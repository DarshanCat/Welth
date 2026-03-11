import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

function calcEMI(principal, annualRate, months) {
  if (annualRate === 0) return Math.round((principal / months) * 100) / 100;
  const r = annualRate / 100 / 12;
  const emi = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  return Math.round(emi * 100) / 100;
}

function buildSchedule(principal, annualRate, months, startDate, emiAmount) {
  const r = annualRate / 100 / 12;
  let balance = principal;
  const now = new Date();
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    const interestComp  = Math.round(balance * r * 100) / 100;
    const principalComp = Math.round((emiAmount - interestComp) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principalComp) * 100) / 100);
    if (i === months) balance = 0;
    schedule.push({
      installment: i, dueDate,
      amount: emiAmount, principal: principalComp,
      interest: interestComp, balance,
      status: dueDate < now ? "PENDING" : "UPCOMING",
    });
  }
  return schedule;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const loans = await db.loan.findMany({
      where: { userId: user.id },
      include: { payments: { orderBy: { installment: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const result = loans.map(loan => {
      const payments = loan.payments.map(p => ({
        ...p, amount: Number(p.amount), principal: Number(p.principal),
        interest: Number(p.interest), balance: Number(p.balance),
        status: p.status === "PENDING" && new Date(p.dueDate) < now ? "MISSED" : p.status,
      }));
      const paid     = payments.filter(p => p.status === "PAID").length;
      const missed   = payments.filter(p => p.status === "MISSED").length;
      const upcoming = payments.filter(p => p.status === "UPCOMING" || p.status === "PENDING").length;
      const paidAmt  = payments.filter(p => p.status === "PAID").reduce((s,p) => s + p.amount, 0);
      const next     = payments.find(p => p.status === "UPCOMING" || p.status === "PENDING");
      return {
        ...loan,
        principal: Number(loan.principal), interestRate: Number(loan.interestRate),
        emiAmount: Number(loan.emiAmount), totalAmount: Number(loan.totalAmount),
        totalInterest: Number(loan.totalInterest),
        payments,
        stats: { paid, missed, upcoming, total: loan.tenureMonths, paidAmt, remaining: Number(loan.totalAmount) - paidAmt, next },
      };
    });
    return NextResponse.json({ loans: result });
  } catch (err) {
    console.error("[GET /api/loans]", err);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { name, principal, interestRate, tenureMonths, startDate, loanType } = await req.json();
    const p = parseFloat(principal), r = parseFloat(interestRate), n = parseInt(tenureMonths);
    const emi          = calcEMI(p, r, n);
    const totalAmount  = Math.round(emi * n * 100) / 100;
    const totalInterest= Math.round((totalAmount - p) * 100) / 100;
    const start        = new Date(startDate);
    const schedule     = buildSchedule(p, r, n, start, emi);

    const loan = await db.loan.create({
      data: {
        name: name || "My Loan", principal: p, interestRate: r,
        tenureMonths: n, emiAmount: emi, totalAmount, totalInterest,
        startDate: start, loanType: loanType || "PERSONAL", userId: user.id,
        payments: { create: schedule },
      },
      include: { payments: { orderBy: { installment: "asc" } } },
    });
    return NextResponse.json({ loan });
  } catch (err) {
    console.error("[POST /api/loans]", err);
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
  }
}