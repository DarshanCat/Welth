import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch goals + last 6 months transactions in parallel
    const [goals, transactions] = await Promise.all([
      db.goal.findMany({ where: { userId: user.id } }),
      db.transaction.findMany({
        where:   { userId: user.id },
        orderBy: { date: "desc" },
      }),
    ]);

    if (!goals.length) return NextResponse.json({ noGoals: true });

    // ── Financial context ─────────────────────────────────────────────────
    const now      = new Date();
    const last3Mo  = transactions.filter(t => {
      const d = new Date(t.date);
      return (now - d) / (1000 * 60 * 60 * 24 * 30) <= 3;
    });

    const avgMonthlyIncome  = last3Mo.filter(t => t.type === "INCOME")
      .reduce((s, t) => s + Number(t.amount), 0) / 3;
    const avgMonthlyExpense = last3Mo.filter(t => t.type === "EXPENSE")
      .reduce((s, t) => s + Number(t.amount), 0) / 3;
    const avgMonthlySavings = Math.max(avgMonthlyIncome - avgMonthlyExpense, 0);

    // Category spending averages
    const catSpend = {};
    last3Mo.filter(t => t.type === "EXPENSE").forEach(t => {
      catSpend[t.category] = (catSpend[t.category] || 0) + Number(t.amount);
    });
    const catAvg = Object.entries(catSpend)
      .map(([cat, total]) => ({ category: cat, monthly: Math.round(total / 3) }))
      .sort((a, b) => b.monthly - a.monthly);

    // Total lifetime savings
    const totalIncome  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const totalSavings = Math.max(totalIncome - totalExpense, 0);

    // ── Analyse each goal ─────────────────────────────────────────────────
    const analysedGoals = await Promise.all(goals.map(async (goal) => {
      const target      = Number(goal.targetAmount);
      const monthlySave = Number(goal.monthlySave);
      const remaining   = Math.max(target - totalSavings, 0);

      // Projected completion at current savings rate
      const projectedMonths = avgMonthlySavings > 0
        ? Math.ceil(remaining / avgMonthlySavings)
        : null;

      // Original plan
      const createdAt      = new Date(goal.createdAt);
      const monthsPassed   = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24 * 30));
      const expectedNow    = monthlySave * monthsPassed;
      const onTrack        = totalSavings >= expectedNow;
      const deficit        = Math.max(expectedNow - totalSavings, 0);
      const surplusMonths  = projectedMonths !== null ? goal.months - (monthsPassed + projectedMonths) : null;

      // What to cut to get back on track
      const neededExtra    = onTrack ? 0 : Math.ceil(deficit / Math.max(goal.months - monthsPassed, 1));
      const cuttableCats   = catAvg
        .filter(c => ["Food", "Entertainment", "Shopping", "Dining", "Subscriptions"].includes(c.category))
        .slice(0, 3)
        .map(c => ({
          category:      c.category,
          currentSpend:  c.monthly,
          suggestedCut:  Math.min(Math.round(c.monthly * 0.2), neededExtra),
          newSpend:      c.monthly - Math.min(Math.round(c.monthly * 0.2), neededExtra),
        }));

      // AI personalised advice for this goal
      let aiAdvice = null;
      try {
        const prompt = `You are CA Arjun. Give 2-sentence sharp advice for this Indian user's financial goal.
Goal: Save ${fmt(target)} in ${goal.months} months
Progress: Saved ${fmt(totalSavings)} (${Math.round(totalSavings/target*100)}%)
Monthly savings: ${fmt(avgMonthlySavings)} actual vs ${fmt(monthlySave)} needed
Status: ${onTrack ? "On track" : `Behind by ${fmt(deficit)}`}
Top expenses: ${catAvg.slice(0,3).map(c=>`${c.category} ₹${c.monthly.toLocaleString('en-IN')}`).join(", ")}
Be specific with numbers. End with "— CA Arjun"`;

        const res = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant", max_tokens: 120,
          messages: [{ role: "user", content: prompt }],
        });
        aiAdvice = res.choices[0]?.message?.content?.trim();
      } catch { /* groq offline */ }

      return {
        id:              goal.id,
        target,
        monthlySave,
        months:          goal.months,
        monthsPassed,
        totalSavings,
        remaining,
        progress:        Math.min(Math.round(totalSavings / target * 100), 100),
        onTrack,
        deficit,
        projectedMonths,
        originalDeadline: new Date(createdAt.getFullYear(), createdAt.getMonth() + goal.months, 1).toISOString(),
        projectedDate:   projectedMonths !== null
          ? new Date(now.getFullYear(), now.getMonth() + projectedMonths, 1).toISOString()
          : null,
        onTimeRisk:      projectedMonths !== null && projectedMonths > (goal.months - monthsPassed),
        surplusMonths,
        neededExtra,
        cuttableCats,
        aiAdvice,
        // Month-by-month projection
        projection:      Array.from({ length: Math.min(goal.months - monthsPassed, 24) }, (_, i) => ({
          month:     i + monthsPassed + 1,
          projected: Math.min(Math.round(totalSavings + avgMonthlySavings * (i + 1)), target),
          needed:    Math.min(Math.round(monthlySave * (monthsPassed + i + 1)), target),
          target,
        })),
      };
    }));

    return NextResponse.json({
      goals:         analysedGoals,
      avgIncome:     Math.round(avgMonthlyIncome),
      avgExpense:    Math.round(avgMonthlyExpense),
      avgSavings:    Math.round(avgMonthlySavings),
      totalSavings:  Math.round(totalSavings),
      topCategories: catAvg.slice(0, 6),
    });

  } catch (err) {
    console.error("[goals-ai]", err);
    return NextResponse.json({ error: "Goals analysis failed" }, { status: 500 });
  }
}