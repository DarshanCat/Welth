import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { clerkUserId: userId } });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const monthParam = body.month; // YYYY-MM or omit for current

    const now   = new Date();
    const year  = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();

    const start = new Date(year, month, 1);
    const end   = new Date(year, month + 1, 0, 23, 59, 59);

    const [transactions, accounts, budget] = await Promise.all([
      db.transaction.findMany({
        where:   { userId: user.id, date: { gte: start, lte: end } },
        orderBy: { date: "asc" },
        include: { account: { select: { name: true } } },
      }),
      db.account.findMany({ where: { userId: user.id } }),
      db.budget.findFirst({ where: { userId: user.id } }),
    ]);

    const income  = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0);
    const savings = Math.max(income - expense, 0);
    const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0);

    const fmt = (n) =>
      new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #0f172a;">CA Monthly Report</h1>
          <p style="margin: 5px 0 0 0; color: #64748b;">${start.toLocaleString("en-IN", { month: "long", year: "numeric" })}</p>
        </div>
        
        <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${user.name || "User"},</p>
          <p>Here is your financial summary for this month:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Total Income</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #10b981;">${fmt(income)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Total Expenses</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #ef4444;">${fmt(expense)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Savings</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #3b82f6;">${fmt(savings)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Net Worth</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #8b5cf6;">${fmt(netWorth)}</td>
            </tr>
            ${budget ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;"><strong>Budget Used</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${fmt(expense)} of ${fmt(budget.amount)}</td>
            </tr>
            ` : ""}
          </table>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #64748b; text-align: center;">
            To view detailed insights, transactions, and AI advice, please visit your CA Dashboard on the platform.
          </p>
        </div>
      </div>
    `;

    const toEmail = user.email; // Send to the user's registered email

    if (!toEmail) {
      return NextResponse.json({ error: "No email associated with user" }, { status: 400 });
    }

    const resendResponse = await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev",
      to: toEmail,
      subject: `Your CA Financial Report - ${start.toLocaleString("en-IN", { month: "long", year: "numeric" })}`,
      html: htmlContent,
    });

    if (resendResponse.error) {
      console.error("[resend error]", resendResponse.error);
      return NextResponse.json({ error: resendResponse.error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Report sent to registered email address via Resend" });
  } catch (err) {
    console.error("[export/email-report]", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
