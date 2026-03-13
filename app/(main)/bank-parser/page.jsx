"use client";
import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle2, Download, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const CAT_COLORS = {
  Food: "#fc8019", Transportation: "#60a5fa", Shopping: "#a78bfa",
  Utilities: "#fbbf24", Healthcare: "#f87171", Groceries: "#34d399",
  Salary: "#10b981", Entertainment: "#8b5cf6", ATM: "#94a3b8",
  Transfer: "#64748b", EMI: "#f59e0b", Other: "#475569",
};

export default function BankParserPage() {
  const [file,        setFile]        = useState(null);
  const [parsing,     setParsing]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState(null);
  const [selected,    setSelected]    = useState(new Set());
  const [importing,   setImporting]   = useState(false);
  const [imported,    setImported]    = useState(false);
  const inputRef = useRef(null);
  const router   = useRouter();

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setError(null); }
  };

  const parse = async () => {
    if (!file) return;
    setParsing(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/ml/bank-parse", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error) setError(data.offline
        ? "ML service offline. Run: python -m uvicorn advanced_ai:app --port 8002"
        : data.error);
      else {
        setResult(data);
        setSelected(new Set(data.transactions.map((_, i) => i)));
      }
    } catch { setError("Parse failed. Try again."); }
    finally { setParsing(false); }
  };

  const toggleAll = () => {
    if (selected.size === result.transactions.length) setSelected(new Set());
    else setSelected(new Set(result.transactions.map((_, i) => i)));
  };

  const importSelected = async () => {
    const toImport = result.transactions.filter((_, i) => selected.has(i));
    if (!toImport.length) return;
    setImporting(true);
    try {
      const res  = await fetch("/api/transactions/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ transactions: toImport }),
      });
      if (res.ok) { setImported(true); setTimeout(() => router.push("/dashboard"), 2000); }
      else setError("Import failed");
    } catch { setError("Import failed"); }
    finally { setImporting(false); }
  };

  const downloadCSV = () => {
    const rows = [["Date", "Description", "Amount", "Type", "Category"],
      ...result.transactions.map(t => [t.date, `"${t.description}"`, t.amount, t.type, t.category])];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "bank_transactions.csv";
    a.click();
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px" }}>
      <h1 className="text-5xl gradient-title">Bank Statement Parser</h1>
      <p style={{ color: "#64748b", fontSize: ".84rem", margin: "6px 0 28px" }}>
        Upload your bank statement PDF or photo → AI extracts all transactions automatically
      </p>

      {/* ── Upload zone ── */}
      {!result && (
        <div
          onDrop={onDrop} onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          style={{ padding: "48px 20px", borderRadius: 20, border: "2px dashed rgba(255,255,255,.12)",
            background: "rgba(255,255,255,.02)", textAlign: "center", cursor: "pointer",
            transition: "all .2s", marginBottom: 20 }}>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onDrop} style={{ display: "none" }}/>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(96,165,250,.12)",
            border: "1px solid rgba(96,165,250,.25)", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 16px" }}>
            <Upload size={24} style={{ color: "#60a5fa" }}/>
          </div>
          {file ? (
            <div>
              <p style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 4px" }}>{file.name}</p>
              <p style={{ color: "#64748b", fontSize: ".78rem", margin: 0 }}>
                {(file.size / 1024).toFixed(0)} KB · Click to change
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: "#f1f5f9", fontWeight: 700, margin: "0 0 6px" }}>Drop your bank statement here</p>
              <p style={{ color: "#64748b", fontSize: ".78rem", margin: "0 0 14px" }}>
                Supports PDF, JPG, PNG — HDFC, SBI, ICICI, Axis, Kotak, any bank
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {["HDFC", "SBI", "ICICI", "Axis", "Kotak", "Yes Bank"].map(b => (
                  <span key={b} style={{ padding: "3px 10px", borderRadius: 9999, fontSize: ".68rem",
                    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#64748b" }}>{b}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {file && !result && (
        <button onClick={parse} disabled={parsing}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#60a5fa,#3b82f6)", color: "#fff",
            fontWeight: 800, fontSize: ".9rem", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          {parsing ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }}/> : <FileText size={18}/>}
          {parsing ? "Parsing with OCR + NER…" : "Parse Statement"}
        </button>
      )}

      {error && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(248,113,113,.07)",
          border: "1px solid rgba(248,113,113,.2)", marginBottom: 16 }}>
          <p style={{ color: "#f87171", fontSize: ".8rem", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 18 }}>
            {[
              { l: "Transactions", v: result.count,                       c: "#60a5fa" },
              { l: "Total Debit",  v: fmt(result.total_debit),            c: "#f87171" },
              { l: "Total Credit", v: fmt(result.total_credit),           c: "#34d399" },
              { l: "Pages",        v: result.pages_parsed || "–",         c: "#94a3b8" },
            ].map(s => (
              <div key={s.l} style={{ padding: "14px", borderRadius: 14, background: "rgba(255,255,255,.025)",
                border: "1px solid rgba(255,255,255,.07)" }}>
                <p style={{ fontSize: ".62rem", color: "#475569", textTransform: "uppercase", margin: "0 0 5px" }}>{s.l}</p>
                <p style={{ fontSize: "1.1rem", fontWeight: 800, color: s.c, margin: 0 }}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button onClick={toggleAll}
              style={{ padding: "8px 16px", borderRadius: 9999, fontSize: ".78rem", fontWeight: 700,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                color: "#94a3b8", cursor: "pointer" }}>
              {selected.size === result.transactions.length ? "Deselect All" : "Select All"} ({selected.size})
            </button>
            <button onClick={downloadCSV}
              style={{ padding: "8px 16px", borderRadius: 9999, fontSize: ".78rem", fontWeight: 700,
                background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)",
                color: "#34d399", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Download size={12}/> Download CSV
            </button>
            <button onClick={importSelected} disabled={importing || selected.size === 0 || imported}
              style={{ padding: "8px 16px", borderRadius: 9999, fontSize: ".78rem", fontWeight: 700,
                background: imported ? "rgba(52,211,153,.15)" : "rgba(96,165,250,.12)",
                border: `1px solid ${imported ? "rgba(52,211,153,.35)" : "rgba(96,165,250,.3)"}`,
                color: imported ? "#34d399" : "#60a5fa", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6 }}>
              {importing ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }}/> :
               imported   ? <CheckCircle2 size={12}/> : <ArrowRight size={12}/>}
              {imported ? "Imported! Redirecting…" : `Import ${selected.size} to Welth`}
            </button>
            <button onClick={() => { setFile(null); setResult(null); }}
              style={{ padding: "8px 14px", borderRadius: 9999, fontSize: ".78rem",
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                color: "#64748b", cursor: "pointer" }}>
              <X size={12}/>
            </button>
          </div>

          {/* Transaction table */}
          <div style={{ borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.06)",
              display: "grid", gridTemplateColumns: "32px 80px 1fr 100px 80px 90px",
              gap: 10, fontSize: ".65rem", color: "#475569", fontWeight: 700, textTransform: "uppercase" }}>
              <span/>
              <span>Date</span><span>Description</span>
              <span style={{ textAlign: "right" }}>Amount</span>
              <span>Type</span><span>Category</span>
            </div>
            <div style={{ maxHeight: 480, overflowY: "auto" }}>
              {result.transactions.map((t, i) => (
                <div key={i} onClick={() => setSelected(p => { const s = new Set(p); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                  style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,.04)",
                    display: "grid", gridTemplateColumns: "32px 80px 1fr 100px 80px 90px",
                    gap: 10, alignItems: "center", cursor: "pointer",
                    background: selected.has(i) ? "rgba(96,165,250,.04)" : "transparent",
                    transition: "background .15s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4,
                    background: selected.has(i) ? "#60a5fa" : "rgba(255,255,255,.06)",
                    border: `1px solid ${selected.has(i) ? "#60a5fa" : "rgba(255,255,255,.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selected.has(i) && <span style={{ color: "#fff", fontSize: ".55rem", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: ".7rem", color: "#64748b" }}>{t.date}</span>
                  <span style={{ fontSize: ".73rem", color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.description}
                  </span>
                  <span style={{ fontSize: ".78rem", fontWeight: 700, textAlign: "right",
                    color: t.type === "EXPENSE" ? "#f87171" : "#34d399" }}>
                    {t.type === "EXPENSE" ? "−" : "+"}{fmt(t.amount)}
                  </span>
                  <span style={{ fontSize: ".65rem", padding: "2px 7px", borderRadius: 9999, textAlign: "center",
                    background: t.type === "EXPENSE" ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.1)",
                    color: t.type === "EXPENSE" ? "#f87171" : "#34d399" }}>
                    {t.type === "EXPENSE" ? "Debit" : "Credit"}
                  </span>
                  <span style={{ fontSize: ".65rem", padding: "2px 7px", borderRadius: 9999,
                    background: `${CAT_COLORS[t.category] || "#475569"}18`,
                    color: CAT_COLORS[t.category] || "#64748b", fontWeight: 600 }}>
                    {t.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}