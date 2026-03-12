"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend,
} from "recharts";
import {
  Brain, TrendingUp, TrendingDown, RefreshCw, Loader2,
  AlertTriangle, Sparkles, Target, BarChart2, Zap,
  ShieldCheck, Flame, Leaf, ChevronRight, Info,
  Wallet, PieChart as PieIcon, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt    = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);
const fmtSh  = (n) => { const a=Math.abs(n??0); if(a>=1e7) return `₹${(n/1e7).toFixed(1)}Cr`; if(a>=1e5) return `₹${(n/1e5).toFixed(1)}L`; if(a>=1e3) return `₹${(n/1e3).toFixed(0)}k`; return `₹${Math.round(n)}`; };
const fmtN   = (n,d=1) => Number(n??0).toFixed(d);

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0d1421", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"8px 14px", fontSize:12, boxShadow:"0 12px 40px rgba(0,0,0,.5)" }}>
      <p style={{ color:"#64748b", margin:"0 0 5px", fontSize:11 }}>{label}</p>
      {payload.filter(p=>p.value!=null).map((p,i) => (
        <p key={i} style={{ color:p.color, margin:"2px 0", fontWeight:600 }}>
          {p.name}: {fmtSh(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Scenario colors ───────────────────────────────────────────────────────────
const SCENE = {
  bear: { color:"#f87171", bg:"rgba(248,113,113,.08)", border:"rgba(248,113,113,.2)", label:"Bear", icon:TrendingDown },
  base: { color:"#60a5fa", bg:"rgba(96,165,250,.08)",  border:"rgba(96,165,250,.2)",  label:"Base", icon:BarChart2 },
  bull: { color:"#34d399", bg:"rgba(52,211,153,.08)",  border:"rgba(52,211,153,.2)",  label:"Bull", icon:TrendingUp },
};

const CAT_COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#84cc16"];

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPENSE SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function ExpensePrediction() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/predict/expenses");
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error||"Failed");
      setData(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SectionSkeleton label="Expense Prediction" />;
  if (error)   return <SectionError label="Expense Prediction" error={error} onRetry={load}/>;

  const { nextMonthLabel, blendedForecast, confidenceLow, confidenceHigh,
          lastMonthExpense, trend, predictedSavings, savingsRate,
          wmaIncome, categoryForecasts=[], chartHistory=[], aiInsight } = data;

  const trendUp  = parseFloat(trend) > 0;
  const chartAll = [...chartHistory, { month:"→ Pred", forecast: blendedForecast, expense: null }];

  return (
    <section>
      {/* Section header */}
      <SectionHeader
        icon={<Wallet size={16} style={{ color:"#f59e0b" }}/>}
        iconBg="rgba(245,158,11,.1)" iconBorder="rgba(245,158,11,.25)"
        title="Expense Prediction"
        subtitle={`AI-powered forecast for ${nextMonthLabel}`}
        badge={{ label:`${data.dataMonths} months data`, color:"#f59e0b" }}
        onRefresh={load}
      />

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KpiCard label="Last Month" value={fmtSh(lastMonthExpense)} color="#94a3b8" sub="Actual spend"/>
        <KpiCard label="Predicted" value={fmtSh(blendedForecast)} color={trendUp?"#f87171":"#34d399"}
          sub={`${trendUp?"+":""}${fmtN(trend)}% vs last`}
          icon={trendUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
          trending={trendUp?"up":"down"}
        />
        <KpiCard label="Range" value={`${fmtSh(confidenceLow)}–${fmtSh(confidenceHigh)}`} color="#a78bfa" sub="Confidence band" small/>
        <KpiCard label="Est. Savings" value={fmtSh(predictedSavings)} color="#34d399"
          sub={`${savingsRate}% of income`}/>
      </div>

      {/* Chart + Category breakdown */}
      <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:16, marginBottom:20 }}>
        {/* Expense trend chart */}
        <ChartCard title="6-Month Trend + Forecast">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartAll} margin={{ top:5, right:5, left:-10, bottom:0 }}>
              <defs>
                <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="fcG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={.35}/>
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
              <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={v=>fmtSh(v)}/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine x="→ Pred" stroke="rgba(167,139,250,.4)" strokeDasharray="4 3"/>
              <Area type="monotone" dataKey="expense"  name="Actual"   stroke="#ef4444" fill="url(#expG)" strokeWidth={2.5} dot={{ r:3, fill:"#ef4444", strokeWidth:0 }} connectNulls={false}/>
              <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#a78bfa" fill="url(#fcG)"  strokeWidth={2.5} strokeDasharray="5 3" dot={{ r:5, fill:"#a78bfa", strokeWidth:0 }} connectNulls={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category predictions */}
        <ChartCard title="Category Forecasts">
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
            {categoryForecasts.map((c, i) => (
              <div key={c.category}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:".73rem", color:"#94a3b8", display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ width:6, height:6, borderRadius:9999, background:CAT_COLORS[i%CAT_COLORS.length], display:"inline-block" }}/>
                    {c.category}
                  </span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:".7rem", color: c.trend>5?"#f87171":c.trend<-5?"#34d399":"#94a3b8", fontWeight:600 }}>
                      {c.trend>0?"+":""}{fmtN(c.trend)}%
                    </span>
                    <span style={{ fontSize:".73rem", fontWeight:700, color:CAT_COLORS[i%CAT_COLORS.length] }}>{fmtSh(c.predicted)}</span>
                  </div>
                </div>
                <div style={{ height:4, borderRadius:2, background:"rgba(255,255,255,.05)" }}>
                  <div style={{ height:"100%", borderRadius:2, background:CAT_COLORS[i%CAT_COLORS.length],
                    width:`${Math.min(100, (c.predicted / (categoryForecasts[0]?.predicted||1)) * 100)}%`,
                    transition:"width .5s" }}/>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* AI insight */}
      {aiInsight && <AiInsightCard insight={aiInsight} accentColor="#f59e0b"/>}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INVESTMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function InvestmentPrediction() {
  const [data,    setData]    = useState(null);
  const [horizon, setHorizon] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/predict/investments");
      const d = await r.json();
      if (d.noHoldings) { setData({ empty: true }); return; }
      if (!r.ok || d.error) throw new Error(d.error||"Failed");
      setData(d);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <SectionSkeleton label="Investment Prediction" />;
  if (error)   return <SectionError label="Investment Prediction" error={error} onRetry={load}/>;

  if (data?.empty) return (
    <section>
      <SectionHeader
        icon={<TrendingUp size={16} style={{ color:"#34d399" }}/>}
        iconBg="rgba(52,211,153,.1)" iconBorder="rgba(52,211,153,.25)"
        title="Investment Prediction" subtitle="Monte Carlo & Scenario Analysis"
        onRefresh={load}
      />
      <EmptyState
        icon={<BarChart2 size={28} style={{ color:"#34d399", opacity:.5 }}/>}
        title="No holdings tracked"
        desc="Add stocks or mutual funds in Portfolio to see investment projections."
        cta={{ label:"Go to Portfolio", href:"/portfolio", color:"#34d399" }}
      />
    </section>
  );

  const { totalInvested, scenarios=[], monteCarlo5Y={}, holdingProjections=[],
          sipProjection, chartData=[], aiInsight, weightedReturns={} } = data;

  const scenH = scenarios.find(s => s.years === horizon) || scenarios[0] || {};

  return (
    <section>
      <SectionHeader
        icon={<TrendingUp size={16} style={{ color:"#34d399" }}/>}
        iconBg="rgba(52,211,153,.1)" iconBorder="rgba(52,211,153,.25)"
        title="Investment Prediction"
        subtitle={`Monte Carlo simulation · ${data.holdingsCount} holdings`}
        badge={{ label:`CAGR ~${fmtN(weightedReturns.base)}%`, color:"#34d399" }}
        onRefresh={load}
      />

      {/* Horizon selector */}
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[1,3,5,10].map(y => (
          <button key={y} onClick={()=>setHorizon(y)}
            style={{ padding:"5px 14px", borderRadius:9999, fontSize:".74rem", fontWeight:horizon===y?700:500,
              background:horizon===y?"rgba(52,211,153,.14)":"rgba(255,255,255,.04)",
              border:horizon===y?"1px solid rgba(52,211,153,.3)":"1px solid rgba(255,255,255,.08)",
              color:horizon===y?"#34d399":"#64748b", cursor:"pointer", transition:"all .2s" }}>
            {y} Year{y>1?"s":""}
          </button>
        ))}
      </div>

      {/* KPI row — scenario outcomes for selected horizon */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        <KpiCard label="Invested" value={fmtSh(totalInvested)} color="#94a3b8" sub="Total cost basis"/>
        {["bear","base","bull"].map(sc => {
          const cfg = SCENE[sc];
          const val = scenH[sc] || 0;
          const gain = val - totalInvested;
          const pct  = totalInvested > 0 ? ((val - totalInvested)/totalInvested*100).toFixed(1) : 0;
          const Icon = cfg.icon;
          return (
            <KpiCard key={sc}
              label={`${cfg.label} (${horizon}Y)`}
              value={fmtSh(val)}
              color={cfg.color}
              sub={`${gain>=0?"+":""}${fmtSh(gain)} (${pct}%)`}
              icon={<Icon size={12}/>}
              trending={sc==="bull"?"up":sc==="bear"?"down":"neutral"}
            />
          );
        })}
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:16, marginBottom:20 }}>
        {/* Scenario projection chart */}
        <ChartCard title="Scenario Projection (10 Years)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top:5, right:5, left:-10, bottom:0 }}>
              <defs>
                {["bear","base","bull"].map(sc => (
                  <linearGradient key={sc} id={`${sc}G`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={SCENE[sc].color} stopOpacity={.2}/>
                    <stop offset="95%" stopColor={SCENE[sc].color} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
              <XAxis dataKey="year" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtSh}/>
              <Tooltip content={<Tip/>}/>
              {["bear","base","bull"].map(sc => (
                <Area key={sc} type="monotone" dataKey={sc} name={SCENE[sc].label}
                  stroke={SCENE[sc].color} fill={`url(#${sc}G)`} strokeWidth={2}
                  dot={{ r:3, fill:SCENE[sc].color, strokeWidth:0 }}/>
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monte Carlo 5Y distribution */}
        <ChartCard title="Monte Carlo 5Y Distribution">
          <div style={{ padding:"8px 0" }}>
            <p style={{ fontSize:".68rem", color:"#64748b", margin:"0 0 12px" }}>500 simulations · Percentile outcomes</p>
            {[
              { label:"Best 10% (P90)",    val:monteCarlo5Y.p90, color:"#34d399" },
              { label:"Upper 25% (P75)",   val:monteCarlo5Y.p75, color:"#60a5fa" },
              { label:"Median (P50)",       val:monteCarlo5Y.median, color:"#a78bfa", bold:true },
              { label:"Lower 25% (P25)",   val:monteCarlo5Y.p25, color:"#f59e0b" },
              { label:"Worst 10% (P10)",   val:monteCarlo5Y.p10, color:"#f87171" },
            ].map(row => (
              <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:".72rem", color:"#64748b" }}>{row.label}</span>
                <span style={{ fontSize: row.bold?".88rem":".78rem", fontWeight: row.bold?800:600, color:row.color }}>
                  {fmtSh(row.val)}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Per-holding projections */}
      {holdingProjections.length > 0 && (
        <ChartCard title="Per-Holding 1-Year Projection" style={{ marginBottom:20 }}>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".75rem" }}>
              <thead>
                <tr>
                  {["Holding","Invested","Bear","Base","Bull"].map(h => (
                    <th key={h} style={{ textAlign:h==="Holding"?"left":"right", color:"#64748b", fontWeight:600, padding:"6px 8px", borderBottom:"1px solid rgba(255,255,255,.06)", fontSize:".65rem", textTransform:"uppercase", letterSpacing:".04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdingProjections.map(h => (
                  <tr key={h.symbol} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding:"7px 8px" }}>
                      <div style={{ fontWeight:700 }}>{h.symbol}</div>
                      <div style={{ color:"#64748b", fontSize:".65rem" }}>{h.type==="MUTUAL_FUND"?"MF":"Stock"}</div>
                    </td>
                    <td style={{ textAlign:"right", padding:"7px 8px", color:"#94a3b8" }}>{fmtSh(h.invested)}</td>
                    <td style={{ textAlign:"right", padding:"7px 8px", color:"#f87171", fontWeight:600 }}>{fmtSh(h.proj1Y_bear)}</td>
                    <td style={{ textAlign:"right", padding:"7px 8px", color:"#60a5fa", fontWeight:600 }}>{fmtSh(h.proj1Y_base)}</td>
                    <td style={{ textAlign:"right", padding:"7px 8px", color:"#34d399", fontWeight:700 }}>{fmtSh(h.proj1Y_bull)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* SIP Power card */}
      {sipProjection && (
        <div style={{ padding:"14px 18px", borderRadius:16, background:"linear-gradient(135deg,rgba(52,211,153,.08),rgba(96,165,250,.06))", border:"1px solid rgba(52,211,153,.2)", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
              <Zap size={14} style={{ color:"#34d399" }}/>
              <span style={{ fontSize:".78rem", fontWeight:700, color:"#f1f5f9" }}>SIP Power — ₹10,000/month for 10 years</span>
            </div>
            <p style={{ fontSize:".7rem", color:"#64748b", margin:0 }}>Invested {fmtSh(sipProjection.invested)} · At ~{fmtN(weightedReturns.base)}% CAGR</p>
          </div>
          <div style={{ display:"flex", gap:20 }}>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:".65rem", color:"#64748b", margin:"0 0 2px" }}>Final Value</p>
              <p style={{ fontSize:"1.2rem", fontWeight:800, color:"#34d399", margin:0 }}>{fmtSh(sipProjection.finalValue)}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ fontSize:".65rem", color:"#64748b", margin:"0 0 2px" }}>Wealth Gain</p>
              <p style={{ fontSize:"1.1rem", fontWeight:800, color:"#60a5fa", margin:0 }}>+{fmtSh(sipProjection.gain)}</p>
            </div>
          </div>
        </div>
      )}

      {/* AI insight */}
      {aiInsight && <AiInsightCard insight={aiInsight} accentColor="#34d399"/>}
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function SectionHeader({ icon, iconBg, iconBorder, title, subtitle, badge, onRefresh }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:12, background:iconBg, border:`1px solid ${iconBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          {icon}
        </div>
        <div>
          <h2 style={{ fontWeight:800, fontSize:"1rem", margin:0, color:"#f1f5f9" }}>{title}</h2>
          <p style={{ fontSize:".7rem", color:"#64748b", margin:0 }}>{subtitle}</p>
        </div>
        {badge && (
          <span style={{ padding:"3px 10px", borderRadius:9999, background:`${badge.color}18`, border:`1px solid ${badge.color}40`, color:badge.color, fontSize:".68rem", fontWeight:700 }}>
            {badge.label}
          </span>
        )}
      </div>
      {onRefresh && (
        <button onClick={onRefresh} style={{ width:30, height:30, borderRadius:9999, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <RefreshCw size={13} style={{ color:"#64748b" }}/>
        </button>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, sub, icon, trending, small }) {
  return (
    <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)" }}>
      <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 6px", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</p>
      <p style={{ fontSize: small?"0.82rem":"1.05rem", fontWeight:800, color, margin:0, lineHeight:1 }}>{value}</p>
      {sub && (
        <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:5 }}>
          {icon && <span style={{ color }}>{icon}</span>}
          <span style={{ fontSize:".65rem", color: trending==="up"?"#f87171":trending==="down"?"#34d399":"#64748b" }}>{sub}</span>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, style }) {
  return (
    <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", ...style }}>
      <p style={{ fontSize:".7rem", color:"#64748b", margin:"0 0 12px", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{title}</p>
      {children}
    </div>
  );
}

function AiInsightCard({ insight, accentColor }) {
  return (
    <div style={{ padding:"16px 20px", borderRadius:16, background:`${accentColor}0a`, border:`1px solid ${accentColor}25` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ width:28, height:28, borderRadius:9, background:`${accentColor}18`, border:`1px solid ${accentColor}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Brain size={13} style={{ color:accentColor }}/>
        </div>
        <span style={{ fontSize:".78rem", fontWeight:700, color:accentColor }}>AI Analysis</span>
        <span style={{ fontSize:".65rem", color:"#475569", padding:"2px 7px", borderRadius:9999, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)" }}>Powered by LLaMA 3.1</span>
      </div>
      <p style={{ fontSize:".82rem", color:"#94a3b8", margin:0, lineHeight:1.65 }}>{insight}</p>
    </div>
  );
}

function SectionSkeleton({ label }) {
  return (
    <div style={{ padding:24, borderRadius:20, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", textAlign:"center" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:8 }}>
        <Loader2 size={16} style={{ color:"#64748b", animation:"spin 1s linear infinite" }}/>
        <span style={{ color:"#64748b", fontSize:".85rem" }}>Building {label} model…</span>
      </div>
      <p style={{ color:"#475569", fontSize:".72rem", margin:0 }}>Analysing your transaction history</p>
    </div>
  );
}

function SectionError({ label, error, onRetry }) {
  return (
    <div style={{ padding:24, borderRadius:16, background:"rgba(248,113,113,.05)", border:"1px solid rgba(248,113,113,.2)", display:"flex", alignItems:"flex-start", gap:10 }}>
      <AlertTriangle size={15} style={{ color:"#f87171", flexShrink:0, marginTop:2 }}/>
      <div>
        <p style={{ color:"#f87171", fontWeight:600, margin:"0 0 3px" }}>{label} — {error}</p>
        <button onClick={onRetry} style={{ fontSize:".72rem", color:"#64748b", background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:4 }}>
          <RefreshCw size={11}/> Retry
        </button>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, cta }) {
  return (
    <div style={{ padding:"2.5rem", textAlign:"center", borderRadius:16, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
      <div style={{ width:56, height:56, borderRadius:16, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>{icon}</div>
      <p style={{ color:"#94a3b8", fontWeight:600, margin:"0 0 5px" }}>{title}</p>
      <p style={{ color:"#475569", fontSize:".78rem", margin:"0 0 16px" }}>{desc}</p>
      {cta && (
        <a href={cta.href}>
          <button style={{ padding:"8px 18px", borderRadius:9999, background:`${cta.color}18`, border:`1px solid ${cta.color}35`, color:cta.color, fontSize:".78rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {cta.label} <ChevronRight size={12}/>
          </button>
        </a>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PredictionsPage() {
  const [tab, setTab] = useState("expense");

  const tabs = [
    { key:"expense",    label:"Expense Forecast",    icon:Wallet },
    { key:"investment", label:"Investment Projection", icon:TrendingUp },
  ];

  return (
    <div style={{ maxWidth:1100 }}>
      {/* Page header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div style={{ width:40, height:40, borderRadius:14, background:"linear-gradient(135deg,rgba(167,139,250,.2),rgba(52,211,153,.1))", border:"1px solid rgba(167,139,250,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Brain size={20} style={{ color:"#a78bfa" }}/>
          </div>
          <div>
            <h1 style={{ fontWeight:800, fontSize:"1.5rem", margin:0, color:"#f1f5f9" }}>AI Predictions</h1>
            <p style={{ color:"#64748b", fontSize:".78rem", margin:0 }}>Statistical forecasting · Monte Carlo simulations · LLaMA 3.1 insights</p>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:4, padding:"5px", background:"rgba(255,255,255,.03)", borderRadius:14, border:"1px solid rgba(255,255,255,.07)", width:"fit-content", marginBottom:28 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const a    = tab === t.key;
          return (
            <button key={t.key} onClick={()=>setTab(t.key)}
              style={{ padding:"8px 18px", borderRadius:10, display:"flex", alignItems:"center", gap:7, fontSize:".8rem", fontWeight:a?700:500, background:a?"rgba(255,255,255,.07)":"transparent", color:a?"#f1f5f9":"#64748b", border:"none", cursor:"pointer", transition:"all .2s" }}>
              <Icon size={14}/> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
        {tab === "expense"    && <ExpensePrediction/>}
        {tab === "investment" && <InvestmentPrediction/>}
      </div>

      {/* Disclaimer */}
      <div style={{ marginTop:32, padding:"10px 16px", borderRadius:10, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)", display:"flex", gap:7, alignItems:"flex-start" }}>
        <Info size={12} style={{ color:"#475569", flexShrink:0, marginTop:2 }}/>
        <p style={{ fontSize:".65rem", color:"#475569", margin:0, lineHeight:1.6 }}>
          Predictions are based on your historical data using statistical models (WMA, Linear Regression, Monte Carlo). Investment projections use historical CAGR benchmarks and are not guaranteed. Past performance is not indicative of future results. This is not financial advice.
        </p>
      </div>
    </div>
  );
}