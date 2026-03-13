"use client";

import { useState } from "react";
import { Download, FileText, Table, Loader2, ChevronDown, Calendar } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

// ── PDF Report Renderer ────────────────────────────────────────────────────────
function buildReportHTML(data) {
  const { user, period, summary, budget, categories, topTransactions, goals, generatedAt } = data;
  const budgetPct  = budget?.pct ?? 0;
  const budgetColor = budgetPct > 90 ? "#ef4444" : budgetPct > 70 ? "#f59e0b" : "#10b981";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Welth Report — ${period.label}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; background:#fff; color:#0f172a; padding:40px; font-size:13px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #10b981; padding-bottom:20px; margin-bottom:28px; }
  .logo { font-size:24px; font-weight:800; color:#10b981; letter-spacing:-1px; }
  .header-right { text-align:right; color:#64748b; font-size:11px; }
  .title { font-size:18px; font-weight:700; color:#0f172a; }
  .section { margin-bottom:28px; }
  .section-title { font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:12px; border-bottom:1px solid #e2e8f0; padding-bottom:6px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; }
  .kpi-label { font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:.06em; margin-bottom:5px; }
  .kpi-val { font-size:18px; font-weight:800; color:#0f172a; }
  .kpi-val.green { color:#10b981; }
  .kpi-val.red   { color:#ef4444; }
  .kpi-val.blue  { color:#3b82f6; }
  .kpi-val.purple{ color:#8b5cf6; }
  .cat-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .cat-name { width:130px; font-size:12px; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cat-bar-wrap { flex:1; height:8px; background:#f1f5f9; border-radius:4px; overflow:hidden; }
  .cat-bar { height:100%; border-radius:4px; background:#10b981; }
  .cat-amt { width:80px; text-align:right; font-size:12px; font-weight:600; color:#0f172a; }
  .cat-pct { width:36px; text-align:right; font-size:11px; color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th { background:#f8fafc; padding:8px 10px; text-align:left; font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #e2e8f0; }
  td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
  .income  { color:#10b981; font-weight:600; }
  .expense { color:#ef4444; font-weight:600; }
  .budget-bar-wrap { height:10px; background:#f1f5f9; border-radius:5px; overflow:hidden; margin-top:8px; }
  .budget-bar { height:100%; border-radius:5px; background:${budgetColor}; width:${Math.min(budgetPct,100)}%; }
  .footer { border-top:1px solid #e2e8f0; padding-top:14px; text-align:center; color:#94a3b8; font-size:10px; }
  @media print {
    body { padding:20px; }
    .no-print { display:none; }
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">welth.</div>
    <div class="title">Monthly Financial Report</div>
    <div style="color:#64748b;font-size:12px;margin-top:4px">${period.label}</div>
  </div>
  <div class="header-right">
    <div style="font-weight:700;font-size:14px">${user.name}</div>
    <div>${user.email}</div>
    <div style="margin-top:4px">Generated: ${new Date(generatedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</div>
  </div>
</div>

<!-- KPIs -->
<div class="section">
  <div class="section-title">Summary</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Income</div><div class="kpi-val green">${fmt(summary.income)}</div></div>
    <div class="kpi"><div class="kpi-label">Expenses</div><div class="kpi-val red">${fmt(summary.expense)}</div></div>
    <div class="kpi"><div class="kpi-label">Savings</div><div class="kpi-val purple">${fmt(summary.savings)}</div></div>
    <div class="kpi"><div class="kpi-label">Net Worth</div><div class="kpi-val blue">${fmt(summary.netWorth)}</div></div>
  </div>
</div>

${budget ? `
<div class="section">
  <div class="section-title">Budget</div>
  <div style="display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:12px;color:#334155">Monthly budget: <b>${fmt(budget.amount)}</b> — used <b>${fmt(budget.used)}</b> (${budget.pct}%)</span>
    <span style="font-size:12px;font-weight:700;color:${budgetColor}">${budget.pct}% used</span>
  </div>
  <div class="budget-bar-wrap"><div class="budget-bar"></div></div>
</div>` : ""}

<!-- Categories -->
${categories.length ? `
<div class="section">
  <div class="section-title">Spending by Category</div>
  ${categories.map((c, i) => {
    const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4","#ec4899","#84cc16"];
    return `<div class="cat-row">
      <div class="cat-name">${c.name}</div>
      <div class="cat-bar-wrap"><div class="cat-bar" style="width:${c.pct}%;background:${COLORS[i % COLORS.length]}"></div></div>
      <div class="cat-amt">${fmt(c.amount)}</div>
      <div class="cat-pct">${c.pct}%</div>
    </div>`;
  }).join("")}
</div>` : ""}

<!-- Top Transactions -->
${topTransactions.length ? `
<div class="section">
  <div class="section-title">Top Transactions</div>
  <table>
    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Account</th><th>Amount</th></tr></thead>
    <tbody>
      ${topTransactions.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.category}</td>
        <td style="color:#64748b">${t.description || "—"}</td>
        <td style="color:#64748b">${t.account}</td>
        <td class="${t.type === "INCOME" ? "income" : "expense"}">${t.type === "INCOME" ? "+" : "-"}${fmt(t.amount)}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<div class="footer">Welth · AI-Powered Personal Finance · This report is for personal use only</div>
</body>
</html>`;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ExportButton({ compact = false }) {
  const [open,        setOpen]        = useState(false);
  const [csvLoading,  setCsvLoading]  = useState(false);
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [monthInput,  setMonthInput]  = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const handleCSV = async () => {
    setCsvLoading(true);
    try {
      const params = new URLSearchParams({ from: monthInput + "-01" });
      const end    = new Date(monthInput + "-01");
      end.setMonth(end.getMonth() + 1); end.setDate(0);
      params.set("to", end.toISOString().split("T")[0]);
      const res  = await fetch(`/api/export/transactions?${params}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `welth-${monthInput}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setCsvLoading(false); setOpen(false); }
  };

  const handlePDF = async () => {
    setPdfLoading(true);
    try {
      const res  = await fetch(`/api/export/report?month=${monthInput}`);
      const data = await res.json();
      const html = buildReportHTML(data);
      const win  = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 500);
    } finally { setPdfLoading(false); setOpen(false); }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:6, padding: compact ? "6px 12px" : "8px 16px",
          borderRadius:9999, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.3)",
          color:"#34d399", fontSize:".78rem", fontWeight:700, cursor:"pointer" }}>
        <Download size={13}/> Export <ChevronDown size={11}/>
      </button>

      {open && (
        <>
          <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={() => setOpen(false)}/>
          <div style={{ position:"absolute", top:"110%", right:0, zIndex:50, background:"#0d1421",
            border:"1px solid rgba(255,255,255,.1)", borderRadius:14, padding:16, width:240,
            boxShadow:"0 20px 60px rgba(0,0,0,.5)" }}>

            <p style={{ fontSize:".72rem", color:"#64748b", fontWeight:600, textTransform:"uppercase",
              letterSpacing:".05em", margin:"0 0 10px" }}>Export Options</p>

            {/* Month picker */}
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:".7rem", color:"#64748b", display:"block", marginBottom:4 }}>Month</label>
              <div style={{ position:"relative" }}>
                <Calendar size={12} style={{ position:"absolute", left:9, top:"50%", transform:"translateY(-50%)", color:"#64748b" }}/>
                <input type="month" value={monthInput} onChange={e => setMonthInput(e.target.value)}
                  style={{ width:"100%", padding:"6px 10px 6px 26px", borderRadius:8,
                    background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
                    color:"#f1f5f9", fontSize:".78rem", outline:"none" }}/>
              </div>
            </div>

            {/* CSV */}
            <button onClick={handleCSV} disabled={csvLoading}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                borderRadius:10, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.2)",
                color:"#34d399", fontSize:".8rem", fontWeight:600, cursor:"pointer", marginBottom:8 }}>
              {csvLoading ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Table size={13}/>}
              {csvLoading ? "Exporting…" : "Download CSV"}
              <span style={{ marginLeft:"auto", fontSize:".65rem", color:"#475569" }}>Transactions</span>
            </button>

            {/* PDF */}
            <button onClick={handlePDF} disabled={pdfLoading}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"10px 12px",
                borderRadius:10, background:"rgba(96,165,250,.08)", border:"1px solid rgba(96,165,250,.2)",
                color:"#60a5fa", fontSize:".8rem", fontWeight:600, cursor:"pointer" }}>
              {pdfLoading ? <Loader2 size={13} style={{ animation:"spin 1s linear infinite" }}/> : <FileText size={13}/>}
              {pdfLoading ? "Building…" : "Print PDF Report"}
              <span style={{ marginLeft:"auto", fontSize:".65rem", color:"#475569" }}>Full report</span>
            </button>
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}