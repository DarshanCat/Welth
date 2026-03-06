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
import { LSTMPredictionCard } from "./_components/lstm-prediction-card";

import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import ChatBot from "@/components/ChatBot";

export default async function DashboardPage() {
  const [accounts, transactions, goals] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
    getUserGoals(),
  ]);

  const financeScore = await getFinanceScore();
  const defaultAccount = accounts?.find((a) => a.isDefault);

  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  return (
    <div className="relative space-y-6 pb-24">

      {/* Row 1: Budget + Finance Score */}
      <div className="grid gap-4 md:grid-cols-2">
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
        {financeScore && (
          <FinanceScoreCard
            score={financeScore.score}
            breakdown={financeScore.breakdown}
          />
        )}
      </div>

      {/* Row 2: Goals */}
      {goals && goals.length > 0 && <GoalsCard goals={goals} />}

      {/* Row 3: Transaction Overview */}
      <DashboardOverview
        accounts={accounts}
        transactions={transactions || []}
      />

      {/* Row 4: Accounts grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Row 5: LSTM Prediction */}
      <LSTMPredictionCard transactions={transactions || []} />

      <ChatBot />
    </div>
  );
}