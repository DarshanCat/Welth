import { serve } from "inngest/next";

import { inngest } from "@/lib/inngest/client";
import {
  checkBudgetAlerts,
  generateMonthlyReports,
  processRecurringTransaction,
  triggerRecurringTransactions,
  generateOffersAlerts,
  detectSubscriptionLeaks,
    smartBudgetVelocityAlert,
    salaryDepletionWarning,
    goalMilestoneAlert,
    unusualSpendingAlert,
    debtRatioAlert,
  smartBudgetVelocityAlert,
  salaryDepletionWarning,
  goalMilestoneAlert,
  unusualSpendingAlert,
  debtRatioAlert,
} from "@/lib/inngest/function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processRecurringTransaction,
    triggerRecurringTransactions,
    generateMonthlyReports,
    checkBudgetAlerts,
    generateOffersAlerts,
    detectSubscriptionLeaks,
    smartBudgetVelocityAlert,
    salaryDepletionWarning,
    goalMilestoneAlert,
    unusualSpendingAlert,
    debtRatioAlert,
  ],
});