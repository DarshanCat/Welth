import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendGoalAlertEmail({ to, goal, deficit }) {
  await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL,
    to,
    subject: "⚠️ You are behind your savings goal",
    html: `
      <h2>Goal Alert</h2>
      <p>You are behind your savings goal.</p>
      <p><b>Target:</b> ₹${goal.targetAmount}</p>
      <p><b>Behind by:</b> ₹${deficit}</p>
      <p>Try reducing expenses or adding income to catch up.</p>
    `,
  });
}
