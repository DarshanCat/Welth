import { Resend } from "resend";
import EmailTemplate from "@/emails/template";
import { NextResponse } from "next/server";

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    const data = await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev",
      to: "darshanram.g9141@gmail.com",
      subject: "Your Monthly Financial Report",
      react: EmailTemplate({
        userName: "Darshan",
        type: "monthly-report",
        data: {
          month: "April",
          stats: {
            totalIncome: 120000,
            totalExpenses: 45000,
            byCategory: {
              housing: 15000,
              food: 12000,
              transport: 5000,
              entertainment: 8000,
              others: 5000
            }
          },
          insights: [
            "Your expenses are well within your budget.",
            "You saved more than 50% of your income this month!"
          ]
        }
      })
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
