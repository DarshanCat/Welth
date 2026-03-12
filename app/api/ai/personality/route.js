import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Spending archetypes ───────────────────────────────────────────────────────
const ARCHETYPES = {
  saver: {
    label: "The Disciplined Saver",
    emoji: "🏦",
    color: "#34d399",
    desc:  "You consistently spend less than you earn and prioritise savings.",
    traits: ["Low expense ratio", "High savings rate", "Consistent spending"],
  },
  spender: {
    label: "The Free Spender",
    emoji: "💳",
    color: "#f87171",
    desc:  "You enjoy spending freely — lifestyle is a priority for you.",
    traits: ["High discretionary spend", "Low savings rate", "Lifestyle-first"],
  },
  investor: {
    label: "The Wealth Builder",
    emoji: "📈",
    color: "#60a5fa",
    desc:  "You actively invest and grow your wealth beyond just saving.",
    traits: ["Regular investments", "Moderate expenses", "Long-term focus"],
  },
  foodie: {
    label: "The Foodie",
    emoji: "🍽️",
    color: "#f59e0b",
    desc:  "Food & dining is your biggest spending category by a clear margin.",
    traits: ["High food spend", "Experience-oriented", "Social spender"],
  },
  traveller: {
    label: "The Explorer",
    emoji: "✈️",
    color: "#a78bfa",
    desc:  "Travel & experiences dominate your discretionary budget.",
    traits: ["High travel spend", "Seasonal spikes", "Experience > things"],
  },
  homebody: {
    label: "The Nester",
    emoji: "🏠",
    color: "#06b6d4",
    desc:  "Most of your spending goes towards home, utilities, and family.",
    traits: ["High housing costs", "Low entertainment", "Stability-focused"],
  },
  balanced: {
    label: "The Balanced One",
    emoji: "⚖️",
    color: "#94a3b8",
    desc:  "Your spending is evenly distributed — no single category dominates.",
    traits: ["Balanced allocation", "Moderate savings", "Pragmatic"],
  },
};

// ── Feature extraction ────────────────────────────────────────────────────────
function extractFeatures(transactions) {
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
  if (!total) return null;

  const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t)  => s + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

  const catTotals = {};
  transactions.filter(t => t.type === "EXPENSE").forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  });

  const catPct = Object.fromEntries(
    Object.entries(catTotals).map(([k, v]) => [k, expense > 0 ? v / expense : 0])
  );

  const savingsRate  = income > 0 ? (income - expense) / income : 0;
  const expenseRatio = income > 0 ? expense / income : 1;

  // Top 3 categories
  const topCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);

  return { income, expense, savingsRate, expenseRatio, catPct, topCats, catTotals };
}

// ── Classify archetype ────────────────────────────────────────────────────────
function classify(features) {
  const { savingsRate, expenseRatio, catPct, topCats } = features;

  const scores = {
    saver:     0,
    spender:   0,
    investor:  0,
    foodie:    0,
    traveller: 0,
    homebody:  0,
    balanced:  0,
  };

  // Saver signals
  if (savingsRate > 0.3)  scores.saver     += 3;
  if (savingsRate > 0.5)  scores.saver     += 2;
  if (expenseRatio < 0.6) scores.saver     += 2;

  // Spender signals
  if (savingsRate < 0.05) scores.spender   += 3;
  if (expenseRatio > 0.9) scores.spender   += 3;
  const shopping = (catPct["Shopping"] || 0) + (catPct["Entertainment"] || 0) + (catPct["Personal Care"] || 0);
  if (shopping > 0.3)     scores.spender   += 2;

  // Investor signals
  if ((catPct["Investments"] || 0) > 0.1)  scores.investor += 4;
  if (topCats.includes("Investments"))      scores.investor += 3;

  // Foodie signals
  const food = (catPct["Food"] || 0) + (catPct["Groceries"] || 0);
  if (food > 0.35) scores.foodie += 3;
  if (food > 0.5)  scores.foodie += 3;
  if (topCats[0] === "Food" || topCats[0] === "Groceries") scores.foodie += 2;

  // Traveller signals
  if ((catPct["Travel"] || 0) > 0.2)       scores.traveller += 4;
  if (topCats.includes("Travel"))           scores.traveller += 3;

  // Homebody signals
  const home = (catPct["Housing"] || 0) + (catPct["Utilities"] || 0);
  if (home > 0.4)                           scores.homebody  += 3;
  if (topCats[0] === "Housing")             scores.homebody  += 2;

  // Balanced (no clear winner)
  const maxScore = Math.max(...Object.values(scores));
  const topKey   = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  if (maxScore < 3) return "balanced";
  return topKey;
}

// ── Monthly spending variance (consistency score) ─────────────────────────────
function consistencyScore(transactions) {
  const monthMap = {};
  transactions.filter(t => t.type === "EXPENSE").forEach(t => {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthMap[key] = (monthMap[key] || 0) + Number(t.amount);
  });
  const vals = Object.values(monthMap);
  if (vals.length < 2) return 80;
  const mean   = vals.reduce((a, b) => a + b, 0) / vals.length;
  const stddev = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  const cv     = mean > 0 ? stddev / mean : 1;
  return Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const transactions = await db.transaction.findMany({
      where:   { userId: user.id },
      orderBy: { date: "desc" },
      take:    300,
    });

    if (transactions.length < 5) {
      return NextResponse.json({ error: "Not enough data" });
    }

    const serialized = transactions.map(t => ({ ...t, amount: Number(t.amount) }));
    const features   = extractFeatures(serialized);
    if (!features) return NextResponse.json({ error: "Could not extract features" });

    const archetypeKey = classify(features);
    const archetype    = ARCHETYPES[archetypeKey];
    const consistency  = consistencyScore(serialized);

    // ── Top 5 categories with percentages ────────────────────────────────────
    const topCategories = Object.entries(features.catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount:  Math.round(amount),
        percent: features.expense > 0 ? +(amount / features.expense * 100).toFixed(1) : 0,
      }));

    // ── AI Personalised insight ───────────────────────────────────────────────
    let aiInsight = null;
    try {
      const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n);
      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are a personal finance coach. This user's spending archetype is "${archetype.label}". 

Their data: savings rate ${(features.savingsRate * 100).toFixed(0)}%, top categories: ${features.topCats.join(", ")}, consistency score: ${consistency}/100, monthly income ~${fmt(features.income / Math.max(1, transactions.length / 30))}.

Write 2 specific, positive-toned insights (60 words total): 1 thing they're doing well and 1 specific improvement. Use their archetype personality. Don't be generic.`,
        }],
      });
      aiInsight = res.choices[0]?.message?.content?.trim();
    } catch { /* skip */ }

    return NextResponse.json({
      archetype: {
        key:    archetypeKey,
        ...archetype,
      },
      stats: {
        savingsRate:   +(features.savingsRate * 100).toFixed(1),
        expenseRatio:  +(features.expenseRatio * 100).toFixed(1),
        consistency,
        totalMonths:   Object.keys(
          Object.fromEntries(serialized.map(t => {
            const d = new Date(t.date);
            return [`${d.getFullYear()}-${d.getMonth()}`, 1];
          }))
        ).length,
      },
      topCategories,
      aiInsight,
    });
  } catch (err) {
    console.error("[ai/personality]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}