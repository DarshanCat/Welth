"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calculator, Plus, Trash2, CheckCircle, XCircle, Clock,
  TrendingDown, IndianRupee, Calendar, ChevronDown, ChevronUp,
  Loader2, RefreshCw, AlertCircle, BadgeCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_CONFIG = {
  PAID:    { color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  icon: CheckCircle, label: "Paid" },
  MISSED:  { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", icon: XCircle,     label: "Missed" },
  PENDING: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  icon: Clock,       label: "Pending" },
};

// ── EMI formula ───────────────────────────────────────────────────────────────
function calcEMI(principal, annualRate, months) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcAmortization(principal, annualRate, months) {
  const r      = annualRate / 12 / 100;
  const emi    = calcEMI(principal, annualRate, months);
  let   balance = principal;
  const rows   = [];
  for (let i = 1; i <= months; i++) {
    const interest   = r === 0 ? 0 : balance * r;
    const principalPaid = emi - interest;
    balance -= principalPaid;
    rows.push({
      month: i,
      emi:   Math.round(emi),
      principal: Math.round(principalPaid),
      interest:  Math.round(interest),
      balance:   Math.max(0, Math.round(balance)),
    });
  }
  return rows;
}

// ── Pie chart tooltip ─────────────────────────────────────────────────────────
function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
      <p style={{ color: payload[0].payload.color, margin: 0 }}>{payload[0].name}: {fmt(payload[0].value)}</p>
    </div>
  );
}

// ── Bar chart tooltip ─────────────────────────────────────────────────────────
function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 11 }}>
      <p style={{ color: "#94a3b8", margin: "0 0 3px" }}>Month {label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: 0 }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────
function PaymentRow({ payment, onMark, loanId }) {
  const [loading, setLoading] = useState(false);
  const cfg = STATUS_CONFIG[payment.status];
  const Icon = cfg.icon;
  const isUpcoming = payment.status === "PENDING" && new Date(payment.dueDate) > new Date();
  const isOverdue  = payment.status === "PENDING" && new Date(payment.dueDate) <= new Date();

  const mark = async (status) => {
    setLoading(true);
    try {
      await fetch(`/api/loans/${loanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, status }),
      });
      onMark();
    } catch { } finally { setLoading(false); }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      background: isOverdue && payment.status === "PENDING" ? "rgba(248,113,113,0.04)" : "transparent",
    }}>
      {/* Status icon */}
      <div style={{ width: 30, height: 30, borderRadius: 9999, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} style={{ color: cfg.color }} />
      </div>

      {/* Month + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: ".82rem", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          EMI {payment.month}
          {isOverdue && <span style={{ fontSize: ".65rem", color: "#f87171", marginLeft: 6, padding: "1px 6px", background: "rgba(248,113,113,0.15)", borderRadius: 9999 }}>Overdue</span>}
        </p>
        <p style={{ fontSize: ".72rem", color: "#64748b", margin: "2px 0 0" }}>
          Due: {fmtDate(payment.dueDate)}
          {payment.paidDate && ` · Paid: ${fmtDate(payment.paidDate)}`}
        </p>
      </div>

      {/* Amount */}
      <p style={{ fontWeight: 700, fontSize: ".88rem", color: cfg.color, flexShrink: 0 }}>{fmt(payment.amount)}</p>

      {/* Actions */}
      {payment.status !== "PAID" && (
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {loading
            ? <Loader2 size={14} style={{ color: "#64748b", animation: "spin 1s linear infinite" }} />
            : (
              <>
                <button onClick={() => mark("PAID")} title="Mark Paid"
                  style={{ width: 26, height: 26, borderRadius: 9999, background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CheckCircle size={12} style={{ color: "#34d399" }} />
                </button>
                {payment.status !== "MISSED" && (
                  <button onClick={() => mark("MISSED")} title="Mark Missed"
                    style={{ width: 26, height: 26, borderRadius: 9999, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <XCircle size={12} style={{ color: "#f87171" }} />
                  </button>
                )}
              </>
            )}
        </div>
      )}
    </div>
  );
}

// ── Loan card ─────────────────────────────────────────────────────────────────
function LoanCard({ loan, onDelete, onRefresh }) {
  const [expanded,    setExpanded]    = useState(false);
  const [activeTab,   setActiveTab]   = useState("schedule");
  const [deleting,    setDeleting]    = useState(false);
  const [filterStatus, setFilter]     = useState("ALL");

  const payments = loan.payments || [];
  const paid     = payments.filter(p => p.status === "PAID").length;
  const missed   = payments.filter(p => p.status === "MISSED").length;
  const pending  = payments.filter(p => p.status === "PENDING").length;
  const total    = payments.length;

  const paidAmt    = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const totalAmt   = loan.emiAmount * total;
  const remaining  = totalAmt - paidAmt;
  const progress   = total > 0 ? (paid / total) * 100 : 0;

  const amort     = calcAmortization(loan.principal, loan.interestRate, loan.tenureMonths);
  const chartData = amort.filter((_, i) => i % Math.max(1, Math.floor(amort.length / 12)) === 0);

  const filtered = filterStatus === "ALL" ? payments : payments.filter(p => p.status === filterStatus);

  const handleDelete = async () => {
    if (!confirm("Delete this loan and all payment records?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/loans/${loan.id}`, { method: "DELETE" });
      onDelete();
    } catch { } finally { setDeleting(false); }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
      {/* Card header */}
      <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <IndianRupee size={18} style={{ color: "#fbbf24" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <p style={{ fontWeight: 800, fontSize: ".95rem", color: "#f1f5f9", margin: 0, fontFamily: "'Sora',sans-serif" }}>{loan.name}</p>
            {loan.lender && <span style={{ fontSize: ".7rem", color: "#fbbf24", padding: "1px 8px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 9999 }}>{loan.lender}</span>}
          </div>
          <p style={{ fontSize: ".75rem", color: "#64748b", margin: "2px 0 0" }}>
            {fmt(loan.principal)} · {loan.interestRate}% p.a. · {loan.tenureMonths} months
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontWeight: 800, fontSize: "1rem", color: "#fbbf24", margin: 0 }}>{fmt(loan.emiAmount)}<span style={{ fontSize: ".7rem", color: "#64748b", fontWeight: 400 }}>/mo</span></p>
          <p style={{ fontSize: ".72rem", color: "#64748b", margin: "2px 0 0" }}>{paid}/{total} paid</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", color: "#64748b", marginBottom: 5 }}>
          <span>Paid {fmt(paidAmt)}</span>
          <span>Remaining {fmt(Math.max(0, remaining))}</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, width: `${progress}%`, background: "linear-gradient(90deg,#10b981,#34d399)", transition: "width .5s ease" }} />
        </div>

        {/* Status pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[
            { s: "PAID",    n: paid,    label: "Paid" },
            { s: "MISSED",  n: missed,  label: "Missed" },
            { s: "PENDING", n: pending, label: "Pending" },
          ].map(({ s, n, label }) => {
            const c = STATUS_CONFIG[s];
            return (
              <span key={s} style={{ fontSize: ".7rem", padding: "2px 8px", borderRadius: 9999, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
                {n} {label}
              </span>
            );
          })}
          <button onClick={() => setExpanded(v => !v)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: ".75rem", color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer" }}>
            {expanded ? <><ChevronUp size={13} /> Hide</> : <><ChevronDown size={13} /> Details</>}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", padding: "8px 12px", gap: 4, background: "rgba(0,0,0,0.2)" }}>
            {[
              { key: "schedule", label: "📅 Schedule" },
              { key: "amort",    label: "📊 Amortization" },
              { key: "summary",  label: "📋 Summary" },
            ].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                style={{ padding: "5px 12px", borderRadius: 9999, fontSize: ".75rem", fontWeight: activeTab === t.key ? 700 : 400, background: activeTab === t.key ? "rgba(251,191,36,0.15)" : "transparent", color: activeTab === t.key ? "#fbbf24" : "#64748b", border: activeTab === t.key ? "1px solid rgba(251,191,36,0.35)" : "1px solid transparent", cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
            <button onClick={handleDelete} disabled={deleting}
              style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 9999, fontSize: ".75rem", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
              Delete
            </button>
          </div>

          {/* Schedule tab */}
          {activeTab === "schedule" && (
            <div>
              <div style={{ display: "flex", gap: 5, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["ALL", "PAID", "MISSED", "PENDING"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ padding: "3px 10px", borderRadius: 9999, fontSize: ".7rem", fontWeight: filterStatus === f ? 700 : 400, background: filterStatus === f ? "rgba(255,255,255,0.1)" : "transparent", color: filterStatus === f ? "#e2e8f0" : "#64748b", border: filterStatus === f ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent", cursor: "pointer" }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {filtered.map((p, i) => (
                  <PaymentRow key={p.id} payment={{ ...p, month: payments.indexOf(p) + 1 }} loanId={loan.id} onMark={onRefresh} />
                ))}
              </div>
            </div>
          )}

          {/* Amortization tab */}
          {activeTab === "amort" && (
            <div style={{ padding: 16 }}>
              <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", marginBottom: 12, marginTop: 0 }}>Principal vs Interest per EMI</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                  <Bar dataKey="interest"  name="Interest"  stackId="a" fill="#f87171" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: ".72rem", color: "#64748b", marginTop: 8, marginBottom: 0, textAlign: "center" }}>
                🟢 Principal repaid &nbsp;🔴 Interest paid — shown every {Math.max(1, Math.floor(amort.length / 12))} months
              </p>
            </div>
          )}

          {/* Summary tab */}
          {activeTab === "summary" && (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Loan Amount (Principal)",  value: fmt(loan.principal),                      color: "#a78bfa" },
                { label: "Total Interest Payable",   value: fmt(loan.emiAmount * loan.tenureMonths - loan.principal), color: "#f87171" },
                { label: "Total Amount Payable",     value: fmt(loan.emiAmount * loan.tenureMonths),  color: "#fbbf24" },
                { label: "Monthly EMI",              value: fmt(loan.emiAmount),                      color: "#34d399" },
                { label: "Interest Rate",            value: `${loan.interestRate}% p.a.`,             color: "#60a5fa" },
                { label: "Loan Tenure",              value: `${loan.tenureMonths} months`,            color: "#94a3b8" },
                { label: "Start Date",               value: fmtDate(loan.startDate),                  color: "#94a3b8" },
                { label: "End Date",                 value: (() => { const d = new Date(loan.startDate); d.setMonth(d.getMonth() + loan.tenureMonths); return fmtDate(d); })(), color: "#94a3b8" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: ".8rem", color: "#94a3b8" }}>{r.label}</span>
                  <span style={{ fontSize: ".82rem", fontWeight: 700, color: r.color }}>{r.value}</span>
                </div>
              ))}
              {/* Pie chart */}
              <div style={{ marginTop: 8 }}>
                <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", marginBottom: 8 }}>Principal vs Interest Breakdown</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Principal", value: Math.round(loan.principal), color: "#10b981" },
                        { name: "Interest",  value: Math.round(loan.emiAmount * loan.tenureMonths - loan.principal), color: "#f87171" },
                      ]}
                      cx="50%" cy="50%" outerRadius={65} labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {[{ color: "#10b981" }, { color: "#f87171" }].map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Calculator panel ──────────────────────────────────────────────────────────
function CalculatorPanel({ onLoanAdded }) {
  const [form, setForm] = useState({
    name: "", lender: "", principal: "", interestRate: "", tenureMonths: "", startDate: new Date().toISOString().split("T")[0],
  });
  const [result,  setResult]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [showAmt, setShowAmt] = useState(false); // amortization table toggle

  const p = parseFloat(form.principal)    || 0;
  const r = parseFloat(form.interestRate) || 0;
  const n = parseInt(form.tenureMonths)   || 0;

  useEffect(() => {
    if (p > 0 && r >= 0 && n > 0) {
      const emi          = calcEMI(p, r, n);
      const totalPayable = emi * n;
      const totalInterest = totalPayable - p;
      setResult({ emi, totalPayable, totalInterest });
    } else {
      setResult(null);
    }
  }, [p, r, n]);

  const amortRows = result && p > 0 ? calcAmortization(p, r, n) : [];

  const handleSave = async () => {
    if (!form.name || !result) return;
    setSaving(true);
    try {
      const res  = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, principal: p, interestRate: r, tenureMonths: n }),
      });
      const data = await res.json();
      if (!data.error) {
        onLoanAdded(data);
        setForm({ name: "", lender: "", principal: "", interestRate: "", tenureMonths: "", startDate: new Date().toISOString().split("T")[0] });
        setResult(null);
      }
    } catch { }
    finally { setSaving(false); }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0", fontSize: ".85rem", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", background: "linear-gradient(135deg,rgba(251,191,36,0.12),rgba(245,158,11,0.06))", borderBottom: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Calculator size={17} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: ".9rem", color: "#fbbf24", margin: 0, fontFamily: "'Sora',sans-serif" }}>EMI Calculator</p>
          <p style={{ fontSize: ".72rem", color: "#64748b", margin: 0 }}>Bajaj Finance style · instant results</p>
        </div>
      </div>

      <div style={{ padding: 18 }}>
        {/* Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>Loan Name *</label>
            <input style={inputStyle} placeholder="e.g. Home Loan, Car Loan"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>Lender</label>
            <input style={inputStyle} placeholder="e.g. Bajaj Finance"
              value={form.lender} onChange={e => setForm(f => ({ ...f, lender: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>Loan Amount (₹) *</label>
            <input style={inputStyle} type="number" placeholder="500000"
              value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>Interest Rate (% p.a.) *</label>
            <input style={inputStyle} type="number" step="0.1" placeholder="8.5"
              value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>Tenure (Months) *</label>
            <input style={inputStyle} type="number" placeholder="24"
              value={form.tenureMonths} onChange={e => setForm(f => ({ ...f, tenureMonths: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: ".75rem", color: "#94a3b8", display: "block", marginBottom: 5 }}>First EMI Date</label>
            <input style={inputStyle} type="date"
              value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
          </div>
        </div>

        {/* Live result */}
        {result && (
          <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14, border: "1px solid rgba(251,191,36,0.25)" }}>
            <div style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.05))", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <BadgeCheck size={14} style={{ color: "#fbbf24" }} />
              <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#fbbf24" }}>Calculation Result</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 }}>
              {[
                { label: "Monthly EMI",     value: fmt(result.emi),          color: "#34d399" },
                { label: "Total Interest",  value: fmt(result.totalInterest), color: "#f87171" },
                { label: "Total Payable",   value: fmt(result.totalPayable),  color: "#fbbf24" },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: "12px 14px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none", textAlign: "center" }}>
                  <p style={{ fontSize: ".7rem", color: "#64748b", margin: "0 0 4px" }}>{s.label}</p>
                  <p style={{ fontSize: ".95rem", fontWeight: 800, color: s.color, margin: 0, fontFamily: "'Sora',sans-serif" }}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Interest ratio bar */}
            <div style={{ padding: "8px 14px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "#64748b", marginBottom: 4 }}>
                <span>Principal {((p / result.totalPayable) * 100).toFixed(0)}%</span>
                <span>Interest {((result.totalInterest / result.totalPayable) * 100).toFixed(0)}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, overflow: "hidden", background: "#f87171" }}>
                <div style={{ height: "100%", width: `${(p / result.totalPayable) * 100}%`, background: "#10b981", borderRadius: 4 }} />
              </div>
            </div>
          </div>
        )}

        {/* Amortization table toggle */}
        {amortRows.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <button onClick={() => setShowAmt(v => !v)}
              style={{ width: "100%", padding: "8px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: ".78rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {showAmt ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {showAmt ? "Hide" : "Show"} Full Amortization Schedule ({amortRows.length} months)
            </button>
            {showAmt && (
              <div style={{ marginTop: 8, maxHeight: 280, overflowY: "auto", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".75rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                      {["Month","EMI","Principal","Interest","Balance"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", textAlign: "right", color: "#64748b", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {amortRows.map(row => (
                      <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "7px 10px", color: "#94a3b8", textAlign: "right" }}>{row.month}</td>
                        <td style={{ padding: "7px 10px", color: "#fbbf24", textAlign: "right", fontWeight: 600 }}>{fmt(row.emi)}</td>
                        <td style={{ padding: "7px 10px", color: "#34d399", textAlign: "right" }}>{fmt(row.principal)}</td>
                        <td style={{ padding: "7px 10px", color: "#f87171", textAlign: "right" }}>{fmt(row.interest)}</td>
                        <td style={{ padding: "7px 10px", color: "#e2e8f0", textAlign: "right" }}>{fmt(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!form.name || !result || saving}
          style={{ width: "100%", padding: "10px", borderRadius: 12, background: form.name && result && !saving ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.06)", border: "none", color: form.name && result && !saving ? "#fff" : "#64748b", fontSize: ".85rem", fontWeight: 700, cursor: form.name && result && !saving ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Sora',sans-serif", transition: "all .2s" }}>
          {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={15} />}
          {saving ? "Saving…" : "Save Loan & Generate EMI Schedule"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EMIPage() {
  const [loans,   setLoans]   = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/loans");
      const data = await res.json();
      if (Array.isArray(data)) setLoans(data);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const handleLoanAdded = (loan) => setLoans(prev => [loan, ...prev]);
  const handleDelete    = ()     => loadLoans();

  // Overall summary
  const totalPrincipal = loans.reduce((s, l) => s + l.principal, 0);
  const totalEMI       = loans.reduce((s, l) => s + l.emiAmount, 0);
  const totalPaid      = loans.reduce((s, l) => s + l.payments.filter(p => p.status === "PAID").reduce((a, p) => a + p.amount, 0), 0);
  const totalMissed    = loans.reduce((s, l) => s + l.payments.filter(p => p.status === "MISSED").length, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "1rem 1rem 6rem", maxWidth: 960, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calculator size={20} style={{ color: "#fbbf24" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "'Sora',sans-serif", margin: 0, lineHeight: 1 }}>EMI Manager</h1>
            <p style={{ fontSize: ".72rem", color: "#64748b", margin: "3px 0 0" }}>Calculate · Track · Manage all your loans</p>
          </div>
        </div>
        <button onClick={loadLoans} disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9999, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: ".8rem", cursor: "pointer" }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      {loans.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Active Loans",    value: loans.length,    color: "#a78bfa", unit: "" },
            { label: "Total Principal", value: fmt(totalPrincipal), color: "#fbbf24", unit: "" },
            { label: "Monthly EMIs",    value: fmt(totalEMI),   color: "#f87171", unit: "" },
            { label: "Total Paid",      value: fmt(totalPaid),  color: "#34d399", unit: "" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "12px 14px" }}>
              <p style={{ fontSize: ".7rem", color: "#64748b", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label}</p>
              <p style={{ fontSize: ".95rem", fontWeight: 800, color: s.color, margin: 0, fontFamily: "'Sora',sans-serif" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {totalMissed > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 12, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", marginBottom: 18 }}>
          <AlertCircle size={16} style={{ color: "#f87171", flexShrink: 0 }} />
          <p style={{ color: "#f87171", fontSize: ".82rem", fontWeight: 600, margin: 0 }}>
            ⚠️ You have {totalMissed} missed EMI payment{totalMissed > 1 ? "s" : ""}. Please clear them to avoid penalties.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, alignItems: "start" }}>
        {/* Left: Calculator */}
        <CalculatorPanel onLoanAdded={handleLoanAdded} />

        {/* Right: Loan list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 0", gap: 12 }}>
              <Loader2 size={24} style={{ color: "#fbbf24", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#64748b", fontSize: ".88rem", margin: 0 }}>Loading your loans…</p>
            </div>
          )}

          {!loading && loans.length === 0 && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "3rem", textAlign: "center" }}>
              <TrendingDown size={36} style={{ color: "#64748b", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#94a3b8", fontWeight: 600, margin: "0 0 6px" }}>No loans yet</p>
              <p style={{ color: "#64748b", fontSize: ".82rem", margin: 0 }}>Use the calculator to add your first loan and track EMIs.</p>
            </div>
          )}

          {!loading && loans.map(loan => (
            <LoanCard key={loan.id} loan={loan} onDelete={handleDelete} onRefresh={loadLoans} />
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}