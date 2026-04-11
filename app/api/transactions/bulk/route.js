import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { transactions } = body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "Invalid transactions array" }, { status: 400 });
    }

    // Usually bank statements don't specify the account ID. You might want to assign them
    // to a default account or prompt the user first. Let's assume we take the first account
    // or create a default one. Wait, let's see how transactions are normally structured.
    
    // We will just fetch the first account of the user for these transactions,
    // or let the frontend pass the accountId. The frontend BankStatementScanner doesn't pass accountId!
    
    const accounts = await db.account.findMany({ where: { userId: user.id } });
    let accountId = accounts.length > 0 ? accounts[0].id : null;

    if (!accountId) {
      // Create a default Bank Account if none exists
      const newAcc = await db.account.create({
        data: {
          userId: user.id,
          name: "Bank Account",
          type: "SAVINGS",
          balance: 0,
        }
      });
      accountId = newAcc.id;
    }

    // Now insert them
    const dataToInsert = transactions.map((tx) => ({
      userId: user.id,
      accountId: accountId,
      amount: parseFloat(tx.amount) || 0,
      description: tx.description || "Bank Statement Import",
      date: new Date(tx.date || new Date()),
      category: tx.category || "Other",
      type: tx.type && ["INCOME", "CREDIT"].includes(tx.type.toUpperCase()) ? "INCOME" : "EXPENSE",
      status: "COMPLETED",
      isRecurring: false,
    }));

    const result = await db.transaction.createMany({
      data: dataToInsert,
      skipDuplicates: true,
    });

    // We also need to update the account balance
    const totalIncome = dataToInsert.filter(t => t.type === "INCOME").reduce((s,t) => s + t.amount, 0);
    const totalExpense = dataToInsert.filter(t => t.type === "EXPENSE").reduce((s,t) => s + t.amount, 0);
    const netChange = totalIncome - totalExpense;

    await db.account.update({
      where: { id: accountId },
      data: { balance: { increment: netChange } }
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error("[bulk-import-error]", error);
    return NextResponse.json({ error: error.message || "Failed to import transactions" }, { status: 500 });
  }
}
