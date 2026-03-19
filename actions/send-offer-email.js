"use server";

import { Resend } from "resend";
import EmailTemplate from "@/emails/template";

export async function sendOfferEmail({ to, userName, offerTitle, offerDetails }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  try {
    await resend.emails.send({
      from: process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev",
      to,
      subject: `Exclusive Offer: ${offerTitle}`,
      react: EmailTemplate({
        userName,
        type: "offer",
        data: {
          offerTitle,
          offerDetails
        }
      })
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send offer email:", error);
    return { success: false, error: error.message };
  }
}
