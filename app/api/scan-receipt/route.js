import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get("receipt");

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this receipt/bill image and extract information. Return ONLY valid JSON, no markdown.

{
  "amount": <total amount as number, no currency symbol>,
  "date": "<ISO date string YYYY-MM-DD, use today if not visible>",
  "description": "<brief description of purchase, max 60 chars>",
  "merchantName": "<store or merchant name>",
  "category": "<one of exactly: Housing, Transportation, Groceries, Utilities, Entertainment, Food, Shopping, Healthcare, Education, Personal Care, Travel, Insurance, Gifts & Donations, Bills & Fees, Other Expenses>",
  "items": ["<item 1>", "<item 2>"],
  "isReceipt": true
}

If this is NOT a receipt, return: {"isReceipt": false}
Rules: amount must be the final TOTAL (including tax). Date in YYYY-MM-DD. category must match exactly one from the list.`;

    const result = await model.generateContent([
      { inlineData: { data: base64, mimeType: file.type } },
      prompt,
    ]);

    const text    = result.response.text().replace(/```json|```/g, "").trim();
    const data    = JSON.parse(text);

    if (!data.isReceipt) {
      return NextResponse.json({ error: "This doesn't look like a receipt. Try a clearer photo of a bill." });
    }

    return NextResponse.json({
      amount:       parseFloat(data.amount),
      date:         data.date,
      description:  data.description,
      merchantName: data.merchantName,
      category:     data.category,
      items:        data.items || [],
    });

  } catch (err) {
    console.error("[Scan Receipt]", err);
    return NextResponse.json({ error: "Could not read receipt. Please try a clearer photo." }, { status: 500 });
  }
}