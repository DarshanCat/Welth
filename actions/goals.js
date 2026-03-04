"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { sendGoalAlertEmail } from "@/lib/email";

export async function getUserGoals() {
  const { userId } = await auth();
  if (!userId) return [];

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) return [];

  const goals = await db.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
  });

  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSavings = Math.max(totalIncome - totalExpense, 0);

  // ⚠️ IMPORTANT: async map because we send emails
  return Promise.all(
    goals.map(async (goal) => {
      const createdAt = new Date(goal.createdAt);
      const now = new Date();

      const monthsPassed =
        (now.getFullYear() - createdAt.getFullYear()) * 12 +
        (now.getMonth() - createdAt.getMonth()) +
        1;

      const expectedSavings =
        (Number(goal.targetAmount) / goal.months) *
        Math.min(monthsPassed, goal.months);

      const isBehind = totalSavings < expectedSavings;

      // 🚨 EMAIL ALERT (ONCE PER DAY)
      const shouldSendAlert =
        isBehind &&
        (!goal.lastAlertSent ||
          new Date(goal.lastAlertSent).toDateString() !==
            now.toDateString());

      if (shouldSendAlert) {
        await sendGoalAlertEmail({
          to: user.email,
          goal: {
            targetAmount: Number(goal.targetAmount),
          },
          deficit: Math.round(expectedSavings - totalSavings),
        });

        await db.goal.update({
          where: { id: goal.id },
          data: { lastAlertSent: new Date() },
        });
      }

      // ✅ SERIALIZED RETURN (client-safe)
      return {
        id: goal.id,
        userId: goal.userId,
        months: goal.months,
        createdAt: createdAt.toISOString(),
        targetAmount: Number(goal.targetAmount),
        monthlySave: Number(goal.monthlySave),
        currentSavings: totalSavings,
        expectedSavings: Math.round(expectedSavings),
        isBehind,
      };
    })
  );
}
