import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { getUserGoals } from "@/actions/goals";
import { getFinanceScore } from "@/actions/finance-score";

import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";
import { GoalsCard } from "./_components/goals-card";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import ChatBot from "@/components/ChatBot";
import DashboardCharts from "./_components/dashboard-charts";
import ReceiptScanner from "@/components/ReceiptScanner";
import InvestmentWidget from "./_components/investment-widget";
import DashboardHero from "./_components/dashboard-hero";
import AiInsightsDashboard from "./_components/ai-insights-dashboard";

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

  // Serialise for client components
  const txForCharts = (transactions || []).map(t => ({
    id:       t.id,
    type:     t.type,
    amount:   Number(t.amount),
    category: t.category,
    date:     t.date?.toISOString?.() ?? String(t.date),
  }));

  const accsForHero = (accounts || []).map(a => ({
    id:        a.id,
    name:      a.name,
    type:      a.type,
    balance:   Number(a.balance),
    isDefault: a.isDefault,
  }));

  const budgetForHero = budgetData ? {
    budget: budgetData.budget ? { amount: Number(budgetData.budget.amount) } : null,
    currentExpenses: Number(budgetData.currentExpenses || 0),
  } : null;

  return (
    <div className="relative space-y-5">

      {/* ── Hero: Net Worth + KPIs ── */}
      <DashboardHero
        accounts={accsForHero}
        transactions={txForCharts}
        financeScore={financeScore?.score ?? null}
        budgetData={budgetForHero}
      />

      {/* ── Main 2-col grid: Investment + Budget ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Investment — takes 3 columns */}
        <div className="lg:col-span-3">
          <InvestmentWidget />
        </div>

        {/* Budget — takes 2 columns */}
        <div className="lg:col-span-2">
          <BudgetProgress
            initialBudget={budgetData?.budget}
            currentExpenses={budgetData?.currentExpenses || 0}
          />
        </div>
      </div>

      {/* ── Financial Charts (full width) ── */}
      <DashboardCharts transactions={txForCharts} />

      {/* ── AI Insights: Anomaly Detection + Spending Personality ── */}
      <AiInsightsDashboard />

      {/* ── Goals + Accounts (side by side if goals exist) ── */}
      {goals && goals.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <GoalsCard goals={goals} />
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1">
              <CreateAccountDrawer>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                  <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
                    <Plus className="h-10 w-10 mb-2" />
                    <p className="text-sm font-medium">Add New Account</p>
                  </CardContent>
                </Card>
              </CreateAccountDrawer>
              {accounts.slice(0, 2).map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>
        </div>
      ) : (
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
      )}

      {/* ── Transaction Overview ── */}
      <DashboardOverview accounts={accounts} transactions={transactions || []} />

      {/* ── Receipt Scanner ── */}
      <div className="max-w-lg">
        <ReceiptScanner />
      </div>

      <ChatBot />
    </div>
  );
}