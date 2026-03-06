import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── All supported categories ──────────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  "Housing", "Transportation", "Groceries", "Utilities", "Entertainment",
  "Food", "Shopping", "Healthcare", "Education", "Personal Care",
  "Travel", "Insurance", "Gifts & Donations", "Bills & Fees", "Other Expenses",
];
const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investments", "Business", "Rental", "Other Income",
];

// ── Step 1: Use LLM to detect intent + extract entities ──────────────────────
async function parseIntent(message) {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are a financial assistant that parses natural language messages.
Today's date is ${today}.

Given this message: "${message}"

Respond with ONLY a JSON object (no markdown, no explanation) in one of these formats:

1. If the user wants to ADD a transaction (any phrasing like "spent", "paid", "bought", "add", "received", "got", "earned", "income"):
{
  "intent": "add_transaction",
  "type": "EXPENSE" or "INCOME",
  "amount": <number>,
  "category": <one of: ${[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].join(", ")}>,
  "description": <short description>,
  "date": "<YYYY-MM-DD>"
}

2. If the user wants to create a SAVINGS GOAL:
{
  "intent": "add_goal",
  "targetAmount": <number>,
  "months": <number>
}

3. If the user wants ANALYSIS or ADVICE:
{
  "intent": "analysis",
  "query": "<cleaned user query>"
}

Rules:
- For dates: "today"=${today}, "yesterday"=day before, "last monday"=most recent monday, etc.
- Amount must be a plain number (no currency symbols)
- Pick the CLOSEST matching category from the list
- If amount is missing or unclear, set intent to "analysis"
- ONLY respond with the JSON object, nothing else`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 200,
  });

  const raw = res.choices[0]?.message?.content?.trim() || "{}";

  // Strip any accidental markdown fences
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return { intent: "analysis", query: message };
  }
}

// ── Step 2: Financial advice via LLM ─────────────────────────────────────────
async function getAdvice(query, user, db) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await db.transaction.findMany({
    where: { userId: user.id, date: { gte: threeMonthsAgo } },
  });

  const income = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);

  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  const categoryMap = {};
  transactions
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + Number(t.amount);
    });

  const topCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(0)}`)
    .join(", ");

  const context = `User Finance Summary (last 3 months):
- Total Income: ₹${income.toFixed(0)}
- Total Expenses: ₹${expense.toFixed(0)}
- Net Savings: ₹${Math.max(0, income - expense).toFixed(0)}
- Top expense categories: ${topCategories || "N/A"}

User question: "${query}"

Give concise, practical, personalised advice in 2-4 sentences. Use ₹ for currency. Be direct.`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a professional personal finance assistant. Be concise and practical.",
      },
      { role: "user", content: context },
    ],
    temperature: 0.4,
    max_tokens: 300,
  });

  return (
    res.choices[0]?.message?.content ||
    "I couldn't generate advice right now. Please try again."
  );
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { reply: "Please login to use the finance assistant." },
        { status: 401 }
      );
    }

    const { message } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ reply: "Please enter a message." });
    }

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ reply: "User not found." });

    // ── Parse intent with LLM ────────────────────────────────────────────
    const parsed = await parseIntent(message);

    // ── Handle: Add Transaction ──────────────────────────────────────────
    if (parsed.intent === "add_transaction") {
      const { type, amount, category, description, date } = parsed;

      if (!amount || amount <= 0) {
        return NextResponse.json({
          reply: '❓ I couldn\'t find an amount. Try: "spent ₹500 on food today"',
        });
      }

      const account = await db.account.findFirst({
        where: { userId: user.id, isDefault: true },
      });

      if (!account) {
        return NextResponse.json({
          reply: "⚠️ Please create a default account first from your dashboard.",
        });
      }

      const txDate = date ? new Date(date) : new Date();

      const tx = await db.transaction.create({
        data: {
          type,
          amount,
          category: category || (type === "INCOME" ? "Other Income" : "Other Expenses"),
          description: description || message,
          date: txDate,
          userId: user.id,
          accountId: account.id,
          status: "COMPLETED",
        },
      });

      const emoji = type === "INCOME" ? "💰" : "💸";
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount);

      return NextResponse.json({
        reply: `${emoji} Transaction Added!\n\n• Amount: ${formatted}\n• Type: ${type === "INCOME" ? "Income" : "Expense"}\n• Category: ${tx.category}\n• Date: ${txDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\n• Account: ${account.name}\n\nYour dashboard will update shortly.`,
        action: "transaction_added",
      });
    }

    // ── Handle: Add Goal ────────────────────────────────────────────────
    if (parsed.intent === "add_goal") {
      const { targetAmount, months } = parsed;

      if (!targetAmount || !months) {
        return NextResponse.json({
          reply: '❓ Try: "Save ₹50000 in 6 months"',
        });
      }

      const monthlySave = targetAmount / months;

      await db.goal.create({
        data: {
          userId: user.id,
          targetAmount,
          months,
          monthlySave,
        },
      });

      const fmt = (n) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

      return NextResponse.json({
        reply: `🎯 Savings Goal Created!\n\n• Target: ${fmt(targetAmount)}\n• Duration: ${months} months\n• Save monthly: ${fmt(monthlySave)}\n\nTip: Cut down on your top expense category to reach your goal faster! 💡`,
        action: "goal_added",
      });
    }

    // ── Handle: Analysis / Advice ────────────────────────────────────────
    const advice = await getAdvice(parsed.query || message, user, db);
    return NextResponse.json({ reply: advice });

  } catch (error) {
    console.error("[Chat API Error]", error);
    return NextResponse.json(
      { reply: "⚠️ Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}