import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const HF_TOKEN = process.env.HF_TOKEN;
const BART     = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";

const EXPENSE_LABELS = [
  "food and dining",
  "groceries and supermarket",
  "shopping and retail",
  "transportation and fuel",
  "housing and rent",
  "utilities and bills",
  "healthcare and medical",
  "entertainment and leisure",
  "education and learning",
  "travel and tourism",
  "personal care and beauty",
  "insurance",
  "investment and savings",
  "gifts and donations",
  "other expenses",
];

const INCOME_LABELS = [
  "salary and wages",
  "freelance and consulting",
  "business income",
  "investment returns and dividends",
  "rental income",
  "other income",
];

// ── Map BART label → Welth category ──────────────────────────────────────────
const LABEL_MAP = {
  "food and dining":                "Food",
  "groceries and supermarket":      "Groceries",
  "shopping and retail":            "Shopping",
  "transportation and fuel":        "Transportation",
  "housing and rent":               "Housing",
  "utilities and bills":            "Utilities",
  "healthcare and medical":         "Healthcare",
  "entertainment and leisure":      "Entertainment",
  "education and learning":         "Education",
  "travel and tourism":             "Travel",
  "personal care and beauty":       "Personal Care",
  "insurance":                      "Insurance",
  "investment and savings":         "Investments",
  "gifts and donations":            "Gifts & Donations",
  "other expenses":                 "Other Expenses",
  "salary and wages":               "Salary",
  "freelance and consulting":       "Freelance",
  "business income":                "Business",
  "investment returns and dividends":"Investments",
  "rental income":                  "Rental",
  "other income":                   "Other Income",
};

// ── Enrich vague UPI/bank descriptions ───────────────────────────────────────
function enrichDescription(desc) {
  if (!desc) return desc;
  const d = desc.toLowerCase();

  // Common Indian bank transaction patterns
  if (d.match(/swiggy|zomato|dunzo|blinkit|zepto|bigbasket/)) return `food delivery: ${desc}`;
  if (d.match(/amazon|flipkart|meesho|myntra|ajio|nykaa/))    return `online shopping: ${desc}`;
  if (d.match(/uber|ola|rapido|yulu|bounce/))                  return `cab or ride: ${desc}`;
  if (d.match(/netflix|spotify|hotstar|youtube|prime/))        return `subscription streaming: ${desc}`;
  if (d.match(/electricity|bescom|tata power|adani|bses/))     return `electricity bill: ${desc}`;
  if (d.match(/jio|airtel|vodafone|bsnl|vi recharge/))         return `mobile recharge: ${desc}`;
  if (d.match(/salary|sal credit|payroll|wages/))              return `salary payment received: ${desc}`;
  if (d.match(/emi|loan|hdfc bank|icici|sbi loan/))            return `loan emi payment: ${desc}`;
  if (d.match(/hospital|clinic|pharma|apollo|medplus/))        return `medical expense: ${desc}`;
  if (d.match(/petrol|diesel|fuel|hp petrol|iocl/))            return `fuel purchase: ${desc}`;
  if (d.match(/upi\/|neft|imps|rtgs/))                         return `bank transfer payment: ${desc}`;

  return desc;
}

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!HF_TOKEN) {
      // Fallback: use Groq-based categorization if no HF token
      return NextResponse.json({ error: "HF_TOKEN not configured", fallback: true }, { status: 500 });
    }

    const { description, amount, type = "EXPENSE" } = await req.json();
    if (!description) return NextResponse.json({ error: "No description" }, { status: 400 });

    const enriched      = enrichDescription(description);
    const candidateLabels = type === "EXPENSE" ? EXPENSE_LABELS : INCOME_LABELS;

    // ── Call BART ──────────────────────────────────────────────────────────
    const hfRes = await fetch(BART, {
      method:  "POST",
      headers: {
        Authorization:  `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: enriched,
        parameters: {
          candidate_labels: candidateLabels,
          multi_label: false,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (hfRes.status === 503) {
      return NextResponse.json({ error: "Model warming up", retry: true }, { status: 503 });
    }

    if (!hfRes.ok) {
      throw new Error(`BART error: ${hfRes.status}`);
    }

    const data = await hfRes.json();

    // data = { sequence, labels: [...], scores: [...] }
    const topLabel  = data.labels?.[0];
    const topScore  = data.scores?.[0];
    const category  = LABEL_MAP[topLabel] || (type === "EXPENSE" ? "Other Expenses" : "Other Income");

    // Build top 3 alternatives
    const alternatives = (data.labels || []).slice(0, 3).map((l, i) => ({
      category: LABEL_MAP[l] || l,
      score:    +(data.scores[i] * 100).toFixed(1),
    }));

    return NextResponse.json({
      category,
      confidence:   +(topScore * 100).toFixed(1),
      alternatives,
      enrichedDesc: enriched,
      model:        "facebook/bart-large-mnli",
    });
  } catch (err) {
    console.error("[hf/categorize]", err);
    return NextResponse.json({ error: "Categorization failed" }, { status: 500 });
  }
}