import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EXPENSE_CATEGORIES = [
  "Housing", "Transportation", "Groceries", "Utilities", "Entertainment",
  "Food", "Shopping", "Healthcare", "Education", "Personal Care",
  "Travel", "Insurance", "Gifts & Donations", "Bills & Fees", "Other Expenses",
];
const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Investments", "Business", "Rental", "Other Income"
];

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { description, amount, type = "EXPENSE" } = await req.json();
    if (!description) return NextResponse.json({ error: "No description" }, { status: 400 });

    const categories = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Categorize this Indian financial transaction.
Description: "${description}"
Amount: ₹${amount || "unknown"}
Type: ${type}
Available categories: ${categories.join(", ")}

Map specific merchants to their logical category (e.g., "Starbucks" -> "Food" or "Dining").
Reply ONLY with valid JSON exactly like this: {"category": "<exact category name>", "confidence": <0-100>, "reason": "<5 words max>"}`;

    const result = await model.generateContent(prompt);
    const rawContent = (await result.response).text();

    const clean = rawContent.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Validate category exists
    if (!categories.includes(parsed.category)) {
      parsed.category = type === "EXPENSE" ? "Other Expenses" : "Other Income";
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ai/categorize]", err);
    return NextResponse.json({ error: "Categorization failed" }, { status: 500 });
  }
}