import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

// ── Known subscription services (Indian + global) ─────────────────────────────
const KNOWN_SERVICES = [
  // Streaming Video
  { name: "Netflix",        keywords: ["netflix"],                       category: "Streaming",   color: "#e50914", emoji: "🎬", typical: [149, 199, 499, 649, 799] },
  { name: "Amazon Prime",   keywords: ["amazon prime", "prime video"],   category: "Streaming",   color: "#ff9900", emoji: "📦", typical: [299, 1499] },
  { name: "Disney+ Hotstar",keywords: ["hotstar", "disney"],             category: "Streaming",   color: "#113ccf", emoji: "🏏", typical: [299, 899, 1499] },
  { name: "Zee5",           keywords: ["zee5", "zee 5"],                 category: "Streaming",   color: "#7e57c2", emoji: "📺", typical: [99, 365, 999] },
  { name: "SonyLiv",        keywords: ["sonyliv", "sony liv"],           category: "Streaming",   color: "#0a4fa0", emoji: "📺", typical: [299, 599, 999] },
  { name: "JioCinema",      keywords: ["jiocinema", "jio cinema"],       category: "Streaming",   color: "#0066cc", emoji: "🎥", typical: [29, 89, 999] },
  { name: "Apple TV+",      keywords: ["apple tv"],                      category: "Streaming",   color: "#555555", emoji: "🍎", typical: [99] },
  { name: "YouTube Premium", keywords: ["youtube premium"],              category: "Streaming",   color: "#ff0000", emoji: "▶️",  typical: [139, 189] },

  // Music
  { name: "Spotify",        keywords: ["spotify"],                       category: "Music",       color: "#1db954", emoji: "🎵", typical: [119, 179] },
  { name: "Apple Music",    keywords: ["apple music"],                   category: "Music",       color: "#fc3c44", emoji: "🎵", typical: [99] },
  { name: "JioSaavn",       keywords: ["jiosaavn", "saavn"],             category: "Music",       color: "#00b761", emoji: "🎵", typical: [99, 299] },
  { name: "Gaana",          keywords: ["gaana"],                         category: "Music",       color: "#e72c30", emoji: "🎵", typical: [99] },

  // Food & Delivery
  { name: "Swiggy One",     keywords: ["swiggy one", "swiggy"],         category: "Food",        color: "#fc8019", emoji: "🍔", typical: [299, 399] },
  { name: "Zomato Pro",     keywords: ["zomato pro", "zomato gold"],    category: "Food",        color: "#cb202d", emoji: "🍕", typical: [149, 299] },
  { name: "Blinkit Pass",   keywords: ["blinkit"],                       category: "Food",        color: "#f8e71c", emoji: "⚡", typical: [99, 149] },

  // Cloud Storage
  { name: "Google One",     keywords: ["google one", "google storage"], category: "Cloud",       color: "#4285f4", emoji: "☁️",  typical: [130, 210, 650] },
  { name: "iCloud+",        keywords: ["icloud"],                        category: "Cloud",       color: "#3e8ef7", emoji: "☁️",  typical: [75, 219, 749] },
  { name: "Dropbox",        keywords: ["dropbox"],                       category: "Cloud",       color: "#0061ff", emoji: "📁", typical: [1200] },
  { name: "Microsoft 365",  keywords: ["microsoft 365", "office 365", "ms office"], category: "Productivity", color: "#d83b01", emoji: "💼", typical: [6199, 8299] },

  // Productivity & AI
  { name: "Notion",         keywords: ["notion"],                        category: "Productivity",color: "#000000", emoji: "📝", typical: [0, 1600] },
  { name: "ChatGPT Plus",   keywords: ["openai", "chatgpt"],             category: "AI",          color: "#10a37f", emoji: "🤖", typical: [1700] },
  { name: "Canva Pro",      keywords: ["canva"],                         category: "Design",      color: "#7d2ae8", emoji: "🎨", typical: [3999, 499] },
  { name: "Adobe CC",       keywords: ["adobe"],                         category: "Design",      color: "#ff0000", emoji: "🎨", typical: [1675, 3400] },

  // Learning
  { name: "LinkedIn Premium",keywords: ["linkedin"],                     category: "Learning",    color: "#0077b5", emoji: "💼", typical: [2099, 3799] },
  { name: "Coursera Plus",  keywords: ["coursera"],                      category: "Learning",    color: "#0056d2", emoji: "📚", typical: [3024] },
  { name: "Udemy",          keywords: ["udemy"],                         category: "Learning",    color: "#a435f0", emoji: "📚", typical: [455, 4000] },

  // Gaming
  { name: "PlayStation Plus",keywords: ["playstation", "ps plus", "psn"],category: "Gaming",     color: "#003087", emoji: "🎮", typical: [499, 2999] },
  { name: "Xbox Game Pass", keywords: ["xbox", "game pass"],             category: "Gaming",      color: "#107c10", emoji: "🎮", typical: [699] },

  // Fitness
  { name: "Cult.fit",       keywords: ["cult.fit", "cultfit", "curefit"],category: "Fitness",    color: "#ff4655", emoji: "💪", typical: [899, 1999] },
  { name: "Gym Membership", keywords: ["gym", "fitness", "yoga"],        category: "Fitness",    color: "#f59e0b", emoji: "🏋️", typical: [500, 1000, 2000] },

  // Telecom / Internet
  { name: "Jio Recharge",   keywords: ["jio recharge", "reliance jio"], category: "Telecom",    color: "#0066cc", emoji: "📱", typical: [239, 299, 719] },
  { name: "Airtel",         keywords: ["airtel"],                         category: "Telecom",    color: "#e40000", emoji: "📱", typical: [179, 265, 719] },
  { name: "Vi (Vodafone)",  keywords: ["vodafone", "vi recharge"],       category: "Telecom",    color: "#e60000", emoji: "📱", typical: [179, 265] },

  // News
  { name: "Times of India", keywords: ["times of india", "toi"],        category: "News",        color: "#cc0000", emoji: "📰", typical: [99, 199] },
  { name: "The Hindu",      keywords: ["the hindu"],                     category: "News",        color: "#cc0000", emoji: "📰", typical: [149, 299] },
];

// ── Normalise description for matching ───────────────────────────────────────
function normalise(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

// ── Match against known services ─────────────────────────────────────────────
function matchKnownService(description) {
  const norm = normalise(description);
  for (const svc of KNOWN_SERVICES) {
    if (svc.keywords.some(k => norm.includes(k))) return svc;
  }
  return null;
}

// ── Frequency analysis — find recurring transactions ─────────────────────────
function detectRecurring(transactions) {
  // Group by normalised description + amount bucket (±10%)
  const groups = {};

  transactions.filter(t => t.type === "EXPENSE").forEach(t => {
    const key = normalise(t.description || t.category) + "_" + Math.round(Number(t.amount) / 50) * 50;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const recurring = [];

  Object.entries(groups).forEach(([key, txns]) => {
    if (txns.length < 2) return;

    // Sort by date
    const sorted = txns.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check intervals between consecutive occurrences
    const intervals = [];
    for (let i = 1; i < sorted.length; i++) {
      const days = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000 * 60 * 60 * 24);
      intervals.push(days);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const isMonthly   = avgInterval >= 25 && avgInterval <= 35;
    const isWeekly    = avgInterval >= 5  && avgInterval <= 9;
    const isYearly    = avgInterval >= 340 && avgInterval <= 380;

    if (!isMonthly && !isWeekly && !isYearly) return;

    const latestTxn  = sorted[sorted.length - 1];
    const amount     = Number(latestTxn.amount);
    const knownSvc   = matchKnownService(latestTxn.description || "");
    const daysSinceLast = (new Date() - new Date(latestTxn.date)) / (1000 * 60 * 60 * 24);

    recurring.push({
      id:           key,
      description:  latestTxn.description || latestTxn.category,
      amount,
      frequency:    isWeekly ? "weekly" : isYearly ? "yearly" : "monthly",
      monthlyAmount: isWeekly ? amount * 4 : isYearly ? amount / 12 : amount,
      occurrences:  txns.length,
      lastCharged:  latestTxn.date,
      daysSinceLast: Math.round(daysSinceLast),
      nextExpected: isMonthly ? new Date(new Date(latestTxn.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      knownService: knownSvc,
      category:     knownSvc?.category || latestTxn.category,
      color:        knownSvc?.color || "#64748b",
      emoji:        knownSvc?.emoji || "💳",
      isKnown:      !!knownSvc,
      // Flag as potentially unused if last charge was > 45 days ago for a monthly sub
      potentiallyUnused: isMonthly && daysSinceLast > 45,
    });
  });

  return recurring.sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}

// ── Main API handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Fetch last 12 months of transactions
    const since = new Date();
    since.setMonth(since.getMonth() - 12);

    const transactions = await db.transaction.findMany({
      where:   { userId: user.id, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    if (transactions.length < 5) {
      return NextResponse.json({ insufficient: true, subscriptions: [] });
    }

    const serialized = transactions.map(t => ({ ...t, amount: Number(t.amount) }));
    const detected   = detectRecurring(serialized);

    // ── Also check already-marked recurring transactions in DB ───────────────
    const markedRecurring = serialized.filter(t => t.isRecurring && t.type === "EXPENSE");
    const markedSet = new Set(markedRecurring.map(t => normalise(t.description || t.category)));

    // Add any marked-recurring not already in detected
    markedRecurring.forEach(t => {
      const norm = normalise(t.description || t.category);
      const alreadyIn = detected.some(d => normalise(d.description) === norm);
      if (!alreadyIn) {
        const knownSvc = matchKnownService(t.description || "");
        detected.push({
          id:            `marked_${t.id}`,
          description:   t.description || t.category,
          amount:        Number(t.amount),
          frequency:     t.recurringInterval?.toLowerCase() || "monthly",
          monthlyAmount: Number(t.amount),
          occurrences:   1,
          lastCharged:   t.date,
          daysSinceLast: Math.round((new Date() - new Date(t.date)) / (1000 * 60 * 60 * 24)),
          nextExpected:  t.nextRecurringDate?.toISOString() || null,
          knownService:  knownSvc,
          category:      knownSvc?.category || t.category,
          color:         knownSvc?.color || "#64748b",
          emoji:         knownSvc?.emoji || "💳",
          isKnown:       !!knownSvc,
          potentiallyUnused: false,
          markedByUser:  true,
        });
      }
    });

    // ── Totals ────────────────────────────────────────────────────────────────
    const monthlyBurn   = detected.reduce((s, d) => s + d.monthlyAmount, 0);
    const yearlyBurn    = monthlyBurn * 12;
    const unusedCount   = detected.filter(d => d.potentiallyUnused).length;
    const unusedSavings = detected.filter(d => d.potentiallyUnused).reduce((s, d) => s + d.monthlyAmount, 0);

    // Category totals
    const byCategory = {};
    detected.forEach(d => {
      byCategory[d.category] = (byCategory[d.category] || 0) + d.monthlyAmount;
    });

    // ── AI Insight via Groq ───────────────────────────────────────────────────
    let aiInsight = null;
    if (detected.length > 0) {
      try {
        const subList = detected.slice(0, 10).map(d =>
          `${d.description} — ${fmt(d.monthlyAmount)}/mo (${d.occurrences} charges, last: ${Math.round(d.daysSinceLast)} days ago)`
        ).join("\n");

        const res = await groq.chat.completions.create({
          model:      "llama-3.1-8b-instant",
          max_tokens: 200,
          messages: [{
            role: "user",
            content: `You are a personal finance advisor. Analyse these recurring subscriptions for an Indian user and give smart advice in 70 words max.

Subscriptions found:
${subList}

Total monthly spend: ${fmt(monthlyBurn)}
Potentially unused (no recent charge): ${unusedCount} subscriptions

Give: 1 specific cancellation recommendation with savings amount, 1 overlapping service to consolidate, 1 positive observation. Be direct and specific.`,
          }],
        });
        aiInsight = res.choices[0]?.message?.content?.trim();
      } catch { /* skip */ }
    }

    return NextResponse.json({
      subscriptions: detected,
      summary: {
        monthlyBurn:    Math.round(monthlyBurn),
        yearlyBurn:     Math.round(yearlyBurn),
        totalCount:     detected.length,
        unusedCount,
        unusedSavings:  Math.round(unusedSavings),
        byCategory,
      },
      aiInsight,
    });
  } catch (err) {
    console.error("[subscriptions]", err);
    return NextResponse.json({ error: "Detection failed" }, { status: 500 });
  }
}