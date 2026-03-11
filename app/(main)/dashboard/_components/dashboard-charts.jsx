"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  CartesianGrid, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon,
  Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const fmt     = (n) => `₹${Math.abs(n) >= 1000 ? (Math.abs(n)/1000).toFixed(1)+"k" : Math.abs(n).toFixed(0)}`;
const fmtFull = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n ?? 0);

const PIE_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#a78bfa"];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f172a", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"8px 14px", fontSize:12 }}>
      <p style={{ color:"#94a3b8", margin:"0 0 4px" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:"2px 0" }}>{p.name}: {fmtFull(p.value)}</p>
      ))}
    </div>
  );
};

export default function DashboardCharts({ transactions = [] }) {
  const [activeTab, setActiveTab] = useState("trends");

  // ── Build monthly data (last 6 months) ─────────────────────────────────────
  const monthlyData = useMemo(() => {
    const now    = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const inRange = transactions.filter(t => {
        const td = new Date(t.date);
        return td >= d && td <= e;
      });
      const income  = inRange.filter(t => t.type === "INCOME").reduce((s,t) => s + t.amount, 0);
      const expense = inRange.filter(t => t.type === "EXPENSE").reduce((s,t) => s + t.amount, 0);
      months.push({
        month:   d.toLocaleString("en-IN", { month:"short", year:"2-digit" }),
        income:  Math.round(income),
        expense: Math.round(expense),
        savings: Math.round(Math.max(0, income - expense)),
        net:     Math.round(income - expense),
      });
    }
    return months;
  }, [transactions]);

  // ── Category spend (current month) ─────────────────────────────────────────
  const categoryData = useMemo(() => {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const map   = {};
    transactions
      .filter(t => t.type === "EXPENSE" && new Date(t.date) >= start)
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  // ── Daily spend last 30 days ────────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
      map[key] = { day: key, expense: 0, income: 0 };
    }
    transactions.forEach(t => {
      const d   = new Date(t.date);
      const dif = Math.floor((now - d) / 86400000);
      if (dif < 30) {
        const key = d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
        if (map[key]) {
          if (t.type === "EXPENSE") map[key].expense += t.amount;
          else map[key].income += t.amount;
        }
      }
    });
    return Object.values(map).map(d => ({ ...d, expense: Math.round(d.expense), income: Math.round(d.income) }));
  }, [transactions]);

  // ── Summary numbers ─────────────────────────────────────────────────────────
  const thisMonth = monthlyData[monthlyData.length - 1] || {};
  const lastMonth = monthlyData[monthlyData.length - 2] || {};
  const incomeTrend  = lastMonth.income  ? ((thisMonth.income  - lastMonth.income)  / lastMonth.income  * 100).toFixed(1) : 0;
  const expenseTrend = lastMonth.expense ? ((thisMonth.expense - lastMonth.expense) / lastMonth.expense * 100).toFixed(1) : 0;

  const TABS = [
    { key: "trends",     label: "6M Trend",  icon: Activity },
    { key: "categories", label: "Categories",icon: PieIcon },
    { key: "daily",      label: "Daily",     icon: BarChart2 },
  ];

  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden" }}>

      {/* Header row */}
      <div style={{ padding:".9rem 1.2rem", borderBottom:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <BarChart2 size={16} style={{ color:"#60a5fa" }} />
          <p style={{ fontWeight:700, color:"#f1f5f9", fontSize:".9rem", margin:0 }}>Financial Overview</p>
        </div>

        {/* Quick stat pills */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            { label:"Income",  val: fmtFull(thisMonth.income),  trend: incomeTrend,  color:"#34d399" },
            { label:"Spent",   val: fmtFull(thisMonth.expense), trend: -expenseTrend,color:"#f87171" },
            { label:"Savings", val: fmtFull(thisMonth.savings), trend: null,          color:"#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ padding:"4px 12px", borderRadius:9999, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:".68rem", color:"#64748b" }}>{s.label}</span>
              <span style={{ fontSize:".78rem", fontWeight:800, color:s.color }}>{s.val}</span>
              {s.trend !== null && (
                <span style={{ fontSize:".65rem", color: parseFloat(s.trend) >= 0 ? "#34d399" : "#f87171", display:"flex", alignItems:"center", gap:2 }}>
                  {parseFloat(s.trend) >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(s.trend)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:3, padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const a    = activeTab === t.key;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding:"6px 14px", borderRadius:9999, display:"flex", alignItems:"center", gap:5, fontSize:".75rem", fontWeight: a ? 700 : 500, background: a ? "rgba(96,165,250,.15)" : "transparent", color: a ? "#60a5fa" : "#64748b", border: a ? "1px solid rgba(96,165,250,.3)" : "1px solid transparent", cursor:"pointer", transition:"all .2s" }}>
              <Icon size={12} />{t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"1rem 1.2rem" }}>

        {/* ── 6 MONTH TREND ── */}
        {activeTab === "trends" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Income vs Expense area chart */}
            <div>
              <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 10px", fontWeight:600 }}>Income vs Expenses — Last 6 Months</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="income"  name="Income"  stroke="#10b981" fill="url(#incomeGrad)"  strokeWidth={2.5} dot={{ r:4, fill:"#10b981" }} activeDot={{ r:6 }} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#expenseGrad)" strokeWidth={2.5} dot={{ r:4, fill:"#ef4444" }} activeDot={{ r:6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Savings bar */}
            <div>
              <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 10px", fontWeight:600 }}>Monthly Savings</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={monthlyData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="savings" name="Savings" radius={[5,5,0,0]}>
                    {monthlyData.map((e,i) => (
                      <Cell key={i} fill={e.savings > 0 ? "#8b5cf6" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {activeTab === "categories" && (
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:16 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 8px", fontWeight:600, textAlign:"center" }}>This Month</p>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={38} paddingAngle={2}>
                    {categoryData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => fmtFull(v)} contentStyle={{ background:"#0f172a", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 10px", fontWeight:600 }}>Spending by Category</p>
              {categoryData.length === 0
                ? <p style={{ color:"#475569", fontSize:".82rem" }}>No expenses this month yet.</p>
                : categoryData.map((c,i) => {
                  const total = categoryData.reduce((s,x) => s + x.value, 0);
                  const pct   = total ? Math.round(c.value / total * 100) : 0;
                  return (
                    <div key={c.name} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:".75rem", marginBottom:3 }}>
                        <span style={{ color:"#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ width:8, height:8, borderRadius:9999, background:PIE_COLORS[i % PIE_COLORS.length], display:"inline-block" }} />
                          {c.name}
                        </span>
                        <span style={{ color:PIE_COLORS[i % PIE_COLORS.length], fontWeight:700 }}>
                          {fmtFull(c.value)} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height:5, borderRadius:3, background:"rgba(255,255,255,.07)" }}>
                        <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, background:PIE_COLORS[i % PIE_COLORS.length], transition:"width .5s" }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        {/* ── DAILY ── */}
        {activeTab === "daily" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <p style={{ fontSize:".75rem", color:"#64748b", margin:0, fontWeight:600 }}>Daily Activity — Last 30 Days</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top:0, right:0, left:-20, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false}
                  interval={Math.floor(dailyData.length / 7)} />
                <YAxis tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[3,3,0,0]} />
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Net flow line */}
            <div>
              <p style={{ fontSize:".75rem", color:"#64748b", margin:"0 0 8px", fontWeight:600 }}>Net Flow (Income − Expense)</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={dailyData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="day" tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false}
                    interval={Math.floor(dailyData.length / 7)} />
                  <YAxis tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey={d => d.income - d.expense} name="Net" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}