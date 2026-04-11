"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, X, CheckCircle2, Loader2, AlertTriangle, ArrowRight,
  FileSpreadsheet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BankStatementScanner() {
  const [stage,      setStage]      = useState("idle"); // idle | scanning | review | importing | done | error
  const [dragOver,   setDragOver]   = useState(false);
  const [file,       setFile]       = useState(null);
  const [result,     setResult]     = useState(null);
  const [errMsg,     setErrMsg]     = useState("");
  const fileRef = useRef(null);
  const router = useRouter();

  const processFile = useCallback(async (f) => {
    if (!f) return;
    setFile(f);
    setStage("scanning");
    
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res  = await fetch("/api/ml/bank-parse", { method: "POST", body: fd });
      const data = await res.json();
      
      if (data.error) {
        setErrMsg(data.offline ? "Python AI service is offline. Please run the backend." : data.error);
        setStage("error");
        return;
      }
      
      if (!data.transactions || data.transactions.length === 0) {
        setErrMsg("No transactions found in this statement.");
        setStage("error");
        return;
      }

      setResult(data);
      setStage("review");
    } catch (err) {
      setErrMsg("Parsing failed. Is the Python service running?");
      setStage("error");
    }
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFile = useCallback(e => {
    const f = e.target.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleImport = async () => {
    setStage("importing");
    if (!result || !result.transactions.length) return;
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: result.transactions }),
      });
      if (res.ok) {
        setStage("done");
        toast.success(`Imported ${result.transactions.length} transactions!`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setErrMsg("Import to database failed.");
        setStage("error");
      }
    } catch {
      setErrMsg("Network error during import.");
      setStage("error");
    }
  };

  const reset = () => {
    setStage("idle"); setFile(null); setResult(null); setErrMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: ".85rem 1.1rem", background: "linear-gradient(135deg,rgba(96,165,250,.1),rgba(59,130,246,.05))", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(96,165,250,.15)", border: "1px solid rgba(96,165,250,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FileText size={16} style={{ color: "#60a5fa" }} />
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#f1f5f9", fontSize: ".88rem", margin: 0 }}>Statement Importer</p>
          <p style={{ color: "#64748b", fontSize: ".7rem", margin: 0 }}>Upload CSV, XML, XL, PDF → auto-import</p>
        </div>
        {stage !== "idle" && (
          <button onClick={reset} style={{ marginLeft: "auto", background: "rgba(255,255,255,.07)", border: "none", borderRadius: 9999, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} style={{ color: "#94a3b8" }} />
          </button>
        )}
      </div>

      <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>

        {/* ── IDLE: Drop zone ── */}
        {stage === "idle" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "rgba(96,165,250,.6)" : "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(96,165,250,.04)" : "rgba(255,255,255,.02)", transition: "all .2s" }}>
            <div style={{ width: 52, height: 52, borderRadius: 9999, background: "rgba(96,165,250,.1)", border: "1px solid rgba(96,165,250,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Upload size={22} style={{ color: "#60a5fa" }} />
            </div>
            <p style={{ fontWeight: 700, color: "#e2e8f0", fontSize: ".9rem", margin: 0 }}>Drop bank statement</p>
            <p style={{ color: "#64748b", fontSize: ".75rem", margin: "5px 0 12px" }}>or click to browse</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: ".72rem", color: "#475569" }}>
              <FileSpreadsheet size={12} />
              CSV, Excel, XML, PDF, JPG
            </div>
            <input ref={fileRef} type="file" accept=".csv,.xml,.xls,.xlsx,.pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display: "none" }} />
          </div>
        )}

        {/* ── SCANNING ── */}
        {stage === "scanning" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "1.5rem 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={24} style={{ color: "#64748b" }}/>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2 size={18} style={{ color: "#60a5fa", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#94a3b8", fontSize: ".85rem", margin: 0 }}>Parsing statement data…</p>
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {stage === "review" && result && (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div style={{ background: "rgba(16,185,129,.05)", border: "1px solid rgba(16,185,129,.2)", padding: "12px", borderRadius: 12 }}>
                <p style={{ fontSize: ".65rem", color: "#64748b", textTransform: "uppercase", margin: "0 0 4px", fontWeight: 700 }}>Total Income</p>
                <p style={{ fontSize: "1.1rem", color: "#34d399", fontWeight: 800, margin: 0 }}>₹{result.total_credit}</p>
              </div>
              <div style={{ background: "rgba(248,113,113,.05)", border: "1px solid rgba(248,113,113,.2)", padding: "12px", borderRadius: 12 }}>
                <p style={{ fontSize: ".65rem", color: "#64748b", textTransform: "uppercase", margin: "0 0 4px", fontWeight: 700 }}>Total Expense</p>
                <p style={{ fontSize: "1.1rem", color: "#f87171", fontWeight: 800, margin: 0 }}>₹{result.total_debit}</p>
              </div>
            </div>

            <div style={{ padding: "10px", background: "rgba(96,165,250,.08)", border: "1px solid rgba(96,165,250,.2)", borderRadius: 10, fontSize: ".8rem", color: "#60a5fa", marginBottom: 16 }}>
              Found <strong>{result.count}</strong> transactions across {result.categories.length} categories.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button 
                onClick={() => router.push("/bank-parser")}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
                Manual Review
              </button>
              <button onClick={handleImport}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", color: "#fff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <ArrowRight size={13} /> Import All
              </button>
            </div>
          </div>
        )}

        {/* ── IMPORTING ── */}
        {stage === "importing" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1.5rem 0" }}>
            <Loader2 size={24} style={{ color: "#60a5fa", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#94a3b8", margin: 0, fontSize: ".85rem" }}>Saving to database…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {stage === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1.5rem 0", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 9999, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={24} style={{ color: "#34d399" }} />
            </div>
            <p style={{ fontWeight: 700, color: "#34d399", margin: 0 }}>Import Complete!</p>
            <p style={{ color: "#64748b", fontSize: ".78rem", margin: "0 0 10px" }}>Refreshing dashboard...</p>
          </div>
        )}

        {/* ── ERROR ── */}
        {stage === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1.5rem 0", textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 9999, background: "rgba(248,113,113,.12)", border: "1px solid rgba(248,113,113,.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={22} style={{ color: "#f87171" }} />
            </div>
            <p style={{ color: "#f87171", fontWeight: 600, margin: 0, fontSize: ".88rem" }}>{errMsg}</p>
            <button onClick={reset}
              style={{ padding: "8px 20px", borderRadius: 9999, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", fontWeight: 700, fontSize: ".8rem", cursor: "pointer", marginTop: 8 }}>
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
