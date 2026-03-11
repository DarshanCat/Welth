import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q    = searchParams.get("q")?.trim();
  const type = searchParams.get("type") || "STOCK"; // STOCK | MF

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    if (type === "MF") {
      // MFAPI.in — free, no key
      const res  = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const results = (data || []).slice(0, 10).map((f) => ({
        symbol:   String(f.schemeCode),
        name:     f.schemeName,
        type:     "MUTUAL_FUND",
        exchange: "MF",
      }));
      return NextResponse.json({ results });
    }

    // Yahoo Finance search for stocks
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=en-US&region=IN&quotesCount=10&newsCount=0`;
    const res  = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    const data = await res.json();
    const quotes = data?.quotes || [];

    const results = quotes
      .filter(q => q.quoteType === "EQUITY" && (q.exchange === "NSI" || q.exchange === "BSE" || q.symbol?.endsWith(".NS") || q.symbol?.endsWith(".BO")))
      .slice(0, 8)
      .map(q => ({
        symbol:   q.symbol?.replace(/\.(NS|BO)$/, ""),
        name:     q.longname || q.shortname || q.symbol,
        type:     "STOCK",
        exchange: q.symbol?.endsWith(".BO") ? "BSE" : "NSE",
        ticker:   q.symbol,
      }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[Search API]", err);
    return NextResponse.json({ results: [] });
  }
}