"use client";

import { useState, useEffect } from "react";
import {
  Calculator, Sparkles, TrendingDown, IndianRupee,
  ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  Loader2, RotateCcw, Info,
} from "lucide-react";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

// ── Input field component ─────────────────────────────────────────────────────
function Field({ label, hint, value, onChange, max, prefix = "₹" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ fontSize: ".75rem", fontWeight: 600, color: "#94a3b8" }}>{label}</label>
        {hint && <span style={{ fontSize: ".65rem", color: "#475569" }}>{hint}</span>}
      </div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          fontSize: ".8rem", color: "#475569", pointerEvents: "none" }}>{prefix}</span>
        <input
          type="number" min={0} max={max} value={value || ""}
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          placeholder="0"
          style={{ width: "100%", padding: "9px 10px 9px 24px", borderRadius: 10,
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)",
            color: "#f1f5f9", fontSize: ".82rem", outline: "none", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <span style={{ fontSize: ".78rem", color: "#94a3b8" }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ width: 40, height: 22, borderRadius: 9999, position: "relative", cursor: "pointer",
          background: value ? "rgba(52,211,153,.4)" : "rgba(255,255,255,.08)",
          border: value ? "1px solid rgba(52,211,153,.5)" : "1px solid rgba(255,255,255,.12)",
          transition: "all .2s" }}>
        <div style={{ width: 16, height: 16, borderRadius: "50%", position: "absolute",
          top: 2, left: value ? 20 : 2, background: value ? "#34d399" : "#475569",
          transition: "left .2s" }}/>
      </button>
    </div>
  );
}

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius: 14, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: "100%", padding: "13px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1rem" }}>{icon}</span>
          <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#f1f5f9" }}>{title}</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: "#64748b" }}/> : <ChevronDown size={14} style={{ color: "#64748b" }}/>}
      </button>
      {open && <div style={{ padding: "0 16px 16px" }}>{children}</div>}
    </div>
  );
}

// ── Tax bar visual ────────────────────────────────────────────────────────────
function TaxBar({ label, total, taxable, tax, effectiveRate, color, isBetter }) {
  const pct = total > 0 ? Math.min(100, (tax / total) * 100) : 0;
  return (
    <div style={{ padding: "16px", borderRadius: 14,
      background: isBetter ? `${color}10` : "rgba(255,255,255,.02)",
      border: `1px solid ${isBetter ? color + "35" : "rgba(255,255,255,.07)"}`,
      position: "relative", overflow: "hidden" }}>
      {isBetter && (
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", alignItems: "center",
          gap: 4, padding: "2px 8px", borderRadius: 9999, background: `${color}20`, border: `1px solid ${color}40` }}>
          <CheckCircle2 size={10} style={{ color }}/>
          <span style={{ fontSize: ".6rem", fontWeight: 700, color }}>BETTER</span>
        </div>
      )}
      <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase",
        letterSpacing: ".06em", margin: "0 0 10px" }}>{label}</p>

      <p style={{ fontSize: "1.6rem", fontWeight: 900, color, margin: "0 0 3px" }}>{fmt(tax)}</p>
      <p style={{ fontSize: ".7rem", color: "#64748b", margin: "0 0 12px" }}>
        {effectiveRate}% effective · {fmt(taxable)} taxable
      </p>

      {/* Tax bar */}
      <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 9999, transition: "width .6s" }}/>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: ".6rem", color: "#334155" }}>₹0</span>
        <span style={{ fontSize: ".6rem", color: "#334155" }}>{fmt(total)}</span>
      </div>

      {/* Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        {[
          { l: "Basic Tax",    v: tax },
          { l: "Monthly TDS",  v: Math.round(tax / 12) },
        ].map(r => (
          <div key={r.l} style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)" }}>
            <p style={{ fontSize: ".6rem", color: "#475569", margin: "0 0 3px" }}>{r.l}</p>
            <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{fmt(r.v)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TaxPage() {
  const [form, setForm] = useState({
    basicSalary: 0, hra: 0, specialAllowance: 0, otherIncome: 0,
    rentPaid: 0, isMetro: false,
    epfContribution: 0, ppfContribution: 0, elssInvestment: 0,
    licPremium: 0, homeLoanPrincipal: 0, nscInvestment: 0, tuitionFees: 0,
    healthInsuranceSelf: 0, healthInsuranceParents: 0,
    parentsSeniorCitizen: false, selfSeniorCitizen: false,
    npsContribution: 0, educationLoanInterest: 0,
    homeLoanInterest: 0, savingsInterest: 0, donations: 0,
  });

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoLoaded, setAutoLoaded] = useState(false);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // ── Auto-load income from transactions ────────────────────────────────────
  useEffect(() => {
    fetch("/api/tax").then(r => r.json()).then(d => {
      if (d.autoIncome && d.autoIncome > 0) {
        const monthly = d.monthlyAvg || 0;
        // Estimate typical CTC breakdown
        const basic   = Math.round(monthly * 0.40);
        const hraAmt  = Math.round(monthly * 0.20);
        const special = Math.round(monthly * 0.40);
        setForm(p => ({
          ...p,
          basicSalary:      basic * 12,
          hra:              hraAmt * 12,
          specialAllowance: special * 12,
        }));
        setAutoLoaded(true);
      }
    }).catch(() => {});
  }, []);

  const calculate = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/tax", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      setResult(data);
      // Scroll to results
      setTimeout(() => document.getElementById("tax-results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch { alert("Calculation failed. Please try again."); }
    finally { setLoading(false); }
  };

  const reset = () => { setForm(p => Object.fromEntries(Object.keys(p).map(k => [k, typeof p[k] === "boolean" ? false : 0]))); setResult(null); };

  const grossIncome = form.basicSalary + form.hra + form.specialAllowance + form.otherIncome;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="text-5xl gradient-title">Tax Estimator</h1>
        <p style={{ color: "#64748b", fontSize: ".84rem", marginTop: 6 }}>
          FY 2024-25 · Old vs New Regime · All deductions · AI-powered advice
        </p>
      </div>

      {autoLoaded && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(52,211,153,.07)",
          border: "1px solid rgba(52,211,153,.2)", marginBottom: 18,
          display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={13} style={{ color: "#34d399" }}/>
          <p style={{ fontSize: ".75rem", color: "#34d399", margin: 0 }}>
            Income auto-filled from your transactions. Adjust as needed.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* ── LEFT — Input form ── */}
        <div>

          {/* Income */}
          <Section title="Income Details" icon="💼" defaultOpen={true}>
            <Field label="Basic Salary (Annual)" hint="~40% of CTC"       value={form.basicSalary}      onChange={set("basicSalary")} />
            <Field label="HRA Received (Annual)"  hint="~20% of CTC"      value={form.hra}              onChange={set("hra")} />
            <Field label="Special Allowance (Annual)"                      value={form.specialAllowance} onChange={set("specialAllowance")} />
            <Field label="Other Income (Annual)"  hint="FD, freelance etc" value={form.otherIncome}      onChange={set("otherIncome")} />
            {grossIncome > 0 && (
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(96,165,250,.08)",
                border: "1px solid rgba(96,165,250,.2)", marginTop: 4 }}>
                <p style={{ fontSize: ".72rem", color: "#60a5fa", margin: 0, fontWeight: 700 }}>
                  Gross Annual Income: {fmt(grossIncome)}
                </p>
              </div>
            )}
          </Section>

          {/* HRA */}
          <Section title="HRA & Rent (Section 10)" icon="🏠">
            <Field label="Monthly Rent Paid" value={form.rentPaid / 12} onChange={v => set("rentPaid")(v * 12)} hint="Enter monthly amount"/>
            <Toggle label="Metro City? (Mumbai, Delhi, Chennai, Kolkata)" value={form.isMetro} onChange={set("isMetro")} />
          </Section>

          {/* 80C */}
          <Section title="Section 80C Investments" icon="📈" defaultOpen={true}>
            <div style={{ padding: "8px 10px", borderRadius: 9, background: "rgba(167,139,250,.07)",
              border: "1px solid rgba(167,139,250,.2)", marginBottom: 12 }}>
              <p style={{ fontSize: ".7rem", color: "#a78bfa", margin: 0 }}>
                Max deduction: ₹1,50,000 · All amounts annual
              </p>
            </div>
            <Field label="EPF Contribution"     value={form.epfContribution}   onChange={set("epfContribution")} />
            <Field label="PPF Investment"        value={form.ppfContribution}   onChange={set("ppfContribution")} />
            <Field label="ELSS Mutual Fund"      value={form.elssInvestment}    onChange={set("elssInvestment")} />
            <Field label="LIC Premium"           value={form.licPremium}        onChange={set("licPremium")} />
            <Field label="Home Loan Principal"   value={form.homeLoanPrincipal} onChange={set("homeLoanPrincipal")} />
            <Field label="NSC Investment"        value={form.nscInvestment}     onChange={set("nscInvestment")} />
            <Field label="Children Tuition Fees" value={form.tuitionFees}       onChange={set("tuitionFees")} />

            {/* 80C progress bar */}
            {(() => {
              const used = form.epfContribution + form.ppfContribution + form.elssInvestment +
                form.licPremium + form.homeLoanPrincipal + form.nscInvestment + form.tuitionFees;
              const pct  = Math.min(100, (used / 150000) * 100);
              const left = Math.max(0, 150000 - used);
              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: ".68rem", color: "#64748b" }}>80C used: {fmt(Math.min(used, 150000))}</span>
                    <span style={{ fontSize: ".68rem", color: left > 0 ? "#f59e0b" : "#34d399" }}>
                      {left > 0 ? `₹${fmtNum(left)} remaining` : "✓ Maxed out"}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 9999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, borderRadius: 9999,
                      background: pct >= 100 ? "#34d399" : pct > 70 ? "#f59e0b" : "#60a5fa", transition: "width .4s" }}/>
                  </div>
                </div>
              );
            })()}
          </Section>

          {/* 80D */}
          <Section title="Section 80D — Health Insurance" icon="🏥">
            <Field label="Self + Family Premium (Annual)" hint="Max ₹25,000" value={form.healthInsuranceSelf}    onChange={set("healthInsuranceSelf")} max={50000} />
            <Field label="Parents Premium (Annual)"       hint="Max ₹25,000" value={form.healthInsuranceParents} onChange={set("healthInsuranceParents")} max={50000} />
            <Toggle label="Self / Spouse is Senior Citizen (60+)" value={form.selfSeniorCitizen}    onChange={set("selfSeniorCitizen")} />
            <Toggle label="Parents are Senior Citizens (60+)"     value={form.parentsSeniorCitizen} onChange={set("parentsSeniorCitizen")} />
          </Section>

          {/* Other deductions */}
          <Section title="Other Deductions" icon="📋">
            <Field label="NPS Contribution 80CCD(1B)" hint="Max ₹50,000 extra" value={form.npsContribution}       onChange={set("npsContribution")} max={50000} />
            <Field label="Home Loan Interest Sec 24(b)" hint="Max ₹2,00,000"   value={form.homeLoanInterest}      onChange={set("homeLoanInterest")} max={200000} />
            <Field label="Education Loan Interest 80E"  hint="No limit"         value={form.educationLoanInterest} onChange={set("educationLoanInterest")} />
            <Field label="Savings Interest 80TTA"       hint="Max ₹10,000"      value={form.savingsInterest}       onChange={set("savingsInterest")} max={10000} />
            <Field label="Donations 80G"                hint="50% eligible"     value={form.donations}             onChange={set("donations")} />
          </Section>

          {/* CTA */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={calculate} disabled={loading || grossIncome === 0}
              style={{ flex: 1, padding: "13px", borderRadius: 12, fontWeight: 800, fontSize: ".88rem",
                background: grossIncome > 0 ? "linear-gradient(135deg,#34d399,#059669)" : "rgba(255,255,255,.06)",
                border: "none", color: grossIncome > 0 ? "#fff" : "#475569",
                cursor: grossIncome > 0 ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }}/> : <Calculator size={16}/>}
              {loading ? "Calculating…" : "Calculate Tax"}
            </button>
            <button onClick={reset}
              style={{ padding: "13px 16px", borderRadius: 12, background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)", color: "#64748b", cursor: "pointer" }}>
              <RotateCcw size={15}/>
            </button>
          </div>
        </div>

        {/* ── RIGHT — Results ── */}
        <div id="tax-results">
          {!result && (
            <div style={{ padding: "40px 20px", textAlign: "center", borderRadius: 20,
              background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)",
              position: "sticky", top: 20 }}>
              <p style={{ fontSize: "2.5rem", margin: "0 0 14px" }}>🧾</p>
              <p style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 8px" }}>
                Fill in your income details
              </p>
              <p style={{ color: "#475569", fontSize: ".8rem", margin: 0 }}>
                Enter your salary, deductions and investments on the left — we'll calculate your exact tax for FY 2024-25 and tell you which regime saves more.
              </p>
            </div>
          )}

          {result && (
            <div style={{ position: "sticky", top: 20 }}>

              {/* Regime comparison */}
              <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                letterSpacing: ".06em", margin: "0 0 12px" }}>Regime Comparison</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <TaxBar
                  label="Old Regime"
                  total={result.grossIncome}
                  taxable={result.oldRegime.taxableIncome}
                  tax={result.oldRegime.totalTax}
                  effectiveRate={result.oldRegime.effectiveRate}
                  color="#f59e0b"
                  isBetter={result.betterRegime === "old"}
                />
                <TaxBar
                  label="New Regime"
                  total={result.grossIncome}
                  taxable={result.newRegime.taxableIncome}
                  tax={result.newRegime.totalTax}
                  effectiveRate={result.newRegime.effectiveRate}
                  color="#34d399"
                  isBetter={result.betterRegime === "new"}
                />
              </div>

              {/* Savings banner */}
              {result.savingsAbs > 0 && (
                <div style={{ padding: "14px 16px", borderRadius: 14, marginBottom: 14,
                  background: result.betterRegime === "new" ? "rgba(52,211,153,.08)" : "rgba(245,158,11,.08)",
                  border: `1px solid ${result.betterRegime === "new" ? "rgba(52,211,153,.25)" : "rgba(245,158,11,.25)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingDown size={16} style={{ color: result.betterRegime === "new" ? "#34d399" : "#f59e0b" }}/>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: ".88rem", margin: "0 0 2px",
                        color: result.betterRegime === "new" ? "#34d399" : "#f59e0b" }}>
                        {result.betterRegime === "new" ? "New" : "Old"} Regime saves you {fmt(result.savingsAbs)}
                      </p>
                      <p style={{ fontSize: ".7rem", color: "#64748b", margin: 0 }}>
                        That's {fmt(Math.round(result.savingsAbs / 12))} less TDS per month
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Deduction breakdown */}
              {result.betterRegime !== "new" && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(255,255,255,.025)",
                  border: "1px solid rgba(255,255,255,.07)", marginBottom: 14 }}>
                  <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: ".06em", margin: "0 0 12px" }}>Deductions Claimed (Old Regime)</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {Object.entries(result.deductions)
                      .filter(([k, v]) => k !== "total" && v > 0)
                      .map(([k, v]) => {
                        const labels = {
                          standardDeduction: "Standard Deduction",
                          hraExemption: "HRA Exemption",
                          sec80C: "Section 80C",
                          sec80D: "Section 80D (Health)",
                          sec80CCD1B: "NPS 80CCD(1B)",
                          sec80E: "Education Loan 80E",
                          sec24b: "Home Loan Interest",
                          sec80TTA: "Savings Interest",
                          sec80G: "Donations 80G",
                        };
                        return (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: ".73rem", color: "#94a3b8" }}>{labels[k] || k}</span>
                            <span style={{ fontSize: ".73rem", fontWeight: 700, color: "#34d399" }}>−{fmt(v)}</span>
                          </div>
                        );
                      })}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 7, marginTop: 3,
                      display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#f1f5f9" }}>Total Deductions</span>
                      <span style={{ fontSize: ".75rem", fontWeight: 800, color: "#34d399" }}>−{fmt(result.deductions.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Optimisation tips */}
              {result.optimisationTips?.length > 0 && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(96,165,250,.05)",
                  border: "1px solid rgba(96,165,250,.18)", marginBottom: 14 }}>
                  <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase",
                    letterSpacing: ".06em", margin: "0 0 10px" }}>💡 Save More Tax</p>
                  {result.optimisationTips.map((t, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, marginBottom: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(96,165,250,.15)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontSize: ".6rem", fontWeight: 800, color: "#60a5fa" }}>{t.section}</span>
                      </div>
                      <p style={{ fontSize: ".73rem", color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{t.tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* AI advice */}
              {result.aiAdvice && (
                <div style={{ padding: "14px 16px", borderRadius: 14, background: "rgba(167,139,250,.06)",
                  border: "1px solid rgba(167,139,250,.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
                    <Sparkles size={14} style={{ color: "#a78bfa" }}/>
                    <p style={{ fontSize: ".7rem", fontWeight: 700, color: "#a78bfa",
                      textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>CA Arjun's Advice</p>
                  </div>
                  <p style={{ fontSize: ".78rem", color: "#94a3b8", margin: 0, lineHeight: 1.7,
                    whiteSpace: "pre-line" }}>{result.aiAdvice}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}