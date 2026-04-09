"use client";
import { useState } from "react";
import { ShieldAlert, CreditCard, Loader2, Sparkles, AlertTriangle, Info, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);

const RISK_COLORS = { high:"#f87171", medium:"#fbbf24" };

function FactorBar({ factor }) {
  const impact_color = factor.impact==="HIGH" ? "#f87171" : factor.impact==="MEDIUM" ? "#fbbf24" : "#34d399";
  return (
    <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:factor.color }}/>
          <span style={{ fontSize:".78rem", fontWeight:700, color:"#f1f5f9" }}>{factor.factor}</span>
          <span style={{ fontSize:".62rem", padding:"1px 7px", borderRadius:9999,
            background:`${impact_color}18`, border:`1px solid ${impact_color}30`, color:impact_color }}>
            {factor.impact}
          </span>
        </div>
        <span style={{ fontSize:".72rem", fontWeight:800, color:factor.color }}>{factor.weight}% weight</span>
      </div>
      <div style={{ height:6, borderRadius:9999, background:"rgba(255,255,255,.06)", marginBottom:6 }}>
        <div style={{ height:"100%", borderRadius:9999, width:`${factor.score}%`,
          background:`linear-gradient(90deg,${factor.color}88,${factor.color})`, transition:"width .6s" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:".66rem", color:"#64748b" }}>{factor.description}</span>
        <span style={{ fontSize:".66rem", color:factor.color, fontWeight:600 }}>{factor.status}</span>
      </div>
      {factor.suggestion && (
        <div style={{ marginTop:6, padding:"6px 10px", borderRadius:8, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.15)" }}>
          <p style={{ fontSize:".68rem", color:"#34d399", margin:0 }}>💡 {factor.suggestion}</p>
        </div>
      )}
    </div>
  );
}

const DEFAULT_CREDIT = {
  monthly_income:      60000,
  monthly_expenses:    40000,
  existing_emis:       8000,
  credit_card_balance: 20000,
  credit_limit:        100000,
  missed_payments:     0,
  accounts_age_months: 36,
  num_active_loans:    2,
  savings_balance:     150000,
  loan_amount:         0,
  loan_tenure_months:  0,
};

export default function XAIDashboard() {
  const [tab,       setTab]       = useState("fraud");
  const [loading,   setLoading]   = useState(false);
  const [fraudData, setFraudData] = useState(null);
  const [creditData,setCreditData]= useState(null);
  const [creditForm,setCreditForm]= useState(DEFAULT_CREDIT);
  const [selected,  setSelected]  = useState(null);

  const runFraud = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/xai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ creditFeatures: null }),
      });
      const d = await res.json();
      setFraudData(d.fraud);
    } catch { alert("Start ML service on port 8002"); }
    finally { setLoading(false); }
  };

  const runCredit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/xai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ creditFeatures: creditForm }),
      });
      const d = await res.json();
      setCreditData(d.creditScore);
    } catch { alert("Start ML service on port 8002"); }
    finally { setLoading(false); }
  };

  const setF = (k) => (v) => setCreditForm(p => ({...p, [k]: Number(v)}));

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 20px" }}>
      <div style={{ marginBottom:24 }}>
        <h1 className="text-5xl gradient-title">XAI Dashboard</h1>
        <p style={{ color:"#64748b", fontSize:".82rem", marginTop:6 }}>
          Explainable AI — understand <em>why</em> your transactions are flagged and <em>what drives</em> your credit score
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[
          { id:"fraud",  label:"🛡️ Fraud Explanation" },
          { id:"credit", label:"💳 Credit Score XAI"  },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"9px 20px", borderRadius:9999, fontSize:".82rem", fontWeight:700, cursor:"pointer",
            background: tab===t.id ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)",
            border:     tab===t.id ? "1px solid rgba(52,211,153,.35)" : "1px solid rgba(255,255,255,.08)",
            color:      tab===t.id ? "#34d399" : "#64748b",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ═══ FRAUD XAI ═══ */}
      {tab === "fraud" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <p style={{ color:"#64748b", fontSize:".8rem", margin:0 }}>
              Autoencoder + IsolationForest ensemble — feature-level deviation analysis for each flagged transaction
            </p>
            <button onClick={runFraud} disabled={loading} style={{
              display:"flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:9999,
              background:"linear-gradient(135deg,rgba(248,113,113,.15),rgba(239,68,68,.08))",
              border:"1px solid rgba(248,113,113,.35)", color:"#f87171",
              fontWeight:700, fontSize:".8rem", cursor:"pointer",
            }}>
              {loading ? <Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> : <ShieldAlert size={14}/>}
              {loading ? "Analysing…" : "Explain My Transactions"}
            </button>
          </div>

          {!fraudData && !loading && (
            <div style={{ padding:"50px 20px", textAlign:"center", borderRadius:20,
              background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>🛡️</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>Fraud Explanation Engine</p>
              <p style={{ color:"#475569", fontSize:".8rem" }}>
                Click &quot;Explain My Transactions&quot; to see exactly which features caused each transaction to be flagged — with percentage contributions from each AI model.
              </p>
            </div>
          )}

          {fraudData && (
            <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap:16 }}>
              {/* List */}
              <div>
                {fraudData.flaggedCount === 0 ? (
                  <div style={{ padding:"20px", borderRadius:16, background:"rgba(52,211,153,.06)", border:"1px solid rgba(52,211,153,.2)", textAlign:"center" }}>
                    <p style={{ color:"#34d399", fontWeight:700, margin:0 }}>✅ No suspicious transactions found in last 6 months</p>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize:".72rem", color:"#64748b", marginBottom:10 }}>
                      {fraudData.flaggedCount} flagged of {fraudData.total} checked — click any to see full explanation
                    </p>
                    {fraudData.flagged.map((tx, i) => (
                      <div key={i}
                        onClick={() => setSelected(selected?.id === tx.id ? null : tx)}
                        style={{ padding:"14px 16px", borderRadius:14, marginBottom:8, cursor:"pointer",
                          background: selected?.id === tx.id ? `${RISK_COLORS[tx.confidence]}12` : "rgba(255,255,255,.025)",
                          border:`1px solid ${selected?.id === tx.id ? RISK_COLORS[tx.confidence]+"40" : "rgba(255,255,255,.07)"}`,
                          transition:"all .15s" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <p style={{ fontWeight:700, color:"#f1f5f9", margin:"0 0 2px", fontSize:".82rem" }}>
                              {tx.description || tx.category}
                            </p>
                            <p style={{ fontSize:".68rem", color:"#64748b", margin:0 }}>
                              {tx.category} · {new Date(tx.date).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <p style={{ fontWeight:800, color:RISK_COLORS[tx.confidence], margin:"0 0 3px", fontSize:".9rem" }}>
                              {fmt(tx.amount)}
                            </p>
                            <span style={{ padding:"2px 8px", borderRadius:9999, fontSize:".62rem", fontWeight:700,
                              background:`${RISK_COLORS[tx.confidence]}18`, border:`1px solid ${RISK_COLORS[tx.confidence]}30`,
                              color:RISK_COLORS[tx.confidence] }}>
                              {tx.confidence} risk · {tx.riskScore}
                            </span>
                          </div>
                        </div>
                        {/* Mini feature bar */}
                        <div style={{ marginTop:8, display:"flex", gap:3 }}>
                          {tx.topFeatures.slice(0,6).map((f, j) => (
                            <div key={j} style={{ flex:f.contribution, height:4, borderRadius:2,
                              background:f.color, opacity:.7 }} title={`${f.name}: ${f.contribution}%`}/>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Detail panel */}
              {selected && (
                <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, padding:"18px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                    <AlertTriangle size={16} style={{ color:RISK_COLORS[selected.confidence] }}/>
                    <h3 style={{ fontWeight:800, color:"#f1f5f9", margin:0, fontSize:".88rem" }}>
                      Why was this flagged?
                    </h3>
                  </div>
                  <p style={{ fontSize:".76rem", color:"#94a3b8", lineHeight:1.7, marginBottom:16 }}>
                    {selected.explanation}
                  </p>

                  {/* Model contributions */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                    <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)" }}>
                      <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 3px" }}>Autoencoder Score</p>
                      <p style={{ fontWeight:800, color:"#f87171", margin:0 }}>{selected.modelContributions.autoencoder}</p>
                    </div>
                    <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(251,191,36,.06)", border:"1px solid rgba(251,191,36,.15)" }}>
                      <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 3px" }}>IsolationForest Score</p>
                      <p style={{ fontWeight:800, color:"#fbbf24", margin:0 }}>{selected.modelContributions.isolationForest}</p>
                    </div>
                  </div>

                  {/* Feature contributions chart */}
                  <p style={{ fontSize:".68rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", marginBottom:10 }}>
                    Feature Contributions
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={selected.topFeatures} layout="vertical" barSize={12}>
                      <XAxis type="number" tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false} unit="%"/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#94a3b8" }} axisLine={false} tickLine={false} width={130}/>
                      <Tooltip contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, fontSize:".72rem" }}
                        formatter={v => [`${v}%`, "Contribution"]}/>
                      <Bar dataKey="contribution" radius={[0,4,4,0]}>
                        {selected.topFeatures.map((f, i) => <Cell key={i} fill={f.color}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ CREDIT SCORE XAI ═══ */}
      {tab === "credit" && (
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:20 }}>
          {/* Input form */}
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ padding:"16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
              <p style={{ fontSize:".7rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 14px" }}>Your Financial Profile</p>

              {[
                { label:"Monthly Income (₹)",     key:"monthly_income",      max:500000 },
                { label:"Monthly Expenses (₹)",   key:"monthly_expenses",    max:400000 },
                { label:"Existing EMIs (₹/mo)",   key:"existing_emis",       max:100000 },
                { label:"CC Balance (₹)",          key:"credit_card_balance", max:200000 },
                { label:"Credit Limit (₹)",        key:"credit_limit",        max:1000000},
                { label:"Missed Payments",         key:"missed_payments",     max:12, step:1 },
                { label:"Account Age (months)",    key:"accounts_age_months", max:120, step:1 },
                { label:"Active Loans",            key:"num_active_loans",    max:10, step:1 },
                { label:"Savings Balance (₹)",     key:"savings_balance",     max:1000000 },
              ].map(f => (
                <div key={f.key} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:".7rem", color:"#94a3b8" }}>{f.label}</span>
                    <span style={{ fontSize:".7rem", fontWeight:700, color:"#f1f5f9" }}>
                      {f.key.includes("months") || f.key.includes("loans") || f.key === "missed_payments"
                        ? creditForm[f.key]
                        : (creditForm[f.key] / 1000).toFixed(0) + "K"}
                    </span>
                  </div>
                  <input type="range" min={0} max={f.max} step={f.step||1000} value={creditForm[f.key]}
                    onChange={e => setF(f.key)(e.target.value)}
                    style={{ width:"100%", accentColor:"#a78bfa", cursor:"pointer" }}/>
                </div>
              ))}
            </div>

            <button onClick={runCredit} disabled={loading} style={{
              padding:"13px", borderRadius:12, border:"none", fontWeight:800, cursor:"pointer",
              background:"linear-gradient(135deg,#a78bfa,#7c3aed)", color:"#fff",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontSize:".88rem",
            }}>
              {loading ? <Loader2 size={18} style={{animation:"spin 1s linear infinite"}}/> : <CreditCard size={18}/>}
              {loading ? "Calculating…" : "Explain My Credit Score"}
            </button>
          </div>

          {/* Results */}
          <div>
            {!creditData ? (
              <div style={{ padding:"50px 20px", textAlign:"center", borderRadius:20,
                background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>💳</p>
                <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>CIBIL Score Explainer</p>
                <p style={{ color:"#475569", fontSize:".8rem" }}>
                  Adjust your profile and click &quot;Explain&quot; to see each CIBIL factor&apos;s contribution, impact, and how to improve.
                </p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* Score dial */}
                <div style={{ padding:"20px 24px", borderRadius:20,
                  background:"linear-gradient(135deg,rgba(167,139,250,.08),rgba(99,102,241,.04))",
                  border:"1px solid rgba(167,139,250,.2)", display:"flex", alignItems:"center", gap:24 }}>
                  <div style={{ position:"relative", width:90, height:90, flexShrink:0 }}>
                    <svg viewBox="0 0 90 90" style={{ transform:"rotate(-90deg)" }}>
                      <circle cx="45" cy="45" r="38" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8"/>
                      <circle cx="45" cy="45" r="38" fill="none"
                        stroke={creditData.estimatedScore >= 750 ? "#34d399" : creditData.estimatedScore >= 700 ? "#fbbf24" : "#f87171"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${((creditData.estimatedScore - 300) / 600) * 238.8} 238.8`}/>
                    </svg>
                    <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
                      alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:"1.3rem", fontWeight:900,
                        color: creditData.estimatedScore >= 750 ? "#34d399" : creditData.estimatedScore >= 700 ? "#fbbf24" : "#f87171" }}>
                        {creditData.estimatedScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontWeight:800, fontSize:"1.1rem", color:"#f1f5f9", margin:"0 0 4px" }}>
                      Estimated CIBIL Score
                    </p>
                    <p style={{ color:"#64748b", fontSize:".75rem", margin:"0 0 10px" }}>
                      300 (Poor) → 900 (Excellent) · Industry CIBIL weighting model
                    </p>
                    {creditData.topSuggestions.length > 0 && (
                      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                        {creditData.topSuggestions.slice(0,2).map((s, i) => (
                          <p key={i} style={{ fontSize:".72rem", color:"#34d399", margin:0 }}>💡 {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Factor breakdown */}
                <p style={{ fontSize:".7rem", color:"#64748b", fontWeight:700, textTransform:"uppercase",
                  letterSpacing:".06em", margin:0 }}>Factor-by-Factor Breakdown</p>
                {creditData.factors.map((f, i) => <FactorBar key={i} factor={f}/>)}

                {/* Radar chart */}
                <div style={{ padding:"16px", borderRadius:16, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <p style={{ fontSize:".7rem", color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:".05em", margin:"0 0 12px" }}>
                    Score Radar
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={creditData.factors.map(f => ({ factor: f.factor.split(" ")[0], score: f.score }))}>
                      <PolarGrid stroke="rgba(255,255,255,.08)"/>
                      <PolarAngleAxis dataKey="factor" tick={{ fontSize:10, fill:"#64748b" }}/>
                      <Radar name="Score" dataKey="score" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}