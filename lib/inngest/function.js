import { inngest } from "./client";
import { db } from "@/lib/prisma";
import EmailTemplate from "@/emails/template";
import { sendEmail } from "@/actions/send-email";
import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Recurring Transaction Processing with Throttling
export const processRecurringTransaction = inngest.createFunction(
  {
    id: "process-recurring-transaction",
    name: "Process Recurring Transaction",
    throttle: {
      limit: 10, // Process 10 transactions
      period: "1m", // per minute
      key: "event.data.userId", // Throttle per user
    },
  },
  { event: "transaction.recurring.process" },
  async ({ event, step }) => {
    // Validate event data
    if (!event?.data?.transactionId || !event?.data?.userId) {
      console.error("Invalid event data:", event);
      return { error: "Missing required event data" };
    }

    await step.run("process-transaction", async () => {
      const transaction = await db.transaction.findUnique({
        where: {
          id: event.data.transactionId,
          userId: event.data.userId,
        },
        include: {
          account: true,
        },
      });

      if (!transaction || !isTransactionDue(transaction)) return;

      // Create new transaction and update account balance in a transaction
      await db.$transaction(async (tx) => {
        // Create new transaction
        await tx.transaction.create({
          data: {
            type: transaction.type,
            amount: transaction.amount,
            description: `${transaction.description} (Recurring)`,
            date: new Date(),
            category: transaction.category,
            userId: transaction.userId,
            accountId: transaction.accountId,
            isRecurring: false,
          },
        });

        // Update account balance
        const balanceChange =
          transaction.type === "EXPENSE"
            ? -transaction.amount.toNumber()
            : transaction.amount.toNumber();

        await tx.account.update({
          where: { id: transaction.accountId },
          data: { balance: { increment: balanceChange } },
        });

        // Update last processed date and next recurring date
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            lastProcessed: new Date(),
            nextRecurringDate: calculateNextRecurringDate(
              new Date(),
              transaction.recurringInterval
            ),
          },
        });
      });
    });
  }
);

// Trigger recurring transactions with batching
export const triggerRecurringTransactions = inngest.createFunction(
  {
    id: "trigger-recurring-transactions", // Unique ID,
    name: "Trigger Recurring Transactions",
  },
  { cron: "0 0 * * *" }, // Daily at midnight
  async ({ step }) => {
    const recurringTransactions = await step.run(
      "fetch-recurring-transactions",
      async () => {
        return await db.transaction.findMany({
          where: {
            isRecurring: true,
            status: "COMPLETED",
            OR: [
              { lastProcessed: null },
              {
                nextRecurringDate: {
                  lte: new Date(),
                },
              },
            ],
          },
        });
      }
    );

    // Send event for each recurring transaction in batches
    if (recurringTransactions.length > 0) {
      const events = recurringTransactions.map((transaction) => ({
        name: "transaction.recurring.process",
        data: {
          transactionId: transaction.id,
          userId: transaction.userId,
        },
      }));

      // Send events directly using inngest.send()
      await inngest.send(events);
    }

    return { triggered: recurringTransactions.length };
  }
);

// 2. Monthly Report Generation
async function generateFinancialInsights(stats, month) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analyze this financial data and provide 3 concise, actionable insights.
    Focus on spending patterns and practical advice.
    Keep it friendly and conversational.

    Financial Data for ${month}:
    - Total Income: $${stats.totalIncome}
    - Total Expenses: $${stats.totalExpenses}
    - Net Income: $${stats.totalIncome - stats.totalExpenses}
    - Expense Categories: ${Object.entries(stats.byCategory)
      .map(([category, amount]) => `${category}: $${amount}`)
      .join(", ")}

    Format the response as a JSON array of strings, like this:
    ["insight 1", "insight 2", "insight 3"]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error generating insights:", error);
    return [
      "Your highest expense category this month might need attention.",
      "Consider setting up a budget for better financial management.",
      "Track your recurring expenses to identify potential savings.",
    ];
  }
}

export const generateMonthlyReports = inngest.createFunction(
  {
    id: "generate-monthly-reports",
    name: "Generate Monthly Reports",
  },
  { cron: "0 0 1 * *" }, // First day of each month
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const stats = await getMonthlyStats(user.id, lastMonth);
        const monthName = lastMonth.toLocaleString("default", {
          month: "long",
        });

        // Generate AI insights
        const insights = await generateFinancialInsights(stats, monthName);

        await sendEmail({
          to: user.email,
          subject: `Your Monthly Financial Report - ${monthName}`,
          react: EmailTemplate({
            userName: user.name,
            type: "monthly-report",
            data: {
              stats,
              month: monthName,
              insights,
            },
          }),
        });
      });
    }

    return { processed: users.length };
  }
);

// 3. Budget Alerts with Event Batching
export const checkBudgetAlerts = inngest.createFunction(
  { name: "Check Budget Alerts" },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const budgets = await step.run("fetch-budgets", async () => {
      return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });

    for (const budget of budgets) {
      const defaultAccount = budget.user.accounts[0];
      if (!defaultAccount) continue; // Skip if no default account

      await step.run(`check-budget-${budget.id}`, async () => {
        const startDate = new Date();
        startDate.setDate(1); // Start of current month

        // Calculate total expenses for the default account only
        const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            accountId: defaultAccount.id, // Only consider default account
            type: "EXPENSE",
            date: {
              gte: startDate,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        const budgetAmount = budget.amount;
        const percentageUsed = (totalExpenses / budgetAmount) * 100;

        // Check if we should send an alert
        if (
          percentageUsed >= 80 && // Default threshold of 80%
          (!budget.lastAlertSent ||
            isNewMonth(new Date(budget.lastAlertSent), new Date()))
        ) {
          await sendEmail({
            to: budget.user.email,
            subject: `Budget Alert for ${defaultAccount.name}`,
            react: EmailTemplate({
              userName: budget.user.name,
              type: "budget-alert",
              data: {
                percentageUsed,
                budgetAmount: parseInt(budgetAmount).toFixed(1),
                totalExpenses: parseInt(totalExpenses).toFixed(1),
                accountName: defaultAccount.name,
              },
            }),
          });

          // Update last alert sent
          await db.budget.update({
            where: { id: budget.id },
            data: { lastAlertSent: new Date() },
          });
        }
      });
    }
  }
);

function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

// Utility functions
function isTransactionDue(transaction) {
  // If no lastProcessed date, transaction is due
  if (!transaction.lastProcessed) return true;

  const today = new Date();
  const nextDue = new Date(transaction.nextRecurringDate);

  // Compare with nextDue date
  return nextDue <= today;
}

function calculateNextRecurringDate(date, interval) {
  const next = new Date(date);
  switch (interval) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

async function getMonthlyStats(userId, month) {
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return transactions.reduce(
    (stats, t) => {
      const amount = t.amount.toNumber();
      if (t.type === "EXPENSE") {
        stats.totalExpenses += amount;
        stats.byCategory[t.category] =
          (stats.byCategory[t.category] || 0) + amount;
      } else {
        stats.totalIncome += amount;
      }
      return stats;
    },
    {
      totalExpenses: 0,
      totalIncome: 0,
      byCategory: {},
      transactionCount: transactions.length,
    }
  );
}

// 4. Generate Promotional Offers (Weekly or Event-Based)
export const generateOffersAlerts = inngest.createFunction(
  { name: "Generate Offers Alerts" },
  { cron: "0 10 * * 1" }, // Every Monday at 10 AM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { settings: true },
      });
    });

    const OFFERS = [
      { title: "Pre-approved Credit Card", message: "Based on your prompt payments, you're eligible for a lifetime free card with 5% cashback." },
      { title: "Personal Loan at 10.5%", message: "Upgrade your lifestyle with a pre-approved personal loan of up to ₹5,00,000." },
      { title: "High-Yield SIP Opportunity", message: "Markets are prime for investment! Start an SIP in our top-rated AI Mutual Fund today." }
    ];

    for (const user of users) {
      await step.run(`process-offer-${user.id}`, async () => {
        // Randomly select one offer for demonstration
        const selected = OFFERS[Math.floor(Math.random() * OFFERS.length)];

        // Create the DB notification (Dashboard)
        await db.notification.create({
          data: {
            userId: user.id,
            title: selected.title,
            message: selected.message,
            type: "OFFER",
          }
        });

        // Send Email if allowed
        if (user.settings?.emailOffersAlert !== false && user.email) {
          await sendEmail({
            to: user.email,
            subject: `Exclusive Offer: ${selected.title}`,
            react: EmailTemplate({
              userName: user.name || "Customer",
              type: "offer",
              data: {
                offerTitle: selected.title,
                offerDetails: selected.message,
              },
            }),
          });
        }
      });
    }

    return { processed: users.length };
  }
);

// 5. Subscription Leak Terminator
export const detectSubscriptionLeaks = inngest.createFunction(
  { name: "Detect Subscription Leaks" },
  { cron: "0 10 1 * *" }, // First day of every month at 10 AM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { accounts: true },
      });
    });

    for (const user of users) {
      const suspiciousSubs = await step.run(`find-leaks-${user.id}`, async () => {
        // Find recurring transactions
        const recurring = await db.transaction.findMany({
          where: { userId: user.id, isRecurring: true, status: "COMPLETED" },
        });
        
        // Mock logic: randomly flag one as "potentially unused" if there are any
        if (recurring.length > 0) {
          const suspect = recurring[Math.floor(Math.random() * recurring.length)];
          return [suspect];
        }
        return [];
      });

      if (suspiciousSubs.length > 0 && user.email) {
        await step.run(`send-leak-alert-${user.id}`, async () => {
          for (const sub of suspiciousSubs) {
            const mailto = `mailto:support@${sub.description?.toLowerCase().replace(/[^a-z]/g, '') || "vendor"}.com?subject=Please cancel my subscription&body=Hello,%0A%0APlease cancel my subscription associated with this email address immediately.%0A%0AThank you,%0A${user.name}`;

            await sendEmail({
              to: user.email,
              subject: `Action Required: Unused Subscription Detected (${sub.description || "Service"})`,
              react: EmailTemplate({
                userName: user.name || "Customer",
                type: "subscription-alert",
                data: {
                  serviceName: sub.description || "Unknown Service",
                  amount: sub.amount.toString(),
                  interval: sub.recurringInterval || "monthly",
                  cancellationMailto: mailto
                },
              }),
            });
          }
        });
      }
    }
    return { success: true };
  }
);

// ═════════════════════════════════════════════════════════════════════════════
// 6. SMART NOTIFICATION ENGINE
//    Proactive AI alerts — fires daily and checks multiple conditions
// ═════════════════════════════════════════════════════════════════════════════

async function createNotification(userId, title, message, type = "ALERT") {
  return await db.notification.create({
    data: { userId, title, message, type, isRead: false },
  });
}

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ── 6a. Budget Velocity Alert ─────────────────────────────────────────────
// Fires if user spends > 60% of budget in first 15 days
export const smartBudgetVelocityAlert = inngest.createFunction(
  { id: "smart-budget-velocity", name: "Smart Budget Velocity Alert" },
  { cron: "0 9 15 * *" }, // 15th of every month at 9 AM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({
        include: { budgets: true, accounts: true },
      });
    });

    for (const user of users) {
      if (!user.budgets.length) continue;

      await step.run(`velocity-${user.id}`, async () => {
        const now   = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);

        const spent = await db.transaction.aggregate({
          where:  { userId: user.id, type: "EXPENSE", date: { gte: start } },
          _sum:   { amount: true },
        });

        const spentAmt  = Number(spent._sum.amount || 0);
        const budgetAmt = Number(user.budgets[0].amount);
        const pct       = budgetAmt > 0 ? (spentAmt / budgetAmt) * 100 : 0;

        if (pct >= 60) {
          // Avoid duplicate alerts
          const existing = await db.notification.findFirst({
            where: {
              userId:    user.id,
              type:      "ALERT",
              title:     { contains: "Budget Velocity" },
              createdAt: { gte: start },
            },
          });
          if (!existing) {
            await createNotification(
              user.id,
              "⚡ Budget Velocity Alert",
              `You've used ${pct.toFixed(0)}% of your monthly budget (${fmt(spentAmt)} of ${fmt(budgetAmt)}) in just 15 days. At this pace you'll overspend by ${fmt(spentAmt * 2 - budgetAmt)}.`,
              "ALERT"
            );
          }
        }
      });
    }
    return { processed: users.length };
  }
);

// ── 6b. Salary Depletion Warning ──────────────────────────────────────────
// Fires when spending velocity predicts balance exhaustion before month end
export const salaryDepletionWarning = inngest.createFunction(
  { id: "salary-depletion-warning", name: "Salary Depletion Warning" },
  { cron: "0 20 * * *" }, // Daily at 8 PM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({ include: { accounts: true } });
    });

    for (const user of users) {
      await step.run(`depletion-${user.id}`, async () => {
        const now   = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const day   = now.getDate();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        const [income, expense] = await Promise.all([
          db.transaction.aggregate({
            where: { userId: user.id, type: "INCOME", date: { gte: start } },
            _sum:  { amount: true },
          }),
          db.transaction.aggregate({
            where: { userId: user.id, type: "EXPENSE", date: { gte: start } },
            _sum:  { amount: true },
          }),
        ]);

        const incomeAmt  = Number(income._sum.amount || 0);
        const expenseAmt = Number(expense._sum.amount || 0);
        if (incomeAmt === 0) return;

        const dailyVelocity   = expenseAmt / day;
        const projectedTotal  = dailyVelocity * daysInMonth;
        const projectedDeficit= projectedTotal - incomeAmt;
        const daysLeft        = daysInMonth - day;
        const remainingBudget = incomeAmt - expenseAmt;
        const daysUntilZero   = dailyVelocity > 0 ? Math.floor(remainingBudget / dailyVelocity) : 999;

        if (projectedDeficit > incomeAmt * 0.15 && daysUntilZero < 10) {
          const existing = await db.notification.findFirst({
            where: {
              userId:    user.id,
              type:      "ALERT",
              title:     { contains: "Salary Running Low" },
              createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
            },
          });
          if (!existing) {
            await createNotification(
              user.id,
              "💸 Salary Running Low",
              `At your current spending rate of ${fmt(Math.round(dailyVelocity))}/day, your salary will run out in ~${daysUntilZero} days. You still have ${daysLeft} days left this month. Consider reducing daily spend by ${fmt(Math.round(projectedDeficit / daysLeft))}.`,
              "ALERT"
            );
          }
        }
      });
    }
    return { processed: users.length };
  }
);

// ── 6c. Goal Milestone Notification ──────────────────────────────────────
// Fires when user hits 25%, 50%, 75%, 100% of a goal
export const goalMilestoneAlert = inngest.createFunction(
  { id: "goal-milestone-alert", name: "Goal Milestone Alert" },
  { cron: "0 8 * * 1" }, // Every Monday at 8 AM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({ include: { goals: true } });
    });

    for (const user of users) {
      if (!user.goals.length) continue;

      await step.run(`goal-${user.id}`, async () => {
        const [income, expense] = await Promise.all([
          db.transaction.aggregate({ where: { userId: user.id, type: "INCOME" }, _sum: { amount: true } }),
          db.transaction.aggregate({ where: { userId: user.id, type: "EXPENSE" }, _sum: { amount: true } }),
        ]);

        const totalSavings = Math.max(
          Number(income._sum.amount || 0) - Number(expense._sum.amount || 0), 0
        );

        for (const goal of user.goals) {
          const target   = Number(goal.targetAmount);
          const progress = Math.min((totalSavings / target) * 100, 100);
          const milestone= progress >= 100 ? 100 : progress >= 75 ? 75 : progress >= 50 ? 50 : progress >= 25 ? 25 : null;

          if (!milestone) continue;

          const alreadyNotified = await db.notification.findFirst({
            where: {
              userId:  user.id,
              title:   { contains: `${milestone}%` },
              message: { contains: fmt(target) },
            },
          });

          if (!alreadyNotified) {
            const msgs = {
              25:  `Great start! You've saved 25% toward your ${fmt(target)} goal. Keep going! 🎯`,
              50:  `Halfway there! You've hit 50% of your ${fmt(target)} savings goal. You're on fire! 🔥`,
              75:  `Almost there! 75% of your ${fmt(target)} goal is complete. Just ${fmt(target - totalSavings)} to go! 💪`,
              100: `🎉 Congratulations! You've reached your ${fmt(target)} savings goal! Time to set a new one.`,
            };
            await createNotification(
              user.id,
              `🎯 Goal ${milestone}% Reached!`,
              msgs[milestone],
              "ALERT"
            );
          }
        }
      });
    }
    return { processed: users.length };
  }
);

// ── 6d. Unusual Spending Pattern Alert ────────────────────────────────────
// Fires when today's spending is 3x above daily average
export const unusualSpendingAlert = inngest.createFunction(
  { id: "unusual-spending-alert", name: "Unusual Spending Pattern Alert" },
  { cron: "0 23 * * *" }, // Daily at 11 PM
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany();
    });

    for (const user of users) {
      await step.run(`unusual-${user.id}`, async () => {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Today's spending
        const todaySpend = await db.transaction.aggregate({
          where: { userId: user.id, type: "EXPENSE", date: { gte: today } },
          _sum:  { amount: true },
        });

        // 30-day average daily spend
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthSpend = await db.transaction.aggregate({
          where: { userId: user.id, type: "EXPENSE", date: { gte: thirtyDaysAgo, lt: today } },
          _sum:  { amount: true },
        });

        const todayAmt = Number(todaySpend._sum.amount || 0);
        const avgDaily = Number(monthSpend._sum.amount || 0) / 30;

        if (todayAmt > avgDaily * 3 && todayAmt > 2000) {
          // Get top transaction today
          const topTxn = await db.transaction.findFirst({
            where:   { userId: user.id, type: "EXPENSE", date: { gte: today } },
            orderBy: { amount: "desc" },
          });

          const existing = await db.notification.findFirst({
            where: {
              userId:    user.id,
              title:     { contains: "Unusual Spending" },
              createdAt: { gte: today },
            },
          });

          if (!existing) {
            await createNotification(
              user.id,
              "🚨 Unusual Spending Detected",
              `You spent ${fmt(Math.round(todayAmt))} today — ${(todayAmt / avgDaily).toFixed(1)}× your daily average of ${fmt(Math.round(avgDaily))}. Largest transaction: ${topTxn ? `${fmt(Number(topTxn.amount))} on ${topTxn.category}` : "N/A"}.`,
              "ALERT"
            );
          }
        }
      });
    }
    return { processed: users.length };
  }
);

// ── 6e. Debt-to-Income Warning ────────────────────────────────────────────
export const debtRatioAlert = inngest.createFunction(
  { id: "debt-ratio-alert", name: "Debt-to-Income Ratio Alert" },
  { cron: "0 9 1 * *" }, // First of every month
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.user.findMany({ include: { loans: true } });
    });

    for (const user of users) {
      if (!user.loans.length) continue;

      await step.run(`dti-${user.id}`, async () => {
        const now   = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);

        const income = await db.transaction.aggregate({
          where: { userId: user.id, type: "INCOME", date: { gte: start } },
          _sum:  { amount: true },
        });

        const avgIncome  = Number(income._sum.amount || 0) / 3;
        const activeLoans= user.loans.filter(l => l.status === "ACTIVE");
        const totalEMI   = activeLoans.reduce((s, l) => s + Number(l.emiAmount), 0);
        const dti        = avgIncome > 0 ? (totalEMI / avgIncome) * 100 : 0;

        if (dti >= 40) {
          const existing = await db.notification.findFirst({
            where: {
              userId:    user.id,
              title:     { contains: "Debt Warning" },
              createdAt: { gte: start },
            },
          });
          if (!existing) {
            await createNotification(
              user.id,
              "🏦 Debt Warning",
              `Your debt-to-income ratio is ${dti.toFixed(0)}% — above the safe limit of 40%. Total EMIs: ${fmt(Math.round(totalEMI))}/month vs income ${fmt(Math.round(avgIncome))}/month. Avoid taking new loans.`,
              "ALERT"
            );
          }
        }
      });
    }
    return { processed: users.length };
  }
);