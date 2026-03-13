"use client";
import { useState, useEffect } from "react";
import { CreditCard, TrendingDown, TrendingUp, Sparkles, Loader2, RotateCcw, Info } from "lucide-react";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat("en-IN").format(n ?? 0);

function Field({ label, hint, value, onChange, max, type = "number", step = "1" }) {
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: ".75rem", fontWeight: 600, color: "#94a3b8" }}>{label}</label>
        {hint && <span style={{ fontSize: ".62rem", color: "#475569" }}>{hint}</span>}
      </div>
      <div style={{ position: "relative" }}>
        {type === "number" && <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: ".8rem", color: "#475569", pointerEvents: "none" }}>₹</span>}
        <input type={type} step={step} min={0} max={max} value={value || ""}
          onChange={e => onChange(type === "number" ? Math.max(0, Number(e.target.value)) : e.target.value)}
          placeholder={type === "number" ? "0" : ""}
          style={{ width: "100%", padding: type === "number" ? "9px 10px 9px 24px" : "9px 10px",
            borderRadius: 10, background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(255,255,255,.1)", color: "#f1f5f9",
            fontSize: ".82rem", outline: "none", boxSizing: "border-box" }}/>
      </div>
    </div>
  );
}

// ── Score Gauge ───────────────────────────────────────────────────────────────
function ScoreGauge({ score, color, label }) {
  const pct  = ((score - 300) / 600) * 100;
  const r    = 70;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * (circ * 0.75);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: 160, height: 120 }}>
        <svg width="160" height="120" viewBox="0 0 160 120">
          {/* Background arc */}
          <circle cx="80" cy="90" r={r} fill="none" stroke="rgba(255,255,255,.06)"
            strokeWidth="12" strokeDasharray={`${circ * 0.75} ${circ}`}
            strokeDashoffset={circ * 0.125} strokeLinecap="round"/>
          {/* Score arc */}
          <circle cx="80" cy="90" r={r} fill="none" stroke={color}
            strokeWidth="12" strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ * 0.125} strokeLinecap="round"
            style={{ transition: "stroke-dasharray .8s ease" }}/>
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -20%)", textAlign: "center" }}>
          <p style={{ fontSize: "2rem", fontWeight: 900, color, margin: 0, lineHeight: 1 }}>{score}</p>
          <p style={{ fontSize: ".7rem", color, fontWeight: 700, margin: "4px 0 0" }}>{label}</p>
        </div>
      </div>
      <p style={{ fontSize: ".65rem", color: "#475569", margin: "4px 0 0" }}>CIBIL Range: 300–900</p>
    </div>
  );
}

export default function CreditScorePage() {
  const [form, setForm] = useState({
    monthly_income: 0, monthly_expenses: 0, existing_emis: 0,
    loan_amount: 0, loan_tenure_months: 0,
    credit_card_balance: 0, credit_limit: 0,
    missed_payments: 0, accounts_age_months: 24,
    num_active_loans: 0, savings_balance: 0,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const set = k => v => setForm(p => ({ ...p, [k]: v }));

  // Auto-fill from transactions
  useEffect(() => {
    fetch("/api/ml/credit-score").then(r => r.json()).then(d => {
      if (d.monthly_income) setForm(p => ({ ...p,
        monthly_income:   d.monthly_income,
        monthly_expenses: d.monthly_expenses,
        existing_emis:    d.existing_emis || 0,
      }));
    }).catch(() => {});
  }, []);

  const calculate = async () => {
    if (!form.monthly_income) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/ml/credit-score", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      setResult(await res.json());
    } catch { alert("Service unavailable. Start the ML service on port 8002."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
      <h1 className="text-5xl gradient-title">Credit Score Predictor</h1>
      <p style={{ color: "#64748b", fontSize: ".84rem", margin: "6px 0 28px" }}>
        ANN-powered CIBIL score estimator · Loan impact analysis · Improvement tips
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ── LEFT — Inputs ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Income & Expenses */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>💼 Monthly Finances</p>
            <Field label="Monthly Income"   value={form.monthly_income}   onChange={set("monthly_income")} />
            <Field label="Monthly Expenses" value={form.monthly_expenses} onChange={set("monthly_expenses")} />
            <Field label="Existing EMIs"    hint="All current loan EMIs" value={form.existing_emis} onChange={set("existing_emis")} />
            <Field label="Savings Balance"  value={form.savings_balance}  onChange={set("savings_balance")} />
          </div>

          {/* Credit Card */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>💳 Credit Card</p>
            <Field label="Outstanding Balance" value={form.credit_card_balance} onChange={set("credit_card_balance")} />
            <Field label="Credit Limit"        value={form.credit_limit}        onChange={set("credit_limit")} />
          </div>

          {/* Loan history */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 14px" }}>📋 Credit History</p>
            <Field label="Missed Payments (last 12 months)" type="number" hint="0 = perfect" value={form.missed_payments}    onChange={set("missed_payments")} max={12} />
            <Field label="Account Age (months)"             type="number" hint="avg age"    value={form.accounts_age_months} onChange={set("accounts_age_months")} />
            <Field label="Active Loans Count"               type="number"                   value={form.num_active_loans}    onChange={set("num_active_loans")} max={10} />
          </div>

          {/* New Loan Simulation */}
          <div style={{ padding: "16px", borderRadius: 16, background: "rgba(248,113,113,.04)", border: "1px solid rgba(248,113,113,.15)" }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" }}>🔮 Loan Simulator (Optional)</p>
            <p style={{ fontSize: ".68rem", color: "#64748b", margin: "0 0 14px" }}>See how a new loan would affect your score</p>
            <Field label="New Loan Amount"   value={form.loan_amount}          onChange={set("loan_amount")} />
            <Field label="Tenure (months)"   type="number" hint="e.g. 60 = 5yr" value={form.loan_tenure_months} onChange={set("loan_tenure_months")} />
          </div>

          <button onClick={calculate} disabled={loading || !form.monthly_income}
            style={{ padding: "13px", borderRadius: 12, fontWeight: 800, fontSize: ".88rem", border: "none",
              background: form.monthly_income ? "linear-gradient(135deg,#60a5fa,#3b82f6)" : "rgba(255,255,255,.06)",
              color: form.monthly_income ? "#fff" : "#475569",
              cursor: form.monthly_income ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }}/> : <CreditCard size={16}/>}
            {loading ? "Predicting…" : "Predict My Credit Score"}
          </button>
        </div>

        {/* ── RIGHT — Results ── */}
        <div style={{ position: "sticky", top: 20 }}>
          {!result && (
            <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 20,
              background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize: "3rem", margin: "0 0 14px" }}>💳</p>
              <p style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 8px" }}>Enter your financial details</p>
              <p style={{ color: "#475569", fontSize: ".8rem", margin: 0 }}>
                Our ANN model will predict your CIBIL score range and show the impact of a new loan.
              </p>
              <div style={{ marginTop: 20, padding: "12px", borderRadius: 12, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.15)" }}>
                <p style={{ fontSize: ".7rem", color: "#a78bfa", margin: 0 }}>
                  ⚡ Income & expenses auto-filled from your transactions
                </p>
              </div>
            </div>
          )}

          {result && !result.error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Score gauges */}
              <div style={{ padding: "20px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display: "grid", gridTemplateColumns: result.score_with_loan ? "1fr 1fr" : "1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: ".68rem", color: "#64748b", textAlign: "center", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase" }}>Current Score</p>
                    <ScoreGauge score={result.current_score} color={result.current_color} label={result.current_band}/>
                  </div>
                  {result.score_with_loan && (
                    <div>
                      <p style={{ fontSize: ".68rem", color: "#64748b", textAlign: "center", margin: "0 0 8px", fontWeight: 700, textTransform: "uppercase" }}>After New Loan</p>
                      <ScoreGauge score={result.score_with_loan} color={result.loan_color} label={result.loan_band}/>
                    </div>
                  )}
                </div>
                {result.loan_impact && (
                  <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 12,
                    background: result.loan_impact < 0 ? "rgba(248,113,113,.07)" : "rgba(52,211,153,.07)",
                    border: `1px solid ${result.loan_impact < 0 ? "rgba(248,113,113,.2)" : "rgba(52,211,153,.2)"}`,
                    display: "flex", alignItems: "center", gap: 8 }}>
                    {result.loan_impact < 0 ? <TrendingDown size={16} style={{ color:"#f87171" }}/> : <TrendingUp size={16} style={{ color:"#34d399" }}/>}
                    <p style={{ fontSize: ".78rem", fontWeight: 700, color: result.loan_impact < 0 ? "#f87171" : "#34d399", margin: 0 }}>
                      New loan would {result.loan_impact < 0 ? "reduce" : "improve"} score by {Math.abs(result.loan_impact)} points
                    </p>
                  </div>
                )}
              </div>

              {/* Key metrics */}
              <div style={{ padding: "16px", borderRadius: 16, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                <p style={{ fontSize: ".68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>Key Metrics</p>
                {[
                  { l: "Debt-to-Income",    v: `${(result.metrics.dti_ratio * 100).toFixed(0)}%`, good: result.metrics.dti_ratio < 0.4  },
                  { l: "Credit Utilisation",v: `${(result.metrics.utilisation * 100).toFixed(0)}%`, good: result.metrics.utilisation < 0.3 },
                  { l: "Payment History",   v: `${(result.metrics.payment_history * 100).toFixed(0)}%`, good: result.metrics.payment_history > 0.8 },
                  { l: "Savings Ratio",     v: `${result.metrics.savings_ratio.toFixed(1)}×`, good: result.metrics.savings_ratio > 1 },
                ].map(m => (
                  <div key={m.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: ".73rem", color: "#94a3b8" }}>{m.l}</span>
                    <span style={{ fontSize: ".73rem", fontWeight: 700, color: m.good ? "#34d399" : "#f87171" }}>{m.v}</span>
                  </div>
                ))}
              </div>

              {/* Improvement tips */}
              {result.tips?.length > 0 && (
                <div style={{ padding: "16px", borderRadius: 16, background: "rgba(96,165,250,.05)", border: "1px solid rgba(96,165,250,.18)" }}>
                  <p style={{ fontSize: ".68rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>💡 Improve Your Score</p>
                  {result.tips.map((t, i) => (
                    <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < result.tips.length - 1 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#f1f5f9" }}>{t.action}</span>
                        <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#34d399" }}>{t.impact}</span>
                      </div>
                      <p style={{ fontSize: ".68rem", color: "#64748b", margin: 0 }}>{t.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontSize: ".62rem", color: "#334155", textAlign: "center", margin: 0 }}>
                MLP-ANN model · 3 hidden layers · Not an official CIBIL score
              </p>
            </div>
          )}

          {result?.error && (
            <div style={{ padding: "20px", borderRadius: 16, background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.2)", textAlign: "center" }}>
              <p style={{ color: "#f87171", fontSize: ".82rem" }}>
                {result.offline ? "⚙️ Start the advanced AI service: python -m uvicorn advanced_ai:app --port 8002" : result.error}
              </p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}