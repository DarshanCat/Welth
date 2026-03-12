import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── EMI maths ─────────────────────────────────────────────────────────────────
function calcEMI(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function totalInterest(principal, annualRate, months) {
  const emi = calcEMI(principal, annualRate, months);
  return emi * months - principal;
}

function prepaymentSavings(principal, annualRate, months, prepayAmt, afterMonth) {
  // Interest paid so far
  const r   = annualRate / 100 / 12;
  const emi = calcEMI(principal, annualRate, months);

  let balance = principal;
  for (let i = 0; i < afterMonth; i++) {
    const interest = balance * r;
    balance = balance - (emi - interest);
  }

  const newBalance   = Math.max(0, balance - prepayAmt);
  const newMonths    = newBalance > 0
    ? Math.ceil(Math.log(emi / (emi - newBalance * r)) / Math.log(1 + r))
    : 0;
  const oldRemaining = totalInterest(balance, annualRate, months - afterMonth);
  const newRemaining = newBalance > 0 ? totalInterest(newBalance, annualRate, newMonths) : 0;

  return {
    interestSaved:  Math.round(oldRemaining - newRemaining),
    monthsSaved:    (months - afterMonth) - newMonths,
    newBalance:     Math.round(newBalance),
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Fetch loans ───────────────────────────────────────────────────────────
    const loans = await db.loan.findMany({ where: { userId: user.id } });
    if (!loans.length) return NextResponse.json({ noLoans: true });

    // ── Fetch income for affordability ────────────────────────────────────────
    const transactions = await db.transaction.findMany({
      where: { userId: user.id, type: "INCOME" },
      orderBy: { date: "desc" },
      take: 90,
    });
    const monthlyIncome = transactions.reduce((s, t) => s + Number(t.amount), 0) / 3 || 0;

    // ── Analyse each loan ─────────────────────────────────────────────────────
    const loanAnalytics = loans.map(loan => {
      const p          = Number(loan.principal);
      const r          = Number(loan.interestRate);
      const n          = Number(loan.tenureMonths);
      const emi        = Math.round(calcEMI(p, r, n));
      const totalInt   = Math.round(totalInterest(p, r, n));
      const totalPay   = p + totalInt;
      const interestRatio = p > 0 ? (totalInt / p * 100).toFixed(1) : 0;

      // Suggest prepaying highest-rate loan with 3 months EMI as lump sum
      const prepay3M   = prepaymentSavings(p, r, n, emi * 3, 6);

      return {
        id:            loan.id,
        name:          loan.name || loan.loanType,
        type:          loan.loanType,
        principal:     p,
        rate:          r,
        months:        n,
        emi,
        totalInterest: totalInt,
        totalPayable:  totalPay,
        interestRatio,
        prepay3M,
        priority:      r, // higher rate = higher priority to pay off
      };
    });

    // ── Sort by rate (avalanche strategy) ─────────────────────────────────────
    const avalanche = [...loanAnalytics].sort((a, b) => b.rate - a.rate);
    const snowball  = [...loanAnalytics].sort((a, b) => a.principal - b.principal);

    const totalEMI        = loanAnalytics.reduce((s, l) => s + l.emi, 0);
    const totalInterestAll = loanAnalytics.reduce((s, l) => s + l.totalInterest, 0);
    const emiToIncomeRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome * 100).toFixed(1) : null;

    // ── AI Strategy ───────────────────────────────────────────────────────────
    let aiStrategy = null;
    try {
      const loanSummary = loanAnalytics.map(l =>
        `${l.name}: ₹${l.principal} at ${l.rate}% for ${l.months}m (EMI: ${fmt(l.emi)}, total interest: ${fmt(l.totalInterest)})`
      ).join("\n");

      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `You are a certified debt management advisor for India. Analyze these loans and give a specific repayment strategy in 100 words:

Loans:
${loanSummary}

Monthly Income: ${fmt(monthlyIncome)}
Total EMI burden: ${fmt(totalEMI)} (${emiToIncomeRatio}% of income)
Total interest payable: ${fmt(totalInterestAll)}

Give: 1 priority recommendation (avalanche vs snowball), 1 prepayment tip, 1 risk flag if EMI/income ratio is unhealthy. Be specific with numbers.`,
        }],
      });
      aiStrategy = res.choices[0]?.message?.content?.trim();
    } catch { /* skip */ }

    return NextResponse.json({
      loans: loanAnalytics,
      avalanche: avalanche.map(l => l.id),
      snowball:  snowball.map(l => l.id),
      summary: {
        totalEMI,
        totalInterestAll,
        monthlyIncome: Math.round(monthlyIncome),
        emiToIncomeRatio,
        healthStatus: emiToIncomeRatio
          ? parseFloat(emiToIncomeRatio) < 30 ? "healthy"
          : parseFloat(emiToIncomeRatio) < 50 ? "moderate" : "stressed"
          : "unknown",
      },
      aiStrategy,
    });
  } catch (err) {
    console.error("[ai/emi-advisor]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}