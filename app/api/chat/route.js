import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =========================
   HELPERS
========================= */

// 🎯 Extract savings goal
function extractGoal(message) {
  const amountMatch = message.match(/₹?\s?(\d{4,})/);
  const monthsMatch = message.match(/(\d+)\s?(month|months)/i);

  if (!amountMatch || !monthsMatch) return null;

  const targetAmount = Number(amountMatch[1]);
  const months = Number(monthsMatch[1]);

  return {
    targetAmount,
    months,
    monthlySave: targetAmount / months,
  };
}

// ✍️ Extract income / expense
function extractTransaction(message) {
  const amountMatch = message.match(/₹?\s?(\d+)/);
  if (!amountMatch) return null;

  const amount = Number(amountMatch[1]);
  const text = message.toLowerCase();

  // Detect type
  const type = text.includes("income") ? "INCOME" : "EXPENSE";

  // Detect category
  let category = "Other";

  if (type === "INCOME") {
    if (text.includes("salary")) category = "Salary";
    else if (text.includes("freelance")) category = "Freelance";
    else category = "Income";
  } else {
    if (text.includes("food") || text.includes("lunch") || text.includes("dinner"))
      category = "Food";
    else if (text.includes("travel") || text.includes("bus") || text.includes("uber"))
      category = "Travel";
    else if (text.includes("shopping"))
      category = "Shopping";
    else if (text.includes("grocery"))
      category = "Groceries";
  }

  // Detect date
  let date = new Date();
  if (text.includes("yesterday")) {
    date.setDate(date.getDate() - 1);
  }

  return { amount, category, date, type };
}

/* =========================
   MAIN HANDLER
========================= */

export async function POST(req) {
  try {
    // 🔐 Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { reply: "Please login to use the finance assistant." },
        { status: 401 }
      );
    }

    const { message } = await req.json();
    const lowerMessage = message.toLowerCase();

    // 👤 Find user
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ reply: "User not found." });
    }

    /* =========================
       ✍️ AUTO ADD (INCOME / EXPENSE)
    ========================= */
    if (lowerMessage.startsWith("add")) {
      const tx = extractTransaction(message);

      if (!tx) {
        return NextResponse.json({
          reply: "Example: Add ₹200 lunch yesterday OR Add income ₹5000 salary",
        });
      }

      const account = await db.account.findFirst({
        where: { userId: user.id, isDefault: true },
      });

      if (!account) {
        return NextResponse.json({
          reply: "Please create a default account first.",
        });
      }

      await db.transaction.create({
        data: {
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          description: message.replace(/^add/i, "").trim() || tx.category,
          date: tx.date,
          userId: user.id,
          accountId: account.id,
        },
      });

      return NextResponse.json({
        reply: `✅ ${tx.type === "INCOME" ? "Income" : "Expense"} Added Successfully!

Amount: ₹${tx.amount}
Category: ${tx.category}
Date: ${tx.date.toDateString()}`,
      });
    }

    /* =========================
       🎯 GOALS HANDLING
    ========================= */
    if (lowerMessage.includes("save") && lowerMessage.includes("month")) {
      const goal = extractGoal(message);

      if (!goal) {
        return NextResponse.json({
          reply: "Example: Save ₹50000 in 6 months",
        });
      }

      await db.goal.create({
        data: {
          userId: user.id,
          targetAmount: goal.targetAmount,
          months: goal.months,
          monthlySave: goal.monthlySave,
        },
      });

      return NextResponse.json({
        reply: `🎯 Savings Goal Created!

Target: ₹${goal.targetAmount}
Duration: ${goal.months} months
Monthly Saving Needed: ₹${goal.monthlySave.toFixed(2)}

Tip: Reduce food & shopping expenses to reach faster 💡`,
      });
    }

    /* =========================
       📊 EXPENSE ANALYSIS + AI
    ========================= */

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: threeMonthsAgo },
        type: "EXPENSE",
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({
        reply: "You don’t have enough expense data yet.",
      });
    }

    const totalExpense = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const categoryMap = {};
    transactions.forEach((t) => {
      categoryMap[t.category] =
        (categoryMap[t.category] || 0) + Number(t.amount);
    });

    const topCategory = Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const avgMonthlyExpense = totalExpense / 3;

    const context = `
User Finance Summary:
- Total expense (last 3 months): ₹${totalExpense.toFixed(2)}
- Average monthly expense: ₹${avgMonthlyExpense.toFixed(2)}
- Top category: ${topCategory[0]} (₹${topCategory[1].toFixed(2)})

User question:
"${message}"

Give clear, practical advice.
Do NOT invent numbers.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a professional personal finance assistant. Be concise, practical, and accurate.",
        },
        { role: "user", content: context },
      ],
      temperature: 0.4,
    });

    return NextResponse.json({
      reply:
        completion.choices[0]?.message?.content ||
        "I couldn’t generate a response right now.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
