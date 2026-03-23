import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ── Fund recommendations by risk profile ──────────────────────────────────────
const FUND_RECOMMENDATIONS = {
  conservative: [
    { name: "SBI Magnum Gilt Fund",        category: "Gilt",          minReturn: 6,  maxReturn: 8,  risk: "Low",    why: "Government securities — zero credit risk" },
    { name: "HDFC Short Duration Fund",     category: "Debt",          minReturn: 6,  maxReturn: 7.5,risk: "Low",    why: "Short-term bonds, stable returns" },
    { name: "Nippon India Liquid Fund",     category: "Liquid",        minReturn: 5.5,maxReturn: 6.5,risk: "Low",    why: "Park emergency fund, instant redemption" },
    { name: "ICICI Pru Balanced Advantage", category: "Hybrid",        minReturn: 9,  maxReturn: 12, risk: "Low-Med",why: "Dynamic equity-debt allocation" },
    { name: "Axis AAA Bond Fund",           category: "Debt",          minReturn: 6,  maxReturn: 7,  risk: "Low",    why: "AAA-rated corporate bonds, safe" },
  ],
  moderate: [
    { name: "Mirae Asset Large Cap Fund",   category: "Large Cap",     minReturn: 11, maxReturn: 15, risk: "Medium", why: "Blue-chip companies, consistent performer" },
    { name: "Parag Parikh Flexi Cap Fund",  category: "Flexi Cap",     minReturn: 13, maxReturn: 18, risk: "Medium", why: "Global diversification, low churn" },
    { name: "HDFC Balanced Advantage Fund", category: "Hybrid",        minReturn: 10, maxReturn: 14, risk: "Medium", why: "Auto-balances equity/debt dynamically" },
    { name: "Axis Bluechip Fund",           category: "Large Cap",     minReturn: 11, maxReturn: 15, risk: "Medium", why: "Quality large-cap stocks, low volatility" },
    { name: "Kotak Flexi Cap Fund",         category: "Flexi Cap",     minReturn: 12, maxReturn: 16, risk: "Medium", why: "Diversified across market caps" },
    { name: "SBI Nifty 50 Index Fund",      category: "Index",         minReturn: 10, maxReturn: 14, risk: "Medium", why: "Passive, low cost, market returns" },
  ],
  aggressive: [
    { name: "Nippon India Small Cap Fund",  category: "Small Cap",     minReturn: 15, maxReturn: 25, risk: "High",   why: "High growth potential, long-term wealth" },
    { name: "Quant Mid Cap Fund",           category: "Mid Cap",       minReturn: 14, maxReturn: 22, risk: "High",   why: "Strong mid-cap performer, quant-based" },
    { name: "HDFC Mid-Cap Opportunities",   category: "Mid Cap",       minReturn: 13, maxReturn: 20, risk: "High",   why: "Consistent mid-cap fund, 15+ yr track record" },
    { name: "SBI Small Cap Fund",           category: "Small Cap",     minReturn: 15, maxReturn: 24, risk: "High",   why: "Top small-cap performer, disciplined approach" },
    { name: "Motilal Oswal Midcap Fund",    category: "Mid Cap",       minReturn: 14, maxReturn: 22, risk: "High",   why: "Concentrated high-conviction portfolio" },
    { name: "Quant Small Cap Fund",         category: "Small Cap",     minReturn: 16, maxReturn: 28, risk: "Very High","why": "Aggressive small-cap, highest return potential" },
  ],
};

// ── SIP Future Value ──────────────────────────────────────────────────────────
function sipFV(monthly, annualRate, years) {
  if (annualRate === 0) return monthly * years * 12;
  const r  = annualRate / 100 / 12;
  const n  = years * 12;
  return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

// ── Step-up SIP (annual increase) ────────────────────────────────────────────
function stepUpSipFV(monthlyStart, annualRate, years, stepUpPct) {
  const monthlyR = annualRate / 100 / 12;
  let corpus     = 0;
  let monthly    = monthlyStart;
  let totalInvested = 0;
  const yearlyData  = [];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      corpus        = (corpus + monthly) * (1 + monthlyR);
      totalInvested += monthly;
    }
    yearlyData.push({
      year:      y,
      corpus:    Math.round(corpus),
      invested:  Math.round(totalInvested),
      gains:     Math.round(corpus - totalInvested),
      monthly:   Math.round(monthly),
    });
    monthly *= (1 + stepUpPct / 100); // increase at year end
  }

  return { finalCorpus: Math.round(corpus), totalInvested: Math.round(totalInvested), yearlyData };
}

// ── Lumpsum FV ────────────────────────────────────────────────────────────────
function lumpsumFV(principal, annualRate, years) {
  return Math.round(principal * Math.pow(1 + annualRate / 100, years));
}

// ── Goal SIP — how much to invest monthly to reach target ────────────────────
function goalSip(targetAmount, annualRate, years) {
  if (annualRate === 0) return Math.ceil(targetAmount / (years * 12));
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return Math.ceil(targetAmount / (((Math.pow(1 + r, n) - 1) / r) * (1 + r)));
}

// ── Year-by-year chart data ───────────────────────────────────────────────────
function buildYearlyChart(monthly, annualRate, years) {
  const r = annualRate / 100 / 12;
  const data = [{ year: 0, corpus: 0, invested: 0, gains: 0 }];
  let corpus = 0, invested = 0;

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      corpus  = (corpus + monthly) * (1 + r);
      invested += monthly;
    }
    data.push({
      year:    y,
      corpus:  Math.round(corpus),
      invested: Math.round(invested),
      gains:   Math.round(corpus - invested),
    });
  }
  return data;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      monthlyAmount  = 5000,
      expectedReturn = 12,      // % per annum
      tenure         = 10,      // years
      stepUpPercent  = 0,       // annual step-up %
      lumpsumAmount  = 0,       // one-time investment
      goalAmount     = 0,       // target corpus
      riskProfile    = "moderate",
    } = await req.json();

    // ── Core SIP calculation ──────────────────────────────────────────────────
    const sipResult    = sipFV(monthlyAmount, expectedReturn, tenure);
    const sipInvested  = monthlyAmount * tenure * 12;
    const sipGains     = sipResult - sipInvested;
    const wealthRatio  = sipResult / sipInvested;
    const absReturn    = ((sipResult - sipInvested) / sipInvested) * 100;

    // ── Step-up SIP ───────────────────────────────────────────────────────────
    const stepUp = stepUpSipFV(monthlyAmount, expectedReturn, tenure, stepUpPercent || 10);

    // ── Lumpsum comparison ────────────────────────────────────────────────────
    const lumpsumEquiv    = lumpsumAmount || sipInvested; // compare equal investment
    const lumpsumResult   = lumpsumFV(lumpsumEquiv, expectedReturn, tenure);
    const sipVsLumpsum    = sipResult - lumpsumResult;

    // ── Goal-based SIP ────────────────────────────────────────────────────────
    const goalMonthly = goalAmount
      ? goalSip(goalAmount, expectedReturn, tenure)
      : goalSip(10000000, expectedReturn, tenure); // default: ₹1 crore goal

    // ── Year-by-year chart ────────────────────────────────────────────────────
    const yearlyChart = buildYearlyChart(monthlyAmount, expectedReturn, Math.min(tenure, 30));

    // ── Multiple return scenarios ─────────────────────────────────────────────
    const scenarios = [6, 8, 10, 12, 15, 18].map(rate => ({
      rate,
      label: rate <= 7 ? "Conservative" : rate <= 10 ? "Moderate" : rate <= 13 ? "Aggressive" : "Very Aggressive",
      finalValue:   Math.round(sipFV(monthlyAmount, rate, tenure)),
      totalInvested: sipInvested,
      gains:         Math.round(sipFV(monthlyAmount, rate, tenure) - sipInvested),
    }));

    // ── Fund recommendations ──────────────────────────────────────────────────
    const funds = FUND_RECOMMENDATIONS[riskProfile] || FUND_RECOMMENDATIONS.moderate;

    // ── AI Insight ────────────────────────────────────────────────────────────
    let aiInsight = null;
    try {
      const res = await groq.chat.completions.create({
        model:      "llama-3.1-8b-instant",
        max_tokens: 250,
        messages: [{
          role: "user",
          content: `You are CA Arjun, a SEBI-registered investment advisor. Give personalised SIP advice for an Indian investor.

SIP DETAILS:
- Monthly SIP: ${fmt(monthlyAmount)}
- Expected Return: ${expectedReturn}% p.a.
- Tenure: ${tenure} years
- Total Invested: ${fmt(sipInvested)}
- Projected Corpus: ${fmt(Math.round(sipResult))}
- Total Gains: ${fmt(Math.round(sipGains))}
- Wealth Ratio: ${wealthRatio.toFixed(2)}x
- Risk Profile: ${riskProfile}
- Step-up SIP (10% annual increase) would give: ${fmt(stepUp.finalCorpus)}
- Extra gain from step-up: ${fmt(stepUp.finalCorpus - Math.round(sipResult))}

Give 3 specific actionable insights in 80 words:
1. Is this SIP amount adequate given the tenure?
2. Should they consider step-up SIP? (mention exact extra gain)
3. One fund category to focus on for their risk profile
End with "— CA Arjun"`,
        }],
      });
      aiInsight = res.choices[0]?.message?.content?.trim();
    } catch { /* skip */ }

    return NextResponse.json({
      input: { monthlyAmount, expectedReturn, tenure, stepUpPercent, riskProfile },

      // Core results
      sipResult:    Math.round(sipResult),
      sipInvested,
      sipGains:     Math.round(sipGains),
      wealthRatio:  +wealthRatio.toFixed(2),
      absReturn:    +absReturn.toFixed(1),
      xirr:         expectedReturn, // simplified

      // Step-up
      stepUp,

      // Lumpsum
      lumpsum: {
        invested:    lumpsumEquiv,
        finalValue:  lumpsumResult,
        gains:       lumpsumResult - lumpsumEquiv,
        vsRegularSip: sipVsLumpsum,
      },

      // Goal-based
      goalPlanning: {
        targetAmount: goalAmount || 10000000,
        requiredMonthly: goalMonthly,
        atCurrentSip: Math.round(sipResult),
        shortfall: goalAmount ? Math.max(0, goalAmount - Math.round(sipResult)) : 0,
      },

      // Charts
      yearlyChart,
      scenarios,

      // Recommendations
      recommendedFunds: funds,

      // AI
      aiInsight,
    });
  } catch (err) {
    console.error("[sip]", err);
    return NextResponse.json({ error: "SIP calculation failed" }, { status: 500 });
  }
}