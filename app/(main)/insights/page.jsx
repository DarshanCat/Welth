"use client";
import { useState, useEffect } from "react";
import {
  TrendingDown, TrendingUp, AlertTriangle, Calendar,
  IndianRupee, Flame, ShieldAlert, Sparkles, Loader2,
  Activity, PiggyBank, BarChart2,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, LineChart, Line,
} from "recharts";

const fmt   = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtCr = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(1)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : fmt(n);

const TIP = ({ children, color = "#34d399" }) => (
  <div style={{ padding:"10px 14px", borderRadius:10, background:`${color}08`, border:`1px solid ${color}20`, marginTop:10 }}>
    <p style={{ fontSize:".74rem", color:"#94a3b8", margin:0, lineHeight:1.6 }}>{children}</p>
  </div>
);

const KPI = ({ label, value, sub, color, icon: Icon }) => (
  <div style={{ padding:"14px 16px", borderRadius:14, background:`${color}08`, border:`1px solid ${color}20` }}>
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
      {Icon && <Icon size={12} style={{ color }}/>}
      <span style={{ fontSize:".62rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</span>
    </div>
    <p style={{ fontWeight:900, fontSize:"1.1rem", color, margin:0 }}>{value}</p>
    {sub && <p style={{ fontSize:".65rem", color:"#64748b", margin:"3px 0 0" }}>{sub}</p>}
  </div>
);

const SectionCard = ({ title, icon: Icon, color, badge, children }) => (
  <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden", marginBottom:16 }}>
    <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:`${color}18`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={16} style={{ color }}/>
        </div>
        <h2 style={{ fontWeight:800, fontSize:".95rem", color:"#f1f5f9", margin:0 }}>{title}</h2>
      </div>
      {badge && (
        <span style={{ padding:"3px 10px", borderRadius:9999, fontSize:".68rem", fontWeight:700,
          background:`${color}15`, border:`1px solid ${color}30`, color }}>{badge}</span>
      )}
    </div>
    <div style={{ padding:"18px 20px" }}>{children}</div>
  </div>
);

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"8px 12px", fontSize:".72rem" }}>
      <p style={{ color:"#34d399", fontWeight:700, margin:"0 0 4px" }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color:p.color || p.stroke, margin:"2px 0" }}>{p.name}: {fmtCr(p.value)}</p>)}
    </div>
  );
};

// ─── MONTH LABEL HELPER ───────────────────────────────────────────────────────
function shortMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

export default function InsightsPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("depletion");

  useEffect(() => {
    fetch("/api/insights").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:16 }}>
      <Loader2 size={36} style={{ color:"#34d399", animation:"spin 1s linear infinite" }}/>
      <p style={{ color:"#64748b", fontSize:".82rem" }}>Analysing your financial patterns…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (data?.noData) return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>📊</p>
      <p style={{ color:"#f1f5f9", fontWeight:700 }}>No transaction data yet</p>
      <p style={{ color:"#64748b", fontSize:".8rem" }}>Add some transactions to unlock your financial insights.</p>
    </div>
  );

  const { salaryDepletion: sd, personalInflation: pi, debtTrap: dt, seasonal: ss, aiSummary, dataMonths } = data || {};

  const TABS = [
    { id:"depletion",  label:"💸 Salary Drain",     color:"#f87171"  },
    { id:"inflation",  label:"📈 Personal Inflation",color:"#fb923c"  },
    { id:"debt",       label:"🏦 Debt Monitor",      color:"#a78bfa"  },
    { id:"seasonal",   label:"🪔 Seasonal Spend",    color:"#fbbf24"  },
  ];

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 className="text-5xl gradient-title">Financial Insights</h1>
        <p style={{ color:"#64748b", fontSize:".82rem", marginTop:6 }}>
          4 real-world problems solved using your actual spending data · {dataMonths} months analysed
        </p>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div style={{ padding:"16px 20px", borderRadius:16, background:"rgba(167,139,250,.06)", border:"1px solid rgba(167,139,250,.2)", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <Sparkles size={14} style={{ color:"#a78bfa" }}/>
            <span style={{ fontSize:".7rem", fontWeight:700, color:"#a78bfa", textTransform:"uppercase", letterSpacing:".06em" }}>CA Arjun&apos;s Overall Assessment</span>
          </div>
          <p style={{ fontSize:".8rem", color:"#94a3b8", margin:0, lineHeight:1.7, whiteSpace:"pre-line" }}>{aiSummary}</p>
        </div>
      )}

      {/* Quick health bar */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Salary Survival", value: sd ? `${sd.avgSurvival} days` : "—", color: sd?.avgSurvival > 20 ? "#34d399" : "#f87171", icon: Activity },
          { label:"Personal Inflation", value: pi ? `${pi.personalInflation}%` : "—", color: pi?.personalInflation > 8 ? "#f87171" : "#34d399", icon: TrendingUp },
          { label:"Debt Risk", value: dt?.riskLevel || "N/A", color: dt?.riskColor || "#64748b", icon: ShieldAlert },
          { label:"Next Big Spend", value: ss ? `${ss.upcoming[0]?.emoji} ${ss.upcoming[0]?.monthsAway}mo` : "—", color: "#fbbf24", icon: Calendar },
        ].map(k => <KPI key={k.label} {...k}/>)}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 18px", borderRadius:9999, fontSize:".8rem", fontWeight:700, cursor:"pointer",
            background: tab===t.id ? `${t.color}15` : "rgba(255,255,255,.04)",
            border:     tab===t.id ? `1px solid ${t.color}40` : "1px solid rgba(255,255,255,.08)",
            color:      tab===t.id ? t.color : "#64748b",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════ TAB 1: SALARY DEPLETION ══════════ */}
      {tab === "depletion" && sd && (
        <div>
          {/* Alert banner */}
          <div style={{ padding:"14px 18px", borderRadius:14, marginBottom:16,
            background: sd.daysLeft < 7 ? "rgba(248,113,113,.08)" : "rgba(52,211,153,.05)",
            border: `1px solid ${sd.daysLeft < 7 ? "rgba(248,113,113,.25)" : "rgba(52,211,153,.15)"}` }}>
            <p style={{ fontWeight:700, color: sd.daysLeft < 7 ? "#f87171" : "#34d399", margin:0, fontSize:".88rem" }}>
              {sd.insight}
            </p>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            <KPI label="Avg Survival Days" value={`${sd.avgSurvival} days`} color="#60a5fa" icon={Activity}
              sub="Days salary lasts on avg"/>
            <KPI label="This Month Income"  value={fmt(sd.latest?.income)}  color="#34d399" icon={IndianRupee}
              sub="Salary credited"/>
            <KPI label="Spent So Far"       value={fmt(sd.latest?.expense)} color="#f87171" icon={TrendingDown}
              sub="Current month expenses"/>
            <KPI label="Savings Rate"       value={`${sd.latest?.savingsRate}%`}
              color={sd.latest?.savingsRate > 20 ? "#34d399" : "#fbbf24"} icon={PiggyBank}
              sub={sd.trend >= 0 ? `↑ ${sd.trend}% better` : `↓ ${Math.abs(sd.trend)}% worse`}/>
          </div>

          {/* Day-by-day depletion chart */}
          <SectionCard title="Day-by-Day Spending This Month" icon={Activity} color="#f87171" badge="Live">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={sd.latest?.cumulative}>
                <defs>
                  <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="day" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={d => `D${d}`}/>
                <YAxis tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtCr} width={52}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine y={sd.latest?.income * 0.8} stroke="#fbbf24" strokeDasharray="4 2"
                  label={{ value:"80% income", fill:"#fbbf24", fontSize:10 }}/>
                <Area type="monotone" dataKey="spent" name="Cumulative Spent" stroke="#f87171" strokeWidth={2} fill="url(#depGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
            <TIP color="#f87171">
              The yellow line is 80% of your monthly income — the point where money gets tight. Your spending hits this at Day {sd.latest?.depletionDay}.
            </TIP>
          </SectionCard>

          {/* Top drains */}
          <SectionCard title="Where Your Salary Goes" icon={Flame} color="#fb923c" badge="This Month">
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {sd.topDrains.map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:120, fontSize:".74rem", color:"#94a3b8", fontWeight:600 }}>{d.category}</div>
                  <div style={{ flex:1, height:8, borderRadius:9999, background:"rgba(255,255,255,.06)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${d.pct}%`, borderRadius:9999,
                      background:`linear-gradient(90deg,#fb923c,#f97316)`, transition:"width .5s" }}/>
                  </div>
                  <div style={{ width:80, textAlign:"right" }}>
                    <span style={{ fontSize:".76rem", fontWeight:700, color:"#fb923c" }}>{fmt(d.amount)}</span>
                    <span style={{ fontSize:".62rem", color:"#64748b", marginLeft:4 }}>{d.pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly survival trend */}
            <div style={{ marginTop:16 }}>
              <p style={{ fontSize:".7rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", margin:"0 0 10px" }}>Savings Rate Trend</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={sd.monthly}>
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={shortMonth}/>
                  <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} unit="%" width={30}/>
                  <Tooltip contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:".72rem" }}/>
                  <Bar dataKey="savingsRate" name="Savings Rate %" radius={[4,4,0,0]}>
                    {sd.monthly.map((m, i) => <Cell key={i} fill={m.savingsRate > 20 ? "#34d399" : m.savingsRate > 10 ? "#fbbf24" : "#f87171"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════ TAB 2: PERSONAL INFLATION ══════════ */}
      {tab === "inflation" && pi && (
        <div>
          {/* Verdict */}
          <div style={{ padding:"14px 18px", borderRadius:14, marginBottom:16,
            background: pi.personalInflation > 8 ? "rgba(248,113,113,.08)" : "rgba(52,211,153,.05)",
            border:`1px solid ${pi.personalInflation > 8 ? "rgba(248,113,113,.25)" : "rgba(52,211,153,.15)"}` }}>
            <p style={{ fontWeight:700, color: pi.personalInflation > 8 ? "#f87171" : "#34d399", margin:0, fontSize:".88rem" }}>
              {pi.verdict}
            </p>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            <KPI label="Your Inflation Rate"  value={`${pi.personalInflation}%`}
              color={pi.personalInflation > pi.rbiCpi ? "#f87171" : "#34d399"} icon={TrendingUp}
              sub="Annualised personal CPI"/>
            <KPI label="RBI Benchmark"         value={`${pi.rbiCpi}%`}  color="#60a5fa" icon={BarChart2} sub="India national CPI"/>
            <KPI label="Gap vs National"       value={`${pi.gap > 0 ? "+" : ""}${pi.gap}%`}
              color={pi.gap > 0 ? "#f87171" : "#34d399"} icon={Activity}
              sub={pi.gap > 0 ? "You're above average" : "Below average ✅"}/>
          </div>

          {/* Category inflation chart */}
          <SectionCard title="Inflation by Category (Annualised)" icon={TrendingUp} color="#fb923c">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pi.catInflation} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} unit="%"/>
                <YAxis type="category" dataKey="category" tick={{ fontSize:11, fill:"#94a3b8" }} axisLine={false} tickLine={false} width={110}/>
                <Tooltip contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:".72rem" }}
                  formatter={(v) => [`${v}%`, "Annualised Inflation"]}/>
                <ReferenceLine x={pi.rbiCpi} stroke="#60a5fa" strokeDasharray="4 2" label={{ value:"RBI", fill:"#60a5fa", fontSize:10 }}/>
                <Bar dataKey="annualised" name="Category Inflation" radius={[0,4,4,0]}>
                  {pi.catInflation.map((c, i) => <Cell key={i} fill={c.annualised > pi.rbiCpi ? "#f87171" : "#34d399"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <TIP color="#fb923c">
              Red bars = categories inflating faster than RBI&apos;s {pi.rbiCpi}% benchmark. These are draining your purchasing power.
            </TIP>
          </SectionCard>

          {/* Driving categories */}
          {pi.driving.length > 0 && (
            <SectionCard title="What's Driving Your Inflation" icon={Flame} color="#f87171">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {pi.driving.map((c, i) => (
                  <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.2)" }}>
                    <p style={{ fontWeight:700, color:"#f87171", fontSize:".8rem", margin:"0 0 4px" }}>{c.category}</p>
                    <p style={{ fontSize:"1rem", fontWeight:900, color:"#f1f5f9", margin:"0 0 2px" }}>{c.annualised}%/yr</p>
                    <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>
                      {fmt(c.firstAmount)} → {fmt(c.lastAmount)}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Total spending trend */}
          <SectionCard title="Monthly Spending vs Income" icon={BarChart2} color="#60a5fa">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={pi.totalTrend}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.2}/><stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/><stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={shortMonth}/>
                <YAxis tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtCr} width={52}/>
                <Tooltip content={<ChartTip/>}/>
                <Area type="monotone" dataKey="income"  name="Income"  stroke="#34d399" strokeWidth={2} fill="url(#incGrad)"/>
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#f87171" strokeWidth={2} fill="url(#expGrad2)"/>
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* ══════════ TAB 3: DEBT MONITOR ══════════ */}
      {tab === "debt" && dt && (
        <div>
          {/* Risk verdict */}
          <div style={{ padding:"16px 20px", borderRadius:14, marginBottom:16,
            background:`${dt.riskColor}08`, border:`1px solid ${dt.riskColor}25` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ fontWeight:700, color:dt.riskColor, margin:0, fontSize:".9rem" }}>{dt.advice}</p>
              <span style={{ padding:"4px 12px", borderRadius:9999, fontSize:".72rem", fontWeight:700,
                background:`${dt.riskColor}20`, border:`1px solid ${dt.riskColor}40`, color:dt.riskColor }}>
                {dt.riskLevel}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            <KPI label="Debt-to-Income"    value={`${dt.dti}%`}       color={dt.riskColor}       icon={ShieldAlert} sub={`Safe limit: ${dt.safeLimit}%`}/>
            <KPI label="Total Monthly EMI" value={fmt(dt.totalEMI)}   color="#a78bfa"             icon={IndianRupee} sub="All active loans"/>
            <KPI label="Monthly Income"    value={fmt(dt.avgIncome)}  color="#34d399"             icon={TrendingUp}  sub="3-month average"/>
            <KPI label="EMI Headroom"      value={fmt(dt.emiHeadroom)} color={dt.emiHeadroom > 0 ? "#34d399" : "#f87171"} icon={Activity} sub="Safe borrowing space"/>
          </div>

          {/* DTI Gauge */}
          <SectionCard title="Debt-to-Income Ratio" icon={ShieldAlert} color={dt.riskColor} badge={`${dt.dti}% / ${dt.safeLimit}% safe`}>
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:".72rem", color:"#64748b" }}>0%</span>
                <span style={{ fontSize:".72rem", color:"#34d399" }}>25% Safe</span>
                <span style={{ fontSize:".72rem", color:"#fbbf24" }}>40% Limit</span>
                <span style={{ fontSize:".72rem", color:"#f87171" }}>60%+</span>
                <span style={{ fontSize:".72rem", color:"#64748b" }}>100%</span>
              </div>
              <div style={{ height:14, borderRadius:9999, background:"rgba(255,255,255,.06)", overflow:"hidden", position:"relative" }}>
                {/* Color zones */}
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#34d399 0%,#34d399 25%,#fbbf24 25%,#fbbf24 40%,#f87171 40%,#ef4444 100%)", opacity:.15 }}/>
                {/* Current DTI bar */}
                <div style={{ height:"100%", width:`${Math.min(dt.dti, 100)}%`, borderRadius:9999,
                  background:`linear-gradient(90deg,#34d399,${dt.riskColor})`, transition:"width .8s",
                  boxShadow:`0 0 10px ${dt.riskColor}50` }}/>
              </div>
            </div>

            {/* Per-loan breakdown */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:14 }}>
              {dt.loanBreakdown.map((l, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10,
                  background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:".76rem", fontWeight:700, color:"#f1f5f9", margin:"0 0 2px" }}>{l.name}</p>
                    <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{l.loanType}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:".8rem", fontWeight:800, color:"#a78bfa", margin:0 }}>{fmt(l.emiAmount)}/mo</p>
                    <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{l.contribution}% of income</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hypothetical new loan */}
            <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12,
              background: dt.hypothetical.safe ? "rgba(52,211,153,.06)" : "rgba(248,113,113,.06)",
              border:`1px solid ${dt.hypothetical.safe ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}` }}>
              <p style={{ fontSize:".72rem", fontWeight:700, color: dt.hypothetical.safe ? "#34d399" : "#f87171", margin:"0 0 4px" }}>
                {dt.hypothetical.safe ? "✅" : "⚠️"} If you take a new ₹5L loan
              </p>
              <p style={{ fontSize:".72rem", color:"#94a3b8", margin:0 }}>
                New DTI: {dt.hypothetical.newDTI}% (+{Math.round(dt.hypothetical.additionalEMI).toLocaleString("en-IN")}/mo EMI) —
                {dt.hypothetical.safe ? " Still within safe limits" : " EXCEEDS safe limit of 40%"}
              </p>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════ TAB 4: SEASONAL SPENDING ══════════ */}
      {tab === "seasonal" && ss && (
        <div>
          {/* Year overview */}
          <SectionCard title="Your Annual Spending Pattern" icon={Calendar} color="#fbbf24" badge={`Peak: ${ss.peakMonth?.month}`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ss.yearChart} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtCr} width={52}/>
                <Tooltip content={<ChartTip/>}/>
                <ReferenceLine y={ss.baseline} stroke="#64748b" strokeDasharray="4 2"
                  label={{ value:"Baseline", fill:"#64748b", fontSize:10 }}/>
                <Bar dataKey="expense" name="Avg Monthly Spend" radius={[5,5,0,0]}>
                  {ss.yearChart.map((m, i) => {
                    const isSpike = ss.spikes?.some(s => s.month === m.month);
                    return <Cell key={i} fill={isSpike ? "#f87171" : "#60a5fa"}/>;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <TIP color="#fbbf24">Red bars = historically high-spend months. Start a sinking fund {Math.min(...(ss.spikes?.map(s => s.monthIndex) || [6]))} months before your peak.</TIP>
          </SectionCard>

          {/* Upcoming seasons */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
            {ss.upcoming.map((s, i) => (
              <div key={i} style={{ padding:"16px 18px", borderRadius:16,
                background:`${s.color}06`, border:`1px solid ${s.color}20` }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:"1.5rem" }}>{s.emoji}</span>
                    <div>
                      <p style={{ fontWeight:700, color:s.color, fontSize:".85rem", margin:0 }}>{s.name}</p>
                      <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>{s.months.join(", ")} — {s.monthsAway} months away</p>
                    </div>
                  </div>
                  <span style={{ padding:"3px 9px", borderRadius:9999, fontSize:".65rem", fontWeight:700,
                    background:`${s.color}15`, border:`1px solid ${s.color}30`, color:s.color }}>
                    {s.monthsAway}mo
                  </span>
                </div>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                  <div style={{ padding:"8px 10px", borderRadius:9, background:"rgba(255,255,255,.03)" }}>
                    <p style={{ fontSize:".6rem", color:"#64748b", margin:"0 0 2px" }}>Avg Season Spend</p>
                    <p style={{ fontWeight:800, color:"#f1f5f9", margin:0, fontSize:".82rem" }}>{fmtCr(s.avgSeasonSpend)}/mo</p>
                  </div>
                  <div style={{ padding:"8px 10px", borderRadius:9, background:"rgba(255,255,255,.03)" }}>
                    <p style={{ fontSize:".6rem", color:"#64748b", margin:"0 0 2px" }}>Extra vs Normal</p>
                    <p style={{ fontWeight:800, color:s.color, margin:0, fontSize:".82rem" }}>+{fmtCr(s.extraSpend)}</p>
                  </div>
                </div>

                {s.monthlySaving > 0 && (
                  <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.15)" }}>
                    <p style={{ fontSize:".72rem", color:"#34d399", fontWeight:700, margin:"0 0 2px" }}>💡 Start Sinking Fund</p>
                    <p style={{ fontSize:".72rem", color:"#94a3b8", margin:0 }}>
                      Save {fmt(s.monthlySaving)}/month for {s.monthsAway} months → ready for {s.name}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <TIP color="#fbbf24" >{ss.tip}</TIP>
        </div>
      )}

      {(!sd && !pi && !dt && !ss) && (
        <div style={{ textAlign:"center", padding:"40px", borderRadius:16, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
          <p style={{ color:"#64748b" }}>Add more transactions (at least 2 months) to unlock all 4 insights.</p>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}