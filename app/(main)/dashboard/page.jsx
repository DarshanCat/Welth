import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { getUserGoals } from "@/actions/goals";
import { getFinanceScore } from "@/actions/finance-score";

import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";
import { GoalsCard } from "./_components/goals-card";
import { FinanceScoreCard } from "./_components/finance-score-card";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import DashboardCharts from "./_components/dashboard-charts";
import ReceiptScanner from "@/components/ReceiptScanner";

export default async function DashboardPage() {
  const [accounts, transactions, goals] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
    getUserGoals(),
  ]);

  const financeScore   = await getFinanceScore();
  const defaultAccount = accounts?.find((a) => a.isDefault);
  let budgetData       = null;
  if (defaultAccount) budgetData = await getCurrentBudget(defaultAccount.id);

  // Serialise transactions for client chart component
  const txForCharts = (transactions || []).map(t => ({
    id:       t.id,
    type:     t.type,
    amount:   Number(t.amount),
    category: t.category,
    date:     t.date?.toISOString?.() ?? String(t.date),
  }));

  return (
    <div className="relative space-y-6">

      {/* Row 1: Budget + Finance Score */}
      <div className="grid gap-4 md:grid-cols-2">
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
        {financeScore && <FinanceScoreCard score={financeScore.score} />}
      </div>

      {/* Row 2: Rich Charts */}
      <DashboardCharts transactions={txForCharts} />

      {/* Row 3: Goals */}
      {goals && goals.length > 0 && <GoalsCard goals={goals} />}

      {/* Row 4: Transaction Overview */}
      <DashboardOverview accounts={accounts} transactions={transactions || []} />

      {/* Row 5: Accounts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>

      {/* Row 6: Receipt Scanner */}
      <div className="max-w-lg">
        <ReceiptScanner />
      </div>

      <ChatBot />
    </div>
  );
}