import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const HF_TOKEN = process.env.HF_TOKEN;
const FINBERT  = "https://api-inference.huggingface.co/models/ProsusAI/finbert";

// ── Call FinBERT on a batch of sentences ──────────────────────────────────────
async function classifySentiment(sentences) {
  const res = await fetch(FINBERT, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: sentences }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Model loading (cold start) — return null so caller can retry
    if (res.status === 503) return null;
    throw new Error(`FinBERT error ${res.status}: ${err}`);
  }
  return res.json(); // Array of [{label, score}] per sentence
}

// ── Fetch recent news headlines for a stock symbol ────────────────────────────
async function fetchNewsHeadlines(symbol, name) {
  try {
    // Use RSS/news API — Yahoo Finance RSS is free and reliable
    const query   = encodeURIComponent(`${name} stock India`);
    const rssUrl  = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}.NS&region=IN&lang=en-IN`;
    const res     = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) throw new Error("RSS fetch failed");
    const xml = await res.text();

    // Parse titles from RSS XML
    const titles = [...xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .map(m => m[1].trim())
      .filter(t => !t.toLowerCase().includes("yahoo finance")) // skip feed title
      .slice(0, 5);

    return titles.length > 0 ? titles : [`${name} market performance`];
  } catch {
    return [`${name} stock outlook`, `${symbol} market analysis`];
  }
}

// ── Aggregate sentiment scores → single label ────────────────────────────────
function aggregateSentiment(results) {
  if (!results || !results.length) return { label: "neutral", score: 0.5, confidence: 0 };

  let pos = 0, neg = 0, neu = 0, count = 0;

  results.forEach(item => {
    // FinBERT returns array of {label, score} for each sentence
    const arr = Array.isArray(item) ? item : [item];
    arr.forEach(({ label, score }) => {
      if (label === "positive") pos += score;
      else if (label === "negative") neg += score;
      else neu += score;
      count++;
    });
  });

  if (!count) return { label: "neutral", score: 0.5, confidence: 0 };

  const avgPos = pos / count;
  const avgNeg = neg / count;
  const avgNeu = neu / count;
  const max    = Math.max(avgPos, avgNeg, avgNeu);

  return {
    label:      avgPos === max ? "positive" : avgNeg === max ? "negative" : "neutral",
    score:      +(max.toFixed(3)),
    positive:   +(avgPos.toFixed(3)),
    negative:   +(avgNeg.toFixed(3)),
    neutral:    +(avgNeu.toFixed(3)),
    confidence: +(Math.abs(avgPos - avgNeg).toFixed(3)),
  };
}

// ── Retry helper for cold-start ───────────────────────────────────────────────
async function classifyWithRetry(sentences, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const result = await classifySentiment(sentences);
    if (result !== null) return result;
    if (i < retries) await new Promise(r => setTimeout(r, 3000)); // wait 3s for model to warm up
  }
  return null;
}

// ── Overall portfolio sentiment ───────────────────────────────────────────────
function portfolioSentiment(holdingSentiments) {
  const weights = holdingSentiments.map(h => h.investedAmt || 1);
  const total   = weights.reduce((a, b) => a + b, 0);

  let wPos = 0, wNeg = 0, wNeu = 0;
  holdingSentiments.forEach((h, i) => {
    const w = weights[i] / total;
    wPos += (h.sentiment?.positive || 0) * w;
    wNeg += (h.sentiment?.negative || 0) * w;
    wNeu += (h.sentiment?.neutral  || 0) * w;
  });

  const max = Math.max(wPos, wNeg, wNeu);
  return {
    label:    wPos === max ? "positive" : wNeg === max ? "negative" : "neutral",
    positive: +(wPos.toFixed(3)),
    negative: +(wNeg.toFixed(3)),
    neutral:  +(wNeu.toFixed(3)),
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!HF_TOKEN) return NextResponse.json({ error: "HF_TOKEN not configured" }, { status: 500 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let holdings = [];
    try {
      holdings = await db.holding.findMany({
        where: { userId: user.id, type: "STOCK" }, // Only stocks have news
        take: 6, // Limit to top 6 to avoid rate limits
        orderBy: { investedAmt: "desc" },
      });
    } catch { return NextResponse.json({ error: "No holdings" }); }

    if (!holdings.length) return NextResponse.json({ noHoldings: true });

    // ── Process each holding ────────────────────────────────────────────────
    const results = [];

    for (const h of holdings) {
      try {
        const headlines = await fetchNewsHeadlines(h.symbol, h.name);
        const raw       = await classifyWithRetry(headlines);

        if (!raw) {
          results.push({ symbol: h.symbol, name: h.name, investedAmt: Number(h.investedAmt), sentiment: null, headlines, error: "Model warming up" });
          continue;
        }

        const sentiment = aggregateSentiment(raw);
        results.push({
          symbol:      h.symbol,
          name:        h.name,
          investedAmt: Number(h.investedAmt),
          sentiment,
          headlines,
        });

        // Small delay between calls to respect rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        results.push({ symbol: h.symbol, name: h.name, investedAmt: Number(h.investedAmt), sentiment: null, error: e.message });
      }
    }

    const validResults = results.filter(r => r.sentiment);
    const overall      = validResults.length ? portfolioSentiment(validResults) : null;

    return NextResponse.json({
      holdings: results,
      overall,
      model:    "ProsusAI/finbert",
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[hf/sentiment]", err);
    return NextResponse.json({ error: "Sentiment analysis failed" }, { status: 500 });
  }
}