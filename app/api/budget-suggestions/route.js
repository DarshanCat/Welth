import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch last 3 months of data in parallel
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const [transactions, budget, goals] = await Promise.all([
      db.transaction.findMany({
        where: { userId: user.id, date: { gte: threeMonthsAgo } },
        orderBy: { date: "desc" },
      }),
      db.budget.findFirst({ where: { userId: user.id } }),
      db.goal.findMany({ where: { userId: user.id } }),
    ]);

    if (transactions.length < 3) {
      return NextResponse.json({
        suggestions: [],
        summary: "Add more transactions to get personalised AI budget suggestions.",
      });
    }

    // Build spending breakdown by category
    const categoryMap = {};
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t) => {
      const amount = Number(t.amount);
      if (t.type === "INCOME") {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        categoryMap[t.category] = (categoryMap[t.category] || 0) + amount;
      }
    });

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, amt]) => ({
        category: cat,
        amount: Math.round(amt),
        percent: totalExpense ? Math.round((amt / totalExpense) * 100) : 0,
      }));

    const savingsRate = totalIncome
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
      : 0;

    const budgetUsage = budget
      ? Math.round((totalExpense / Number(budget.amount)) * 100)
      : null;

    const goalTargets = goals
      .map((g) => `₹${Number(g.targetAmount).toLocaleString("en-IN")} in ${g.months} months`)
      .join(", ");

    // Build prompt
    const prompt = `You are an expert personal finance advisor analysing a user's finances.

USER FINANCIAL DATA (last 3 months):
- Total Income: ₹${Math.round(totalIncome).toLocaleString("en-IN")}
- Total Expenses: ₹${Math.round(totalExpense).toLocaleString("en-IN")}
- Net Savings: ₹${Math.round(Math.max(0, totalIncome - totalExpense)).toLocaleString("en-IN")}
- Savings Rate: ${savingsRate}%
- Budget set: ${budget ? `₹${Number(budget.amount).toLocaleString("en-IN")}/month` : "Not set"}
- Budget used: ${budgetUsage !== null ? `${budgetUsage}%` : "N/A"}
- Savings Goals: ${goalTargets || "None set"}

TOP SPENDING CATEGORIES:
${topCategories.map((c) => `- ${c.category}: ₹${c.amount.toLocaleString("en-IN")} (${c.percent}%)`).join("\n")}

Generate exactly 4 specific, actionable budget suggestions. 
Respond ONLY with a JSON array, no markdown, no explanation:
[
  {
    "title": "short title (max 5 words)",
    "suggestion": "specific actionable advice (1-2 sentences, use ₹ amounts)",
    "impact": "High" | "Medium" | "Low",
    "category": "the relevant spending category or 'General'",
    "saving": estimated monthly saving as a number (integer, no symbols)
  }
]`;

    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = res.choices[0]?.message?.content?.trim() || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();

    let suggestions = [];
    try {
      suggestions = JSON.parse(clean);
    } catch {
      suggestions = [];
    }

    return NextResponse.json({
      suggestions,
      meta: {
        totalIncome: Math.round(totalIncome),
        totalExpense: Math.round(totalExpense),
        savingsRate,
        budgetUsage,
        topCategories,
      },
    });
  } catch (error) {
    console.error("[Budget Suggestions Error]", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}