import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const INDIAN_ASSETS = {
  "Liquid Fund / FD":        { cagr: 6.5,  risk: "Low",      color: "#60a5fa", icon: "💧" },
  "Large Cap Index Fund":    { cagr: 12.0, risk: "Medium",   color: "#34d399", icon: "📊" },
  "Mid Cap Fund":            { cagr: 15.0, risk: "Med-High", color: "#fbbf24", icon: "📈" },
  "Small Cap Fund":          { cagr: 18.0, risk: "High",     color: "#f97316", icon: "🚀" },
  "ELSS (Tax Saving)":       { cagr: 13.0, risk: "Medium",   color: "#a78bfa", icon: "🛡️" },
  "Debt / Bond Fund":        { cagr: 7.5,  risk: "Low",      color: "#06b6d4", icon: "🏦" },
  "Gold ETF":                { cagr: 8.0,  risk: "Medium",   color: "#fbbf24", icon: "🥇" },
  "US / International Fund": { cagr: 11.0, risk: "Med-High", color: "#f472b6", icon: "🌍" },
  "REITs / InvITs":          { cagr: 9.0,  risk: "Medium",   color: "#10b981", icon: "🏢" },
  "PPF / NPS":               { cagr: 7.5,  risk: "Low",      color: "#8b5cf6", icon: "📋" },
};

function getAllocation(riskScore, hasEmergency, taxBracket) {
  let alloc = {};
  if (riskScore <= 3) {
    alloc = { "Liquid Fund / FD": hasEmergency ? 10 : 25, "Debt / Bond Fund": 30, "PPF / NPS": 20, "Large Cap Index Fund": 15, "Gold ETF": 10 };
  } else if (riskScore <= 5) {
    alloc = { "Large Cap Index Fund": 30, "ELSS (Tax Saving)": taxBracket >= 0.20 ? 15 : 5, "Mid Cap Fund": 15, "Debt / Bond Fund": 20, "Gold ETF": 5, "PPF / NPS": 10, "Liquid Fund / FD": hasEmergency ? 0 : 5 };
  } else if (riskScore <= 7) {
    alloc = { "Large Cap Index Fund": 25, "Mid Cap Fund": 20, "ELSS (Tax Saving)": taxBracket >= 0.20 ? 15 : 5, "Small Cap Fund": 10, "US / International Fund": 10, "Gold ETF": 5, "Debt / Bond Fund": 10, "PPF / NPS": 5 };
  } else {
    alloc = { "Large Cap Index Fund": 20, "Mid Cap Fund": 25, "Small Cap Fund": 20, "US / International Fund": 15, "ELSS (Tax Saving)": taxBracket >= 0.20 ? 10 : 5, "Gold ETF": 5, "REITs / InvITs": 5 };
  }
  const total = Object.values(alloc).reduce((s, v) => s + v, 0);
  return Object.fromEntries(Object.entries(alloc).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.round((v / total) * 1000) / 10]));
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { monthly_income = 0, monthly_expenses = 0, investment_amount = 100000, monthly_sip = 5000,
            risk_score = 5, investment_horizon = 10, age = 28, existing_emis = 0,
            has_emergency_fund = false, tax_bracket = 0.30 } = await req.json();

    const income      = Math.max(monthly_income, 1);
    const savings     = Math.max(income - monthly_expenses - existing_emis, 0);
    const savingsRate = (savings / income) * 100;
    const RISK_LABELS = ["","Very Low","Low","Low-Med","Moderate","Moderate","Med-High","Med-High","High","High","Very High"];
    const riskLabel   = RISK_LABELS[Math.min(Math.max(risk_score, 1), 10)];

    const emergencyNeeded = income * 6;
    const allocation      = getAllocation(risk_score, has_emergency_fund, tax_bracket);

    const portfolioItems = [];
    let   totalProjected = 0;

    for (const [assetName, pct] of Object.entries(allocation)) {
      const meta        = INDIAN_ASSETS[assetName] || { cagr: 10, risk: "Medium", color: "#64748b", icon: "💰" };
      const cagr        = meta.cagr / 100;
      const allocAmt    = investment_amount * (pct / 100);
      const monthlyAlloc= monthly_sip * (pct / 100);
      const lumpFV      = allocAmt * Math.pow(1 + cagr, investment_horizon);
      const mr          = cagr / 12;
      const n           = investment_horizon * 12;
      const sipFV       = mr > 0 && monthlyAlloc > 0 ? monthlyAlloc * (((Math.pow(1 + mr, n) - 1) / mr) * (1 + mr)) : 0;
      const fv          = lumpFV + sipFV;
      totalProjected   += fv;
      portfolioItems.push({ asset: assetName, allocation: pct, amount: Math.round(allocAmt),
        monthlySIP: Math.round(monthlyAlloc), projectedFV: Math.round(fv),
        cagr: meta.cagr, risk: meta.risk, color: meta.color, icon: meta.icon });
    }

    const taxTips = [];
    if (tax_bracket >= 0.20) {
      const elss = portfolioItems.find(i => i.asset.includes("ELSS"));
      if (elss) taxTips.push(`ELSS saves up to ${fmt(Math.min(elss.amount, 150000) * tax_bracket)} in income tax (Section 80C)`);
    }
    if (investment_horizon >= 3) taxTips.push("Hold equity > 1 year for LTCG at 10% vs 15% STCG");

    let aiInsight = null;
    try {
      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", max_tokens: 120,
        messages: [{ role: "user", content: `CA Arjun: 2 tips for age ${age}, ${riskLabel} risk, invest ${fmt(investment_amount)} + SIP ${fmt(monthly_sip)}/mo for ${investment_horizon}yrs. 50 words max. End "— CA Arjun"` }],
      });
      aiInsight = res.choices[0]?.message?.content?.trim();
    } catch { /* offline */ }

    return NextResponse.json({
      riskScore: risk_score, riskLabel, investmentAmount: investment_amount, monthlySIP: monthly_sip,
      horizon: investment_horizon, savingsRate: Math.round(savingsRate * 10) / 10,
      emergencyFund: { hasEmergencyFund: has_emergency_fund, recommended: Math.round(emergencyNeeded),
        status: has_emergency_fund ? "✅ Adequate" : `❌ Build ${fmt(emergencyNeeded)} first` },
      allocation: portfolioItems, totalProjected: Math.round(totalProjected),
      totalInvested: Math.round(investment_amount + monthly_sip * 12 * investment_horizon),
      rebalanceSignals: portfolioItems.filter(i => i.allocation > 40).map(i => `⚠ ${i.asset} over-concentrated at ${i.allocation}%`),
      taxTips, aiInsight, model: "Welth RoboAdvisor v2 (self-contained, no ML service needed)",
    });
  } catch (err) {
    console.error("[robo-advisor]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({});
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({});
    const since = new Date(); since.setMonth(since.getMonth() - 3);
    const txns = await db.transaction.findMany({ where: { userId: user.id, date: { gte: since } } });
    const income   = txns.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0) / 3;
    const expenses = txns.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0) / 3;
    return NextResponse.json({ monthly_income: Math.round(income), monthly_expenses: Math.round(expenses), existing_emis: 0 });
  } catch { return NextResponse.json({}); }
}