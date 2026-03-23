import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const res  = await fetch(`${ML_URL}/robo/advise`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("[robo-advisor]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "Robo advisor failed" }, { status: 500 });
  }
}

// GET — auto-fill income/expenses from transactions
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({});
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({});

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const txns = await db.transaction.findMany({ where: { userId: user.id, date: { gte: since } } });

    const income   = txns.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0) / 3;
    const expenses = txns.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0) / 3;
    const emis     = txns.filter(t => t.isRecurring && t.type === "EXPENSE" && t.category === "Bills & Fees")
                         .reduce((s, t) => s + Number(t.amount), 0) / 3;

    return NextResponse.json({
      monthly_income:   Math.round(income),
      monthly_expenses: Math.round(expenses),
      existing_emis:    Math.round(emis),
    });
  } catch { return NextResponse.json({}); }
}