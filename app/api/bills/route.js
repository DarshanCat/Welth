import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// ── Advance a date by one interval ───────────────────────────────────────────
function nextDate(date, interval) {
  const d = new Date(date);
  switch (interval) {
    case "DAILY":   d.setDate(d.getDate() + 1);       break;
    case "WEEKLY":  d.setDate(d.getDate() + 7);       break;
    case "MONTHLY": d.setMonth(d.getMonth() + 1);     break;
    case "YEARLY":  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}

// ── Compute all occurrences within a window ───────────────────────────────────
function occurrencesInWindow(startDate, interval, windowStart, windowEnd) {
  const dates = [];
  let cur = new Date(startDate);

  // Fast-forward to window start
  let safety = 0;
  while (cur < windowStart && safety < 500) {
    cur = nextDate(cur, interval);
    safety++;
  }

  // Collect dates within window
  while (cur <= windowEnd && dates.length < 10) {
    dates.push(new Date(cur));
    cur = nextDate(cur, interval);
  }

  return dates;
}

// ── Category → emoji + color ──────────────────────────────────────────────────
const CAT_CFG = {
  "Housing":         { emoji: "🏠", color: "#60a5fa" },
  "Utilities":       { emoji: "⚡", color: "#fbbf24" },
  "Food":            { emoji: "🍔", color: "#fc8019" },
  "Entertainment":   { emoji: "🎬", color: "#a78bfa" },
  "Transportation":  { emoji: "🚗", color: "#34d399" },
  "Healthcare":      { emoji: "🏥", color: "#f87171" },
  "Insurance":       { emoji: "🛡️", color: "#06b6d4" },
  "Education":       { emoji: "📚", color: "#8b5cf6" },
  "Investments":     { emoji: "📈", color: "#10b981" },
  "Bills & Fees":    { emoji: "💳", color: "#f59e0b" },
  "Shopping":        { emoji: "🛍️", color: "#ec4899" },
  "Salary":          { emoji: "💰", color: "#34d399" },
};
const DEFAULT_CFG = { emoji: "💳", color: "#64748b" };

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Window: today → 60 days ahead
    const today      = new Date();
    today.setHours(0, 0, 0, 0);
    const windowEnd  = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 60);

    // ── 1. Recurring transactions ─────────────────────────────────────────
    const recurringTxns = await db.transaction.findMany({
      where:   { userId: user.id, isRecurring: true },
      orderBy: { date: "asc" },
    });

    const bills = [];

    for (const t of recurringTxns) {
      if (!t.recurringInterval) continue;

      // Use nextRecurringDate if set, otherwise compute from last date
      const baseDate = t.nextRecurringDate
        ? new Date(t.nextRecurringDate)
        : nextDate(t.date, t.recurringInterval);

      const occurrences = occurrencesInWindow(
        baseDate, t.recurringInterval, today, windowEnd
      );

      const cfg = CAT_CFG[t.category] || DEFAULT_CFG;

      for (const occ of occurrences) {
        const daysUntil = Math.round((occ - today) / (1000 * 60 * 60 * 24));
        bills.push({
          id:          `${t.id}_${occ.toISOString()}`,
          name:        t.description || t.category,
          amount:      Number(t.amount),
          dueDate:     occ.toISOString(),
          daysUntil,
          category:    t.category,
          type:        t.type,
          interval:    t.recurringInterval,
          emoji:       cfg.emoji,
          color:       cfg.color,
          isOverdue:   daysUntil < 0,
          isDueSoon:   daysUntil >= 0 && daysUntil <= 3,
          sourceId:    t.id,
          source:      "recurring",
        });
      }
    }

    // ── 2. EMI Loans ──────────────────────────────────────────────────────
    try {
      const loans = await db.loan.findMany({
        where:   { userId: user.id, status: "ACTIVE" },
        include: { emiPayments: { orderBy: { dueDate: "desc" }, take: 1 } },
      });

      for (const loan of loans) {
        // Compute next EMI due date from last payment or loan start
        const lastPayment = loan.emiPayments[0];
        const lastDueDate = lastPayment
          ? new Date(lastPayment.dueDate)
          : new Date(loan.startDate);

        const occurrences = occurrencesInWindow(
          nextDate(lastDueDate, "MONTHLY"), "MONTHLY", today, windowEnd
        );

        for (const occ of occurrences) {
          const daysUntil = Math.round((occ - today) / (1000 * 60 * 60 * 24));
          bills.push({
            id:        `loan_${loan.id}_${occ.toISOString()}`,
            name:      `${loan.lenderName || loan.loanType} EMI`,
            amount:    Number(loan.emiAmount),
            dueDate:   occ.toISOString(),
            daysUntil,
            category:  "Bills & Fees",
            type:      "EXPENSE",
            interval:  "MONTHLY",
            emoji:     "🏦",
            color:     "#f59e0b",
            isOverdue: daysUntil < 0,
            isDueSoon: daysUntil >= 0 && daysUntil <= 3,
            sourceId:  loan.id,
            source:    "loan",
          });
        }
      }
    } catch {
      // Loan model may not exist yet — skip silently
    }

    // ── Sort by due date ──────────────────────────────────────────────────
    bills.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // ── Summary stats ─────────────────────────────────────────────────────
    const upcoming30  = bills.filter(b => b.daysUntil >= 0 && b.daysUntil <= 30);
    const overdue     = bills.filter(b => b.isOverdue);
    const dueSoon     = bills.filter(b => b.isDueSoon);
    const totalDue30  = upcoming30
      .filter(b => b.type === "EXPENSE")
      .reduce((s, b) => s + b.amount, 0);

    // ── Group by calendar date ─────────────────────────────────────────────
    const byDate = {};
    bills.forEach(b => {
      const key = b.dueDate.split("T")[0];
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(b);
    });

    return NextResponse.json({
      bills,
      byDate,
      summary: {
        totalCount:  bills.length,
        overdueCount: overdue.length,
        dueSoonCount: dueSoon.length,
        totalDue30:   Math.round(totalDue30),
        upcoming30:   upcoming30.length,
      },
      overdue,
      dueSoon,
    });
  } catch (err) {
    console.error("[bills]", err);
    return NextResponse.json({ error: "Failed to load bills" }, { status: 500 });
  }
}