"use client";
import { useState, useEffect } from "react";
import { Bot, TrendingUp, Target, Sparkles, Loader2, Shield, AlertTriangle, IndianRupee, BarChart2, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtCr  = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : fmt(n);
const fmtNum = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

function Slider({ label, value, onChange, min, max, step = 1, suffix = "", prefix = "" }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:".76rem", color:"#94a3b8", fontWeight:600 }}>{label}</span>
        <span style={{ fontSize:".8rem", fontWeight:800, color:"#f1f5f9" }}>{prefix}{fmtNum(value)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width:"100%", accentColor:"#34d399", cursor:"pointer" }}/>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:".6rem", color:"#334155" }}>{prefix}{min}{suffix}</span>
        <span style={{ fontSize:".6rem", color:"#334155" }}>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}

const RISK_LABELS = ["","Very Low","Low","Low-Med","Moderate","Moderate","Med-High","Med-High","High","High","Very High"];
const RISK_COLORS = ["","#60a5fa","#60a5fa","#34d399","#34d399","#fbbf24","#fbbf24","#f97316","#f87171","#f87171","#ef4444"];

export default function RoboAdvisorPage() {
  const [form, setForm] = useState({
    monthly_income:     0,
    monthly_expenses:   0,
    investment_amount:  100000,
    monthly_sip:        5000,
    risk_score:         5,
    investment_horizon: 10,
    age:                28,
    existing_emis:      0,
    has_emergency_fund: false,
    tax_bracket:        0.30,
  });
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [activeTab, setActiveTab] = useState("allocation");

  // Portfolio Risk state
  const [risk,      setRisk]      = useState(null);
  const [riskLoad,  setRiskLoad]  = useState(false);
  const [optResult, setOptResult] = useState(null);
  const [optLoad,   setOptLoad]   = useState(false);
  const [optProfile, setOptProfile] = useState("moderate");

  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  // Auto-fill income
  useEffect(() => {
    fetch("/api/ml/robo-advisor").then(r => r.json()).then(d => {
      if (d.monthly_income) setForm(p => ({ ...p,
        monthly_income: d.monthly_income,
        monthly_expenses: d.monthly_expenses,
        existing_emis: d.existing_emis || 0,
      }));
    }).catch(() => {});
  }, []);

  const advise = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ml/robo-advisor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setResult(await res.json());
    } catch { alert("Service unavailable. Start ML service on port 8002."); }
    finally { setLoading(false); }
  };

  const analyzeRisk = async () => {
    setRiskLoad(true);
    try {
      const res = await fetch("/api/ml/portfolio-risk");
      setRisk(await res.json());
    } catch {} finally { setRiskLoad(false); }
  };

  const optimizePortfolio = async () => {
    setOptLoad(true);
    try {
      const res = await fetch("/api/ml/portfolio-optimize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskProfile: optProfile }),
      });
      setOptResult(await res.json());
    } catch {} finally { setOptLoad(false); }
  };

  const r = result;

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 20px" }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 className="text-5xl gradient-title">Robo Advisor</h1>
        <p style={{ color:"#64748b", fontSize:".84rem", marginTop:6 }}>
          AI-powered portfolio allocation · Risk analytics · Portfolio optimizer · Tax-loss harvesting
        </p>
        <p style={{ fontSize:".72rem", color:"#475569", marginTop:4 }}>
          Powered by FinGPT Trader algorithms — RoboService · RiskAnalyzer · PortfolioOptimizer
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { id:"allocation", label:"🤖 Robo Allocation" },
          { id:"risk",       label:"📊 Risk Analytics" },
          { id:"optimize",   label:"⚡ Portfolio Optimizer" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding:"9px 18px", borderRadius:9999, fontSize:".8rem", fontWeight:700, cursor:"pointer",
            background: activeTab===t.id ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)",
            border:     activeTab===t.id ? "1px solid rgba(52,211,153,.35)" : "1px solid rgba(255,255,255,.08)",
            color:      activeTab===t.id ? "#34d399" : "#64748b",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══════════════════ TAB 1: ROBO ALLOCATION ══════════════════ */}
      {activeTab === "allocation" && (
        <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:20 }}>

          {/* Inputs */}
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ padding:"16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
              <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 14px" }}>Risk Profile</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:".75rem", color:"#94a3b8" }}>Risk Score</span>
                <span style={{ padding:"3px 10px", borderRadius:9999, fontSize:".7rem", fontWeight:700,
                  background:`${RISK_COLORS[form.risk_score]}18`, border:`1px solid ${RISK_COLORS[form.risk_score]}30`,
                  color:RISK_COLORS[form.risk_score] }}>{RISK_LABELS[form.risk_score]}</span>
              </div>
              <Slider label="" value={form.risk_score} onChange={set("risk_score")} min={1} max={10}/>
              <Slider label="Age" value={form.age} onChange={set("age")} min={18} max={65} suffix=" yrs"/>
              <Slider label="Investment Horizon" value={form.investment_horizon} onChange={set("investment_horizon")} min={1} max={30} suffix=" yrs"/>
            </div>

            <div style={{ padding:"16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
              <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 14px" }}>Finances</p>
              <Slider label="Monthly Income"    value={form.monthly_income}    onChange={set("monthly_income")}    min={0} max={500000} step={1000} prefix="₹"/>
              <Slider label="Monthly Expenses"  value={form.monthly_expenses}  onChange={set("monthly_expenses")}  min={0} max={300000} step={1000} prefix="₹"/>
              <Slider label="Existing EMIs"     value={form.existing_emis}     onChange={set("existing_emis")}     min={0} max={100000} step={500}  prefix="₹"/>
              <Slider label="Lumpsum to Invest" value={form.investment_amount} onChange={set("investment_amount")} min={0} max={5000000} step={10000} prefix="₹"/>
              <Slider label="Monthly SIP"       value={form.monthly_sip}       onChange={set("monthly_sip")}       min={0} max={100000} step={500}  prefix="₹"/>
            </div>

            <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
              <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 12px" }}>Preferences</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:".76rem", color:"#94a3b8" }}>Tax Bracket</span>
                <select value={form.tax_bracket} onChange={e => set("tax_bracket")(parseFloat(e.target.value))}
                  style={{ padding:"4px 8px", borderRadius:8, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", color:"#f1f5f9", fontSize:".76rem" }}>
                  <option value={0.10}>10% (Up to ₹5L)</option>
                  <option value={0.20}>20% (₹5L–₹10L)</option>
                  <option value={0.30}>30% (Above ₹10L)</option>
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:".76rem", color:"#94a3b8" }}>Emergency Fund Built?</span>
                <button onClick={() => set("has_emergency_fund")(!form.has_emergency_fund)} style={{
                  width:40, height:22, borderRadius:9999, position:"relative", cursor:"pointer",
                  background: form.has_emergency_fund ? "rgba(52,211,153,.4)" : "rgba(255,255,255,.08)",
                  border:`1px solid ${form.has_emergency_fund ? "rgba(52,211,153,.5)" : "rgba(255,255,255,.12)"}`,
                }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", position:"absolute",
                    top:2, left: form.has_emergency_fund ? 20 : 2,
                    background: form.has_emergency_fund ? "#34d399" : "#475569", transition:"left .2s" }}/>
                </button>
              </div>
            </div>

            <button onClick={advise} disabled={loading || !form.monthly_income} style={{
              padding:"14px", borderRadius:12, border:"none", fontWeight:800, fontSize:".9rem", cursor:"pointer",
              background: form.monthly_income ? "linear-gradient(135deg,#34d399,#059669)" : "rgba(255,255,255,.06)",
              color: form.monthly_income ? "#fff" : "#475569",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>
              {loading ? <Loader2 size={18} style={{ animation:"spin 1s linear infinite" }}/> : <Bot size={18}/>}
              {loading ? "Analysing…" : "Get Robo Advice"}
            </button>
          </div>

          {/* Results */}
          <div>
            {!r && (
              <div style={{ padding:"50px 20px", textAlign:"center", borderRadius:20,
                background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                <p style={{ fontSize:"3rem", margin:"0 0 14px" }}>🤖</p>
                <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 8px" }}>Set your profile to get started</p>
                <p style={{ color:"#475569", fontSize:".8rem", margin:0 }}>
                  Fill in your financial details and click "Get Robo Advice" for an AI-generated portfolio allocation.
                </p>
              </div>
            )}

            {r && !r.error && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

                {/* Emergency fund alert */}
                {!r.emergencyFund?.hasEmergencyFund && (
                  <div style={{ padding:"12px 16px", borderRadius:14, background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.2)", display:"flex", alignItems:"center", gap:10 }}>
                    <AlertTriangle size={16} style={{ color:"#f87171", flexShrink:0 }}/>
                    <div>
                      <p style={{ fontWeight:700, color:"#f87171", margin:"0 0 2px", fontSize:".8rem" }}>Build Emergency Fund First</p>
                      <p style={{ color:"#94a3b8", fontSize:".72rem", margin:0 }}>Recommended: {fmtCr(r.emergencyFund?.recommended)} (6 months expenses)</p>
                    </div>
                  </div>
                )}

                {/* KPIs */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    { l:"Risk Profile",  v:r.riskLabel,            c:RISK_COLORS[form.risk_score] },
                    { l:"Projected Corpus", v:fmtCr(r.totalProjected), c:"#34d399" },
                    { l:"Total Invested",   v:fmtCr(r.totalInvested),  c:"#60a5fa" },
                  ].map(k => (
                    <div key={k.l} style={{ padding:"14px", borderRadius:14, background:`${k.c}08`, border:`1px solid ${k.c}20` }}>
                      <p style={{ fontSize:".65rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", margin:"0 0 6px" }}>{k.l}</p>
                      <p style={{ fontSize:"1.05rem", fontWeight:900, color:k.c, margin:0 }}>{k.v}</p>
                    </div>
                  ))}
                </div>

                {/* Pie chart + allocation list */}
                <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:16, padding:"16px", borderRadius:16,
                  background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div>
                    <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 10px" }}>Allocation</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={r.allocation} dataKey="allocation" nameKey="asset" innerRadius={45} outerRadius={75}>
                          {r.allocation.map((a, i) => <Cell key={i} fill={a.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:".72rem" }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {r.allocation.map((a, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 10px", borderRadius:9,
                        background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.05)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ fontSize:"1rem" }}>{a.icon}</span>
                          <div>
                            <p style={{ fontSize:".72rem", fontWeight:700, color:"#f1f5f9", margin:0 }}>{a.asset}</p>
                            <p style={{ fontSize:".6rem", color:"#64748b", margin:0 }}>{a.cagr}% CAGR · {a.risk}</p>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:".8rem", fontWeight:800, color:a.color, margin:0 }}>{a.allocation}%</p>
                          <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{fmt(a.amount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projected FV bar chart */}
                <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 12px" }}>Projected Future Value by Asset</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={r.allocation} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                      <XAxis dataKey="icon" tick={{ fontSize:14 }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} tickFormatter={fmtCr} width={52}/>
                      <Tooltip formatter={(v) => fmtCr(v)} labelFormatter={(_, p) => p?.[0]?.payload?.asset || ""} contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:".72rem" }}/>
                      <Bar dataKey="projectedFV" name="Projected Value" radius={[6,6,0,0]}>
                        {r.allocation.map((a, i) => <Cell key={i} fill={a.color}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tax tips */}
                {r.taxTips?.length > 0 && (
                  <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(96,165,250,.05)", border:"1px solid rgba(96,165,250,.18)" }}>
                    <p style={{ fontSize:".7rem", fontWeight:700, color:"#60a5fa", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 10px" }}>💡 Tax Optimisation Tips</p>
                    {r.taxTips.map((t, i) => <p key={i} style={{ fontSize:".75rem", color:"#94a3b8", margin:"0 0 4px" }}>• {t}</p>)}
                  </div>
                )}

                {/* Rebalance signals */}
                {r.rebalanceSignals?.length > 0 && (
                  <div style={{ padding:"14px 16px", borderRadius:14, background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.18)" }}>
                    <p style={{ fontSize:".7rem", fontWeight:700, color:"#fbbf24", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 10px" }}>⚖ Rebalancing Signals</p>
                    {r.rebalanceSignals.map((s, i) => <p key={i} style={{ fontSize:".75rem", color:"#94a3b8", margin:"0 0 4px" }}>• {s}</p>)}
                  </div>
                )}

                <p style={{ fontSize:".62rem", color:"#334155", textAlign:"center", margin:0 }}>
                  Powered by FinGPT RoboService · Indian market adapted · Not SEBI investment advice
                </p>
              </div>
            )}

            {r?.error && (
              <div style={{ padding:"20px", borderRadius:16, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.2)", textAlign:"center" }}>
                <p style={{ color:"#f87171", fontSize:".82rem" }}>
                  {r.offline ? "⚙️ Start ML service: python -m uvicorn advanced_ai:app --port 8002" : r.error}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: RISK ANALYTICS ══════════════════ */}
      {activeTab === "risk" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <p style={{ color:"#94a3b8", fontSize:".82rem", margin:0 }}>
                VaR · Beta · Sharpe Ratio · EWMA Volatility · Tax-Loss Harvesting alerts
              </p>
              <p style={{ color:"#475569", fontSize:".7rem", margin:"4px 0 0" }}>Powered by FinGPT RiskAnalyzer</p>
            </div>
            <button onClick={analyzeRisk} disabled={riskLoad} style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:9999,
              background:"linear-gradient(135deg,rgba(96,165,250,.15),rgba(59,130,246,.08))",
              border:"1px solid rgba(96,165,250,.35)", color:"#60a5fa", fontWeight:700,
              fontSize:".8rem", cursor:"pointer",
            }}>
              {riskLoad ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <BarChart2 size={14}/>}
              {riskLoad ? "Analysing…" : "Analyse Portfolio Risk"}
            </button>
          </div>

          {!risk && !riskLoad && (
            <div style={{ padding:"48px 20px", textAlign:"center", borderRadius:20, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>📊</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>Portfolio Risk Analysis</p>
              <p style={{ color:"#475569", fontSize:".8rem" }}>Click "Analyse Portfolio Risk" to get VaR, Beta, Sharpe Ratio and tax-loss harvesting opportunities from your holdings.</p>
            </div>
          )}

          {risk?.offline && (
            <div style={{ padding:"16px", borderRadius:12, background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.2)", textAlign:"center" }}>
              <p style={{ color:"#f87171", fontSize:".82rem" }}>⚙️ Start ML service: python -m uvicorn advanced_ai:app --port 8002</p>
            </div>
          )}

          {risk && !risk.error && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Portfolio-level metrics */}
              {risk.portfolioMetrics && Object.keys(risk.portfolioMetrics).length > 0 && (
                <>
                  {/* Market Regime */}
                  {risk.portfolioMetrics.marketRegime && (
                    <div style={{ padding:"14px 18px", borderRadius:14,
                      background:`${risk.portfolioMetrics.marketRegime.color}10`,
                      border:`1px solid ${risk.portfolioMetrics.marketRegime.color}25`,
                      display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:risk.portfolioMetrics.marketRegime.color, boxShadow:`0 0 8px ${risk.portfolioMetrics.marketRegime.color}` }}/>
                      <div>
                        <p style={{ fontWeight:700, fontSize:".82rem", color:risk.portfolioMetrics.marketRegime.color, margin:0 }}>
                          Market Regime: {risk.portfolioMetrics.marketRegime.label}
                        </p>
                        <p style={{ fontSize:".67rem", color:"#64748b", margin:0 }}>Based on FinGPT MarketRegimeDetector</p>
                      </div>
                    </div>
                  )}

                  {/* Risk KPIs */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                    {[
                      { l:"Annualised Vol",    v:`${risk.portfolioMetrics.annualisedVol}%`,   c:"#f97316" },
                      { l:"Value at Risk (95%)",v:`${risk.portfolioMetrics.var95}%`,           c:"#f87171" },
                      { l:"Sharpe Ratio",      v:risk.portfolioMetrics.sharpe,                 c: risk.portfolioMetrics.sharpe > 1 ? "#34d399" : risk.portfolioMetrics.sharpe > 0 ? "#fbbf24" : "#f87171" },
                      { l:"Beta vs Nifty50",   v:risk.portfolioMetrics.beta,                   c:"#a78bfa" },
                    ].map(m => (
                      <div key={m.l} style={{ padding:"14px", borderRadius:14, background:`${m.c}08`, border:`1px solid ${m.c}20` }}>
                        <p style={{ fontSize:".63rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", margin:"0 0 6px" }}>{m.l}</p>
                        <p style={{ fontSize:"1.1rem", fontWeight:900, color:m.c, margin:0 }}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                    {[
                      { l:"Expected Shortfall", v:`${risk.portfolioMetrics.expectedShortfall}%`, c:"#f87171" },
                      { l:"Max Drawdown",        v:`${risk.portfolioMetrics.maxDrawdown}%`,       c:"#f97316" },
                      { l:"Concentration (HHI)", v:risk.portfolioMetrics.concentration,            c: risk.portfolioMetrics.concentration > 0.3 ? "#f87171" : "#34d399" },
                    ].map(m => (
                      <div key={m.l} style={{ padding:"14px", borderRadius:14, background:`${m.c}08`, border:`1px solid ${m.c}20` }}>
                        <p style={{ fontSize:".63rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", margin:"0 0 6px" }}>{m.l}</p>
                        <p style={{ fontSize:"1.1rem", fontWeight:900, color:m.c, margin:0 }}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Tax-loss harvesting */}
              {risk.taxLossAlerts?.length > 0 && (
                <div style={{ padding:"16px 18px", borderRadius:16, background:"rgba(52,211,153,.05)", border:"1px solid rgba(52,211,153,.2)" }}>
                  <p style={{ fontSize:".7rem", fontWeight:700, color:"#34d399", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 12px" }}>
                    🍃 Tax-Loss Harvesting Opportunities — Save up to {fmt(risk.taxLossSaving)} in tax
                  </p>
                  {risk.taxLossAlerts.map((a, i) => (
                    <div key={i} style={{ padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)", marginBottom:8 }}>
                      <p style={{ fontSize:".75rem", color:"#fbbf24", margin:0 }}>{a.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-holding risk table */}
              <div style={{ borderRadius:16, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
                <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)",
                  display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px",
                  gap:8, fontSize:".65rem", color:"#475569", fontWeight:700, textTransform:"uppercase" }}>
                  <span>Holding</span><span style={{ textAlign:"right" }}>Gain%</span>
                  <span style={{ textAlign:"right" }}>Volatility</span><span style={{ textAlign:"right" }}>Sharpe</span><span style={{ textAlign:"right" }}>VaR 95%</span>
                </div>
                {risk.holdings?.map((h, i) => (
                  <div key={i} style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.04)",
                    display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px",
                    gap:8, alignItems:"center", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)" }}>
                    <div>
                      <p style={{ fontSize:".76rem", fontWeight:700, color:"#f1f5f9", margin:0 }}>{h.symbol}</p>
                      <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{h.name?.slice(0,25)}</p>
                    </div>
                    <span style={{ fontSize:".76rem", fontWeight:700, textAlign:"right",
                      color: h.gainPct >= 0 ? "#34d399" : "#f87171" }}>
                      {h.gainPct >= 0 ? "+" : ""}{h.gainPct?.toFixed(1)}%
                    </span>
                    <span style={{ fontSize:".73rem", textAlign:"right", color:"#f97316" }}>{h.volatility ? `${h.volatility}%` : "—"}</span>
                    <span style={{ fontSize:".73rem", textAlign:"right", color: h.sharpe > 1 ? "#34d399" : "#fbbf24" }}>{h.sharpe ?? "—"}</span>
                    <span style={{ fontSize:".73rem", textAlign:"right", color:"#f87171" }}>{h.var95 ? `${h.var95}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ TAB 3: OPTIMIZER ══════════════════ */}
      {activeTab === "optimize" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:200 }}>
              <p style={{ color:"#94a3b8", fontSize:".82rem", margin:"0 0 4px" }}>
                Finds optimal allocation weights to maximise your Sharpe Ratio using scipy SLSQP.
              </p>
              <p style={{ color:"#475569", fontSize:".7rem", margin:0 }}>Powered by FinGPT PortfolioOptimizer</p>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <select value={optProfile} onChange={e => setOptProfile(e.target.value)}
                style={{ padding:"8px 12px", borderRadius:9, background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.12)", color:"#f1f5f9", fontSize:".78rem" }}>
                <option value="conservative">Conservative</option>
                <option value="moderate">Moderate</option>
                <option value="aggressive">Aggressive</option>
              </select>
              <button onClick={optimizePortfolio} disabled={optLoad} style={{
                display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:9999,
                background:"linear-gradient(135deg,rgba(167,139,250,.15),rgba(139,92,246,.08))",
                border:"1px solid rgba(167,139,250,.35)", color:"#a78bfa", fontWeight:700, fontSize:".8rem", cursor:"pointer",
              }}>
                {optLoad ? <Loader2 size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Sparkles size={14}/>}
                {optLoad ? "Optimising…" : "Optimise Portfolio"}
              </button>
            </div>
          </div>

          {!optResult && !optLoad && (
            <div style={{ padding:"48px 20px", textAlign:"center", borderRadius:20, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>⚡</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>Portfolio Optimizer</p>
              <p style={{ color:"#475569", fontSize:".8rem" }}>Uses Max-Sharpe optimization (scipy SLSQP) to find the ideal allocation weights for your current stock holdings.</p>
            </div>
          )}

          {optResult?.insufficient && (
            <div style={{ padding:"16px", borderRadius:12, background:"rgba(248,113,113,.07)", border:"1px solid rgba(248,113,113,.2)", textAlign:"center" }}>
              <p style={{ color:"#f87171", fontSize:".82rem" }}>Add at least 2 stock holdings to your portfolio to use the optimizer.</p>
            </div>
          )}

          {optResult && !optResult.error && !optResult.insufficient && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Improvement summary */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {[
                  { l:"Current Sharpe",  v:optResult.current?.sharpe,  c:"#64748b" },
                  { l:"Optimal Sharpe",  v:optResult.optimal?.sharpe,  c:"#34d399" },
                  { l:"Improvement",     v:`+${optResult.improvement?.sharpe}`,c: optResult.improvement?.sharpe > 0 ? "#34d399" : "#f87171" },
                ].map(m => (
                  <div key={m.l} style={{ padding:"14px", borderRadius:14, background:`${m.c}08`, border:`1px solid ${m.c}20` }}>
                    <p style={{ fontSize:".65rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", margin:"0 0 6px" }}>{m.l}</p>
                    <p style={{ fontSize:"1.1rem", fontWeight:900, color:m.c, margin:0 }}>{m.v}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations table */}
              <div style={{ borderRadius:16, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
                <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,.06)",
                  display:"grid", gridTemplateColumns:"1fr 90px 90px 90px 80px 80px",
                  gap:8, fontSize:".63rem", color:"#475569", fontWeight:700, textTransform:"uppercase" }}>
                  <span>Stock</span>
                  <span style={{ textAlign:"right" }}>Current %</span>
                  <span style={{ textAlign:"right" }}>Optimal %</span>
                  <span style={{ textAlign:"right" }}>Change</span>
                  <span style={{ textAlign:"right" }}>1Y Return</span>
                  <span style={{ textAlign:"center" }}>Action</span>
                </div>
                {optResult.recommendations?.map((rec, i) => {
                  const actionColor = rec.action === "INCREASE" ? "#34d399" : rec.action === "DECREASE" ? "#f87171" : "#64748b";
                  return (
                    <div key={i} style={{ padding:"11px 16px", borderBottom:"1px solid rgba(255,255,255,.04)",
                      display:"grid", gridTemplateColumns:"1fr 90px 90px 90px 80px 80px",
                      gap:8, alignItems:"center", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)" }}>
                      <div>
                        <p style={{ fontSize:".76rem", fontWeight:700, color:"#f1f5f9", margin:0 }}>{rec.symbol}</p>
                        <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{rec.name?.slice(0,20)}</p>
                      </div>
                      <span style={{ fontSize:".75rem", color:"#94a3b8", textAlign:"right" }}>{rec.currentWeight}%</span>
                      <span style={{ fontSize:".75rem", fontWeight:700, color:"#f1f5f9", textAlign:"right" }}>{rec.optimalWeight}%</span>
                      <span style={{ fontSize:".75rem", fontWeight:700, textAlign:"right", color: rec.delta > 0 ? "#34d399" : "#f87171" }}>
                        {rec.delta > 0 ? "+" : ""}{rec.delta}%
                      </span>
                      <span style={{ fontSize:".73rem", textAlign:"right", color: rec.annualisedReturn > 0 ? "#34d399" : "#f87171" }}>
                        {rec.annualisedReturn > 0 ? "+" : ""}{rec.annualisedReturn}%
                      </span>
                      <span style={{ fontSize:".65rem", fontWeight:700, textAlign:"center", padding:"3px 8px", borderRadius:9999,
                        background:`${actionColor}15`, border:`1px solid ${actionColor}30`, color:actionColor }}>
                        {rec.action}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize:".62rem", color:"#334155", textAlign:"center", margin:0 }}>
                FinGPT PortfolioOptimizer (Max-Sharpe SLSQP) · Based on 1-year price history · Not financial advice
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}