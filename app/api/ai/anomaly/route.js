import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Z-score anomaly detection ─────────────────────────────────────────────────
function detectAnomalies(transactions) {
  // Group by category, compute mean + stddev per category
  const catGroups = {};
  transactions.forEach(t => {
    if (t.type !== "EXPENSE") return;
    if (!catGroups[t.category]) catGroups[t.category] = [];
    catGroups[t.category].push(Number(t.amount));
  });

  const anomalies = [];

  transactions.forEach(t => {
    if (t.type !== "EXPENSE") return;
    const group = catGroups[t.category] || [];
    if (group.length < 3) return; // need at least 3 data points

    const mean   = group.reduce((a, b) => a + b, 0) / group.length;
    const stddev = Math.sqrt(group.reduce((s, v) => s + (v - mean) ** 2, 0) / group.length);
    if (stddev === 0) return;

    const z = (Number(t.amount) - mean) / stddev;

    if (z > 2.0) { // More than 2 std deviations above mean
      anomalies.push({
        id:          t.id,
        description: t.description || t.category,
        amount:      Number(t.amount),
        category:    t.category,
        date:        t.date,
        zScore:      +z.toFixed(2),
        categoryMean: +mean.toFixed(0),
        severity:    z > 3 ? "high" : "medium",
      });
    }
  });

  return anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 10);
}

// ── Duplicate detection ───────────────────────────────────────────────────────
function detectDuplicates(transactions) {
  const dupes = [];
  const seen  = {};

  transactions.forEach(t => {
    const key = `${Math.round(Number(t.amount))}_${t.category}_${new Date(t.date).toDateString()}`;
    if (seen[key]) {
      dupes.push({ id: t.id, description: t.description, amount: Number(t.amount), category: t.category, date: t.date });
    } else {
      seen[key] = t;
    }
  });

  return dupes.slice(0, 5);
}

// ── Unusual timing detection ──────────────────────────────────────────────────
function detectUnusualTiming(transactions) {
  const now    = new Date();
  const thisM  = now.getMonth();
  const thisY  = now.getFullYear();

  // Categories that spiked this month vs 3-month avg
  const catMonthly = {};
  transactions.filter(t => t.type === "EXPENSE").forEach(t => {
    const d   = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!catMonthly[t.category]) catMonthly[t.category] = {};
    catMonthly[t.category][key] = (catMonthly[t.category][key] || 0) + Number(t.amount);
  });

  const spikes = [];
  Object.entries(catMonthly).forEach(([cat, months]) => {
    const currentKey = `${thisY}-${thisM}`;
    const current    = months[currentKey] || 0;
    const past       = Object.entries(months)
      .filter(([k]) => k !== currentKey)
      .map(([, v]) => v);
    if (past.length < 2 || !current) return;
    const avg = past.reduce((a, b) => a + b, 0) / past.length;
    if (avg > 0 && current > avg * 1.8) {
      spikes.push({ category: cat, current: +current.toFixed(0), avg: +avg.toFixed(0), pct: +((current/avg - 1) * 100).toFixed(0) });
    }
  });

  return spikes.sort((a, b) => b.pct - a.pct).slice(0, 5);
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const transactions = await db.transaction.findMany({
      where:   { userId: user.id },
      orderBy: { date: "desc" },
      take:    500,
    });

    if (transactions.length < 5) {
      return NextResponse.json({ error: "Not enough data", anomalies: [], duplicates: [], spikes: [] });
    }

    const serialized = transactions.map(t => ({ ...t, amount: Number(t.amount) }));
    const anomalies  = detectAnomalies(serialized);
    const duplicates = detectDuplicates(serialized);
    const spikes     = detectUnusualTiming(serialized);

    // ── AI narrative for top anomaly ──────────────────────────────────────────
    let aiNarrative = null;
    if (anomalies.length > 0) {
      try {
        const top = anomalies[0];
        const res = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_tokens: 120,
          messages: [{
            role: "user",
            content: `You are a fraud/anomaly detection AI. In 40 words max, explain why this transaction is suspicious and what action to take:
Transaction: ${top.description} — ${fmt(top.amount)} in ${top.category}
Average for this category: ${fmt(top.categoryMean)}
It is ${top.zScore}x the standard deviation above normal.
Be specific and actionable.`,
          }],
        });
        aiNarrative = res.choices[0]?.message?.content?.trim();
      } catch { /* skip */ }
    }

    return NextResponse.json({
      anomalies,
      duplicates,
      spikes,
      aiNarrative,
      totalFlags: anomalies.length + duplicates.length + spikes.length,
    });
  } catch (err) {
    console.error("[ai/anomaly]", err);
    return NextResponse.json({ error: "Detection failed" }, { status: 500 });
  }
}