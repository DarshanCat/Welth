import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol   = searchParams.get("symbol");
  const exchange = searchParams.get("exchange") || "NSE";
  const type     = searchParams.get("type") || "STOCK";

  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  try {
    if (type === "MUTUAL_FUND") {
      // MFAPI.in - free, no key needed
      const res  = await fetch(`https://api.mfapi.in/mf/${symbol}`, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      const data = await res.json();
      const latest = data?.data?.[0];
      const prev   = data?.data?.[1];
      if (!latest) return NextResponse.json({ error: "NAV not found" }, { status: 404 });
      const nav     = parseFloat(latest.nav);
      const prevNav = prev ? parseFloat(prev.nav) : nav;
      return NextResponse.json({
        symbol,
        price:     nav,
        prevClose: prevNav,
        change:    parseFloat((nav - prevNav).toFixed(2)),
        changePct: parseFloat(((nav - prevNav) / prevNav * 100).toFixed(2)),
        date:      latest.date,
        name:      data?.meta?.scheme_name,
      });
    }

    // Yahoo Finance for stocks
    const ticker = exchange === "BSE" ? `${symbol}.BO` : `${symbol}.NS`;
    const url    = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
    const res    = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      next: { revalidate: 300 }, // 5 min cache
    });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) {
      return NextResponse.json({ error: "Price not available" }, { status: 404 });
    }

    const price    = meta.regularMarketPrice;
    const prev     = meta.chartPreviousClose || meta.previousClose || price;
    const change   = parseFloat((price - prev).toFixed(2));
    const changePct = parseFloat(((change / prev) * 100).toFixed(2));

    return NextResponse.json({
      symbol,
      price,
      prevClose:   prev,
      change,
      changePct,
      high52:      meta.fiftyTwoWeekHigh,
      low52:       meta.fiftyTwoWeekLow,
      marketState: meta.marketState,
      currency:    meta.currency || "INR",
      exchange,
    });
  } catch (err) {
    console.error("[price]", err);
    return NextResponse.json({ error: "Failed to fetch price" }, { status: 500 });
  }
}