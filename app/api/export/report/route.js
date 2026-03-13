import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // YYYY-MM or omit for current

    const now   = new Date();
    const year  = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();

    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0, 23, 59, 59);

    const [transactions, accounts, budget, goals] = await Promise.all([
      db.transaction.findMany({
        where:   { userId: user.id, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        include: { account: { select: { name: true } } },
      }),
      db.account.findMany({ where: { userId: user.id } }),
      db.budget.findFirst({ where: { userId: user.id } }),
      db.goal.findMany({ where: { userId: user.id } }),
    ]);

    const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const savings = Math.max(income - expense, 0);

    // Category breakdown
    const catMap = {};
    transactions.filter(t => t.type === "EXPENSE").forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    const categories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => ({ name, amount: +amount.toFixed(2), pct: expense > 0 ? +(amount/expense*100).toFixed(1) : 0 }));

    // Net worth
    const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0);

    return NextResponse.json({
      user:      { name: user.name || "Welth User", email: user.email },
      period:    { year, month, label: start.toLocaleString("en-IN", { month: "long", year: "numeric" }) },
      summary:   { income: +income.toFixed(2), expense: +expense.toFixed(2), savings: +savings.toFixed(2), netWorth: +netWorth.toFixed(2) },
      budget:    budget ? { amount: Number(budget.amount), used: +expense.toFixed(2), pct: +(expense / Number(budget.amount) * 100).toFixed(1) } : null,
      categories,
      goals:     goals.map(g => ({ target: Number(g.targetAmount), months: g.months, monthly: Number(g.monthlySave) })),
      topTransactions: transactions
        .sort((a, b) => Number(b.amount) - Number(a.amount))
        .slice(0, 10)
        .map(t => ({ date: new Date(t.date).toLocaleDateString("en-IN"), type: t.type, category: t.category, description: t.description || "", amount: Number(t.amount), account: t.account?.name || "" })),
      txCount:   transactions.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[export/report]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}