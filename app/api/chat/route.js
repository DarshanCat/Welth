import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const EXPENSE_CATEGORIES = [
  "Housing","Transportation","Groceries","Utilities","Entertainment",
  "Food","Shopping","Healthcare","Education","Personal Care",
  "Travel","Insurance","Gifts & Donations","Bills & Fees","Other Expenses",
];
const INCOME_CATEGORIES = ["Salary","Freelance","Investments","Business","Rental","Other Income"];

// ── Intent Parser ─────────────────────────────────────────────────────────────
async function parseIntent(message) {
  const today = new Date().toISOString().split("T")[0];
  const prompt = `You are a financial assistant that classifies messages into intents.
Today: ${today}. Message: "${message}"

Reply ONLY with JSON (no markdown), one of:
1. Transaction: {"intent":"add_transaction","type":"EXPENSE"|"INCOME","amount":<number>,"category":"<one of: ${[...EXPENSE_CATEGORIES,...INCOME_CATEGORIES].join(",")}>","description":"<short>","date":"<YYYY-MM-DD>"}
2. Goal: {"intent":"add_goal","targetAmount":<number>,"months":<number>}
3. Investment query (stocks/mutual funds/SIP/portfolio/invest/returns/market): {"intent":"investment","query":"<cleaned>","riskProfile":"conservative"|"moderate"|"aggressive"}
4. Budget query (budget/spending/where is my money): {"intent":"budget_analysis","query":"<cleaned>"}
5. Tax query (tax/ITR/section 80C/deduction): {"intent":"tax_advice","query":"<cleaned>"}
6. General finance: {"intent":"analysis","query":"<cleaned>"}

Rules: amount = plain number, no symbols. Default to "analysis" if unsure. ONLY JSON.`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1, max_tokens: 150,
  });
  const raw = res.choices[0]?.message?.content?.trim().replace(/```json|```/g, "").trim() || "{}";
  try { return JSON.parse(raw); } catch { return { intent: "analysis", query: message }; }
}

// ── Load user financial context ───────────────────────────────────────────────
async function getUserContext(userId) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [transactions, budget, goals, accounts] = await Promise.all([
    db.transaction.findMany({ where: { userId, date: { gte: threeMonthsAgo } } }),
    db.budget.findFirst({ where: { userId } }),
    db.goal.findMany({ where: { userId } }),
    db.account.findMany({ where: { userId } }),
  ]);

  const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
  const savings = Math.max(0, income - expense);
  const savingsRate = income > 0 ? Math.round(savings / income * 100) : 0;
  const monthlyIncome = Math.round(income / 3);
  const monthlySavings = Math.round(savings / 3);
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  const catMap = {};
  transactions.filter(t => t.type === "EXPENSE").forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + Number(t.amount);
  });
  const topSpend = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([c, a]) => `${c}(${fmt(a)})`).join(", ");

  return {
    income, expense, savings, savingsRate,
    monthlyIncome, monthlySavings, totalBalance,
    budget: budget ? Number(budget.amount) : null,
    goalsCount: goals.length,
    topSpend,
    canInvest: monthlySavings > 1000,
    investableMonthly: Math.round(monthlySavings * 0.6), // 60% of savings for investment
    emergencyFundNeeded: monthlyIncome * 6,
    hasEmergencyFund: totalBalance >= monthlyIncome * 3,
  };
}

// ── Investment Recommendation ─────────────────────────────────────────────────
async function getInvestmentAdvice(query, ctx, riskProfile = "moderate") {
  const risk = riskProfile || (ctx.savingsRate > 30 ? "moderate" : ctx.savingsRate > 15 ? "moderate" : "conservative");

  const prompt = `You are CA Arjun, a SEBI-registered investment advisor and Chartered Accountant in India. You give specific, actionable Indian investment advice.

CLIENT PROFILE:
- Monthly Income:    ${fmt(ctx.monthlyIncome)}
- Monthly Savings:   ${fmt(ctx.monthlySavings)} (${ctx.savingsRate}% rate)
- Available to invest: ${fmt(ctx.investableMonthly)}/month
- Total Balance:     ${fmt(ctx.totalBalance)}
- Risk Profile:      ${risk}
- Emergency Fund:    ${ctx.hasEmergencyFund ? "✅ Adequate" : "❌ Needs building (target: " + fmt(ctx.emergencyFundNeeded) + ")"}
- Goals:             ${ctx.goalsCount} active
- Top spending:      ${ctx.topSpend}

CLIENT QUESTION: "${query}"

Provide investment advice structured EXACTLY as this JSON (no markdown):
{
  "summary": "<2 sentence investment overview based on their actual savings capacity>",
  "canInvest": ${ctx.canInvest},
  "monthlyInvestable": ${ctx.investableMonthly},
  "recommendations": [
    {
      "type": "Mutual Fund"|"Direct Equity"|"SIP"|"PPF"|"NPS"|"FD"|"Gold ETF"|"Index Fund"|"ELSS",
      "name": "<specific fund/instrument name>",
      "allocation": <percent as number>,
      "monthlyAmount": <number in ₹>,
      "expectedReturn": "<e.g. 12-15% p.a.>",
      "risk": "Low"|"Medium"|"High",
      "why": "<1 sentence specific reason based on their profile>",
      "howTo": "<1 sentence on how to start — which app/platform>"
    }
  ],
  "warnings": ["<important disclaimer or risk warning>"],
  "nextStep": "<single most important action to take this week>",
  "caNote": "<1 sentence professional sign-off as CA Arjun>"
}

Rules:
- 3-4 recommendations totalling 100% allocation
- Use real Indian fund names (e.g. Nifty 50 Index Fund, Parag Parikh Flexi Cap, HDFC Mid-Cap Opportunities)
- ${risk === "conservative" ? "Focus on FD, PPF, debt funds, gold" : risk === "aggressive" ? "Include mid-cap, small-cap, direct equity" : "Mix of index funds, large-cap, some mid-cap"}
- If emergency fund missing, first recommendation must be liquid fund/FD for emergency
- Monthly amounts must add up to roughly ${ctx.investableMonthly}
- Always mention Groww, Zerodha, or Kuvera for how to start`;

  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are CA Arjun, a SEBI-registered investment advisor. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2, max_tokens: 900,
  });

  const raw = res.choices[0]?.message?.content?.replace(/```json|```/g, "").trim() || "{}";
  try {
    const data = JSON.parse(raw);
    return { type: "investment", data };
  } catch {
    return { type: "text", text: raw };
  }
}

// ── Budget Analysis ───────────────────────────────────────────────────────────
async function getBudgetAnalysis(query, ctx) {
  const prompt = `You are CA Arjun, a Chartered Accountant. Analyse spending and give specific advice.

CLIENT DATA (3 months):
- Income: ${fmt(ctx.income)} | Expenses: ${fmt(ctx.expense)} | Savings: ${fmt(ctx.savings)} (${ctx.savingsRate}%)
- Budget: ${ctx.budget ? fmt(ctx.budget) + "/month" : "Not set"}
- Top spending: ${ctx.topSpend}

Question: "${query}"

Reply as CA Arjun, professional, specific with ₹ numbers from their data. 3-5 sentences. 
Identify the biggest overspend area and give a specific cut target.
End with "— CA Arjun"`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.25, max_tokens: 300,
  });
  return { type: "text", text: res.choices[0]?.message?.content || "Unable to analyse." };
}

// ── Tax Advice ────────────────────────────────────────────────────────────────
async function getTaxAdvice(query, ctx) {
  const prompt = `You are CA Arjun, a tax expert. Give Indian income tax advice.

CLIENT DATA:
- Monthly Income: ${fmt(ctx.monthlyIncome)} → Annual ~${fmt(ctx.monthlyIncome * 12)}
- Savings Rate: ${ctx.savingsRate}%
- Can invest in tax-saving instruments: ${ctx.canInvest ? "Yes, " + fmt(ctx.investableMonthly) + "/month" : "Limited"}

Question: "${query}"

Give specific tax advice for India (FY 2024-25):
- Mention applicable tax slab
- Specific 80C, 80D, HRA deductions relevant to their income
- How much they can save in tax with specific ₹ amounts
- Keep it to 4-6 sentences, professional tone
End with "— CA Arjun"`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2, max_tokens: 350,
  });
  return { type: "text", text: res.choices[0]?.message?.content || "Unable to provide tax advice." };
}

// ── General CA Advice ─────────────────────────────────────────────────────────
async function getCAAdvice(query, ctx) {
  const prompt = `You are CA Arjun, a senior Chartered Accountant and personal finance advisor.

CLIENT DATA (3 months):
- Income: ${fmt(ctx.income)} | Expenses: ${fmt(ctx.expense)} | Savings: ${fmt(ctx.savings)} (${ctx.savingsRate}%)
- Balance: ${fmt(ctx.totalBalance)} | Budget: ${ctx.budget ? fmt(ctx.budget) + "/month" : "Not set"}
- Goals: ${ctx.goalsCount} active | Top spend: ${ctx.topSpend}

Question: "${query}"

Reply professionally, use their actual ₹ numbers. 2-4 sentences. End with "— CA Arjun"`;

  const res = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3, max_tokens: 300,
  });
  return { type: "text", text: res.choices[0]?.message?.content || "Unable to generate advice." };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ reply: "Please login to use the finance assistant.", type: "text" }, { status: 401 });

    const { message } = await req.json();
    if (!message?.trim()) return NextResponse.json({ reply: "Please enter a message.", type: "text" });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ reply: "User not found.", type: "text" });

    const [parsed, ctx] = await Promise.all([
      parseIntent(message),
      getUserContext(user.id),
    ]);

    // ── Add Transaction ────────────────────────────────────────────────────
    if (parsed.intent === "add_transaction") {
      const { type, amount, category, description, date } = parsed;
      if (!amount || amount <= 0) {
        return NextResponse.json({ reply: `❓ I couldn't find an amount. Try: "spent ₹500 on food today"`, type: "text" });
      }
      const account = await db.account.findFirst({ where: { userId: user.id, isDefault: true } });
      if (!account) return NextResponse.json({ reply: "⚠️ Please create a default account first from your dashboard.", type: "text" });

      const txDate = date ? new Date(date) : new Date();
      const tx = await db.transaction.create({
        data: {
          type, amount,
          category: category || (type === "INCOME" ? "Other Income" : "Other Expenses"),
          description: description || message,
          date: txDate, userId: user.id, accountId: account.id, status: "COMPLETED",
        },
      });
      return NextResponse.json({
        type: "text",
        reply: `✅ Transaction Recorded\n\n• Amount: ${fmt(amount)}\n• Type: ${type === "INCOME" ? "Income" : "Expense"}\n• Category: ${tx.category}\n• Date: ${txDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\n• Account: ${account.name}\n\nDashboard updated.`,
        action: "transaction_added",
      });
    }

    // ── Add Goal ───────────────────────────────────────────────────────────
    if (parsed.intent === "add_goal") {
      const { targetAmount, months } = parsed;
      if (!targetAmount || !months) return NextResponse.json({ reply: `❓ Try: "Save ₹50000 in 6 months"`, type: "text" });
      const monthlySave = targetAmount / months;
      await db.goal.create({ data: { userId: user.id, targetAmount, months, monthlySave } });
      return NextResponse.json({
        type: "text",
        reply: `🎯 Savings Goal Created!\n\n• Target: ${fmt(targetAmount)}\n• Duration: ${months} months\n• Monthly saving needed: ${fmt(monthlySave)}\n\n— CA Arjun: Set a standing instruction to auto-transfer ${fmt(monthlySave)} on your salary date. Automation is the key to goal success.`,
        action: "goal_added",
      });
    }

    // ── Investment ─────────────────────────────────────────────────────────
    if (parsed.intent === "investment") {
      const result = await getInvestmentAdvice(parsed.query || message, ctx, parsed.riskProfile);
      return NextResponse.json(result);
    }

    // ── Budget Analysis ────────────────────────────────────────────────────
    if (parsed.intent === "budget_analysis") {
      const result = await getBudgetAnalysis(parsed.query || message, ctx);
      return NextResponse.json(result);
    }

    // ── Tax Advice ─────────────────────────────────────────────────────────
    if (parsed.intent === "tax_advice") {
      const result = await getTaxAdvice(parsed.query || message, ctx);
      return NextResponse.json(result);
    }

    // ── General ────────────────────────────────────────────────────────────
    const result = await getCAAdvice(parsed.query || message, ctx);
    return NextResponse.json(result);

  } catch (err) {
    console.error("[Chat API Error]", err);
    return NextResponse.json({ reply: "⚠️ Something went wrong. Please try again.", type: "text" }, { status: 500 });
  }
}