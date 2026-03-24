import { getUserAccounts, getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { getUserGoals } from "@/actions/goals";
import { getFinanceScore } from "@/actions/finance-score";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { DashboardOverview } from "./_components/transaction-overview";
import { GoalsCard } from "./_components/goals-card";
import DashboardCharts from "./_components/dashboard-charts";
import ReceiptScanner from "@/components/ReceiptScanner";
import InvestmentWidget from "./_components/investment-widget";
import DashboardHero from "./_components/dashboard-hero";
import AiInsightsDashboard from "./_components/ai-insights-dashboard";
import ExportButton from "@/components/ExportButton";
import FraudDetectionWidget from "./_components/fraud-detection-widget";
import { Plus, Wallet } from "lucide-react";
import SmartGoalsAI from "@/components/SmartGoalsAI";
import NLSearch from "@/components/NLSearch";

export default async function DashboardPage() {
  // ── Parallel fetches — eliminates sequential waterfall ────────────────────
  const { userId } = await auth();

  const [accounts, transactions, goals, financeScore, userRecord] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
    getUserGoals(),
    getFinanceScore(),
    userId ? db.user.findUnique({
      where:   { clerkUserId: userId },
      include: { settings: true },
    }) : Promise.resolve(null),
  ]);

  if (!accounts || accounts.length === 0) redirect("/onboarding");

  // Budget depends on defaultAccount — one extra fetch (unavoidable)
  const defaultAccount = accounts?.find((a) => a.isDefault);
  const budgetData     = defaultAccount ? await getCurrentBudget(defaultAccount.id) : null;
  const upiId          = userRecord?.settings?.upiId || null;

  const txForCharts = (transactions || []).map(t => ({
    id: t.id, type: t.type, amount: Number(t.amount),
    category: t.category, date: t.date?.toISOString?.() ?? String(t.date),
  }));

  const accsForHero = (accounts || []).map(a => ({
    id: a.id, name: a.name, type: a.type,
    balance: Number(a.balance), isDefault: a.isDefault,
  }));

  const budgetForHero = budgetData ? {
    budget: budgetData.budget ? { amount: Number(budgetData.budget.amount) } : null,
    currentExpenses: Number(budgetData.currentExpenses || 0),
  } : null;

  return (
    <div style={{ paddingTop: 24, paddingBottom: 48 }}>

      {/* ── SECTION 1: Page title row + Hero ── */}
      <div style={{
        background:   "linear-gradient(180deg, rgba(16,185,129,.06) 0%, rgba(6,182,212,.03) 50%, transparent 100%)",
        border:       "1px solid rgba(52,211,153,.1)",
        borderRadius: 24, padding: "24px 28px 28px",
        marginBottom: 16,
      }}>
        {/* Title + Export */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{
              fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 900, margin: 0,
              background: "linear-gradient(135deg,#f1f5f9 0%,#94a3b8 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              fontFamily: "'Sora',sans-serif",
            }}>Dashboard</h1>
            <p style={{ fontSize:".75rem", color:"#475569", margin:"4px 0 0" }}>
              {new Date().toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
            </p>
          </div>
          <ExportButton />
        </div>

        {/* Hero KPIs */}
        <DashboardHero
          accounts={accsForHero}
          transactions={txForCharts}
          financeScore={financeScore?.score ?? null}
          budgetData={budgetForHero}
        />
      </div>

      {/* ── SECTION 2: Investment + Budget ── */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16, marginBottom:16 }}>
        <InvestmentWidget />
        <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
        />
      </div>

      {/* ── SECTION 3: Charts ── */}
      <div style={{ marginBottom:16 }}>
        <DashboardCharts transactions={txForCharts} />
      </div>

      {/* ── SECTION 4: AI Insights + Fraud ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <AiInsightsDashboard />
        <FraudDetectionWidget />
      </div>

      {/* ── SECTION 5: Goals + Accounts ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        {goals && goals.length > 0 ? (
          <SmartGoalsAI />
        ) : (
          <div style={{
            background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)",
            borderRadius:20, padding:"32px 20px", textAlign:"center",
          }}>
            <p style={{ fontSize:"2rem", margin:"0 0 10px" }}>🎯</p>
            <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>No goals yet</p>
            <p style={{ color:"#64748b", fontSize:".78rem", margin:0 }}>Add savings goals to track progress</p>
          </div>
        )}

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
            <Wallet size={14} style={{ color:"#60a5fa" }}/>
            <span style={{ fontSize:".7rem", fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:".06em" }}>Your Accounts</span>
          </div>
          <CreateAccountDrawer>
            <div className="add-account-hover" style={{
              background:"rgba(255,255,255,.02)",
              border:"1px dashed rgba(255,255,255,.12)",
              borderRadius:16, padding:"16px 18px",
              display:"flex", alignItems:"center", justifyContent:"center",
              gap:8, cursor:"pointer",
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%",
                background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <Plus size={14} style={{ color:"#34d399" }}/>
              </div>
              <span style={{ fontSize:".78rem", color:"#64748b", fontWeight:600 }}>Add New Account</span>
            </div>
          </CreateAccountDrawer>
          {accounts.slice(0, 3).map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      </div>

      {/* ── SECTION 6: Transactions ── */}
      <div style={{ marginBottom:16 }}>
        <DashboardOverview accounts={accounts} transactions={transactions || []} upiId={upiId} />
      </div>

      {/* ── SECTION 7: Receipt Scanner ── */}
      <div style={{ maxWidth:560 }}>
        <ReceiptScanner />
      </div>

    </div>
  );
}