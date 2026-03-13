import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

function buildMonthlySeries(transactions, type, months = 9) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d    = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return transactions
      .filter(t => {
        const td = new Date(t.date);
        return t.type === type && td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      })
      .reduce((s, t) => s + Number(t.amount), 0);
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

    const txns = await db.transaction.findMany({
      where: { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (txns.length < 5) return NextResponse.json({ insufficient: true });

    const monthly_expenses = buildMonthlySeries(txns, "EXPENSE", 9).map(Math.round);
    const monthly_income   = buildMonthlySeries(txns, "INCOME",  9).map(Math.round);

    // ── Expense forecast ──────────────────────────────────────────────────
    const [expRes, incRes] = await Promise.all([
      fetch(`${ML_URL}/tft/forecast`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ monthly_values: monthly_expenses, horizon: 3 }),
        signal:  AbortSignal.timeout(60000),
      }),
      fetch(`${ML_URL}/tft/forecast`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ monthly_values: monthly_income, horizon: 3 }),
        signal:  AbortSignal.timeout(60000),
      }),
    ]);

    const expData = await expRes.json();
    const incData = await incRes.json();

    return NextResponse.json({
      expenses:        expData,
      income:          incData,
      history:         { monthly_expenses, monthly_income },
      model:           "Attention-LSTM (TFT-style)",
    });

  } catch (err) {
    console.error("[tft]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "TFT forecast failed" }, { status: 500 });
  }
}