"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function getFinanceScore() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) return null;

  const transactions = await db.transaction.findMany({
    where: { userId: user.id },
  });

  const budget = await db.budget.findUnique({
    where: { userId: user.id },
  });

  const goals = await db.goal.findMany({
    where: { userId: user.id },
  });

  const income = transactions
    .filter(t => t.type === "INCOME")
    .reduce((s, t) => s + Number(t.amount), 0);

  const expense = transactions
    .filter(t => t.type === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount), 0);

  const savings = Math.max(income - expense, 0);

  /* ======================
     1️⃣ Savings Score
  ====================== */
  let savingsScore = 5;
  const savingsRate = income ? savings / income : 0;
  if (savingsRate >= 0.3) savingsScore = 30;
  else if (savingsRate >= 0.2) savingsScore = 20;
  else if (savingsRate >= 0.1) savingsScore = 10;

  /* ======================
     2️⃣ Budget Score
  ====================== */
  let budgetScore = 10;
  if (budget) {
    const usage = expense / Number(budget.amount);
    if (usage <= 0.8) budgetScore = 25;
    else if (usage <= 1) budgetScore = 15;
    else budgetScore = 5;
  }

  /* ======================
     3️⃣ Goal Score
  ====================== */
  let goalScore = 0;
  if (goals.length > 0) {
    const g = goals[0];
    const progress = savings / Number(g.targetAmount);
    if (progress >= 0.8) goalScore = 25;
    else if (progress >= 0.5) goalScore = 15;
    else if (progress >= 0.25) goalScore = 8;
    else goalScore = 3;
  }

  /* ======================
     4️⃣ Stability Score
  ====================== */
  let stabilityScore = 10;
  const last3 = transactions
    .filter(t => t.type === "EXPENSE")
    .slice(-3)
    .map(t => Number(t.amount));

  if (last3.length >= 3) {
    const max = Math.max(...last3);
    const min = Math.min(...last3);
    if (max - min < 1000) stabilityScore = 20;
    else if (max - min < 3000) stabilityScore = 12;
    else stabilityScore = 5;
  }

  const score =
    savingsScore + budgetScore + goalScore + stabilityScore;

  return {
    score,
    breakdown: {
      savingsScore,
      budgetScore,
      goalScore,
      stabilityScore,
    },
  };
}
