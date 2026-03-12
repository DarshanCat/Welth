import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Historical return assumptions (CAGR %) ────────────────────────────────────
const ASSET_RETURNS = {
  STOCK:       { bear: -8,  base: 12,  bull: 22,  volatility: 18 },
  MUTUAL_FUND: { bear: -3,  base: 11,  bull: 18,  volatility: 12 },
  ETF:         { bear: -5,  base: 10,  bull: 16,  volatility: 13 },
};

// ── Monte Carlo single simulation ─────────────────────────────────────────────
function simulatePath(principal, annualReturnPct, volatilityPct, years) {
  let value = principal;
  const monthlyReturn   = annualReturnPct / 100 / 12;
  const monthlyVol      = volatilityPct / 100 / Math.sqrt(12);
  const path = [principal];

  for (let m = 0; m < years * 12; m++) {
    // Box-Muller transform for Gaussian noise
    const u1    = Math.random(), u2 = Math.random();
    const noise = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    value *= (1 + monthlyReturn + monthlyVol * noise);
    value  = Math.max(0, value);
    if ((m + 1) % 12 === 0) path.push(Math.round(value));
  }
  return path;
}

// ── Run N simulations and extract percentiles ─────────────────────────────────
function monteCarlo(principal, annualReturnPct, volatilityPct, years, runs = 500) {
  const finalValues = [];
  const paths = [];
  for (let i = 0; i < runs; i++) {
    const p = simulatePath(principal, annualReturnPct, volatilityPct, years);
    finalValues.push(p.at(-1));
    if (i < 20) paths.push(p); // store first 20 paths for chart
  }
  finalValues.sort((a, b) => a - b);
  return {
    p10:    finalValues[Math.floor(runs * 0.10)],
    p25:    finalValues[Math.floor(runs * 0.25)],
    median: finalValues[Math.floor(runs * 0.50)],
    p75:    finalValues[Math.floor(runs * 0.75)],
    p90:    finalValues[Math.floor(runs * 0.90)],
    paths,
  };
}

// ── Compound growth (deterministic) ──────────────────────────────────────────
function compoundGrowth(principal, annualRatePct, years) {
  return Math.round(principal * Math.pow(1 + annualRatePct / 100, years));
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Fetch holdings ─────────────────────────────────────────────────────────
    let holdings = [];
    try {
      holdings = await db.holding.findMany({ where: { userId: user.id } });
    } catch { /* table might not exist yet */ }

    if (!holdings.length) {
      return NextResponse.json({ error: "No holdings", noHoldings: true });
    }

    const totalInvested = holdings.reduce((s, h) => s + Number(h.investedAmt), 0);

    // ── Asset class breakdown ─────────────────────────────────────────────────
    const byType = { STOCK: 0, MUTUAL_FUND: 0, ETF: 0 };
    holdings.forEach(h => { byType[h.type] = (byType[h.type] || 0) + Number(h.investedAmt); });

    // ── Weighted portfolio return assumptions ─────────────────────────────────
    let wBear = 0, wBase = 0, wBull = 0, wVol = 0;
    Object.entries(byType).forEach(([type, amt]) => {
      const wt = totalInvested > 0 ? amt / totalInvested : 0;
      const r  = ASSET_RETURNS[type] || ASSET_RETURNS.STOCK;
      wBear += wt * r.bear; wBase += wt * r.base;
      wBull += wt * r.bull; wVol  += wt * r.volatility;
    });

    // ── Scenario projections (1, 3, 5, 10 years) ─────────────────────────────
    const horizons = [1, 3, 5, 10];
    const scenarios = horizons.map(years => ({
      years,
      bear:   compoundGrowth(totalInvested, wBear, years),
      base:   compoundGrowth(totalInvested, wBase, years),
      bull:   compoundGrowth(totalInvested, wBull, years),
      bearGain: compoundGrowth(totalInvested, wBear, years) - totalInvested,
      baseGain: compoundGrowth(totalInvested, wBase, years) - totalInvested,
      bullGain: compoundGrowth(totalInvested, wBull, years) - totalInvested,
    }));

    // ── Monte Carlo for 5-year horizon ────────────────────────────────────────
    const mc5 = monteCarlo(totalInvested, wBase, wVol, 5);

    // ── Per-holding 1Y projection ─────────────────────────────────────────────
    const holdingProjections = holdings.slice(0, 8).map(h => {
      const r    = ASSET_RETURNS[h.type] || ASSET_RETURNS.STOCK;
      const inv  = Number(h.investedAmt);
      return {
        symbol: h.symbol,
        name:   h.name,
        type:   h.type,
        invested: inv,
        proj1Y_bear: compoundGrowth(inv, r.bear, 1),
        proj1Y_base: compoundGrowth(inv, r.base, 1),
        proj1Y_bull: compoundGrowth(inv, r.bull, 1),
      };
    });

    // ── SIP projection (if they invest 10k/month for 10 years at base rate) ──
    const sipMonthly = 10000;
    const sipMonths  = 120;
    const sipRate    = wBase / 100 / 12;
    const sipFV      = sipMonthly * ((Math.pow(1 + sipRate, sipMonths) - 1) / sipRate) * (1 + sipRate);
    const sipInvested = sipMonthly * sipMonths;

    // ── Chart data: 5-year annual projection ──────────────────────────────────
    const chartData = [
      { year: "Now", bear: totalInvested, base: totalInvested, bull: totalInvested },
      ...horizons.map(y => ({ year: `${y}Y`, ...scenarios.find(s => s.years === y) ? {
        bear: scenarios.find(s => s.years === y).bear,
        base: scenarios.find(s => s.years === y).base,
        bull: scenarios.find(s => s.years === y).bull,
      } : {} })),
    ];

    // ── AI Investment Analysis ────────────────────────────────────────────────
    let aiInsight = null;
    try {
      const stockCount = holdings.filter(h => h.type === "STOCK").length;
      const mfCount    = holdings.filter(h => h.type === "MUTUAL_FUND").length;
      const topHolding = holdings.sort((a, b) => Number(b.investedAmt) - Number(a.investedAmt))[0];

      const aiRes = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are a SEBI-registered investment advisor AI for Indian markets. Analyze this portfolio and give 3 specific insights in 100 words max:
Portfolio: ${fmt(totalInvested)} total invested
Mix: ${stockCount} stocks, ${mfCount} mutual funds
Projected 5Y value (base case): ${fmt(scenarios.find(s=>s.years===5)?.base)}
Largest holding: ${topHolding?.name} (${fmt(Number(topHolding?.investedAmt))})
Weighted expected CAGR: ${wBase.toFixed(1)}%
Monte Carlo median (5Y): ${fmt(mc5.median)}

Give: 1 diversification tip, 1 risk observation, 1 actionable step. Keep it specific to these numbers.`,
        }],
      });
      aiInsight = aiRes.choices[0]?.message?.content?.trim();
    } catch { /* AI offline */ }

    return NextResponse.json({
      totalInvested,
      holdingsCount: holdings.length,
      byType,
      weightedReturns: { bear: +wBear.toFixed(1), base: +wBase.toFixed(1), bull: +wBull.toFixed(1) },
      scenarios,
      monteCarlo5Y: {
        p10:    mc5.p10,
        p25:    mc5.p25,
        median: mc5.median,
        p75:    mc5.p75,
        p90:    mc5.p90,
      },
      sipProjection: { monthly: sipMonthly, invested: sipInvested, finalValue: Math.round(sipFV), gain: Math.round(sipFV - sipInvested) },
      holdingProjections,
      chartData,
      aiInsight,
    });
  } catch (err) {
    console.error("[predict/investments]", err);
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}