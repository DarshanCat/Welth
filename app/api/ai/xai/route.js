import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { creditFeatures } = await req.json().catch(() => ({}));

    // Fetch last 6 months transactions
    const since = new Date();
    since.setMonth(since.getMonth() - 6);

    const txns = await db.transaction.findMany({
      where:   { userId: user.id, type: "EXPENSE", date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const payload = txns.map(t => ({
      id:          t.id,
      amount:      Number(t.amount),
      category:    t.category,
      description: t.description || "",
      date:        t.date.toISOString(),
    }));

    const res = await fetch(`${ML_URL}/xai/explain`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        transactions:    payload,
        credit_features: creditFeatures || null,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    return NextResponse.json(await res.json());

  } catch (err) {
    console.error("[xai]", err);
    if (err.name === "TimeoutError" || err.message?.includes("fetch")) {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "XAI failed" }, { status: 500 });
  }
}