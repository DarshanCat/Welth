import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

// Mock Plaid / Setu Bank Sync Webhook Endpoint
export async function POST(req) {
  try {
    const { userId, accountId, count = 3 } = await req.json();

    if (!userId || !accountId) {
      return NextResponse.json({ error: "Missing userId or accountId" }, { status: 400 });
    }

    const account = await db.account.findUnique({
      where: { id: accountId, userId },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Mock data generators
    const categories = ["Food", "Transportation", "Shopping", "Entertainment", "Groceries"];
    const merchants = ["Swiggy", "Uber", "Amazon", "Netflix", "Blinkit", "Zomato", "Myntra"];
    
    let totalDeducted = 0;
    const transactionsToInsert = [];

    for (let i = 0; i < count; i++) {
      const amount = Math.floor(Math.random() * 800) + 150;
      totalDeducted += amount;
      
      transactionsToInsert.push({
        type: "EXPENSE",
        amount,
        description: `UPI-${merchants[Math.floor(Math.random() * merchants.length)]}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        date: new Date(),
        userId,
        accountId,
        status: "COMPLETED",
        isRecurring: false,
      });
    }

    // Insert all simulated transactions
    await db.transaction.createMany({
      data: transactionsToInsert,
    });

    // Update account balance
    await db.account.update({
      where: { id: accountId },
      data: {
        balance: {
          decrement: totalDeducted,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${count} new transactions via Setu/Plaid mock.`,
      syncedAmount: totalDeducted
    });

  } catch (err) {
    console.error("Bank Sync Webhook Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
