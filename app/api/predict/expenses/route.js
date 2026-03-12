import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Linear regression ─────────────────────────────────────────────────────────
function linearRegression(ys) {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const slope = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) /
                xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  return { slope, intercept: yMean - slope * xMean, yMean };
}

// ── Weighted Moving Average (recent months weigh more) ────────────────────────
function wma(values) {
  if (!values.length) return 0;
  const weights = values.map((_, i) => i + 1);
  const total   = weights.reduce((a, b) => a + b, 0);
  return values.reduce((s, v, i) => s + v * weights[i], 0) / total;
}

// ── Standard deviation ────────────────────────────────────────────────────────
function stdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    });

    if (!transactions.length) return NextResponse.json({ error: "No transactions" });

    // ── Build monthly totals ───────────────────────────────────────────────────
    const monthMap = {};
    const catMonthMap = {};

    transactions.forEach(t => {
      const d   = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { income: 0, expense: 0 };
      if (t.type === "EXPENSE") {
        monthMap[key].expense += Number(t.amount);
        if (!catMonthMap[t.category]) catMonthMap[t.category] = {};
        catMonthMap[t.category][key] = (catMonthMap[t.category][key] || 0) + Number(t.amount);
      } else {
        monthMap[key].income += Number(t.amount);
      }
    });

    const sortedMonths = Object.keys(monthMap).sort();
    const last6        = sortedMonths.slice(-6);
    const monthlyExpenses = last6.map(k => Math.round(monthMap[k].expense));
    const monthlyIncome   = last6.map(k => Math.round(monthMap[k].income));

    // ── Next month label ──────────────────────────────────────────────────────
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthLabel = next.toLocaleString("en-IN", { month: "long", year: "numeric" });

    // ── Overall expense prediction (blend of LR + WMA) ───────────────────────
    const { slope, intercept } = linearRegression(monthlyExpenses);
    const lrForecast  = Math.max(0, Math.round(intercept + slope * last6.length));
    const wmaForecast = Math.max(0, Math.round(wma(monthlyExpenses)));
    const blendedForecast = Math.round((lrForecast * 0.5 + wmaForecast * 0.5));

    const std            = stdDev(monthlyExpenses);
    const confidenceLow  = Math.max(0, Math.round(blendedForecast - std));
    const confidenceHigh = Math.round(blendedForecast + std);

    // ── Category-level predictions ────────────────────────────────────────────
    const categoryForecasts = Object.entries(catMonthMap).map(([cat, monthData]) => {
      const vals = last6.map(k => Math.round(monthData[k] || 0));
      const hasData = vals.some(v => v > 0);
      if (!hasData) return null;
      const { slope: cSlope, intercept: cInt } = linearRegression(vals);
      const predicted = Math.max(0, Math.round(cInt + cSlope * vals.length));
      const avg       = Math.round(vals.reduce((a, b) => a + b, 0) / vals.filter(v => v > 0).length);
      const trend     = vals.at(-1) > 0 ? ((vals.at(-1) - (vals.at(-2) || vals.at(-1))) / (vals.at(-2) || vals.at(-1))) * 100 : 0;
      return { category: cat, predicted, avg, trend: parseFloat(trend.toFixed(1)), history: vals };
    }).filter(Boolean).sort((a, b) => b.predicted - a.predicted);

    // ── Savings forecast ──────────────────────────────────────────────────────
    const wmaIncome       = Math.round(wma(monthlyIncome.filter(v => v > 0)));
    const predictedSavings = Math.max(0, wmaIncome - blendedForecast);
    const savingsRate      = wmaIncome > 0 ? Math.round((predictedSavings / wmaIncome) * 100) : 0;

    // ── AI Insight ────────────────────────────────────────────────────────────
    const lastMonthExp = monthlyExpenses.at(-1) || 0;
    const topCategories = categoryForecasts.slice(0, 5).map(c =>
      `${c.category}: ${fmt(c.predicted)} (trend: ${c.trend > 0 ? "+" : ""}${c.trend}%)`).join(", ");

    let aiInsight = null;
    try {
      const aiRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 250,
        messages: [{
          role: "user",
          content: `You are a personal finance AI. Based on this data, give 2-3 specific, actionable insights in 80 words max:
- Last month expenses: ${fmt(lastMonthExp)}
- Predicted next month: ${fmt(blendedForecast)} (range: ${fmt(confidenceLow)}–${fmt(confidenceHigh)})
- Top expense categories: ${topCategories}
- Predicted savings rate: ${savingsRate}%
Give practical advice. No generic tips. Be specific to the numbers.`,
        }],
      });
      aiInsight = aiRes.choices[0]?.message?.content?.trim();
    } catch { /* AI offline - skip */ }

    // ── Monthly history for chart ─────────────────────────────────────────────
    const chartHistory = last6.map((k, i) => ({
      month: new Date(k + "-01").toLocaleString("en-IN", { month: "short", year: "2-digit" }),
      expense: monthlyExpenses[i],
      income:  monthlyIncome[i],
      savings: Math.max(0, monthlyIncome[i] - monthlyExpenses[i]),
    }));

    return NextResponse.json({
      nextMonthLabel,
      blendedForecast,
      confidenceLow,
      confidenceHigh,
      lastMonthExpense: lastMonthExp,
      trend:    ((blendedForecast - lastMonthExp) / (lastMonthExp || 1) * 100).toFixed(1),
      wmaIncome,
      predictedSavings,
      savingsRate,
      categoryForecasts: categoryForecasts.slice(0, 8),
      chartHistory,
      forecastMonth: { month: nextMonthLabel.split(" ")[0].slice(0, 3) + " " + nextMonthLabel.split(" ")[1].slice(2), forecast: blendedForecast },
      aiInsight,
      dataMonths: last6.length,
    });
  } catch (err) {
    console.error("[predict/expenses]", err);
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}