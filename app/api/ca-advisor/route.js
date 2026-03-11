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

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [transactions, budget, goals, accounts] = await Promise.all([
      db.transaction.findMany({ where: { userId: user.id, date: { gte: threeMonthsAgo } }, orderBy: { date: "desc" } }),
      db.budget.findFirst({ where: { userId: user.id } }),
      db.goal.findMany({ where: { userId: user.id } }),
      db.account.findMany({ where: { userId: user.id } }),
    ]);

    if (transactions.length < 2) {
      return NextResponse.json({
        briefing: "Welcome! Please add a few transactions so I can analyse your finances and provide personalised guidance.",
        alerts: [],
        metrics: null,
      });
    }

    // ── Compute metrics ────────────────────────────────────────────────────
    const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const thisMonthExpense = transactions
      .filter(t => t.type === "EXPENSE" && new Date(t.date) >= startOfMonth)
      .reduce((s, t) => s + Number(t.amount), 0);

    const savingsRate   = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
    const budgetUsed    = budget ? (thisMonthExpense / Number(budget.amount) * 100).toFixed(1) : null;
    const totalBalance  = accounts.reduce((s, a) => s + Number(a.balance), 0);

    const categoryMap = {};
    transactions.filter(t => t.type === "EXPENSE").forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount);
    });
    const topSpend = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    // ── Build CA prompt ────────────────────────────────────────────────────
    const prompt = `You are CA Arjun, a senior Chartered Accountant and personal finance advisor with 15+ years of experience. You are professional, empathetic, and speak with authority. You always address the client formally but warmly.

CLIENT FINANCIAL SNAPSHOT (last 3 months):
- Total Income:       ${fmt(income)}
- Total Expenses:     ${fmt(expense)}
- Net Savings:        ${fmt(Math.max(0, income - expense))}
- Savings Rate:       ${savingsRate}%
- Total Bank Balance: ${fmt(totalBalance)}
- This Month Spent:   ${fmt(thisMonthExpense)}
- Monthly Budget:     ${budget ? fmt(Number(budget.amount)) : "Not set"}
- Budget Used:        ${budgetUsed ? `${budgetUsed}%` : "N/A"}
- Active Goals:       ${goals.length}
- Top Expense Areas:  ${topSpend.map(([c, a]) => `${c} (${fmt(a)})`).join(", ") || "N/A"}

Generate a professional CA briefing with this EXACT JSON structure (no markdown, no extra text):
{
  "greeting": "Professional greeting addressing the client (1 sentence)",
  "briefing": "2-3 sentence executive summary of their financial health — be specific with numbers",
  "alerts": [
    {
      "level": "critical" | "warning" | "good",
      "title": "Short alert title",
      "detail": "One specific, actionable sentence"
    }
  ],
  "advice": [
    {
      "area": "area name (Tax / Savings / Budget / Investment / Debt / Emergency Fund)",
      "recommendation": "Specific CA-level recommendation in 1-2 sentences using actual numbers",
      "priority": "Immediate" | "This Month" | "This Quarter"
    }
  ],
  "caNote": "A short closing professional note from CA Arjun (1 sentence, warm but formal)"
}

Rules:
- alerts: 2-4 items mixing critical/warning/good based on actual data
- advice: exactly 3 items covering different areas
- Always use ₹ for amounts
- Be specific — use their actual numbers, not generic advice
- Sound like a real CA, not a chatbot`;

    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.25,
      max_tokens: 800,
    });

    const raw   = res.choices[0]?.message?.content?.trim() || "{}";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed = {};
    try { parsed = JSON.parse(clean); } catch { parsed = {}; }

    return NextResponse.json({
      ...parsed,
      metrics: {
        income: Math.round(income),
        expense: Math.round(expense),
        savings: Math.round(Math.max(0, income - expense)),
        savingsRate: parseFloat(savingsRate),
        totalBalance: Math.round(totalBalance),
        budgetUsed: budgetUsed ? parseFloat(budgetUsed) : null,
        goalsCount: goals.length,
        topSpend: topSpend.map(([cat, amt]) => ({ cat, amt: Math.round(amt) })),
      },
    });
  } catch (err) {
    console.error("[CA Advisor Error]", err);
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}