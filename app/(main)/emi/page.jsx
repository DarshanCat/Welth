"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calculator, Plus, ChevronDown, ChevronUp, Trash2,
  CheckCircle2, Clock, AlertTriangle, TrendingDown,
  IndianRupee, Percent, Calendar, BarChart3, X,
  RefreshCw, Loader2, CreditCard, Home, Car, BookOpen,
  Briefcase, HelpCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ────────────────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const LOAN_TYPES = [
  { key: "HOME",      label: "Home",      icon: Home,       color: "#60a5fa" },
  { key: "CAR",       label: "Car",       icon: Car,        color: "#34d399" },
  { key: "PERSONAL",  label: "Personal",  icon: CreditCard, color: "#f59e0b" },
  { key: "EDUCATION", label: "Education", icon: BookOpen,   color: "#a78bfa" },
  { key: "BUSINESS",  label: "Business",  icon: Briefcase,  color: "#f87171" },
  { key: "OTHER",     label: "Other",     icon: HelpCircle, color: "#94a3b8" },
];

const STATUS_CFG = {
  PAID:     { color: "#34d399", bg: "rgba(52,211,153,.12)",  border: "rgba(52,211,153,.3)",  label: "Paid",    icon: CheckCircle2 },
  MISSED:   { color: "#f87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.3)", label: "Missed",  icon: AlertTriangle },
  UPCOMING: { color: "#60a5fa", bg: "rgba(96,165,250,.1)",   border: "rgba(96,165,250,.25)", label: "Due",     icon: Clock },
  PENDING:  { color: "#f59e0b", bg: "rgba(245,158,11,.1)",   border: "rgba(245,158,11,.3)",  label: "Overdue", icon: AlertTriangle },
};

// ── Pure EMI maths (client-side for instant preview) ────────────────────────
function calcEMI(p, r, n) {
  if (!p || !n) return 0;
  if (r === 0) return p / n;
  const mr = r / 100 / 12;
  return (p * mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
}

function buildBreakdown(p, r, n, emi) {
  const mr = r / 100 / 12;
  let balance = p;
  return Array.from({ length: n }, (_, i) => {
    const interest  = Math.round(balance * mr * 100) / 100;
    const principal = Math.round((emi - interest) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principal) * 100) / 100);
    return { month: i + 1, interest, principal, balance };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Donut chart (SVG)
function DonutChart({ principal, interest }) {
  const total = principal + interest;
  if (!total) return null;
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const pSlice = (principal / total) * circ;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={18} stroke="rgba(248,113,113,.9)"
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={18} stroke="rgba(52,211,153,.9)"
        strokeDasharray={`${pSlice} ${circ}`} strokeDashoffset={0}
        transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
      <text x={cx} y={cy - 7} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight={700}>EMI</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#34d399" fontSize={12} fontWeight={800}>
        {fmt(Math.round(principal / (principal + interest) * 100))}%
      </text>
      <text x={cx} y={cy + 22} textAnchor="middle" fill="#94a3b8" fontSize={9}>principal</text>
    </svg>
  );
}

// ── Calculator form ──────────────────────────────────────────────────────────
function CalcSlider({ label, min, max, step, value, onChange, format, icon: Icon, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon size={13} style={{ color }} />
          <span style={{ fontSize: ".78rem", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
        </div>
        <span style={{ fontWeight: 800, color, fontSize: ".9rem", fontFamily: "'Sora',sans-serif" }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".65rem", color: "#475569", marginTop: 2 }}>
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

// ── EMI row ──────────────────────────────────────────────────────────────────
function EmiRow({ p, loanId, onMarkPaid, onMarkMissed, loading }) {
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.UPCOMING;
  const Icon = cfg.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: p.status === "PAID" ? "rgba(52,211,153,.04)" : "rgba(255,255,255,.025)", border: `1px solid ${p.status === "PAID" ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.06)"}`, marginBottom: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 9999, background: cfg.bg, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontWeight: 700, fontSize: ".8rem", color: "#e2e8f0" }}>EMI #{p.installment}</span>
          <span style={{ fontSize: ".65rem", padding: "1px 7px", borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: ".7rem", color: "#64748b" }}>
          <span>Due: {fmtDate(p.dueDate)}</span>
          <span>P: {fmt(p.principal)}</span>
          <span>I: {fmt(p.interest)}</span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontWeight: 800, color: cfg.color, fontSize: ".85rem", margin: 0 }}>{fmt(p.amount)}</p>
        <p style={{ fontSize: ".65rem", color: "#475569", margin: "2px 0 0" }}>Bal: {fmt(p.balance)}</p>
      </div>
      {p.status !== "PAID" && (
        <button onClick={() => onMarkPaid(loanId, p.id)} disabled={loading}
          style={{ width: 28, height: 28, borderRadius: 9999, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.3)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          title="Mark as Paid">
          <CheckCircle2 size={13} style={{ color: "#34d399" }} />
        </button>
      )}
      {p.status === "PAID" && p.paidDate && (
        <span style={{ fontSize: ".65rem", color: "#34d399", flexShrink: 0 }}>✓ {fmtDate(p.paidDate)}</span>
      )}
    </div>
  );
}

// ── Loan card ────────────────────────────────────────────────────────────────
function LoanCard({ loan, onMarkPaid, onDelete, mutating }) {
  const [expanded, setExpanded]   = useState(false);
  const [filter,   setFilter]     = useState("ALL");
  const typeConfig = LOAN_TYPES.find(t => t.key === loan.loanType) || LOAN_TYPES[5];
  const TypeIcon   = typeConfig.icon;
  const paidPct    = Math.round((loan.stats.paid / loan.tenureMonths) * 100);

  const shown = expanded
    ? loan.payments.filter(p => filter === "ALL" || p.status === filter || (filter === "MISSED" && p.status === "MISSED"))
    : loan.payments.filter(p => p.status !== "PAID").slice(0, 3);

  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden", marginBottom: 14 }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.1rem", background: `linear-gradient(135deg,${typeConfig.color}12,${typeConfig.color}06)`, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: `${typeConfig.color}18`, border: `1px solid ${typeConfig.color}35`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TypeIcon size={17} style={{ color: typeConfig.color }} />
            </div>
            <div>
              <p style={{ fontWeight: 800, color: "#f1f5f9", fontSize: ".95rem", fontFamily: "'Sora',sans-serif", margin: 0 }}>{loan.name}</p>
              <p style={{ fontSize: ".72rem", color: "#64748b", margin: 0 }}>{typeConfig.label} · {loan.interestRate}% p.a. · {loan.tenureMonths} months</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {loan.stats.missed > 0 && (
              <span style={{ fontSize: ".68rem", padding: "2px 8px", borderRadius: 9999, background: "rgba(248,113,113,.15)", color: "#f87171", border: "1px solid rgba(248,113,113,.3)", fontWeight: 700 }}>
                {loan.stats.missed} MISSED
              </span>
            )}
            <button onClick={() => onDelete(loan.id)} title="Delete loan"
              style={{ width: 28, height: 28, borderRadius: 9999, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={12} style={{ color: "#f87171" }} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          {[
            { label: "EMI",          val: fmt(loan.emiAmount),     color: typeConfig.color },
            { label: "Paid",         val: fmt(loan.stats.paidAmt), color: "#34d399" },
            { label: "Remaining",    val: fmt(loan.stats.remaining),color: "#f59e0b" },
            { label: "Total",        val: fmt(loan.totalAmount),   color: "#94a3b8" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "7px 4px" }}>
              <p style={{ fontSize: ".68rem", color: "#64748b", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: ".8rem", fontWeight: 700, color: s.color, margin: "3px 0 0" }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".72rem", color: "#64748b", marginBottom: 5 }}>
            <span>{loan.stats.paid}/{loan.tenureMonths} EMIs paid</span>
            <span style={{ color: typeConfig.color, fontWeight: 700 }}>{paidPct}% complete</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.07)", overflow: "hidden", display: "flex" }}>
            <div style={{ height: "100%", width: `${paidPct}%`, background: `linear-gradient(90deg,${typeConfig.color},${typeConfig.color}cc)`, transition: "width .7s ease", borderRadius: 4 }} />
            {loan.stats.missed > 0 && (
              <div style={{ height: "100%", width: `${Math.round(loan.stats.missed / loan.tenureMonths * 100)}%`, background: "rgba(248,113,113,.7)", borderRadius: 4 }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 5, fontSize: ".68rem" }}>
            <span style={{ color: typeConfig.color }}>■ Paid: {loan.stats.paid}</span>
            {loan.stats.missed > 0 && <span style={{ color: "#f87171" }}>■ Missed: {loan.stats.missed}</span>}
            <span style={{ color: "#64748b" }}>■ Remaining: {loan.stats.upcoming}</span>
          </div>
        </div>
      </div>

      {/* EMI list toggle */}
      <button onClick={() => setExpanded(v => !v)}
        style={{ width: "100%", padding: ".6rem 1rem", background: "transparent", border: "none", color: "#64748b", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>EMI Schedule · {expanded ? "Collapse" : `Next ${Math.min(3, loan.stats.upcoming)} upcoming`}</span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div style={{ padding: "0 .85rem .85rem" }}>
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {["ALL","UPCOMING","PAID","MISSED"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{ fontSize: ".68rem", padding: "3px 10px", borderRadius: 9999, fontWeight: 600, cursor: "pointer", background: filter === f ? (f==="PAID"?"rgba(52,211,153,.15)":f==="MISSED"?"rgba(248,113,113,.15)":"rgba(96,165,250,.15)") : "rgba(255,255,255,.05)", color: filter === f ? (f==="PAID"?"#34d399":f==="MISSED"?"#f87171":"#60a5fa") : "#64748b", border: `1px solid ${filter===f?(f==="PAID"?"rgba(52,211,153,.35)":f==="MISSED"?"rgba(248,113,113,.35)":"rgba(96,165,250,.3)"):"rgba(255,255,255,.08)"}` }}>
                {f}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {shown.length === 0
              ? <p style={{ textAlign: "center", color: "#475569", padding: "1.5rem 0", fontSize: ".82rem" }}>No EMIs in this filter.</p>
              : shown.map(p => <EmiRow key={p.id} p={p} loanId={loan.id} onMarkPaid={onMarkPaid} onMarkMissed={() => {}} loading={mutating} />)
            }
          </div>
        </div>
      )}

      {/* Collapsed: show upcoming */}
      {!expanded && loan.stats.upcoming > 0 && (
        <div style={{ padding: "0 .85rem .85rem" }}>
          {shown.map(p => <EmiRow key={p.id} p={p} loanId={loan.id} onMarkPaid={onMarkPaid} onMarkMissed={() => {}} loading={mutating} />)}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function EmiPage() {
  const [tab,       setTab]       = useState("calculator");
  const [loans,     setLoans]     = useState([]);
  const [fetching,  setFetching]  = useState(true);
  const [mutating,  setMutating]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Calculator state
  const [principal, setPrincipal] = useState(500000);
  const [rate,      setRate]      = useState(10.5);
  const [months,    setMonths]    = useState(24);

  // New loan form
  const [form, setForm] = useState({
    name: "", principal: "", interestRate: "", tenureMonths: "",
    startDate: new Date().toISOString().slice(0,10), loanType: "PERSONAL",
  });

  const emi          = calcEMI(principal, rate, months);
  const totalAmount  = emi * months;
  const totalInterest= totalAmount - principal;
  const breakdown    = buildBreakdown(principal, rate, months, emi);

  // Chart data: first 12 or all if < 12
  const chartData = breakdown.slice(0, Math.min(months, 12)).map(b => ({
    m: `M${b.month}`, principal: b.principal, interest: b.interest, balance: b.balance,
  }));

  const loadLoans = useCallback(async () => {
    setFetching(true);
    try {
      const r = await fetch("/api/loans");
      const d = await r.json();
      setLoans(d.loans || []);
    } catch { setLoans([]); }
    finally  { setFetching(false); }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const handleCreate = async () => {
    if (!form.principal || !form.interestRate || !form.tenureMonths || !form.startDate) return;
    setSaving(true);
    try {
      const r = await fetch("/api/loans", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const d = await r.json();
      if (d.loan) { setLoans(p => [d.loan, ...p]); setShowForm(false); setForm({ name:"", principal:"", interestRate:"", tenureMonths:"", startDate: new Date().toISOString().slice(0,10), loanType:"PERSONAL" }); }
    } finally { setSaving(false); }
  };

  const handleMarkPaid = async (loanId, paymentId) => {
    setMutating(true);
    try {
      await fetch(`/api/loans/${loanId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, action: "mark_paid" }),
      });
      await loadLoans();
    } finally { setMutating(false); }
  };

  const handleDelete = async (loanId) => {
    if (!confirm("Delete this loan and all its EMI records?")) return;
    setMutating(true);
    try {
      await fetch(`/api/loans/${loanId}`, { method: "DELETE" });
      setLoans(p => p.filter(l => l.id !== loanId));
    } finally { setMutating(false); }
  };

  const totalMissed  = loans.reduce((s, l) => s + l.stats.missed, 0);
  const totalMonthly = loans.filter(l => l.status === "ACTIVE").reduce((s, l) => s + l.emiAmount, 0);

  return (
    <div style={{ minHeight: "100vh", padding: "1rem 1rem 6rem", maxWidth: 920, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,rgba(96,165,250,.2),rgba(59,130,246,.1))", border: "1px solid rgba(96,165,250,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calculator size={20} style={{ color: "#60a5fa" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "'Sora',sans-serif", margin: 0, lineHeight: 1 }}>EMI Manager</h1>
            <p style={{ fontSize: ".72rem", color: "#64748b", margin: "3px 0 0" }}>Calculate · Track · Never miss a payment</p>
          </div>
        </div>
        {tab === "tracker" && (
          <button onClick={() => setShowForm(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9999, background: showForm ? "rgba(248,113,113,.15)" : "linear-gradient(135deg,rgba(96,165,250,.18),rgba(59,130,246,.1))", border: `1px solid ${showForm ? "rgba(248,113,113,.4)" : "rgba(96,165,250,.4)"}`, color: showForm ? "#f87171" : "#60a5fa", fontSize: ".8rem", fontWeight: 700, cursor: "pointer" }}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Loan</>}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 20 }}>
        {[
          { key: "calculator", label: "EMI Calculator", icon: Calculator },
          { key: "tracker",    label: `My Loans${loans.length ? ` (${loans.length})` : ""}`, icon: BarChart3 },
        ].map(t => {
          const Icon   = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "9px 8px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: ".82rem", fontWeight: active ? 700 : 500, background: active ? "rgba(96,165,250,.15)" : "transparent", color: active ? "#60a5fa" : "#64748b", border: active ? "1px solid rgba(96,165,250,.3)" : "1px solid transparent", cursor: "pointer", transition: "all .2s" }}>
              <Icon size={14} />{t.label}
              {t.key === "tracker" && totalMissed > 0 && (
                <span style={{ background: "#f87171", color: "#fff", borderRadius: 9999, fontSize: ".6rem", fontWeight: 800, padding: "1px 5px" }}>{totalMissed}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ CALCULATOR TAB ═══════════════ */}
      {tab === "calculator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Sliders */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, padding: "1.25rem 1.4rem" }}>
            <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", marginBottom: 18, marginTop: 0 }}>Loan Parameters</p>
            <CalcSlider label="Loan Amount" min={10000} max={10000000} step={10000} value={principal} onChange={setPrincipal} format={v => fmt(v)} icon={IndianRupee} color="#60a5fa" />
            <CalcSlider label="Interest Rate (p.a.)" min={1} max={36} step={0.1} value={rate} onChange={setRate} format={v => `${v}%`} icon={Percent} color="#fbbf24" />
            <CalcSlider label="Tenure" min={3} max={360} step={3} value={months} onChange={setMonths} format={v => `${v} months`} icon={Calendar} color="#a78bfa" />
          </div>

          {/* Result cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Monthly EMI",    val: fmt(emi),          color: "#60a5fa", sub: "per month" },
              { label: "Total Interest", val: fmt(totalInterest),color: "#f87171", sub: `${Math.round(totalInterest/principal*100)}% of principal` },
              { label: "Total Payable",  val: fmt(totalAmount),  color: "#34d399", sub: `over ${months} months` },
            ].map(c => (
              <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem .9rem", textAlign: "center" }}>
                <p style={{ fontSize: ".7rem", color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: ".05em" }}>{c.label}</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 800, color: c.color, fontFamily: "'Sora',sans-serif", margin: "6px 0 2px" }}>{c.val}</p>
                <p style={{ fontSize: ".68rem", color: "#475569", margin: 0 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Donut + Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14 }}>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <DonutChart principal={principal} interest={totalInterest} />
              <div style={{ display: "flex", gap: 14, fontSize: ".72rem" }}>
                <span style={{ color: "#34d399" }}>■ Principal</span>
                <span style={{ color: "#f87171" }}>■ Interest</span>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem" }}>
              <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", marginTop: 0, marginBottom: 12 }}>Payment Breakdown</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Loan Amount",  val: fmt(principal),      color: "#60a5fa", pct: 100 },
                  { label: "Total Interest",val: fmt(totalInterest), color: "#f87171", pct: Math.round(totalInterest/totalAmount*100) },
                  { label: "Total Amount", val: fmt(totalAmount),     color: "#34d399", pct: 100 },
                  { label: "Monthly EMI",  val: fmt(emi),            color: "#fbbf24", pct: null },
                ].map(r => (
                  <div key={r.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", marginBottom: 3 }}>
                      <span style={{ color: "#94a3b8" }}>{r.label}</span>
                      <span style={{ fontWeight: 700, color: r.color }}>{r.val}</span>
                    </div>
                    {r.pct !== null && (
                      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.07)" }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${r.pct}%`, background: r.color, transition: "width .5s" }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Area chart: P+I over time */}
          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem 1.1rem" }}>
            <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", marginTop: 0, marginBottom: 14 }}>
              Principal vs Interest — first {Math.min(months, 12)} months
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, n) => [fmt(v), n === "principal" ? "Principal" : "Interest"]}
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="principal" name="principal" stroke="#34d399" fill="rgba(52,211,153,.12)" strokeWidth={2} />
                <Area type="monotone" dataKey="interest"  name="interest"  stroke="#f87171" fill="rgba(248,113,113,.1)"  strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* CTA */}
          <button onClick={() => { setTab("tracker"); setShowForm(true); setForm(f => ({ ...f, principal: String(principal), interestRate: String(rate), tenureMonths: String(months) })); }}
            style={{ padding: "12px", borderRadius: 12, background: "linear-gradient(135deg,rgba(96,165,250,.18),rgba(59,130,246,.1))", border: "1px solid rgba(96,165,250,.4)", color: "#60a5fa", fontWeight: 700, cursor: "pointer", fontSize: ".85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Plus size={15} /> Track This Loan → Save to My Loans
          </button>
        </div>
      )}

      {/* ═══════════════ TRACKER TAB ═══════════════ */}
      {tab === "tracker" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Add loan form */}
          {showForm && (
            <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(96,165,250,.25)", borderRadius: 18, padding: "1.2rem" }}>
              <p style={{ fontWeight: 700, fontSize: ".9rem", color: "#60a5fa", marginTop: 0, marginBottom: 14 }}>Add New Loan</p>

              {/* Loan type selector */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 14 }}>
                {LOAN_TYPES.map(t => {
                  const Icon = t.icon;
                  const sel  = form.loanType === t.key;
                  return (
                    <button key={t.key} onClick={() => setForm(f => ({ ...f, loanType: t.key }))}
                      style={{ padding: "8px 4px", borderRadius: 10, background: sel ? `${t.color}18` : "rgba(255,255,255,.04)", border: `1px solid ${sel ? t.color + "50" : "rgba(255,255,255,.08)"}`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <Icon size={15} style={{ color: t.color }} />
                      <span style={{ fontSize: ".65rem", color: sel ? t.color : "#64748b", fontWeight: sel ? 700 : 500 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { key: "name",          label: "Loan Name",       placeholder: "e.g. Home Loan SBI",  type: "text" },
                  { key: "startDate",     label: "Start Date",      placeholder: "",                    type: "date" },
                  { key: "principal",     label: "Principal (₹)",   placeholder: "e.g. 500000",         type: "number" },
                  { key: "interestRate",  label: "Interest % p.a.", placeholder: "e.g. 10.5",           type: "number" },
                  { key: "tenureMonths",  label: "Tenure (months)", placeholder: "e.g. 24",             type: "number" },
                ].map(f => (
                  <div key={f.key} style={f.key === "name" ? { gridColumn: "1/-1" } : {}}>
                    <label style={{ fontSize: ".72rem", color: "#64748b", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".82rem", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {/* Preview */}
              {form.principal && form.interestRate && form.tenureMonths && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(96,165,250,.06)", border: "1px solid rgba(96,165,250,.2)", borderRadius: 10, display: "flex", gap: 16, fontSize: ".78rem" }}>
                  {(() => {
                    const p = parseFloat(form.principal), r = parseFloat(form.interestRate), n = parseInt(form.tenureMonths);
                    const e = calcEMI(p, r, n);
                    return (
                      <>
                        <span style={{ color: "#60a5fa" }}>EMI: <strong>{fmt(e)}</strong></span>
                        <span style={{ color: "#f87171" }}>Interest: <strong>{fmt(e*n - p)}</strong></span>
                        <span style={{ color: "#34d399" }}>Total: <strong>{fmt(e*n)}</strong></span>
                      </>
                    );
                  })()}
                </div>
              )}

              <button onClick={handleCreate} disabled={saving}
                style={{ marginTop: 12, width: "100%", padding: "11px", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", color: "#fff", fontWeight: 700, fontSize: ".85rem", cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Creating…</> : <><Plus size={14} /> Create Loan & EMI Schedule</>}
              </button>
            </div>
          )}

          {/* Summary bar */}
          {loans.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[
                { label: "Total Loans",    val: loans.length,        color: "#60a5fa", fmt: v => v },
                { label: "Monthly EMIs",   val: totalMonthly,        color: "#fbbf24", fmt: fmt },
                { label: "Missed EMIs",    val: totalMissed,         color: totalMissed > 0 ? "#f87171" : "#34d399", fmt: v => v },
                { label: "Total Owed",     val: loans.reduce((s,l) => s + l.stats.remaining, 0), color: "#a78bfa", fmt: fmt },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
                  <p style={{ fontSize: ".68rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                  <p style={{ fontSize: ".95rem", fontWeight: 800, color: s.color, margin: "4px 0 0", fontFamily: "'Sora',sans-serif" }}>{s.fmt(s.val)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loans */}
          {fetching ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem", gap: 12 }}>
              <Loader2 size={22} style={{ color: "#60a5fa", animation: "spin 1s linear infinite" }} />
              <span style={{ color: "#64748b" }}>Loading loans…</span>
            </div>
          ) : loans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18 }}>
              <Calculator size={36} style={{ color: "#475569", margin: "0 auto 12px", display: "block" }} />
              <p style={{ color: "#64748b", margin: 0, fontSize: ".9rem" }}>No loans tracked yet.</p>
              <p style={{ color: "#475569", margin: "6px 0 0", fontSize: ".78rem" }}>Add a loan to track EMIs, see what&apos;s paid, and never miss a payment.</p>
              <button onClick={() => setShowForm(true)}
                style={{ marginTop: 14, padding: "9px 20px", borderRadius: 9999, background: "rgba(96,165,250,.15)", border: "1px solid rgba(96,165,250,.35)", color: "#60a5fa", fontWeight: 700, fontSize: ".8rem", cursor: "pointer" }}>
                + Add Your First Loan
              </button>
            </div>
          ) : (
            loans.map(loan => <LoanCard key={loan.id} loan={loan} onMarkPaid={handleMarkPaid} onDelete={handleDelete} mutating={mutating} />)
          )}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=range] { height: 5px; border-radius: 3px; }
      `}</style>
    </div>
  );
}