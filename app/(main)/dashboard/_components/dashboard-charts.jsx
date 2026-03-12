"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line,
} from "recharts";
import { TrendingUp, BarChart2, PieChart as PieIcon, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

const fmt     = (n) => `₹${Math.abs(n) >= 1_00_000 ? (Math.abs(n)/1_00_000).toFixed(1)+"L" : Math.abs(n) >= 1000 ? (Math.abs(n)/1000).toFixed(0)+"k" : Math.abs(n).toFixed(0)}`;
const fmtFull = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n ?? 0);

const PALETTE = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#84cc16","#f97316","#a78bfa"];

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d1a2d", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"8px 14px", fontSize:12, boxShadow:"0 8px 32px rgba(0,0,0,.4)" }}>
      <p style={{ color:"#64748b", margin:"0 0 4px", fontSize:11 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, margin:"2px 0", fontWeight:600 }}>{p.name}: {fmtFull(p.value)}</p>
      ))}
    </div>
  );
};

export default function DashboardCharts({ transactions = [] }) {
  const [tab, setTab] = useState("trends");

  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const e = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
      const inRange = transactions.filter(t => { const td = new Date(t.date); return td >= d && td <= e; });
      const income  = inRange.filter(t => t.type==="INCOME").reduce((s,t) => s+t.amount, 0);
      const expense = inRange.filter(t => t.type==="EXPENSE").reduce((s,t) => s+t.amount, 0);
      return {
        month:   d.toLocaleString("en-IN", { month:"short" }),
        income:  Math.round(income),
        expense: Math.round(expense),
        savings: Math.round(Math.max(0, income - expense)),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const map = {};
    transactions.filter(t => t.type==="EXPENSE" && new Date(t.date)>=start)
      .forEach(t => { map[t.category] = (map[t.category]||0)+t.amount; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8)
      .map(([name,value]) => ({ name, value: Math.round(value) }));
  }, [transactions]);

  const dailyData = useMemo(() => {
    const now = new Date();
    const map = {};
    for (let i=29; i>=0; i--) {
      const d = new Date(now); d.setDate(d.getDate()-i);
      const key = d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
      map[key] = { day:key, expense:0, income:0 };
    }
    transactions.forEach(t => {
      const d = new Date(t.date);
      const dif = Math.floor((now - d)/86400000);
      if (dif < 30) {
        const key = d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
        if (map[key]) { if(t.type==="EXPENSE") map[key].expense+=t.amount; else map[key].income+=t.amount; }
      }
    });
    return Object.values(map).map(d => ({...d, expense:Math.round(d.expense), income:Math.round(d.income)}));
  }, [transactions]);

  const thisMonth = monthlyData[5]||{};
  const lastMonth = monthlyData[4]||{};
  const incomeTrend  = lastMonth.income  ? ((thisMonth.income  - lastMonth.income)  / lastMonth.income  * 100).toFixed(1) : 0;
  const expenseTrend = lastMonth.expense ? ((thisMonth.expense - lastMonth.expense) / lastMonth.expense * 100).toFixed(1) : 0;
  const totalCatSpend = categoryData.reduce((s,c) => s+c.value, 0);

  const TABS = [
    { key:"trends",     label:"6M Trend",   icon:Activity  },
    { key:"categories", label:"Categories", icon:PieIcon   },
    { key:"daily",      label:"Daily",      icon:BarChart2 },
  ];

  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"14px 20px 12px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"rgba(96,165,250,.12)", border:"1px solid rgba(96,165,250,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <TrendingUp size={15} style={{ color:"#60a5fa" }} />
          </div>
          <div>
            <p style={{ fontWeight:700, color:"#f1f5f9", fontSize:".88rem", margin:0 }}>Financial Overview</p>
            <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>Income · Expenses · Trends</p>
          </div>
        </div>

        {/* Monthly summary pills */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            { label:"Income",  val:fmtFull(thisMonth.income),  trend:incomeTrend,  up:parseFloat(incomeTrend)>=0,  color:"#34d399" },
            { label:"Spent",   val:fmtFull(thisMonth.expense), trend:expenseTrend, up:parseFloat(expenseTrend)<=0, color:"#f87171" },
            { label:"Savings", val:fmtFull(thisMonth.savings), trend:null, color:"#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ padding:"5px 12px", borderRadius:9999, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:".65rem", color:"#64748b" }}>{s.label}</span>
              <span style={{ fontSize:".8rem", fontWeight:800, color:s.color }}>{s.val}</span>
              {s.trend != null && (
                <span style={{ fontSize:".62rem", color:s.up?"#34d399":"#f87171", display:"flex", alignItems:"center" }}>
                  {s.up ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                  {Math.abs(s.trend)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex", gap:3, padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
        {TABS.map(t => {
          const Icon = t.icon; const a = tab===t.key;
          return (
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ padding:"6px 14px", borderRadius:9999, display:"flex", alignItems:"center", gap:5, fontSize:".74rem", fontWeight:a?700:500, background:a?"rgba(96,165,250,.14)":"transparent", color:a?"#60a5fa":"#64748b", border:a?"1px solid rgba(96,165,250,.28)":"1px solid transparent", cursor:"pointer", transition:"all .2s" }}>
              <Icon size={11}/>{t.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding:"16px 20px" }}>

        {/* ── 6M TREND ── */}
        {tab==="trends" && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <div>
              <p style={{ fontSize:".72rem", color:"#64748b", margin:"0 0 10px", fontWeight:600, letterSpacing:".03em" }}>INCOME VS EXPENSES — LAST 6 MONTHS</p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={.22}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                  <Tooltip content={<Tip/>}/>
                  <Area type="monotone" dataKey="income"  name="Income"  stroke="#10b981" fill="url(#incG)" strokeWidth={2.5} dot={{ r:4, fill:"#10b981", strokeWidth:0 }} activeDot={{ r:6 }}/>
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#expG)" strokeWidth={2.5} dot={{ r:4, fill:"#ef4444", strokeWidth:0 }} activeDot={{ r:6 }}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p style={{ fontSize:".72rem", color:"#64748b", margin:"0 0 10px", fontWeight:600, letterSpacing:".03em" }}>MONTHLY SAVINGS</p>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={monthlyData} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                  <Tooltip content={<Tip/>}/>
                  <Bar dataKey="savings" name="Savings" radius={[6,6,0,0]}>
                    {monthlyData.map((e,i) => <Cell key={i} fill={e.savings>0?"#8b5cf6":"#ef4444"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── CATEGORIES ── */}
        {tab==="categories" && (
          <div>
            <p style={{ fontSize:".72rem", color:"#64748b", margin:"0 0 14px", fontWeight:600, letterSpacing:".03em" }}>SPENDING BY CATEGORY — THIS MONTH</p>
            {categoryData.length===0 ? (
              <p style={{ color:"#475569", textAlign:"center", padding:"2rem 0" }}>No expenses recorded this month</p>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:20, alignItems:"center" }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={2}>
                      {categoryData.map((_,i) => <Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmtFull(v)} contentStyle={{ background:"#0d1a2d", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, fontSize:11 }}/>
                  </PieChart>
                </ResponsiveContainer>
                <div>
                  {categoryData.map((c,i) => {
                    const pct = totalCatSpend ? Math.round(c.value/totalCatSpend*100) : 0;
                    return (
                      <div key={c.name} style={{ marginBottom:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                          <span style={{ fontSize:".75rem", color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ width:7, height:7, borderRadius:9999, background:PALETTE[i%PALETTE.length], display:"inline-block", flexShrink:0 }}/>
                            {c.name}
                          </span>
                          <span style={{ fontSize:".75rem", color:PALETTE[i%PALETTE.length], fontWeight:700 }}>
                            {fmtFull(c.value)} <span style={{ color:"#475569", fontWeight:500 }}>({pct}%)</span>
                          </span>
                        </div>
                        <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.06)" }}>
                          <div style={{ height:"100%", borderRadius:2, width:`${pct}%`, background:PALETTE[i%PALETTE.length], transition:"width .5s" }}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DAILY ── */}
        {tab==="daily" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <p style={{ fontSize:".72rem", color:"#64748b", margin:0, fontWeight:600, letterSpacing:".03em" }}>DAILY ACTIVITY — LAST 30 DAYS</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} margin={{ top:0, right:0, left:-15, bottom:0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} interval={Math.floor(dailyData.length/6)}/>
                <YAxis tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[3,3,0,0]}/>
                <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div>
              <p style={{ fontSize:".72rem", color:"#64748b", margin:"0 0 8px", fontWeight:600, letterSpacing:".03em" }}>NET CASH FLOW</p>
              <ResponsiveContainer width="100%" height={90}>
                <LineChart data={dailyData} margin={{ top:0, right:0, left:-15, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="day" tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} interval={Math.floor(dailyData.length/6)}/>
                  <YAxis tick={{ fontSize:9, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmt}/>
                  <Tooltip content={<Tip/>}/>
                  <Line type="monotone" dataKey={d=>d.income-d.expense} name="Net Flow" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r:4 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}