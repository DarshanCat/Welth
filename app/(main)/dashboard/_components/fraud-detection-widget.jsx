"use client";
import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export default function FraudDetectionWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/ml/fraud");
      const json = await res.json();
      if (json.error) setError(json.offline ? "ML service offline" : json.error);
      else setData(json);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const hasFraud = data?.flagged_count > 0;

  return (
    <div style={{ background: hasFraud ? "rgba(248,113,113,.04)" : "rgba(52,211,153,.04)",
      border: `1px solid ${hasFraud ? "rgba(248,113,113,.2)" : "rgba(52,211,153,.2)"}`,
      borderRadius: 20, overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10,
            background: hasFraud ? "rgba(248,113,113,.12)" : "rgba(52,211,153,.12)",
            border: `1px solid ${hasFraud ? "rgba(248,113,113,.25)" : "rgba(52,211,153,.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            {hasFraud
              ? <ShieldAlert size={16} style={{ color: "#f87171" }}/>
              : <ShieldCheck  size={16} style={{ color: "#34d399" }}/>}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: ".82rem", margin: 0 }}>Fraud Detection</p>
            <p style={{ fontSize: ".62rem", color: "#64748b", margin: 0 }}>
              Autoencoder + IsolationForest
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading}
            style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)", color: "#64748b", cursor: "pointer" }}>
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/>
          </button>
          {hasFraud && (
            <button onClick={() => setExpanded(v => !v)}
              style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
                justifyContent: "center", background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)", color: "#64748b", cursor: "pointer" }}>
              {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 18px 14px" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0" }}>
            <Loader2 size={14} style={{ color: "#a78bfa", animation: "spin 1s linear infinite" }}/>
            <span style={{ fontSize: ".75rem", color: "#64748b" }}>Scanning transactions with AI…</span>
          </div>
        )}

        {!loading && error && (
          <p style={{ fontSize: ".75rem", color: "#f87171", margin: 0 }}>
            {error === "ML service offline" ? "⚙️ Start the advanced AI service on port 8002" : error}
          </p>
        )}

        {!loading && data?.insufficient && (
          <p style={{ fontSize: ".75rem", color: "#64748b", margin: 0 }}>Add more transactions to enable fraud detection</p>
        )}

        {!loading && data && !data.insufficient && (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              {[
                { l: "Scanned",  v: data.total_checked, c: "#94a3b8" },
                { l: "Flagged",  v: data.flagged_count, c: hasFraud ? "#f87171" : "#34d399" },
                { l: "Safe",     v: data.safe_count,    c: "#34d399" },
              ].map(s => (
                <div key={s.l} style={{ padding: "8px 10px", borderRadius: 10,
                  background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                  <p style={{ fontSize: ".6rem", color: "#475569", margin: "0 0 3px", textTransform: "uppercase" }}>{s.l}</p>
                  <p style={{ fontSize: "1rem", fontWeight: 800, color: s.c, margin: 0 }}>{s.v}</p>
                </div>
              ))}
            </div>

            {!hasFraud && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <ShieldCheck size={14} style={{ color: "#34d399" }}/>
                <p style={{ fontSize: ".75rem", color: "#34d399", margin: 0, fontWeight: 600 }}>
                  No suspicious transactions detected
                </p>
              </div>
            )}

            {/* Flagged transactions */}
            {hasFraud && expanded && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {data.flagged.slice(0, 5).map((f, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 12,
                    background: f.confidence === "high" ? "rgba(248,113,113,.07)" : "rgba(251,191,36,.06)",
                    border: `1px solid ${f.confidence === "high" ? "rgba(248,113,113,.2)" : "rgba(251,191,36,.2)"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: ".75rem", fontWeight: 700, color: "#f1f5f9",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                        {f.description || f.category}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: ".7rem", fontWeight: 800,
                          color: f.confidence === "high" ? "#f87171" : "#fbbf24" }}>
                          {fmt(f.amount)}
                        </span>
                        <span style={{ padding: "1px 6px", borderRadius: 9999, fontSize: ".58rem", fontWeight: 700,
                          background: f.confidence === "high" ? "rgba(248,113,113,.15)" : "rgba(251,191,36,.15)",
                          color: f.confidence === "high" ? "#f87171" : "#fbbf24" }}>
                          {f.confidence === "high" ? "⚠ HIGH" : "~ MED"}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: ".68rem", color: "#64748b", margin: 0 }}>
                      {f.reasons[0]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {hasFraud && !expanded && (
              <button onClick={() => setExpanded(true)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  borderRadius: 8, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
                  color: "#f87171", fontSize: ".72rem", fontWeight: 700, cursor: "pointer" }}>
                <AlertTriangle size={12}/>
                View {data.flagged_count} flagged transaction{data.flagged_count > 1 ? "s" : ""}
              </button>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}