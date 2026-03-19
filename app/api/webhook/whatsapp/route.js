import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import twilio from "twilio";

// Twilio client setup for sending replies
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const body = formData.get("Body");
    const from = formData.get("From"); // e.g., "whatsapp:+14155238886"
    
    if (!body || !from) {
      return NextResponse.json({ error: "Missing Body or From fields from Twilio" }, { status: 400 });
    }

    const phone = from.replace("whatsapp:", "").trim();

    // 1. Find user by whatsapp phone (must be opted-in)
    const userSettings = await db.userSettings.findFirst({
      where: { 
        whatsappPhone: phone,
        whatsappAlerts: true 
      },
      include: {
        user: {
          include: { accounts: { where: { isDefault: true } } }
        }
      }
    });

    if (!userSettings || !userSettings.user) {
      // Send fallback message if they aren't registered / opted-in
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: "CA Arjun: Sorry, I don't recognize this number. Please link your WhatsApp phone number (+XX...) in your Welth Dashboard Settings to start logging transactions remotely!"
      });
      return NextResponse.json({ success: true, message: "User not found or not opted in." });
    }

    const user = userSettings.user;
    const account = user.accounts[0];
    if (!account) {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: "CA Arjun: You haven't set up a Default Account yet. Please log into the Welth dashboard to finish onboarding."
      });
      return NextResponse.json({ success: true, message: "No default account linked." });
    }

    // 2. Parse the natural language transaction using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
    Analyze this SMS text message sent by a user: "${body}"
    Extract the financial transaction details and return them IN STRICT JSON format.
    Format requirements:
    {
      "amount": number (positive float),
      "type": "EXPENSE" or "INCOME",
      "category": string (e.g., "Food", "Transportation", "Shopping", "Salary", "Healthcare", "Groceries", "Utilities", "Other Expenses"),
      "description": string (brief, clean description)
    }
    If the text is NOT a clear financial transaction, return { "error": "Not a financial transaction" }. Do not wrap JSON in Markdown codeblocks. Return only raw JSON string.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleanJson = text.replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.error || !parsed.amount) {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: from,
        body: `CA Arjun: I couldn't understand that transaction format. Could you try wording it like "Spent ₹350 on Lunch"?`
      });
      return NextResponse.json({ success: true, message: "Parse failed" });
    }

    // 3. Create the Transaction record in the database
    const tx = await db.transaction.create({
      data: {
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: (parsed.description || body).substring(0, 50),
        date: new Date(),
        userId: user.id,
        accountId: account.id,
        status: "COMPLETED",
      }
    });

    // 4. Update the User's Default Account Balance
    const balanceChange = parsed.type === "EXPENSE" ? -parsed.amount : parsed.amount;
    await db.account.update({
      where: { id: account.id },
      data: { balance: { increment: balanceChange } },
    });

    // 5. Reply to User confirming successful save
    const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
    const replyBody = `✅ *Transaction Logged!*\n\n` +
      `Amount: ${fmt(parsed.amount)}\n` +
      `Type: ${parsed.type === "EXPENSE" ? "🔴 Expense" : "🟢 Income"}\n` +
      `Category: ${parsed.category}\n\n` +
      `— CA Arjun`;

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: from,
      body: replyBody
    });

    return NextResponse.json({ success: true, transactionId: tx.id });

  } catch (err) {
    console.error("WhatsApp Webhook Parse/Insert Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
