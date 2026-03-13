import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ── FY 2024-25 Tax Slabs ──────────────────────────────────────────────────────

// OLD REGIME slabs
function calcOldRegime(taxableIncome) {
  if (taxableIncome <= 250000)  return 0;
  if (taxableIncome <= 500000)  return (taxableIncome - 250000) * 0.05;
  if (taxableIncome <= 1000000) return 12500 + (taxableIncome - 500000) * 0.20;
  return 112500 + (taxableIncome - 1000000) * 0.30;
}

// NEW REGIME slabs (FY 2024-25 — revised in Budget 2024)
function calcNewRegime(taxableIncome) {
  if (taxableIncome <= 300000)  return 0;
  if (taxableIncome <= 700000)  return (taxableIncome - 300000) * 0.05;
  if (taxableIncome <= 1000000) return 20000 + (taxableIncome - 700000) * 0.10;
  if (taxableIncome <= 1200000) return 50000 + (taxableIncome - 1000000) * 0.15;
  if (taxableIncome <= 1500000) return 80000 + (taxableIncome - 1200000) * 0.20;
  return 140000 + (taxableIncome - 1500000) * 0.30;
}

// Surcharge
function calcSurcharge(tax, grossIncome, regime) {
  if (grossIncome <= 5000000)  return 0;
  if (grossIncome <= 10000000) return tax * 0.10;
  if (grossIncome <= 20000000) return tax * 0.15;
  if (grossIncome <= 50000000) return tax * 0.25;
  return tax * (regime === "new" ? 0.25 : 0.37);
}

// Health & Education Cess (4%)
function addCess(taxPlusSurcharge) {
  return taxPlusSurcharge * 0.04;
}

// Marginal Relief for 87A rebate boundary
function apply87ARebate(tax, taxableIncome, regime) {
  // Old regime: rebate up to ₹12,500 if taxable income ≤ ₹5L
  if (regime === "old" && taxableIncome <= 500000) return Math.max(0, tax - 12500);
  // New regime: rebate up to ₹25,000 if taxable income ≤ ₹7L
  if (regime === "new" && taxableIncome <= 700000) return Math.max(0, tax - 25000);
  return tax;
}

// ── Full tax calculation ──────────────────────────────────────────────────────
function calculateTax(grossIncome, deductions, regime) {
  const totalDeductions = regime === "old"
    ? Math.min(deductions.total, grossIncome * 0.9) // can't deduct more than 90%
    : 75000; // New regime: only standard deduction ₹75,000 (Budget 2024)

  const taxableIncome = Math.max(0, grossIncome - totalDeductions);
  const basicTax      = regime === "old"
    ? calcOldRegime(taxableIncome)
    : calcNewRegime(taxableIncome);

  const taxAfterRebate = apply87ARebate(basicTax, taxableIncome, regime);
  const surcharge      = calcSurcharge(taxAfterRebate, grossIncome, regime);
  const cess           = addCess(taxAfterRebate + surcharge);
  const totalTax       = Math.round(taxAfterRebate + surcharge + cess);
  const effectiveRate  = grossIncome > 0 ? +((totalTax / grossIncome) * 100).toFixed(2) : 0;
  const monthlyTDS     = Math.round(totalTax / 12);

  return { taxableIncome, basicTax: Math.round(basicTax), taxAfterRebate: Math.round(taxAfterRebate), surcharge: Math.round(surcharge), cess: Math.round(cess), totalTax, effectiveRate, monthlyTDS, totalDeductions: Math.round(totalDeductions) };
}

// ── Deduction limits (FY 2024-25) ────────────────────────────────────────────
const DEDUCTION_LIMITS = {
  sec80C:            150000,  // PPF, ELSS, LIC, EPF, home loan principal etc.
  sec80D_self:       25000,   // Health insurance self + family (< 60 yrs)
  sec80D_self_sr:    50000,   // Health insurance self (senior citizen)
  sec80D_parents:    25000,   // Health insurance parents (< 60 yrs)
  sec80D_parents_sr: 50000,   // Health insurance parents (senior citizen)
  sec80CCD1B:        50000,   // Additional NPS contribution
  sec80E:            null,    // Education loan interest (no limit)
  sec80G:            null,    // Donations (50% or 100% depending on org)
  sec80TTA:          10000,   // Savings account interest
  sec80TTB:          50000,   // Sr citizen bank interest
  hra:               null,    // Calculated separately
  standardDeduction: 50000,   // Old regime standard deduction
  homeLoanInterest:  200000,  // Sec 24(b) — self-occupied property
};

// ── HRA Calculation ───────────────────────────────────────────────────────────
function calcHRAExemption({ basicSalary, hraReceived, rentPaid, isMetro }) {
  if (!rentPaid || !hraReceived) return 0;
  const a = hraReceived;
  const b = rentPaid - basicSalary * 0.10;
  const c = basicSalary * (isMetro ? 0.50 : 0.40);
  return Math.max(0, Math.min(a, Math.max(0, b), c));
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const {
      // Income
      basicSalary       = 0,
      hra               = 0,
      specialAllowance  = 0,
      otherIncome       = 0,
      // Rent
      rentPaid          = 0,
      isMetro           = false,
      // 80C components
      epfContribution   = 0,
      ppfContribution   = 0,
      elssInvestment    = 0,
      licPremium        = 0,
      homeLoanPrincipal = 0,
      nscInvestment     = 0,
      tuitionFees       = 0,
      // Other deductions
      healthInsuranceSelf    = 0,
      healthInsuranceParents = 0,
      parentsSeniorCitizen   = false,
      selfSeniorCitizen      = false,
      npsContribution        = 0,  // Additional 80CCD(1B)
      educationLoanInterest  = 0,  // 80E
      homeLoanInterest       = 0,  // Sec 24(b)
      savingsInterest        = 0,  // 80TTA/TTB
      donations              = 0,  // 80G (50% eligible)
    } = body;

    // ── Gross income ─────────────────────────────────────────────────────────
    const grossIncome = basicSalary + hra + specialAllowance + otherIncome;

    // ── HRA exemption ─────────────────────────────────────────────────────────
    const hraExemption = calcHRAExemption({
      basicSalary,
      hraReceived: hra,
      rentPaid,
      isMetro,
    });

    // ── 80C total (capped at 1.5L) ────────────────────────────────────────────
    const raw80C = epfContribution + ppfContribution + elssInvestment +
                   licPremium + homeLoanPrincipal + nscInvestment + tuitionFees;
    const sec80C = Math.min(raw80C, DEDUCTION_LIMITS.sec80C);

    // ── 80D ───────────────────────────────────────────────────────────────────
    const selfLimit    = selfSeniorCitizen ? DEDUCTION_LIMITS.sec80D_self_sr : DEDUCTION_LIMITS.sec80D_self;
    const parentsLimit = parentsSeniorCitizen ? DEDUCTION_LIMITS.sec80D_parents_sr : DEDUCTION_LIMITS.sec80D_parents;
    const sec80D       = Math.min(healthInsuranceSelf, selfLimit) + Math.min(healthInsuranceParents, parentsLimit);

    // ── Other deductions ──────────────────────────────────────────────────────
    const sec80CCD1B = Math.min(npsContribution, DEDUCTION_LIMITS.sec80CCD1B);
    const sec80E     = educationLoanInterest; // No limit
    const sec24b     = Math.min(homeLoanInterest, DEDUCTION_LIMITS.homeLoanInterest);
    const sec80TTA   = selfSeniorCitizen
      ? Math.min(savingsInterest, DEDUCTION_LIMITS.sec80TTB)
      : Math.min(savingsInterest, DEDUCTION_LIMITS.sec80TTA);
    const sec80G     = Math.round(donations * 0.5); // 50% of eligible donations

    // ── Old regime total deductions ───────────────────────────────────────────
    const totalOldDeductions = DEDUCTION_LIMITS.standardDeduction +
      hraExemption + sec80C + sec80D + sec80CCD1B +
      sec80E + sec24b + sec80TTA + sec80G;

    const deductionBreakdown = {
      standardDeduction: DEDUCTION_LIMITS.standardDeduction,
      hraExemption:      Math.round(hraExemption),
      sec80C:            Math.round(sec80C),
      sec80D:            Math.round(sec80D),
      sec80CCD1B:        Math.round(sec80CCD1B),
      sec80E:            Math.round(sec80E),
      sec24b:            Math.round(sec24b),
      sec80TTA:          Math.round(sec80TTA),
      sec80G:            Math.round(sec80G),
      total:             Math.round(totalOldDeductions),
    };

    // ── Calculate both regimes ────────────────────────────────────────────────
    const oldRegime = calculateTax(grossIncome, { total: totalOldDeductions }, "old");
    const newRegime = calculateTax(grossIncome, {}, "new");

    const savings        = oldRegime.totalTax - newRegime.totalTax;
    const betterRegime   = savings > 0 ? "new" : savings < 0 ? "old" : "equal";
    const savingsAbs     = Math.abs(savings);

    // ── Unused deduction capacity (how much more user can invest in 80C etc.) ─
    const unused80C      = Math.max(0, DEDUCTION_LIMITS.sec80C - raw80C);
    const unusedNPS      = Math.max(0, DEDUCTION_LIMITS.sec80CCD1B - sec80CCD1B);
    const unusedHealth80D= Math.max(0, selfLimit - Math.min(healthInsuranceSelf, selfLimit));

    const optimisationTips = [];
    if (unused80C > 0)       optimisationTips.push({ section: "80C", potential: fmt(unused80C), tip: `Invest ${fmt(unused80C)} more in ELSS, PPF, or NPS to fully utilise 80C limit` });
    if (unusedNPS > 0)       optimisationTips.push({ section: "80CCD(1B)", potential: fmt(unusedNPS), tip: `Add ${fmt(unusedNPS)} more to NPS Tier 1 — exclusive deduction over 80C` });
    if (unusedHealth80D > 0) optimisationTips.push({ section: "80D", potential: fmt(unusedHealth80D), tip: `Pay ${fmt(unusedHealth80D)} more in health insurance premium to max out 80D` });
    if (!rentPaid && grossIncome > 500000) optimisationTips.push({ section: "HRA", potential: "Variable", tip: "If you pay rent, claim HRA exemption — could save significantly" });

    // ── AI Personalised advice ────────────────────────────────────────────────
    let aiAdvice = null;
    try {
      const res = await groq.chat.completions.create({
        model:      "llama-3.3-70b-versatile",
        max_tokens: 400,
        messages: [{
          role: "user",
          content: `You are CA Arjun, a senior Chartered Accountant. Give personalised Indian tax planning advice for FY 2024-25.

CLIENT TAX SUMMARY:
- Gross Annual Income: ${fmt(grossIncome)}
- Old Regime Tax: ${fmt(oldRegime.totalTax)} (effective rate: ${oldRegime.effectiveRate}%)
- New Regime Tax: ${fmt(newRegime.totalTax)} (effective rate: ${newRegime.effectiveRate}%)
- Better Regime: ${betterRegime.toUpperCase()} (saves ${fmt(savingsAbs)})
- Current 80C used: ${fmt(raw80C)} / ${fmt(DEDUCTION_LIMITS.sec80C)} (unused: ${fmt(unused80C)})
- HRA exemption claimed: ${fmt(hraExemption)}
- Health insurance deduction: ${fmt(sec80D)}
- NPS additional deduction: ${fmt(sec80CCD1B)}
- Home loan interest: ${fmt(sec24b)}
- Total deductions (old regime): ${fmt(totalOldDeductions)}

Give 3 specific, actionable tax-saving recommendations in 120 words. Focus on:
1. Whether to choose old or new regime with specific reasoning
2. Top 1-2 unused deduction opportunities with exact ₹ amounts
3. One investment suggestion for tax saving

Be direct, use their actual numbers, end with "— CA Arjun"`,
        }],
      });
      aiAdvice = res.choices[0]?.message?.content?.trim();
    } catch { /* skip */ }

    // ── Auto-fetch income from DB if available ────────────────────────────────
    let autoIncome = null;
    try {
      const user = await db.user.findUnique({ where: { clerkUserId: userId } });
      if (user) {
        const since = new Date();
        since.setMonth(since.getMonth() - 3);
        const txns = await db.transaction.findMany({
          where: { userId: user.id, type: "INCOME", date: { gte: since } },
        });
        const monthlyAvg = txns.reduce((s, t) => s + Number(t.amount), 0) / 3;
        autoIncome = Math.round(monthlyAvg * 12);
      }
    } catch { /* skip */ }

    return NextResponse.json({
      grossIncome,
      oldRegime,
      newRegime,
      deductions:      deductionBreakdown,
      betterRegime,
      savings,
      savingsAbs,
      optimisationTips,
      aiAdvice,
      autoIncome,
      fy:              "2024-25",
      limits:          DEDUCTION_LIMITS,
    });
  } catch (err) {
    console.error("[tax]", err);
    return NextResponse.json({ error: "Tax calculation failed" }, { status: 500 });
  }
}

// GET — returns auto-detected income from transactions
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ autoIncome: null });

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const txns = await db.transaction.findMany({
      where: { userId: user.id, type: "INCOME", date: { gte: since } },
    });

    const monthlyAvg  = txns.length > 0
      ? txns.reduce((s, t) => s + Number(t.amount), 0) / 3
      : 0;
    const annualIncome = Math.round(monthlyAvg * 12);

    return NextResponse.json({ autoIncome: annualIncome, monthlyAvg: Math.round(monthlyAvg) });
  } catch (err) {
    return NextResponse.json({ autoIncome: null });
  }
}