import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const txns = await db.transaction.findMany({
      where:   { userId: user.id, type: "EXPENSE", date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (txns.length < 10) {
      return NextResponse.json({ insufficient: true, message: "Need at least 10 transactions" });
    }

    const payload = txns.map(t => ({
      id:          t.id,
      amount:      Number(t.amount),
      category:    t.category,
      description: t.description || "",
      date:        t.date.toISOString(),
    }));

    const res = await fetch(`${ML_URL}/fraud/detect`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ transactions: payload, user_id: user.id }),
      signal:  AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("[fraud]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "Fraud detection failed" }, { status: 500 });
  }
}