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

    const holdings = await db.holding.findMany({ where: { userId: user.id } });
    if (!holdings.length) return NextResponse.json({ noHoldings: true });

    // Fetch live prices first
    const holdingsWithPrice = await Promise.all(holdings.map(async (h) => {
      let currentPrice = Number(h.avgBuyPrice);
      try {
        const exc    = h.exchange || "NSE";
        const suffix = exc === "NSE" ? ".NS" : exc === "BSE" ? ".BO" : "";
        const res    = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${h.symbol}${suffix}?interval=1d&range=5d`,
          { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) currentPrice = price;
      } catch { /* use avgBuyPrice as fallback */ }

      return {
        symbol:      h.symbol,
        name:        h.name,
        type:        h.type,
        exchange:    h.exchange || "NSE",
        quantity:    Number(h.quantity),
        avgBuyPrice: Number(h.avgBuyPrice),
        investedAmt: Number(h.investedAmt),
        currentPrice,
      };
    }));

    const totalInvested = holdingsWithPrice.reduce((s, h) => s + h.investedAmt, 0);

    const res = await fetch(`${ML_URL}/portfolio/risk`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ holdings: holdingsWithPrice, total_invested: totalInvested }),
      signal:  AbortSignal.timeout(45000),
    });

    if (!res.ok) throw new Error(`ML error: ${res.status}`);
    return NextResponse.json(await res.json());

  } catch (err) {
    console.error("[portfolio-risk]", err);
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      return NextResponse.json({ error: "ML service offline", offline: true });
    }
    return NextResponse.json({ error: "Risk analysis failed" }, { status: 500 });
  }
}