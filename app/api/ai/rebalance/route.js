import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Ideal allocations by risk profile ────────────────────────────────────────
const IDEAL_ALLOCATION = {
  conservative: { STOCK: 20, MUTUAL_FUND: 60, ETF: 20 },
  moderate:     { STOCK: 40, MUTUAL_FUND: 45, ETF: 15 },
  aggressive:   { STOCK: 65, MUTUAL_FUND: 25, ETF: 10 },
};

// ── Herfindahl concentration index ───────────────────────────────────────────
function concentrationIndex(holdings) {
  const total = holdings.reduce((s, h) => s + h.investedAmt, 0);
  if (!total) return 0;
  return holdings.reduce((s, h) => s + Math.pow(h.investedAmt / total, 2), 0);
}

export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const riskProfile = searchParams.get("risk") || "moderate";

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let holdings = [];
    try {
      holdings = await db.holding.findMany({ where: { userId: user.id } });
    } catch { return NextResponse.json({ noHoldings: true }); }

    if (!holdings.length) return NextResponse.json({ noHoldings: true });

    const serialized = holdings.map(h => ({
      ...h,
      investedAmt: Number(h.investedAmt),
      quantity:    Number(h.quantity),
      avgBuyPrice: Number(h.avgBuyPrice),
    }));

    const totalInvested = serialized.reduce((s, h) => s + h.investedAmt, 0);

    // ── Current allocation ────────────────────────────────────────────────────
    const byType = { STOCK: 0, MUTUAL_FUND: 0, ETF: 0 };
    serialized.forEach(h => { byType[h.type] = (byType[h.type] || 0) + h.investedAmt; });

    const currentAlloc = Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, totalInvested > 0 ? +(v / totalInvested * 100).toFixed(1) : 0])
    );

    // ── Target allocation ─────────────────────────────────────────────────────
    const ideal = IDEAL_ALLOCATION[riskProfile] || IDEAL_ALLOCATION.moderate;

    // ── Rebalancing actions ────────────────────────────────────────────────────
    const actions = Object.entries(ideal).map(([type, targetPct]) => {
      const currentPct = currentAlloc[type] || 0;
      const diff       = targetPct - currentPct;
      const amtDiff    = Math.abs(diff / 100 * totalInvested);
      return {
        type,
        currentPct,
        targetPct,
        diff:     +diff.toFixed(1),
        amtDiff:  Math.round(amtDiff),
        action:   diff > 2 ? "buy" : diff < -2 ? "sell" : "hold",
        urgent:   Math.abs(diff) > 10,
      };
    }).filter(a => a.action !== "hold" || Math.abs(a.diff) <= 2);

    // ── Concentration risk ────────────────────────────────────────────────────
    const hhi = concentrationIndex(serialized);
    const concentrationRisk = hhi > 0.5 ? "high" : hhi > 0.25 ? "moderate" : "low";
    const topHolding = serialized.sort((a, b) => b.investedAmt - a.investedAmt)[0];
    const topConcentration = totalInvested > 0
      ? +(topHolding.investedAmt / totalInvested * 100).toFixed(1) : 0;

    // ── Diversification score 0-100 ───────────────────────────────────────────
    const uniqueSectors   = [...new Set(serialized.map(h => h.type))].length;
    const holdingCount    = serialized.length;
    const allocScore      = 100 - Object.values(ideal).reduce((s, t, i) => {
      const curr = Object.values(currentAlloc)[i] || 0;
      return s + Math.abs(t - curr);
    }, 0);
    const divScore = Math.round(
      (Math.min(holdingCount / 10, 1) * 30) +
      (Math.min(uniqueSectors / 3, 1) * 30) +
      (Math.max(0, allocScore) / 100 * 40)
    );

    // ── AI Rebalancing narrative ──────────────────────────────────────────────
    let aiAdvice = null;
    try {
      const actionSummary = actions
        .filter(a => a.action !== "hold")
        .map(a => `${a.action.toUpperCase()} ${a.type.replace("_", " ")}: currently ${a.currentPct}%, target ${a.targetPct}% (${a.action === "buy" ? "add" : "reduce"} ${fmt(a.amtDiff)})`)
        .join("; ");

      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 250,
        messages: [{
          role: "user",
          content: `You are a SEBI-registered portfolio advisor. In 80 words, give specific rebalancing advice for this Indian investor:

Portfolio: ${fmt(totalInvested)} total | ${holdingCount} holdings | ${riskProfile} risk profile
Current mix: Stocks ${currentAlloc.STOCK}%, Mutual Funds ${currentAlloc.MUTUAL_FUND}%, ETFs ${currentAlloc.ETF}%
Target mix: Stocks ${ideal.STOCK}%, Mutual Funds ${ideal.MUTUAL_FUND}%, ETFs ${ideal.ETF}%
Actions needed: ${actionSummary || "Portfolio is balanced"}
Largest holding: ${topHolding?.name} (${topConcentration}% of portfolio)
Concentration risk: ${concentrationRisk}

Give: 1 specific action to take now, 1 risk to watch, 1 long-term suggestion.`,
        }],
      });
      aiAdvice = res.choices[0]?.message?.content?.trim();
    } catch { /* skip */ }

    return NextResponse.json({
      totalInvested,
      holdingsCount: holdings.length,
      riskProfile,
      currentAlloc,
      idealAlloc:  ideal,
      actions,
      diversificationScore: divScore,
      concentrationRisk,
      topConcentration,
      topHolding: topHolding ? { name: topHolding.name, symbol: topHolding.symbol, pct: topConcentration } : null,
      needsRebalancing: actions.some(a => a.urgent),
      aiAdvice,
    });
  } catch (err) {
    console.error("[ai/rebalance]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}