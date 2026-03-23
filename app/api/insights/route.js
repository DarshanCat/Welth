import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function groupByMonth(transactions) {
  const map = {};
  for (const t of transactions) {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = { income: 0, expense: 0, categories: {}, days: {} };
    if (t.type === "INCOME")  map[key].income  += Number(t.amount);
    if (t.type === "EXPENSE") {
      map[key].expense += Number(t.amount);
      const cat = t.category || "Other";
      map[key].categories[cat] = (map[key].categories[cat] || 0) + Number(t.amount);
      const day = d.getDate();
      map[key].days[day] = (map[key].days[day] || 0) + Number(t.amount);
    }
  }
  return map;
}

function getLastNMonths(byMonth, n) {
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-n);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SALARY DEPLETION TRACKER
// ─────────────────────────────────────────────────────────────────────────────
function solveSalaryDepletion(transactions, byMonth) {
  const last6 = getLastNMonths(byMonth, 6);
  if (last6.length < 2) return null;

  // Monthly survival stats
  const monthly = last6.map(([month, data]) => {
    const days  = data.days;
    const total = data.expense;
    if (total === 0) return null;

    // Cumulative spending day by day
    const cumulative = [];
    let   running    = 0;
    for (let d = 1; d <= 31; d++) {
      running += days[d] || 0;
      cumulative.push({ day: d, spent: Math.round(running), pct: Math.round((running / data.income) * 100) });
    }

    // Day money runs out (spending = 80% of income)
    const depletionDay = cumulative.find(c => c.pct >= 80)?.day ?? 31;
    const velocity     = total / 30; // avg daily spend

    return {
      month, income: Math.round(data.income), expense: Math.round(total),
      depletionDay, velocity: Math.round(velocity),
      survivalDays: depletionDay,
      savingsRate:  Math.round(((data.income - total) / Math.max(data.income, 1)) * 100),
      cumulative: cumulative.filter(c => c.day % 5 === 0 || c.day === 1),
    };
  }).filter(Boolean);

  if (!monthly.length) return null;

  const latest   = monthly[monthly.length - 1];
  const avgSurvival = Math.round(monthly.reduce((s, m) => s + m.survivalDays, 0) / monthly.length);
  const daysLeft    = avgSurvival - new Date().getDate();

  // Top drain categories this month
  const latestMonth  = last6[last6.length - 1][1];
  const topDrains    = Object.entries(latestMonth.categories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amt]) => ({
      category: cat,
      amount:   Math.round(amt),
      pct:      Math.round((amt / Math.max(latestMonth.expense, 1)) * 100),
    }));

  // Trend: getting worse or better?
  const trend = monthly.length >= 2
    ? monthly[monthly.length - 1].savingsRate - monthly[0].savingsRate
    : 0;

  return {
    monthly,
    latest,
    avgSurvival,
    daysLeft: Math.max(0, daysLeft),
    topDrains,
    trend: Math.round(trend),
    insight: daysLeft < 5
      ? `⚠️ Only ~${daysLeft} days of salary left this month`
      : daysLeft < 10
      ? `💛 About ${daysLeft} days before salary runs thin`
      : `✅ You have ~${daysLeft} healthy days left this month`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PERSONAL INFLATION CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function solvePersonalInflation(byMonth) {
  const months = getLastNMonths(byMonth, 7);
  if (months.length < 3) return null;

  const RBI_CPI = 5.5; // approximate annual CPI %

  // Category-level MoM inflation
  const allCats = new Set();
  months.forEach(([, d]) => Object.keys(d.categories).forEach(c => allCats.add(c)));

  const catInflation = [];
  for (const cat of allCats) {
    const series = months.map(([month, d]) => ({
      month, amount: d.categories[cat] || 0,
    }));
    const nonZero = series.filter(s => s.amount > 0);
    if (nonZero.length < 2) continue;

    const first = nonZero[0].amount;
    const last  = nonZero[nonZero.length - 1].amount;
    const annualised = ((last / first) ** (12 / Math.max(nonZero.length - 1, 1)) - 1) * 100;

    catInflation.push({
      category:    cat,
      firstAmount: Math.round(first),
      lastAmount:  Math.round(last),
      change:      Math.round(last - first),
      changePct:   Math.round(((last - first) / first) * 100),
      annualised:  Math.round(annualised * 10) / 10,
      series:      series.map(s => ({ month: s.month, amount: Math.round(s.amount) })),
    });
  }
  catInflation.sort((a, b) => b.annualised - a.annualised);

  // Personal inflation rate = weighted avg across categories
  const totalSpend = catInflation.reduce((s, c) => s + c.lastAmount, 0);
  const personalInflation = totalSpend > 0
    ? catInflation.reduce((s, c) => s + (c.lastAmount / totalSpend) * c.annualised, 0)
    : 0;

  // Monthly total spending trend
  const totalTrend = months.map(([month, d]) => ({
    month,
    expense: Math.round(d.expense),
    income:  Math.round(d.income),
  }));

  // What's driving your inflation vs RBI
  const driving   = catInflation.filter(c => c.annualised > RBI_CPI).slice(0, 3);
  const deflating = catInflation.filter(c => c.annualised < 0).slice(0, 2);

  return {
    personalInflation: Math.round(personalInflation * 10) / 10,
    rbiCpi:            RBI_CPI,
    gap:               Math.round((personalInflation - RBI_CPI) * 10) / 10,
    catInflation:      catInflation.slice(0, 8),
    totalTrend,
    driving,
    deflating,
    verdict: personalInflation > RBI_CPI * 1.5
      ? "🔴 Your personal inflation is dangerously high"
      : personalInflation > RBI_CPI
      ? "🟡 Your spending is rising faster than national inflation"
      : "🟢 Your spending inflation is under control",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DEBT TRAP MONITOR
// ─────────────────────────────────────────────────────────────────────────────
function solveDebtTrap(loans, byMonth) {
  const SAFE_DTI = 40; // Debt-to-income ratio safe limit %

  const last3 = getLastNMonths(byMonth, 3);
  const avgMonthlyIncome = last3.length
    ? last3.reduce((s, [, d]) => s + d.income, 0) / last3.length
    : 0;

  const activeLoans = loans.filter(l => l.status === "ACTIVE");
  const totalEMI    = activeLoans.reduce((s, l) => s + Number(l.emiAmount), 0);
  const totalDebt   = activeLoans.reduce((s, l) => s + Number(l.principal), 0);
  const dti         = avgMonthlyIncome > 0 ? (totalEMI / avgMonthlyIncome) * 100 : 0;

  // Risk level
  const riskLevel = dti >= 60 ? "CRITICAL" : dti >= 40 ? "HIGH" : dti >= 25 ? "MODERATE" : "SAFE";
  const riskColor = { CRITICAL: "#ef4444", HIGH: "#f87171", MODERATE: "#fbbf24", SAFE: "#34d399" }[riskLevel];

  // How much more EMI can they safely take?
  const safeEMI    = avgMonthlyIncome * (SAFE_DTI / 100);
  const emiHeadroom = Math.max(0, safeEMI - totalEMI);

  // Per-loan analysis
  const loanBreakdown = activeLoans.map(l => {
    const emi         = Number(l.emiAmount);
    const contribution = avgMonthlyIncome > 0 ? (emi / avgMonthlyIncome) * 100 : 0;
    const remaining   = Number(l.totalAmount) - (Number(l.principal) - Number(l.totalInterest || 0));
    return {
      name:          l.name,
      loanType:      l.loanType,
      emiAmount:     Math.round(emi),
      contribution:  Math.round(contribution * 10) / 10,
      principal:     Math.round(Number(l.principal)),
    };
  });

  // Projection: if they take one more ₹5L loan
  const hypotheticalEMI  = 5000000 * (0.115 / 12 / (1 - Math.pow(1 + 0.115/12, -60)));
  const hypotheticalDTI  = avgMonthlyIncome > 0 ? ((totalEMI + hypotheticalEMI) / avgMonthlyIncome) * 100 : 0;

  // Monthly EMI trend from recurring transactions
  const emiTrend = getLastNMonths(byMonth, 6).map(([month, d]) => ({
    month,
    emiEstimate: Math.round(Object.entries(d.categories)
      .filter(([c]) => ["Bills & Fees", "Loan", "EMI"].some(k => c.toLowerCase().includes(k.toLowerCase())))
      .reduce((s, [, v]) => s + v, 0)),
    income: Math.round(d.income),
  }));

  return {
    totalEMI:      Math.round(totalEMI),
    totalDebt:     Math.round(totalDebt),
    avgIncome:     Math.round(avgMonthlyIncome),
    dti:           Math.round(dti * 10) / 10,
    safeLimit:     SAFE_DTI,
    emiHeadroom:   Math.round(emiHeadroom),
    riskLevel,
    riskColor,
    loanBreakdown,
    emiTrend,
    hypothetical: {
      additionalEMI: Math.round(hypotheticalEMI),
      newDTI:        Math.round(hypotheticalDTI * 10) / 10,
      safe:          hypotheticalDTI <= SAFE_DTI,
    },
    advice: riskLevel === "CRITICAL"
      ? "🚨 Stop taking new loans immediately. Focus on debt payoff."
      : riskLevel === "HIGH"
      ? "⚠️ You're close to the debt danger zone. Avoid new credit."
      : riskLevel === "MODERATE"
      ? "💛 Manageable but watch out. Avoid impulse loans."
      : `✅ Healthy DTI. You can safely take EMI up to ${fmt(emiHeadroom)}/month more.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SEASONAL SPENDING PREDICTOR
// ─────────────────────────────────────────────────────────────────────────────
function solveSeasonalSpending(transactions, byMonth) {
  const SEASONS = {
    "Diwali / Festive": { months: [9, 10], emoji: "🪔", color: "#fbbf24" },
    "Wedding Season":   { months: [11, 0, 1], emoji: "💒", color: "#f472b6" },
    "Summer Vacation":  { months: [4, 5], emoji: "☀️", color: "#fb923c" },
    "New Year":         { months: [11, 0], emoji: "🎆", color: "#60a5fa" },
    "Back to School":   { months: [5, 6], emoji: "📚", color: "#a78bfa" },
  };

  // Build monthly averages by calendar month (across all years)
  const calMonthData = Array(12).fill(null).map(() => ({ expenses: [], income: [] }));
  for (const [, data] of Object.entries(byMonth)) {
    // byMonth keys are YYYY-MM
  }
  for (const t of transactions) {
    const d   = new Date(t.date);
    const mon = d.getMonth();
    if (t.type === "EXPENSE") calMonthData[mon].expenses.push(Number(t.amount));
    if (t.type === "INCOME")  calMonthData[mon].income.push(Number(t.amount));
  }

  const monthlyAvg = calMonthData.map((d, i) => {
    const totalExp = d.expenses.reduce((s, v) => s + v, 0);
    const totalInc = d.income.reduce((s, v) => s + v, 0);
    const months   = Math.max(d.expenses.length / 30, 1); // rough estimate
    return {
      month:      new Date(2024, i, 1).toLocaleString("en-IN", { month: "short" }),
      monthIndex: i,
      avgExpense: Math.round(totalExp / Math.max(Object.keys(byMonth).length / 12, 1)),
      avgIncome:  Math.round(totalInc / Math.max(Object.keys(byMonth).length / 12, 1)),
    };
  });

  // Detect spikes — months with expense > overall avg * 1.2
  const overallAvgExp = monthlyAvg.reduce((s, m) => s + m.avgExpense, 0) / 12;
  const spikes = monthlyAvg.map(m => ({
    ...m,
    isSpike:   m.avgExpense > overallAvgExp * 1.2,
    spikePct:  Math.round(((m.avgExpense - overallAvgExp) / Math.max(overallAvgExp, 1)) * 100),
  }));

  // Upcoming seasons
  const currentMonth = new Date().getMonth();
  const upcoming = [];
  for (const [name, season] of Object.entries(SEASONS)) {
    // Find next occurrence
    let monthsAway = Infinity;
    for (const m of season.months) {
      let diff = m - currentMonth;
      if (diff <= 0) diff += 12;
      if (diff < monthsAway) monthsAway = diff;
    }

    // Average spike during this season
    const seasonExpenses = season.months.map(m => monthlyAvg[m]?.avgExpense || 0);
    const avgSeasonSpend = seasonExpenses.reduce((s, v) => s + v, 0) / season.months.length;
    const extraSpend     = Math.max(0, avgSeasonSpend - overallAvgExp);
    const savingsNeeded  = Math.round(extraSpend);
    const monthlySaving  = monthsAway > 0 ? Math.round(savingsNeeded / monthsAway) : 0;

    upcoming.push({
      name,
      emoji:         season.emoji,
      color:         season.color,
      monthsAway,
      avgSeasonSpend: Math.round(avgSeasonSpend),
      extraSpend:     Math.round(extraSpend),
      savingsNeeded,
      monthlySaving,
      months:        season.months.map(m => new Date(2024, m, 1).toLocaleString("en-IN", { month: "short" })),
    });
  }
  upcoming.sort((a, b) => a.monthsAway - b.monthsAway);

  // Year overview chart
  const yearChart = monthlyAvg.map(m => ({
    month:    m.month,
    expense:  m.avgExpense,
    baseline: Math.round(overallAvgExp),
  }));

  return {
    yearChart,
    spikes:   spikes.filter(s => s.isSpike),
    upcoming: upcoming.slice(0, 4),
    baseline: Math.round(overallAvgExp),
    peakMonth: monthlyAvg.reduce((a, b) => a.avgExpense > b.avgExpense ? a : b),
    tip: `Your most expensive month is historically ${monthlyAvg.reduce((a, b) => a.avgExpense > b.avgExpense ? a : b).month}. Start a sinking fund early.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ROUTE
// ─────────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch all data in parallel
    const [transactions, loans] = await Promise.all([
      db.transaction.findMany({
        where:   { userId: user.id },
        orderBy: { date: "asc" },
      }),
      db.loan.findMany({ where: { userId: user.id } }),
    ]);

    if (!transactions.length) {
      return NextResponse.json({ noData: true });
    }

    const serialised = transactions.map(t => ({
      ...t, amount: Number(t.amount), date: t.date.toISOString(),
    }));

    const byMonth = groupByMonth(serialised);

    // Run all 4 analyses
    const [salaryDepletion, personalInflation, debtTrap, seasonal] = await Promise.all([
      Promise.resolve(solveSalaryDepletion(serialised, byMonth)),
      Promise.resolve(solvePersonalInflation(byMonth)),
      Promise.resolve(solveDebtTrap(loans, byMonth)),
      Promise.resolve(solveSeasonalSpending(serialised, byMonth)),
    ]);

    // AI summary across all 4
    let aiSummary = null;
    try {
      const context = [
        salaryDepletion && `Salary survival: ${salaryDepletion.avgSurvival} days avg, savings rate ${salaryDepletion.latest?.savingsRate}%`,
        personalInflation && `Personal inflation: ${personalInflation.personalInflation}% vs RBI ${personalInflation.rbiCpi}%`,
        debtTrap && `Debt-to-income: ${debtTrap.dti}% (${debtTrap.riskLevel}), total EMI ${fmt(debtTrap.totalEMI)}/month`,
        seasonal && `Upcoming high spend: ${seasonal.upcoming[0]?.name} in ${seasonal.upcoming[0]?.monthsAway} months`,
      ].filter(Boolean).join(". ");

      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant", max_tokens: 200,
        messages: [{
          role: "user",
          content: `You are CA Arjun. Give 3 sharp, specific financial insights for this Indian user in 80 words max. Data: ${context}. End with "— CA Arjun"`,
        }],
      });
      aiSummary = res.choices[0]?.message?.content?.trim();
    } catch { /* groq offline */ }

    return NextResponse.json({
      salaryDepletion,
      personalInflation,
      debtTrap,
      seasonal,
      aiSummary,
      dataMonths: Object.keys(byMonth).length,
    });

  } catch (err) {
    console.error("[insights]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}