"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Briefcase, BadgeCheck, TrendingUp, TrendingDown, Wallet,
  Target, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight,
  ShieldCheck, AlertTriangle, CheckCircle, Info, FileText,
  BarChart2, List, PieChart, Calendar, IndianRupee,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart as RPie, Pie, Cell,
} from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const HEALTH_CONFIG = {
  "Excellent":       { color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.35)",  icon: ShieldCheck },
  "Good":            { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)",   icon: CheckCircle },
  "Fair":            { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",   icon: AlertTriangle },
  "Needs Attention": { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)",  icon: AlertTriangle },
};

const FINDING_CONFIG = {
  positive: { color: "#34d399", icon: TrendingUp },
  negative: { color: "#f87171", icon: TrendingDown },
  neutral:  { color: "#94a3b8", icon: Info },
};

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

const TABS = [
  { key: "overview",     label: "Overview",     icon: BarChart2 },
  { key: "transactions", label: "Transactions", icon: List },
  { key: "budget",       label: "Budget",       icon: PieChart },
  { key: "goals",        label: "Goals",        icon: Target },
];

function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "1rem", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize: "1.2rem", fontWeight: 800, color, fontFamily: "'Sora',sans-serif", margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: ".72rem", color: "#64748b", margin: 0 }}>{sub}</p>}
    </div>
  );
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 14px", fontSize: 12 }}>
      <p style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: 0 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
}

function TxRow({ tx }) {
  const isIncome = tx.type === "INCOME";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: isIncome ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", flexShrink: 0 }}>
        {isIncome ? <ArrowUpRight size={15} style={{ color: "#34d399" }} /> : <ArrowDownRight size={15} style={{ color: "#f87171" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: ".85rem", fontWeight: 600, color: "#e2e8f0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description || tx.category}</p>
        <p style={{ fontSize: ".72rem", color: "#64748b", margin: "2px 0 0" }}>{tx.category} · {fmtDate(tx.date)}</p>
      </div>
      <p style={{ fontSize: ".88rem", fontWeight: 700, color: isIncome ? "#34d399" : "#f87171", flexShrink: 0, margin: 0 }}>
        {isIncome ? "+" : "-"}{fmt(tx.amount)}
      </p>
    </div>
  );
}

export default function CADashboardPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [tab,      setTab]      = useState("overview");
  const [txFilter, setTxFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      const res  = await fetch("/api/ca-dashboard");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch { setError(true); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { metrics, categoryBreakdown, monthlyTrend, recentTx, accounts, goals, budget, analysis } = data || {};
  const health = HEALTH_CONFIG[analysis?.overallHealth] || HEALTH_CONFIG["Fair"];
  const HealthIcon = health.icon;
  const filteredTx = (recentTx || []).filter(t => txFilter === "ALL" || t.type === txFilter);

  return (
    <div style={{ minHeight: "100vh", padding: "1rem 1rem 6rem", maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.4)" }}>
              <Briefcase size={20} style={{ color: "#fbbf24" }} />
            </div>
            <BadgeCheck size={14} style={{ color: "#34d399", position: "absolute", bottom: -3, right: -3 }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "'Sora',sans-serif", margin: 0, lineHeight: 1 }}>CA Report</h1>
            <p style={{ fontSize: ".72rem", color: "#64748b", margin: "3px 0 0" }}>
              Prepared by CA Arjun · {data ? new Date(data.generatedAt).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—"}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: ".8rem", cursor: "pointer" }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 9999, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={24} style={{ color: "#fbbf24", animation: "spin 1s linear infinite" }} />
          </div>
          <p style={{ color: "#64748b", fontSize: ".9rem", margin: 0 }}>CA Arjun is preparing your report…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <p style={{ color: "#f87171", marginBottom: 12 }}>Failed to load report.</p>
          <button onClick={load} style={{ color: "#fbbf24", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}>Try again</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Health banner */}
          <div style={{ background: health.bg, border: `1px solid ${health.border}`, borderRadius: 20, padding: "1rem 1.25rem", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: `${health.color}20`, border: `1px solid ${health.color}40`, flexShrink: 0 }}>
              <HealthIcon size={24} style={{ color: health.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <p style={{ fontWeight: 800, color: health.color, fontSize: "1.1rem", fontFamily: "'Sora',sans-serif", margin: 0 }}>{analysis?.overallHealth || "—"}</p>
                <span style={{ fontSize: ".72rem", padding: "2px 10px", borderRadius: 9999, background: `${health.color}20`, color: health.color, fontWeight: 700 }}>
                  Score: {analysis?.healthScore ?? "—"}/100
                </span>
              </div>
              <p style={{ color: "#94a3b8", fontSize: ".82rem", lineHeight: 1.6, margin: 0 }}>{analysis?.executiveSummary}</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, padding: "9px 4px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: ".78rem", fontWeight: active ? 700 : 500, background: active ? "rgba(251,191,36,0.15)" : "transparent", color: active ? "#fbbf24" : "#64748b", border: active ? "1px solid rgba(251,191,36,0.3)" : "1px solid transparent", cursor: "pointer", transition: "all .2s" }}>
                  <Icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <StatCard label="This Month Income"  value={fmt(metrics?.thisMonth?.income)}  color="#34d399" icon={TrendingUp}   sub="Current month" />
                <StatCard label="This Month Spent"   value={fmt(metrics?.thisMonth?.expense)} color="#f87171" icon={TrendingDown} sub="Current month" />
                <StatCard label="Total Balance"      value={fmt(metrics?.totalBalance)}        color="#a78bfa" icon={Wallet}       sub={`${accounts?.length} account(s)`} />
                <StatCard label="3M Savings Rate"    value={`${metrics?.savingsRate3M}%`}     color="#60a5fa" icon={ShieldCheck}  sub="Last 3 months" />
              </div>

              {/* Area chart */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 16, marginTop: 0 }}>6-Month Income vs Expenses</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTip />} />
                    <Area type="monotone" dataKey="income"  name="Income"  stroke="#34d399" fill="rgba(52,211,153,0.1)"  strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#f87171" fill="rgba(248,113,113,0.1)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Findings + Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Key Findings</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(analysis?.keyFindings || []).map((f, i) => {
                      const cfg = FINDING_CONFIG[f.type] || FINDING_CONFIG.neutral;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <Icon size={13} style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }} />
                          <p style={{ fontSize: ".78rem", color: "#94a3b8", margin: 0, lineHeight: 1.55 }}>{f.finding}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Action Items</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(analysis?.actionItems || []).map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ width: 20, height: 20, borderRadius: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, flexShrink: 0, background: i === 0 ? "rgba(248,113,113,0.2)" : i === 1 ? "rgba(251,191,36,0.2)" : "rgba(52,211,153,0.2)", color: i === 0 ? "#f87171" : i === 1 ? "#fbbf24" : "#34d399" }}>
                          {a.priority}
                        </span>
                        <div>
                          <p style={{ fontSize: ".78rem", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{a.action}</p>
                          <p style={{ fontSize: ".72rem", color: "#64748b", margin: "2px 0 0" }}>{a.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {analysis?.taxNote && (
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <FileText size={11} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: ".75rem", color: "#fbbf24", fontStyle: "italic", margin: 0 }}>{analysis.taxNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Accounts */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Accounts</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                  {(accounts || []).map(acc => (
                    <div key={acc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Wallet size={14} style={{ color: "#a78bfa" }} />
                        </div>
                        <div>
                          <p style={{ fontSize: ".82rem", fontWeight: 600, color: "#e2e8f0", margin: 0 }}>{acc.name}</p>
                          <p style={{ fontSize: ".7rem", color: "#64748b", margin: 0 }}>{acc.type}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: ".82rem", fontWeight: 700, color: acc.balance >= 0 ? "#34d399" : "#f87171", margin: 0 }}>{fmt(acc.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSACTIONS ── */}
          {tab === "transactions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {["ALL","INCOME","EXPENSE"].map(f => (
                  <button key={f} onClick={() => setTxFilter(f)}
                    style={{ padding: "6px 16px", borderRadius: 9999, fontSize: ".78rem", fontWeight: 600, background: txFilter === f ? (f==="INCOME" ? "rgba(52,211,153,0.15)" : f==="EXPENSE" ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)") : "rgba(255,255,255,0.05)", color: txFilter === f ? (f==="INCOME" ? "#34d399" : f==="EXPENSE" ? "#f87171" : "#fbbf24") : "#64748b", border: `1px solid ${txFilter===f ? (f==="INCOME" ? "rgba(52,211,153,0.4)" : f==="EXPENSE" ? "rgba(248,113,113,0.4)" : "rgba(251,191,36,0.4)") : "rgba(255,255,255,0.08)"}`, cursor: "pointer" }}>
                    {f}
                  </button>
                ))}
                <span style={{ marginLeft: "auto", fontSize: ".72rem", color: "#64748b" }}>Last 20 transactions</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[
                  { label: "Total In",        val: fmt(filteredTx.filter(t=>t.type==="INCOME").reduce((s,t)=>s+t.amount,0)),  color: "#34d399", bg: "rgba(52,211,153,0.07)",   border: "rgba(52,211,153,0.2)" },
                  { label: "Total Out",       val: fmt(filteredTx.filter(t=>t.type==="EXPENSE").reduce((s,t)=>s+t.amount,0)), color: "#f87171", bg: "rgba(248,113,113,0.07)",  border: "rgba(248,113,113,0.2)" },
                  { label: "Transactions",    val: filteredTx.length,                                                          color: "#a78bfa", bg: "rgba(139,92,246,0.07)",   border: "rgba(139,92,246,0.2)" },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: 12, textAlign: "center" }}>
                    <p style={{ fontSize: ".72rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                    <p style={{ fontSize: "1.05rem", fontWeight: 700, color: s.color, margin: "4px 0 0" }}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "4px 16px" }}>
                {filteredTx.length === 0
                  ? <p style={{ textAlign: "center", color: "#64748b", padding: "2rem 0", fontSize: ".88rem" }}>No transactions found.</p>
                  : filteredTx.map(tx => <TxRow key={tx.id} tx={tx} />)
                }
              </div>
            </div>
          )}

          {/* ── BUDGET ── */}
          {tab === "budget" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!budget ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
                  <IndianRupee size={32} style={{ color: "#64748b", margin: "0 auto 12px", display: "block" }} />
                  <p style={{ color: "#64748b", fontSize: ".88rem", margin: 0 }}>No budget set. Add one from your main dashboard.</p>
                </div>
              ) : (
                <>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", margin: 0 }}>Monthly Budget Usage</p>
                      <span style={{ fontSize: ".9rem", fontWeight: 800, color: parseFloat(metrics?.budgetUsed) > 90 ? "#f87171" : parseFloat(metrics?.budgetUsed) > 75 ? "#fbbf24" : "#34d399" }}>
                        {metrics?.budgetUsed}% used
                      </span>
                    </div>
                    <div style={{ height: 16, borderRadius: 8, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 12 }}>
                      <div style={{ height: "100%", borderRadius: 8, width: `${Math.min(100, parseFloat(metrics?.budgetUsed || 0))}%`, background: parseFloat(metrics?.budgetUsed) > 90 ? "linear-gradient(90deg,#ef4444,#dc2626)" : parseFloat(metrics?.budgetUsed) > 75 ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#10b981,#059669)", transition: "width .7s ease" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", color: "#64748b" }}>
                      <span>Spent: {fmt(budget.used)}</span>
                      <span>Budget: {fmt(budget.amount)}</span>
                      <span>Left: {fmt(Math.max(0, budget.amount - budget.used))}</span>
                    </div>
                  </div>

                  {categoryBreakdown?.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                        <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Spending by Category</p>
                        <ResponsiveContainer width="100%" height={180}>
                          <RPie>
                            <Pie data={categoryBreakdown.slice(0,7)} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={72} labelLine={false}>
                              {categoryBreakdown.slice(0,7).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={v => fmt(v)} />
                          </RPie>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                        <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Category Breakdown</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {categoryBreakdown.slice(0,7).map((c, i) => (
                            <div key={c.category}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", marginBottom: 4 }}>
                                <span style={{ color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{c.category}</span>
                                <span style={{ color: PIE_COLORS[i % PIE_COLORS.length], fontWeight: 600, flexShrink: 0 }}>{c.percent}%</span>
                              </div>
                              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
                                <div style={{ height: "100%", borderRadius: 3, width: `${c.percent}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                    <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 16, marginTop: 0 }}>Monthly Savings Trend</p>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={monthlyTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<ChartTip />} />
                        <Bar dataKey="savings" name="Savings" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── GOALS ── */}
          {tab === "goals" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!goals?.length ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
                  <Target size={32} style={{ color: "#64748b", margin: "0 auto 12px", display: "block" }} />
                  <p style={{ color: "#64748b", fontSize: ".88rem", margin: 0 }}>No savings goals yet. Tell the CA chatbot to create one.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {[
                      { label: "Goals",         val: goals.length,                                                            color: "#a78bfa", bg: "rgba(139,92,246,0.07)", border: "rgba(139,92,246,0.2)" },
                      { label: "Total Target",  val: fmt(goals.reduce((s,g)=>s+g.targetAmount,0)),                           color: "#34d399", bg: "rgba(52,211,153,0.07)",  border: "rgba(52,211,153,0.2)" },
                      { label: "Monthly Need",  val: fmt(goals.reduce((s,g)=>s+g.monthlySave,0)),                            color: "#fbbf24", bg: "rgba(251,191,36,0.07)",  border: "rgba(251,191,36,0.2)" },
                    ].map(s => (
                      <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: 12, textAlign: "center" }}>
                        <p style={{ fontSize: ".72rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                        <p style={{ fontSize: "1.05rem", fontWeight: 700, color: s.color, margin: "4px 0 0" }}>{s.val}</p>
                      </div>
                    ))}
                  </div>

                  {goals.map((g, i) => {
                    const pct = Math.min(100, ((metrics?.last3Months?.savings || 0) / g.targetAmount) * 100);
                    return (
                      <div key={g.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Target size={16} style={{ color: "#a78bfa" }} />
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#e2e8f0", margin: 0 }}>Goal {i+1}</p>
                              <p style={{ fontSize: ".72rem", color: "#64748b", margin: "2px 0 0" }}>{g.months} months · {fmt(g.monthlySave)}/mo needed</p>
                            </div>
                          </div>
                          <p style={{ fontWeight: 800, fontSize: "1rem", color: "#a78bfa", margin: 0 }}>{fmt(g.targetAmount)}</p>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", color: "#64748b", marginBottom: 6 }}>
                            <span>Progress (estimated)</span><span>{pct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.07)" }}>
                            <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`, background: "linear-gradient(90deg,#8b5cf6,#a78bfa)", transition: "width .7s ease" }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".72rem", color: "#64748b" }}>
                          <Calendar size={11} />
                          <span>Deadline in ~{g.months} months from creation</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}