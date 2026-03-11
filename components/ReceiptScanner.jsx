"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, Camera, X, CheckCircle2, Loader2, AlertTriangle,
  Receipt, IndianRupee, Calendar, Tag, Store, Send,
} from "lucide-react";

const CATEGORIES = [
  "Housing","Transportation","Groceries","Utilities","Entertainment",
  "Food","Shopping","Healthcare","Education","Personal Care",
  "Travel","Insurance","Gifts & Donations","Bills & Fees","Other Expenses",
];

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n ?? 0);

export default function ReceiptScanner({ onTransactionAdded }) {
  const [stage,      setStage]      = useState("idle"); // idle | scanning | review | saving | done | error
  const [dragOver,   setDragOver]   = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [scanned,    setScanned]    = useState(null);
  const [form,       setForm]       = useState({});
  const [errMsg,     setErrMsg]     = useState("");
  const fileRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setErrMsg("Please upload an image file (JPG, PNG, WEBP).");
      setStage("error");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setStage("scanning");

    try {
      // Call server action via API
      const formData = new FormData();
      formData.append("receipt", file);
      const res  = await fetch("/api/scan-receipt", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error || !data.amount) {
        setErrMsg(data.error || "Could not read receipt. Try a clearer photo.");
        setStage("error");
        return;
      }

      const extracted = {
        amount:      data.amount,
        date:        data.date ? new Date(data.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        description: data.description || data.merchantName || "Receipt",
        category:    capitalizeFirst(data.category) || "Shopping",
        merchant:    data.merchantName || "",
      };

      setScanned(data);
      setForm(extracted);
      setStage("review");
    } catch (err) {
      setErrMsg("Scan failed. Please try again.");
      setStage("error");
    }
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFile = useCallback(e => {
    const file = e.target.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSave = async () => {
    setStage("saving");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `add expense ${form.amount} category ${form.category} description ${form.description} date ${form.date}`,
        }),
      });
      const data = await res.json();
      if (data.action === "transaction_added") {
        setStage("done");
        onTransactionAdded?.();
      } else {
        setErrMsg("Transaction saved but couldn't confirm. Check dashboard.");
        setStage("done");
      }
    } catch {
      setErrMsg("Save failed. Try again.");
      setStage("error");
    }
  };

  const reset = () => {
    setStage("idle"); setPreview(null); setScanned(null);
    setForm({}); setErrMsg("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: ".85rem 1.1rem", background: "linear-gradient(135deg,rgba(251,191,36,.1),rgba(245,158,11,.05))", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Receipt size={16} style={{ color: "#fbbf24" }} />
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#f1f5f9", fontSize: ".88rem", margin: 0 }}>Receipt Scanner</p>
          <p style={{ color: "#64748b", fontSize: ".7rem", margin: 0 }}>Upload a bill photo → auto-fill transaction</p>
        </div>
        {stage !== "idle" && (
          <button onClick={reset} style={{ marginLeft: "auto", background: "rgba(255,255,255,.07)", border: "none", borderRadius: 9999, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} style={{ color: "#94a3b8" }} />
          </button>
        )}
      </div>

      <div style={{ padding: "1rem 1.1rem" }}>

        {/* ── IDLE: Drop zone ── */}
        {stage === "idle" && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${dragOver ? "rgba(251,191,36,.6)" : "rgba(255,255,255,.12)"}`, borderRadius: 14, padding: "2rem 1rem", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(251,191,36,.04)" : "rgba(255,255,255,.02)", transition: "all .2s" }}>
            <div style={{ width: 52, height: 52, borderRadius: 9999, background: "rgba(251,191,36,.1)", border: "1px solid rgba(251,191,36,.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Upload size={22} style={{ color: "#fbbf24" }} />
            </div>
            <p style={{ fontWeight: 700, color: "#e2e8f0", fontSize: ".9rem", margin: 0 }}>Drop receipt here</p>
            <p style={{ color: "#64748b", fontSize: ".75rem", margin: "5px 0 12px" }}>or click to browse · JPG, PNG, WEBP</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: ".72rem", color: "#475569" }}>
              <Camera size={12} />
              Works best with clear, well-lit photos
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
          </div>
        )}

        {/* ── SCANNING ── */}
        {stage === "scanning" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "1.5rem 0" }}>
            {preview && (
              <img src={preview} alt="Receipt" style={{ maxHeight: 180, borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", objectFit: "contain" }} />
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2 size={18} style={{ color: "#fbbf24", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "#94a3b8", fontSize: ".85rem", margin: 0 }}>Scanning with AI…</p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {["Reading amount","Detecting merchant","Extracting date","Categorising"].map((s, i) => (
                <span key={i} style={{ fontSize: ".65rem", padding: "2px 8px", borderRadius: 9999, background: "rgba(251,191,36,.08)", color: "#fbbf24", animation: `fadeIn .4s ${i*.15}s both` }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── REVIEW ── */}
        {stage === "review" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 14 }}>
              {preview && (
                <img src={preview} alt="Receipt" style={{ width: 90, height: 110, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,.1)" }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Amount */}
                <div>
                  <label style={{ fontSize: ".68rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <IndianRupee size={10} /> Amount (₹)
                  </label>
                  <input type="number" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#34d399", fontWeight: 800, fontSize: ".9rem", outline: "none", boxSizing: "border-box" }} />
                </div>
                {/* Merchant */}
                <div>
                  <label style={{ fontSize: ".68rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                    <Store size={10} /> Merchant
                  </label>
                  <input value={form.merchant || ""} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".8rem", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {/* Date */}
              <div>
                <label style={{ fontSize: ".68rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Calendar size={10} /> Date
                </label>
                <input type="date" value={form.date || ""} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".8rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              {/* Category */}
              <div>
                <label style={{ fontSize: ".68rem", color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                  <Tag size={10} /> Category
                </label>
                <select value={form.category || ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "#1e293b", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".8rem", outline: "none", boxSizing: "border-box" }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: ".68rem", color: "#64748b", marginBottom: 3, display: "block" }}>Description</label>
              <input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".8rem", outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Preview pill */}
            <div style={{ padding: "8px 12px", background: "rgba(52,211,153,.07)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 9, fontSize: ".78rem", color: "#34d399", marginBottom: 12 }}>
              Will add: <strong>Expense {fmt(form.amount)}</strong> · {form.category} · {form.date}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={reset}
                style={{ flex: 1, padding: "10px", borderRadius: 10, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", color: "#94a3b8", fontWeight: 600, fontSize: ".82rem", cursor: "pointer" }}>
                Retake
              </button>
              <button onClick={handleSave}
                style={{ flex: 2, padding: "10px", borderRadius: 10, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <Send size={13} /> Save Transaction
              </button>
            </div>
          </div>
        )}

        {/* ── SAVING ── */}
        {stage === "saving" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1.5rem 0" }}>
            <Loader2 size={24} style={{ color: "#34d399", animation: "spin 1s linear infinite" }} />
            <p style={{ color: "#94a3b8", margin: 0, fontSize: ".85rem" }}>Saving transaction…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {stage === "done" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "1.5rem 0", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 9999, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={24} style={{ color: "#34d399" }} />
            </div>
            <p style={{ fontWeight: 700, color: "#34d399", margin: 0 }}>Transaction Saved!</p>
            <p style={{ color: "#64748b", fontSize: ".78rem", margin: 0 }}>{errMsg || "Check your dashboard for the update."}</p>
            <button onClick={reset}
              style={{ padding: "8px 20px", borderRadius: 9999, background: "rgba(52,211,153,.12)", border: "1px solid rgba(52,211,153,.3)", color: "#34d399", fontWeight: 700, fontSize: ".8rem", cursor: "pointer" }}>
              Scan Another
            </button>
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
              style={{ padding: "8px 20px", borderRadius: 9999, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", fontWeight: 700, fontSize: ".8rem", cursor: "pointer" }}>
              Try Again
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
      `}</style>
    </div>
  );
}

function capitalizeFirst(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}