import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // ── Step 1: Groq parses natural language → filter JSON ────────────────
    const parseRes = await groq.chat.completions.create({
      model:      "llama-3.1-8b-instant",
      max_tokens: 200,
      messages: [{
        role: "system",
        content: `You are a financial query parser. Convert natural language queries about transactions into JSON filters.
Return ONLY valid JSON with these optional fields:
{
  "type": "INCOME" | "EXPENSE" | null,
  "category": string | null,           // e.g. "Food", "Shopping", "Entertainment"
  "minAmount": number | null,
  "maxAmount": number | null,
  "description": string | null,        // keyword to search in description
  "daysBack": number | null,           // e.g. 30 for last month, 7 for last week
  "monthName": string | null,          // e.g. "January", "February"
  "isRecurring": boolean | null,
  "summary": string                    // human readable explanation of the filter
}
Be liberal with category matching — "Swiggy/Zomato/food/restaurant" → "Food", "netflix/prime/spotify" → "Entertainment" etc.
Return only raw JSON, no markdown.`,
      }, {
        role: "user",
        content: query,
      }],
    });

    let filters = {};
    try {
      const raw = parseRes.choices[0]?.message?.content?.trim() || "{}";
      filters   = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      filters = { summary: "Searching all transactions" };
    }

    // ── Step 2: Apply filters to DB query ────────────────────────────────
    const where = { userId: user.id };

    if (filters.type)        where.type     = filters.type;
    if (filters.isRecurring !== null && filters.isRecurring !== undefined)
      where.isRecurring = filters.isRecurring;

    // Category matching (case-insensitive contains)
    if (filters.category)    where.category = { contains: filters.category, mode: "insensitive" };

    // Description keyword
    if (filters.description) where.description = { contains: filters.description, mode: "insensitive" };

    // Amount range
    if (filters.minAmount || filters.maxAmount) {
      where.amount = {};
      if (filters.minAmount) where.amount.gte = filters.minAmount;
      if (filters.maxAmount) where.amount.lte = filters.maxAmount;
    }

    // Date range
    if (filters.daysBack) {
      const since = new Date();
      since.setDate(since.getDate() - filters.daysBack);
      where.date = { gte: since };
    } else if (filters.monthName) {
      const monthIdx = ["january","february","march","april","may","june",
        "july","august","september","october","november","december"]
        .indexOf(filters.monthName.toLowerCase());
      if (monthIdx !== -1) {
        const year  = new Date().getFullYear();
        const start = new Date(year, monthIdx, 1);
        const end   = new Date(year, monthIdx + 1, 0, 23, 59, 59);
        where.date  = { gte: start, lte: end };
      }
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take:    100,
    });

    // ── Step 3: Aggregate stats ────────────────────────────────────────────
    const total  = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const income = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense= transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);

    // Category breakdown of results
    const catBreakdown = {};
    transactions.forEach(t => {
      catBreakdown[t.category] = (catBreakdown[t.category] || 0) + Number(t.amount);
    });

    return NextResponse.json({
      query,
      filters,
      transactions: transactions.map(t => ({
        id:          t.id,
        type:        t.type,
        amount:      Number(t.amount),
        category:    t.category,
        description: t.description,
        date:        t.date.toISOString(),
        isRecurring: t.isRecurring,
      })),
      stats: {
        count:   transactions.length,
        total:   Math.round(total),
        income:  Math.round(income),
        expense: Math.round(expense),
        catBreakdown: Object.entries(catBreakdown)
          .map(([cat, amt]) => ({ category: cat, amount: Math.round(amt) }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5),
      },
    });

  } catch (err) {
    console.error("[search]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}