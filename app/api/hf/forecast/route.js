import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const HF_TOKEN    = process.env.HF_TOKEN;
// Use HF Inference API for Chronos — no local Python service needed
const CHRONOS_HF  = "https://api-inference.huggingface.co/models/amazon/chronos-t5-small";

// ── Build monthly series ──────────────────────────────────────────────────────
function buildMonthlySeries(transactions, type, months = 9) {
  const now    = new Date();
  const series = [];
  for (let i = months - 1; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const total = transactions
      .filter(t => {
        const td = new Date(t.date);
        return t.type === type &&
               td.getFullYear() === d.getFullYear() &&
               td.getMonth()    === d.getMonth();
      })
      .reduce((s, t) => s + Number(t.amount), 0);
    series.push(Math.round(total));
  }
  return series;
}

// ── Statistical fallback (WMA + linear regression) ───────────────────────────
function statisticalForecast(series, horizon = 3) {
  if (series.length < 2) return Array(horizon).fill({ mid: 0, low: 0, high: 0 });

  // Weighted moving average (more weight to recent)
  const weights = series.map((_, i) => i + 1);
  const wSum    = weights.reduce((a, b) => a + b, 0);
  const wma     = series.reduce((s, v, i) => s + v * weights[i], 0) / wSum;

  // Linear regression trend
  const n    = series.length;
  const xMean = (n - 1) / 2;
  const yMean = series.reduce((a, b) => a + b, 0) / n;
  const slope = series.reduce((s, y, x) => s + (x - xMean) * (y - yMean), 0) /
                series.reduce((s, _, x) => s + (x - xMean) ** 2, 0);

  // Std dev for confidence band
  const stddev = Math.sqrt(series.reduce((s, v) => s + (v - yMean) ** 2, 0) / n);

  return Array.from({ length: horizon }, (_, h) => {
    const trend = yMean + slope * (n + h);
    const blend = (wma + trend) / 2;
    return {
      month_index: h + 1,
      mid:  Math.round(Math.max(0, blend)),
      low:  Math.round(Math.max(0, blend - stddev)),
      high: Math.round(Math.max(0, blend + stddev)),
    };
  });
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const since = new Date();
    since.setMonth(since.getMonth() - 9);

    const transactions = await db.transaction.findMany({
      where:   { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (transactions.length < 5) return NextResponse.json({ insufficient: true });

    const monthly_income  = buildMonthlySeries(transactions, "INCOME",  9);
    const monthly_expense = buildMonthlySeries(transactions, "EXPENSE", 9);

    // ── Try HuggingFace Chronos API ───────────────────────────────────────
    let expenseForecast = null;
    let incomeForecast  = null;
    let usedModel       = "statistical";

    if (HF_TOKEN) {
      try {
        const [expRes, incRes] = await Promise.all([
          fetch(CHRONOS_HF, {
            method:  "POST",
            headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ inputs: monthly_expense, parameters: { prediction_length: 3 } }),
            signal:  AbortSignal.timeout(20000),
          }),
          fetch(CHRONOS_HF, {
            method:  "POST",
            headers: { Authorization: `Bearer ${HF_TOKEN}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ inputs: monthly_income,  parameters: { prediction_length: 3 } }),
            signal:  AbortSignal.timeout(20000),
          }),
        ]);

        if (expRes.ok && incRes.ok) {
          const expData = await expRes.json();
          const incData = await incRes.json();
          // HF returns array of samples [[...], [...], ...]
          if (Array.isArray(expData) && expData.length > 0) {
            const expSamples = expData; // shape: [num_samples, horizon]
            const incSamples = incData;
            expenseForecast = Array.from({ length: 3 }, (_, h) => {
              const col = expSamples.map(s => Array.isArray(s) ? s[h] : s);
              col.sort((a, b) => a - b);
              return {
                month_index: h + 1,
                low:  Math.round(Math.max(0, col[Math.floor(col.length * 0.1)])),
                mid:  Math.round(Math.max(0, col[Math.floor(col.length * 0.5)])),
                high: Math.round(Math.max(0, col[Math.floor(col.length * 0.9)])),
              };
            });
            incomeForecast = Array.from({ length: 3 }, (_, h) => {
              const col = incSamples.map(s => Array.isArray(s) ? s[h] : s);
              col.sort((a, b) => a - b);
              return {
                month_index: h + 1,
                low:  Math.round(Math.max(0, col[Math.floor(col.length * 0.1)])),
                mid:  Math.round(Math.max(0, col[Math.floor(col.length * 0.5)])),
                high: Math.round(Math.max(0, col[Math.floor(col.length * 0.9)])),
              };
            });
            usedModel = "amazon/chronos-t5-small";
          }
        }
      } catch (e) {
        console.warn("[Chronos HF fallback]", e.message);
      }
    }

    // ── Fallback to statistical if HF failed ─────────────────────────────
    if (!expenseForecast) expenseForecast = statisticalForecast(monthly_expense, 3);
    if (!incomeForecast)  incomeForecast  = statisticalForecast(monthly_income,  3);

    // ── Savings forecast ─────────────────────────────────────────────────
    const savingsForecast = expenseForecast.map((e, i) => ({
      month_index:  e.month_index,
      income_mid:   incomeForecast[i].mid,
      expense_mid:  e.mid,
      savings_mid:  Math.max(0, incomeForecast[i].mid - e.mid),
    }));

    const lastExpense = monthly_expense[monthly_expense.length - 1];
    const nextExpense = expenseForecast[0].mid;
    const trend = nextExpense > lastExpense * 1.05 ? "increasing"
                : nextExpense < lastExpense * 0.95 ? "decreasing" : "stable";

    return NextResponse.json({
      expenses: { forecast: expenseForecast, history: monthly_expense },
      income:   { forecast: incomeForecast,  history: monthly_income  },
      savings:  savingsForecast,
      trend,
      model:    usedModel,
      history:  { monthly_income, monthly_expense },
    });
  } catch (err) {
    console.error("[hf/forecast]", err);
    return NextResponse.json({ error: "Forecast failed" }, { status: 500 });
  }
}