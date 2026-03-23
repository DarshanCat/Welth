import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const ML_URL = process.env.ADVANCED_AI_URL || "http://127.0.0.1:8002";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { riskProfile = "moderate" } = await req.json();
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const holdings = await db.holding.findMany({
      where: { userId: user.id, type: "STOCK" }, // Stocks only — MFs have insufficient Yahoo data
    });
    if (holdings.length < 2) return NextResponse.json({ insufficient: true });

    const payload = holdings.map(h => ({
      symbol:      h.symbol,
      name:        h.name,
      exchange:    h.exchange || "NSE",
      investedAmt: Number(h.investedAmt),
    }));

    const res = await fetch(`${ML_URL}/portfolio/optimize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ holdings: payload, risk_profile: riskProfile }),
      signal:  AbortSignal.timeout(60000), // Optimization can take time
    });

    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    return NextResponse.json(await res.json());

  } catch (err) {
    console.error("[portfolio-optimize]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "Optimization failed" }, { status: 500 });
  }
}