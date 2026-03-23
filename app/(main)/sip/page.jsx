"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, IndianRupee, Target, Sparkles,
  Loader2, Calculator, BarChart2, ArrowUpRight, Info,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine,
} from "recharts";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtCr  = (n) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : fmt(n);
const fmtNum = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

// ── Slider Input ──────────────────────────────────────────────────────────────
function Slider({ label, value, onChange, min, max, step = 1, suffix = "", prefix = "" }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: ".78rem", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: ".82rem", fontWeight: 800, color: "#f1f5f9" }}>
          {prefix}{fmtNum(value)}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#34d399", cursor: "pointer" }}/>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: ".6rem", color: "#334155" }}>{prefix}{min}{suffix}</span>
        <span style={{ fontSize: ".6rem", color: "#334155" }}>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 14,
      background: `${color}08`, border: `1px solid ${color}25` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        {Icon && <Icon size={13} style={{ color }}/>}
        <span style={{ fontSize: ".65rem", color: "#64748b", fontWeight: 700,
          textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      </div>
      <p style={{ fontWeight: 900, fontSize: "1.15rem", color, margin: "0 0 2px" }}>{value}</p>
      {sub && <p style={{ fontSize: ".65rem", color: "#475569", margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(5,13,27,.97)", border: "1px solid rgba(52,211,153,.25)",
      borderRadius: 10, padding: "10px 14px", fontSize: ".75rem" }}>
      <p style={{ color: "#34d399", fontWeight: 700, margin: "0 0 6px" }}>Year {label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: {fmtCr(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Risk Tab ──────────────────────────────────────────────────────────────────
function RiskTab({ active, label, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "8px 4px", borderRadius: 9999, fontSize: ".75rem", fontWeight: 700,
      cursor: "pointer", transition: "all .15s",
      background: active ? `${color}18` : "rgba(255,255,255,.04)",
      border: active ? `1px solid ${color}45` : "1px solid rgba(255,255,255,.08)",
      color: active ? color : "#64748b",
    }}>{label}</button>
  );
}

const RISK_COLORS = { conservative: "#60a5fa", moderate: "#34d399", aggressive: "#f87171" };
const RISK_RETURNS = { conservative: 8, moderate: 12, aggressive: 16 };

export default function SIPPage() {
  const [monthly,    setMonthly]    = useState(5000);
  const [rate,       setRate]       = useState(12);
  const [tenure,     setTenure]     = useState(10);
  const [stepUp,     setStepUp]     = useState(10);
  const [goalAmt,    setGoalAmt]    = useState(10000000);
  const [riskProfile,setRiskProfile]= useState("moderate");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [activeTab,  setActiveTab]  = useState("calculator"); // calculator | stepup | compare | goal | funds

  const calculate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sip", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          monthlyAmount:  monthly,
          expectedReturn: rate,
          tenure,
          stepUpPercent:  stepUp,
          goalAmount:     goalAmt,
          riskProfile,
        }),
      });
      setResult(await res.json());
    } catch { alert("Calculation failed"); }
    finally { setLoading(false); }
  };

  const handleRiskChange = (profile) => {
    setRiskProfile(profile);
    setRate(RISK_RETURNS[profile]);
  };

  const r = result;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-5xl gradient-title">SIP Investment Analysis</h1>
        <p style={{ color: "#64748b", fontSize: ".84rem", marginTop: 6 }}>
          Systematic Investment Plan — Calculator · Step-up · Goal Planning · Fund Recommendations
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

        {/* ── LEFT — Inputs ── */}
        <div>
          {/* Risk Profile */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(255,255,255,.07)", marginBottom: 12 }}>
            <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b",
              textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>Risk Profile</p>
            <div style={{ display: "flex", gap: 6 }}>
              {["conservative", "moderate", "aggressive"].map(p => (
                <RiskTab key={p} active={riskProfile === p} label={p.charAt(0).toUpperCase() + p.slice(1)}
                  color={RISK_COLORS[p]} onClick={() => handleRiskChange(p)}/>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)",
            border: "1px solid rgba(255,255,255,.07)", marginBottom: 12 }}>
            <Slider label="Monthly SIP Amount"   value={monthly} onChange={setMonthly} min={500}   max={200000} step={500}  prefix="₹" />
            <Slider label="Expected Return (p.a.)"value={rate}    onChange={setRate}    min={4}     max={30}     step={0.5}  suffix="%" />
            <Slider label="Investment Tenure"     value={tenure}  onChange={setTenure}  min={1}     max={40}               suffix=" yrs" />
            <Slider label="Annual Step-up"        value={stepUp}  onChange={setStepUp}  min={0}     max={30}               suffix="%" />
          </div>

          {/* Goal Planning Input */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(167,139,250,.05)",
            border: "1px solid rgba(167,139,250,.18)", marginBottom: 12 }}>
            <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#a78bfa",
              textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>🎯 My Target Corpus</p>
            <Slider label="I want to accumulate" value={goalAmt} onChange={setGoalAmt}
              min={100000} max={100000000} step={100000} prefix="₹" />
            <p style={{ fontSize: ".68rem", color: "#64748b", margin: "4px 0 0" }}>
              = {fmtCr(goalAmt)} in {tenure} years
            </p>
          </div>

          {/* Calculate Button */}
          <button onClick={calculate} disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff",
              fontWeight: 800, fontSize: ".9rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }}/> : <Calculator size={18}/>}
            {loading ? "Calculating…" : "Calculate SIP"}
          </button>

          {/* Quick stat before calculation */}
          {!r && (
            <div style={{ marginTop: 14, padding: "12px", borderRadius: 12,
              background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.15)" }}>
              <p style={{ fontSize: ".72rem", color: "#34d399", margin: "0 0 4px", fontWeight: 700 }}>Quick Estimate</p>
              <p style={{ fontSize: ".8rem", color: "#f1f5f9", margin: 0, fontWeight: 800 }}>
                {fmtCr(Math.round((() => {
                  const r2 = rate / 100 / 12, n = tenure * 12;
                  return monthly * ((Math.pow(1 + r2, n) - 1) / r2) * (1 + r2);
                })()))}
              </p>
              <p style={{ fontSize: ".65rem", color: "#64748b", margin: "2px 0 0" }}>
                vs ₹{fmtNum(monthly * tenure * 12)} invested
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT — Results ── */}
        <div>
          {!r && (
            <div style={{ padding: "60px 20px", textAlign: "center", borderRadius: 20,
              background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize: "3rem", margin: "0 0 14px" }}>📈</p>
              <p style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 8px" }}>Set your SIP parameters</p>
              <p style={{ color: "#475569", fontSize: ".82rem", margin: 0 }}>
                Adjust the sliders and click Calculate to see your full SIP analysis with AI recommendations.
              </p>
            </div>
          )}

          {r && (
            <>
              {/* Tabs */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { id: "calculator", label: "📊 Results" },
                  { id: "stepup",     label: "📈 Step-up SIP" },
                  { id: "compare",    label: "⚖️ Scenarios" },
                  { id: "goal",       label: "🎯 Goal Planner" },
                  { id: "funds",      label: "💼 Fund Picks" },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    style={{ padding: "7px 14px", borderRadius: 9999, fontSize: ".75rem",
                      fontWeight: 700, cursor: "pointer", transition: "all .15s",
                      background: activeTab === t.id ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)",
                      border: activeTab === t.id ? "1px solid rgba(52,211,153,.35)" : "1px solid rgba(255,255,255,.08)",
                      color: activeTab === t.id ? "#34d399" : "#64748b" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Tab: Calculator ── */}
              {activeTab === "calculator" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* KPI row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    <StatCard label="Maturity Value"  value={fmtCr(r.sipResult)} color="#34d399" icon={TrendingUp}
                      sub={`in ${tenure} years`}/>
                    <StatCard label="Total Invested"  value={fmtCr(r.sipInvested)} color="#60a5fa" icon={IndianRupee}
                      sub={`${fmtNum(monthly)}/month`}/>
                    <StatCard label="Total Gains"     value={fmtCr(r.sipGains)} color="#a78bfa" icon={ArrowUpRight}
                      sub={`${r.absReturn.toFixed(1)}% returns`}/>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                    <StatCard label="Wealth Ratio"   value={`${r.wealthRatio}x`} color="#fbbf24"
                      sub="Your money multiplied"/>
                    <StatCard label="Monthly → Yearly" value={fmt(monthly * 12)} color="#06b6d4"
                      sub="Annual SIP investment"/>
                    <StatCard label="Rate of Return"  value={`${rate}% p.a.`} color="#f97316"
                      sub="Expected CAGR"/>
                  </div>

                  {/* Growth chart */}
                  <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)",
                    border: "1px solid rgba(255,255,255,.07)" }}>
                    <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>
                      Corpus Growth Over {tenure} Years
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={r.yearlyChart}>
                        <defs>
                          <linearGradient id="corpGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                          tickFormatter={v => v % 5 === 0 || v === tenure ? `Y${v}` : ""}/>
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                          tickFormatter={fmtCr} width={52}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        <Area type="monotone" dataKey="corpus"   name="Corpus"   stroke="#34d399" strokeWidth={2} fill="url(#corpGrad)"/>
                        <Area type="monotone" dataKey="invested"  name="Invested" stroke="#60a5fa" strokeWidth={2} fill="url(#invGrad)" strokeDasharray="4 2"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* AI Insight */}
                  {r.aiInsight && (
                    <div style={{ padding: "14px 16px", borderRadius: 14,
                      background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.2)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                        <Sparkles size={14} style={{ color: "#a78bfa" }}/>
                        <span style={{ fontSize: ".7rem", fontWeight: 700, color: "#a78bfa",
                          textTransform: "uppercase", letterSpacing: ".06em" }}>CA Arjun's SIP Advice</span>
                      </div>
                      <p style={{ fontSize: ".78rem", color: "#94a3b8", margin: 0,
                        lineHeight: 1.7, whiteSpace: "pre-line" }}>{r.aiInsight}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Step-up SIP ── */}
              {activeTab === "stepup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ padding: "16px", borderRadius: 14, background: "rgba(52,211,153,.06)",
                      border: "1px solid rgba(52,211,153,.2)" }}>
                      <p style={{ fontSize: ".68rem", color: "#64748b", margin: "0 0 6px", fontWeight: 700 }}>Regular SIP</p>
                      <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "#34d399", margin: 0 }}>{fmtCr(r.sipResult)}</p>
                      <p style={{ fontSize: ".68rem", color: "#64748b", margin: "4px 0 0" }}>Fixed {fmt(monthly)}/month</p>
                    </div>
                    <div style={{ padding: "16px", borderRadius: 14, background: "rgba(167,139,250,.06)",
                      border: "1px solid rgba(167,139,250,.2)" }}>
                      <p style={{ fontSize: ".68rem", color: "#64748b", margin: "0 0 6px", fontWeight: 700 }}>Step-up SIP ({stepUp}%/yr)</p>
                      <p style={{ fontSize: "1.4rem", fontWeight: 900, color: "#a78bfa", margin: 0 }}>{fmtCr(r.stepUp.finalCorpus)}</p>
                      <p style={{ fontSize: ".68rem", color: "#64748b", margin: "4px 0 0" }}>Extra: {fmtCr(r.stepUp.finalCorpus - r.sipResult)}</p>
                    </div>
                  </div>

                  {/* Step-up chart */}
                  <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)",
                    border: "1px solid rgba(255,255,255,.07)" }}>
                    <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>
                      Regular vs Step-up SIP Comparison
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={r.stepUp.yearlyData}>
                        <defs>
                          <linearGradient id="stepGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="regGrad2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}/>
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                          tickFormatter={fmtCr} width={52}/>
                        <Tooltip content={<ChartTooltip/>}/>
                        <Area type="monotone" dataKey="corpus"   name="Step-up Corpus" stroke="#a78bfa" strokeWidth={2} fill="url(#stepGrad)"/>
                        <Area type="monotone" dataKey="invested"  name="Invested"       stroke="#34d399" strokeWidth={2} fill="url(#regGrad2)" strokeDasharray="4 2"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Year-by-year table */}
                  <div style={{ borderRadius: 14, background: "rgba(255,255,255,.02)",
                    border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr",
                      padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.06)",
                      fontSize: ".65rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
                      <span>Year</span><span>Monthly SIP</span><span>Invested</span><span>Corpus</span><span>Gains</span>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                      {r.stepUp.yearlyData.map((row, i) => (
                        <div key={row.year} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr",
                          padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.04)",
                          background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)",
                          fontSize: ".72rem" }}>
                          <span style={{ color: "#a78bfa", fontWeight: 700 }}>Y{row.year}</span>
                          <span style={{ color: "#f1f5f9" }}>{fmtCr(row.monthly)}</span>
                          <span style={{ color: "#60a5fa" }}>{fmtCr(row.invested)}</span>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>{fmtCr(row.corpus)}</span>
                          <span style={{ color: "#fbbf24" }}>{fmtCr(row.gains)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Scenarios ── */}
              {activeTab === "compare" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: ".78rem", color: "#64748b", margin: 0 }}>
                    {fmt(monthly)}/month × {tenure} years at different return rates
                  </p>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={r.scenarios} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                      <XAxis dataKey="rate" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${v}%`}/>
                      <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                        tickFormatter={fmtCr} width={52}/>
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                        <div style={{ background:"rgba(5,13,27,.97)",border:"1px solid rgba(52,211,153,.25)",borderRadius:10,padding:"10px 14px",fontSize:".75rem"}}>
                          <p style={{color:"#34d399",fontWeight:700,margin:"0 0 6px"}}>{label}% p.a.</p>
                          {payload.map(p=><p key={p.name} style={{color:p.fill,margin:"2px 0"}}>{p.name}: {fmtCr(p.value)}</p>)}
                        </div>
                      ) : null}/>
                      <Legend wrapperStyle={{ fontSize: ".72rem", color: "#64748b" }}/>
                      <ReferenceLine y={r.sipInvested} stroke="#60a5fa" strokeDasharray="4 2" label={{ value:"Invested", fill:"#60a5fa", fontSize:10 }}/>
                      <Bar dataKey="finalValue" name="Maturity Value" fill="#34d399" radius={[6,6,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {r.scenarios.map(s => (
                      <div key={s.rate} style={{ display: "flex", alignItems: "center",
                        padding: "10px 14px", borderRadius: 10, justifyContent: "space-between",
                        background: s.rate === rate ? "rgba(52,211,153,.07)" : "rgba(255,255,255,.02)",
                        border: `1px solid ${s.rate === rate ? "rgba(52,211,153,.25)" : "rgba(255,255,255,.06)"}` }}>
                        <div>
                          <span style={{ fontSize: ".78rem", fontWeight: 700,
                            color: s.rate === rate ? "#34d399" : "#f1f5f9" }}>{s.rate}% — {s.label}</span>
                          {s.rate === rate && <span style={{ marginLeft: 8, fontSize: ".62rem", color: "#34d399" }}>← Your rate</span>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontWeight: 800, fontSize: ".88rem", color: "#f1f5f9", margin: 0 }}>{fmtCr(s.finalValue)}</p>
                          <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>Gain: {fmtCr(s.gains)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Goal Planner ── */}
              {activeTab === "goal" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "20px", borderRadius: 16,
                    background: r.goalPlanning.shortfall > 0 ? "rgba(248,113,113,.06)" : "rgba(52,211,153,.06)",
                    border: `1px solid ${r.goalPlanning.shortfall > 0 ? "rgba(248,113,113,.2)" : "rgba(52,211,153,.2)"}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <Target size={20} style={{ color: r.goalPlanning.shortfall > 0 ? "#f87171" : "#34d399" }}/>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: ".95rem",
                          color: r.goalPlanning.shortfall > 0 ? "#f87171" : "#34d399", margin: 0 }}>
                          {r.goalPlanning.shortfall > 0 ? "SIP Shortfall Detected" : "Goal Achievable! 🎉"}
                        </p>
                        <p style={{ fontSize: ".7rem", color: "#64748b", margin: 0 }}>
                          Target: {fmtCr(r.goalPlanning.targetAmount)} in {tenure} years
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,.04)" }}>
                        <p style={{ fontSize: ".65rem", color: "#64748b", margin: "0 0 4px" }}>Current SIP gives</p>
                        <p style={{ fontWeight: 800, color: "#34d399", margin: 0, fontSize: "1.05rem" }}>
                          {fmtCr(r.goalPlanning.atCurrentSip)}
                        </p>
                      </div>
                      <div style={{ padding: "12px", borderRadius: 10, background: "rgba(255,255,255,.04)" }}>
                        <p style={{ fontSize: ".65rem", color: "#64748b", margin: "0 0 4px" }}>Required monthly SIP</p>
                        <p style={{ fontWeight: 800, color: "#a78bfa", margin: 0, fontSize: "1.05rem" }}>
                          {fmt(r.goalPlanning.requiredMonthly)}
                        </p>
                      </div>
                    </div>

                    {r.goalPlanning.shortfall > 0 && (
                      <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 9,
                        background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.15)" }}>
                        <p style={{ fontSize: ".75rem", color: "#f87171", margin: 0 }}>
                          ⚠️ Shortfall: {fmtCr(r.goalPlanning.shortfall)} — Increase SIP by {fmt(r.goalPlanning.requiredMonthly - monthly)}/month to reach your goal
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Common goals */}
                  <div style={{ padding: "14px 16px", borderRadius: 14,
                    background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                    <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>
                      Common Indian Financial Goals
                    </p>
                    {[
                      { goal: "Emergency Fund (6 months)", target: 600000,  years: 2  },
                      { goal: "Down Payment (20% of 50L home)", target: 1000000, years: 5  },
                      { goal: "Child's Higher Education",  target: 5000000, years: 15 },
                      { goal: "Car Purchase",              target: 1500000, years: 3  },
                      { goal: "Early Retirement Corpus",   target: 30000000,years: 20 },
                    ].map(g => {
                      const r2 = rate / 100 / 12, n = g.years * 12;
                      const needed = Math.ceil(g.target / (((Math.pow(1+r2,n)-1)/r2)*(1+r2)));
                      return (
                        <div key={g.goal} style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", padding: "8px 0",
                          borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                          <div>
                            <p style={{ fontSize: ".76rem", fontWeight: 600, color: "#f1f5f9", margin: "0 0 2px" }}>{g.goal}</p>
                            <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>{fmtCr(g.target)} in {g.years} yrs</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: ".78rem", fontWeight: 800, color: "#a78bfa", margin: 0 }}>{fmt(needed)}/mo</p>
                            <p style={{ fontSize: ".6rem", color: "#64748b", margin: 0 }}>@ {rate}% p.a.</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Tab: Fund Picks ── */}
              {activeTab === "funds" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ padding: "10px 14px", borderRadius: 10,
                    background: `${RISK_COLORS[riskProfile]}10`, border: `1px solid ${RISK_COLORS[riskProfile]}30` }}>
                    <p style={{ fontSize: ".75rem", color: RISK_COLORS[riskProfile], fontWeight: 700, margin: 0 }}>
                      {riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} profile — {riskProfile === "conservative" ? "6-10%" : riskProfile === "moderate" ? "10-15%" : "15-25%"} expected returns
                    </p>
                  </div>

                  {r.recommendedFunds.map((fund, i) => (
                    <div key={i} style={{ padding: "14px 16px", borderRadius: 14,
                      background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: ".84rem", color: "#f1f5f9", margin: "0 0 3px" }}>{fund.name}</p>
                          <span style={{ padding: "2px 8px", borderRadius: 9999, fontSize: ".62rem",
                            fontWeight: 700, background: `${RISK_COLORS[riskProfile]}15`,
                            border: `1px solid ${RISK_COLORS[riskProfile]}30`,
                            color: RISK_COLORS[riskProfile] }}>{fund.category}</span>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p style={{ fontSize: ".82rem", fontWeight: 800, color: "#34d399", margin: "0 0 2px" }}>
                            {fund.minReturn}–{fund.maxReturn}%
                          </p>
                          <p style={{ fontSize: ".62rem", color: "#64748b", margin: 0 }}>Expected CAGR</p>
                        </div>
                      </div>
                      <p style={{ fontSize: ".72rem", color: "#64748b", margin: "6px 0 0" }}>
                        💡 {fund.why}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8,
                        paddingTop: 8, borderTop: "1px solid rgba(255,255,255,.05)" }}>
                        <span style={{ fontSize: ".65rem", color: "#475569" }}>
                          Risk: <span style={{ color: fund.risk.includes("High") ? "#f87171" : fund.risk === "Medium" ? "#fbbf24" : "#34d399",
                            fontWeight: 700 }}>{fund.risk}</span>
                        </span>
                        <span style={{ fontSize: ".65rem", color: "#475569" }}>
                          SIP via: Groww · Zerodha Coin · Kuvera
                        </span>
                      </div>
                    </div>
                  ))}

                  <p style={{ fontSize: ".65rem", color: "#334155", textAlign: "center", marginTop: 4 }}>
                    Past performance does not guarantee future returns · Not SEBI investment advice
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}