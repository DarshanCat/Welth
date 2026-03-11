import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// ── Fetch live price from Yahoo Finance ──────────────────────────────────────
async function fetchStockPrice(symbol, exchange = "NSE") {
  try {
    const ticker = exchange === "NSE" ? `${symbol}.NS` : exchange === "BSE" ? `${symbol}.BO` : symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 300 }, // cache 5 mins
    });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;
    return {
      price:        meta.regularMarketPrice,
      prevClose:    meta.chartPreviousClose || meta.previousClose,
      change:       meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose),
      changePct:    ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose)) * 100,
      currency:     meta.currency,
      marketState:  meta.marketState,
      high52:       meta.fiftyTwoWeekHigh,
      low52:        meta.fiftyTwoWeekLow,
    };
  } catch {
    return null;
  }
}

// ── Fetch live NAV from MFAPI ────────────────────────────────────────────────
async function fetchMFNav(schemeCode) {
  try {
    const res  = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, { next: { revalidate: 3600 } });
    const data = await res.json();
    const latest = data?.data?.[0];
    const prev   = data?.data?.[1];
    if (!latest) return null;
    const nav     = parseFloat(latest.nav);
    const prevNav = prev ? parseFloat(prev.nav) : nav;
    return {
      price:     nav,
      prevClose: prevNav,
      change:    nav - prevNav,
      changePct: ((nav - prevNav) / prevNav) * 100,
      date:      latest.date,
      schemeName: data?.meta?.scheme_name,
    };
  } catch {
    return null;
  }
}

// ── GET: all holdings with live prices ──────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const holdings = await db.holding.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });

    // Fetch all live prices in parallel
    const enriched = await Promise.all(
      holdings.map(async (h) => {
        const liveData = h.type === "MUTUAL_FUND"
          ? await fetchMFNav(h.symbol)
          : await fetchStockPrice(h.symbol, h.exchange || "NSE");

        const qty       = Number(h.quantity);
        const avgBuy    = Number(h.avgBuyPrice);
        const invested  = Number(h.investedAmt);
        const currPrice = liveData?.price ?? avgBuy;
        const currValue = qty * currPrice;
        const gain      = currValue - invested;
        const gainPct   = invested > 0 ? (gain / invested) * 100 : 0;

        return {
          ...h,
          quantity:    qty,
          avgBuyPrice: avgBuy,
          investedAmt: invested,
          live: liveData,
          currentPrice: currPrice,
          currentValue: Math.round(currValue * 100) / 100,
          gain:         Math.round(gain * 100) / 100,
          gainPct:      Math.round(gainPct * 100) / 100,
        };
      })
    );

    const totalInvested = enriched.reduce((s, h) => s + h.investedAmt, 0);
    const totalValue    = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalGain     = totalValue - totalInvested;
    const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    return NextResponse.json({
      holdings: enriched,
      summary: {
        totalInvested: Math.round(totalInvested * 100) / 100,
        totalValue:    Math.round(totalValue * 100) / 100,
        totalGain:     Math.round(totalGain * 100) / 100,
        totalGainPct:  Math.round(totalGainPct * 100) / 100,
        count:         enriched.length,
      },
    });
  } catch (err) {
    console.error("[GET /api/portfolio]", err);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

// ── POST: add holding ────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { symbol, name, type, quantity, avgBuyPrice, exchange } = await req.json();
    if (!symbol || !quantity || !avgBuyPrice) {
      return NextResponse.json({ error: "symbol, quantity, avgBuyPrice required" }, { status: 400 });
    }

    const qty      = parseFloat(quantity);
    const price    = parseFloat(avgBuyPrice);
    const invested = Math.round(qty * price * 100) / 100;

    // Check if already exists → update quantity
    const existing = await db.holding.findFirst({
      where: { userId: user.id, symbol: symbol.toUpperCase() },
    });

    if (existing) {
      const newQty      = Number(existing.quantity) + qty;
      const newInvested = Number(existing.investedAmt) + invested;
      const newAvg      = newInvested / newQty;
      const updated = await db.holding.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgBuyPrice: newAvg, investedAmt: newInvested },
      });
      return NextResponse.json({ holding: updated });
    }

    const holding = await db.holding.create({
      data: {
        symbol:     symbol.toUpperCase(),
        name:       name || symbol,
        type:       type || "STOCK",
        quantity:   qty,
        avgBuyPrice: price,
        investedAmt: invested,
        exchange:   exchange || "NSE",
        userId:     user.id,
      },
    });
    return NextResponse.json({ holding });
  } catch (err) {
    console.error("[POST /api/portfolio]", err);
    return NextResponse.json({ error: "Failed to add holding" }, { status: 500 });
  }
}