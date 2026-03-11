import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const now = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf3Month = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const startOfYear   = new Date(now.getFullYear(), 0, 1);

    const [allTx, accounts, budget, goals] = await Promise.all([
      db.transaction.findMany({
        where: { userId: user.id },
        orderBy: { date: "desc" },
      }),
      db.account.findMany({ where: { userId: user.id } }),
      db.budget.findFirst({ where: { userId: user.id } }),
      db.goal.findMany({ where: { userId: user.id } }),
    ]);

    // ── Period slices ──────────────────────────────────────────────────────
    const thisMon  = allTx.filter(t => new Date(t.date) >= startOfMonth);
    const last3Mon = allTx.filter(t => new Date(t.date) >= startOf3Month);
    const thisYear = allTx.filter(t => new Date(t.date) >= startOfYear);

    const sum = (txs, type) =>
      txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0);

    const metrics = {
      thisMonth: {
        income:  sum(thisMon, "INCOME"),
        expense: sum(thisMon, "EXPENSE"),
        savings: Math.max(0, sum(thisMon, "INCOME") - sum(thisMon, "EXPENSE")),
      },
      last3Months: {
        income:  sum(last3Mon, "INCOME"),
        expense: sum(last3Mon, "EXPENSE"),
        savings: Math.max(0, sum(last3Mon, "INCOME") - sum(last3Mon, "EXPENSE")),
      },
      ytd: {
        income:  sum(thisYear, "INCOME"),
        expense: sum(thisYear, "EXPENSE"),
        savings: Math.max(0, sum(thisYear, "INCOME") - sum(thisYear, "EXPENSE")),
      },
      totalBalance: accounts.reduce((s, a) => s + Number(a.balance), 0),
      savingsRate3M: sum(last3Mon, "INCOME") > 0
        ? ((sum(last3Mon, "INCOME") - sum(last3Mon, "EXPENSE")) / sum(last3Mon, "INCOME") * 100).toFixed(1)
        : 0,
      budgetUsed: budget
        ? (sum(thisMon, "EXPENSE") / Number(budget.amount) * 100).toFixed(1)
        : null,
      budgetAmount: budget ? Number(budget.amount) : null,
    };

    // ── Category breakdown (3 months) ──────────────────────────────────────
    const catMap = {};
    last3Mon.filter(t => t.type === "EXPENSE").forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({
        category: cat,
        amount: Math.round(amt),
        percent: metrics.last3Months.expense
          ? Math.round(amt / metrics.last3Months.expense * 100)
          : 0,
      }));

    // ── Monthly trend (last 6 months) ──────────────────────────────────────
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthTx = allTx.filter(t => {
        const td = new Date(t.date);
        return td >= d && td <= e;
      });
      monthlyTrend.push({
        month: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
        income:  Math.round(sum(monthTx, "INCOME")),
        expense: Math.round(sum(monthTx, "EXPENSE")),
        savings: Math.round(Math.max(0, sum(monthTx, "INCOME") - sum(monthTx, "EXPENSE"))),
      });
    }

    // ── Recent transactions (last 20) ──────────────────────────────────────
    const recentTx = allTx.slice(0, 20).map(t => ({
      id:          t.id,
      date:        t.date,
      type:        t.type,
      amount:      Number(t.amount),
      category:    t.category,
      description: t.description,
      status:      t.status,
    }));

    // ── AI CA analysis ─────────────────────────────────────────────────────
    const prompt = `You are CA Arjun, a senior Chartered Accountant. Generate a professional financial analysis report.

CLIENT DATA:
- This Month: Income ${fmt(metrics.thisMonth.income)}, Expenses ${fmt(metrics.thisMonth.expense)}, Savings ${fmt(metrics.thisMonth.savings)}
- 3-Month: Income ${fmt(metrics.last3Months.income)}, Expenses ${fmt(metrics.last3Months.expense)}, Savings Rate ${metrics.savingsRate3M}%
- YTD: Income ${fmt(metrics.ytd.income)}, Expenses ${fmt(metrics.ytd.expense)}
- Total Balance: ${fmt(metrics.totalBalance)}
- Budget: ${budget ? `${fmt(metrics.budgetAmount)}/month, ${metrics.budgetUsed}% used` : "Not set"}
- Goals: ${goals.length} active, total target ${fmt(goals.reduce((s, g) => s + Number(g.targetAmount), 0))}
- Top expenses: ${categoryBreakdown.slice(0, 4).map(c => `${c.category} ${fmt(c.amount)}`).join(", ")}

Respond ONLY with this JSON (no markdown):
{
  "overallHealth": "Excellent" | "Good" | "Fair" | "Needs Attention",
  "healthScore": <number 0-100>,
  "executiveSummary": "<2-3 sentence professional summary using actual numbers>",
  "keyFindings": [
    { "type": "positive" | "negative" | "neutral", "finding": "<specific finding with numbers>" }
  ],
  "taxNote": "<1 sentence tax planning tip relevant to their income level>",
  "actionItems": [
    { "priority": 1|2|3, "action": "<specific action>", "impact": "<expected outcome>" }
  ]
}

Rules: keyFindings = 3-4 items, actionItems = 3 items ordered by priority. Be specific with ₹ amounts.`;

    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 700,
    });

    let analysis = {};
    try {
      const raw = res.choices[0]?.message?.content?.replace(/```json|```/g, "").trim();
      analysis = JSON.parse(raw);
    } catch { analysis = {}; }

    return NextResponse.json({
      metrics,
      categoryBreakdown,
      monthlyTrend,
      recentTx,
      accounts: accounts.map(a => ({ id: a.id, name: a.name, type: a.type, balance: Number(a.balance), isDefault: a.isDefault })),
      goals: goals.map(g => ({ id: g.id, targetAmount: Number(g.targetAmount), months: g.months, monthlySave: Number(g.monthlySave) })),
      budget: budget ? { amount: Number(budget.amount), used: sum(thisMon, "EXPENSE") } : null,
      analysis,
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[CA Dashboard Error]", err);
    return NextResponse.json({ error: "Failed to load CA dashboard" }, { status: 500 });
  }
}