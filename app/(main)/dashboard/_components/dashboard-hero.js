"use client";

import { useMemo } from "react";
import {
  TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownRight, Target, Activity,
} from "lucide-react";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtShort = (n) => {
  if (Math.abs(n) >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (Math.abs(n) >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000)       return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

export default function DashboardHero({ accounts = [], transactions = [], financeScore = null, budgetData = null }) {
  const now = new Date();

  const stats = useMemo(() => {
    const netWorth = accounts.reduce((s, a) => s + Number(a.balance), 0);

    const thisMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const income  = thisMonthTx.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const expense = thisMonthTx.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
    const lmIncome  = lastMonthTx.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
    const lmExpense = lastMonthTx.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

    const savings     = Math.max(income - expense, 0);
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const incomeTrend  = lmIncome  > 0 ? ((income  - lmIncome)  / lmIncome  * 100).toFixed(1) : null;
    const expenseTrend = lmExpense > 0 ? ((expense - lmExpense) / lmExpense * 100).toFixed(1) : null;

    const budgetUsed = budgetData?.currentExpenses || 0;
    const budgetMax  = budgetData?.budget?.amount   || 0;
    const budgetPct  = budgetMax > 0 ? Math.round((budgetUsed / budgetMax) * 100) : 0;

    return { netWorth, income, expense, savings, savingsRate, incomeTrend, expenseTrend, budgetUsed, budgetMax, budgetPct };
  }, [accounts, transactions, budgetData]);

  const scoreColor = financeScore >= 70 ? "#34d399" : financeScore >= 40 ? "#fbbf24" : "#f87171";
  const scoreLabel = financeScore >= 70 ? "Excellent" : financeScore >= 40 ? "Good" : "Needs Work";

  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Greeting + Net Worth ───────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(16,185,129,.08) 0%, rgba(52,211,153,.04) 50%, rgba(6,182,212,.06) 100%)",
        border: "1px solid rgba(52,211,153,.18)",
        borderRadius: 20,
        padding: "24px 28px",
        marginBottom: 12,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow blobs */}
        <div style={{ position:"absolute", top:-60, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(52,211,153,.06)", filter:"blur(40px)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:100, width:150, height:150, borderRadius:"50%", background:"rgba(6,182,212,.05)", filter:"blur(30px)", pointerEvents:"none" }} />

        <div style={{ position:"relative", display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div>
            <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 4px", fontWeight:600, textTransform:"uppercase", letterSpacing:".08em" }}>
              Total Net Worth
            </p>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <h1 style={{ fontSize:"clamp(1.8rem, 4vw, 2.8rem)", fontWeight:800, color:"#f1f5f9", margin:0, lineHeight:1, fontFamily:"'Sora', sans-serif" }}>
                {fmtShort(stats.netWorth)}
              </h1>
              <span style={{ fontSize:".8rem", color:"#64748b", fontWeight:500 }}>
                across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p style={{ fontSize:".72rem", color:"#475569", margin:"6px 0 0" }}>{monthLabel}</p>
          </div>

          {/* Finance Score badge */}
          {financeScore !== null && (
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center",
              padding:"12px 20px", borderRadius:16,
              background:"rgba(255,255,255,.04)",
              border:`1px solid ${scoreColor}30`,
            }}>
              <div style={{ position:"relative", width:60, height:60 }}>
                <svg viewBox="0 0 60 60" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
                  <circle cx="30" cy="30" r="24" fill="none" stroke={scoreColor} strokeWidth="5"
                    strokeDasharray={`${(financeScore / 100) * 150.8} 150.8`}
                    strokeLinecap="round" style={{ transition:"stroke-dasharray .8s ease" }} />
                </svg>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
                  <span style={{ fontSize:"1rem", fontWeight:800, color:scoreColor, lineHeight:1 }}>{financeScore}</span>
                </div>
              </div>
              <span style={{ fontSize:".65rem", color:scoreColor, fontWeight:700, marginTop:4 }}>HEALTH SCORE</span>
              <span style={{ fontSize:".6rem", color:"#64748b" }}>{scoreLabel}</span>
            </div>
          )}
        </div>

        {/* ── 4 KPI chips ── */}
        <div style={{ position:"relative", display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginTop:20 }}>
          {[
            {
              icon: ArrowUpRight, label: "Income", value: fmtINR(stats.income),
              color:"#34d399", bg:"rgba(52,211,153,.1)", border:"rgba(52,211,153,.2)",
              trend: stats.incomeTrend, trendUp: parseFloat(stats.incomeTrend) >= 0,
            },
            {
              icon: ArrowDownRight, label: "Expenses", value: fmtINR(stats.expense),
              color:"#f87171", bg:"rgba(248,113,113,.08)", border:"rgba(248,113,113,.2)",
              trend: stats.expenseTrend, trendUp: parseFloat(stats.expenseTrend) <= 0,
            },
            {
              icon: Wallet, label: "Savings", value: fmtINR(stats.savings),
              color:"#a78bfa", bg:"rgba(167,139,250,.08)", border:"rgba(167,139,250,.2)",
              sub: `${stats.savingsRate}% rate`,
            },
            {
              icon: Target, label: "Budget Used", value: `${stats.budgetPct}%`,
              color: stats.budgetPct > 90 ? "#f87171" : stats.budgetPct > 70 ? "#fbbf24" : "#60a5fa",
              bg: stats.budgetPct > 90 ? "rgba(248,113,113,.08)" : "rgba(96,165,250,.08)",
              border: stats.budgetPct > 90 ? "rgba(248,113,113,.2)" : "rgba(96,165,250,.2)",
              sub: stats.budgetMax > 0 ? `of ${fmtShort(stats.budgetMax)}` : "No budget set",
            },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} style={{
                padding: "12px 14px", borderRadius: 14,
                background: k.bg, border: `1px solid ${k.border}`,
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <Icon size={13} style={{ color: k.color }} />
                    <span style={{ fontSize:".65rem", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{k.label}</span>
                  </div>
                  {k.trend != null && (
                    <span style={{ fontSize:".6rem", color: k.trendUp ? "#34d399" : "#f87171", fontWeight:700 }}>
                      {parseFloat(k.trend) >= 0 ? "↑" : "↓"}{Math.abs(k.trend)}%
                    </span>
                  )}
                </div>
                <p style={{ fontWeight:800, fontSize:"1rem", color: k.color, margin:0, lineHeight:1 }}>{k.value}</p>
                {k.sub && <p style={{ fontSize:".62rem", color:"#64748b", margin:"4px 0 0" }}>{k.sub}</p>}

                {/* Budget mini progress bar */}
                {k.label === "Budget Used" && stats.budgetMax > 0 && (
                  <div style={{ height:3, borderRadius:2, background:"rgba(255,255,255,.06)", marginTop:8 }}>
                    <div style={{ height:"100%", borderRadius:2, width:`${Math.min(stats.budgetPct,100)}%`, background:k.color, transition:"width .5s" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}