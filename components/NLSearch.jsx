"use client";
import { useState, useRef } from "react";
import { Search, Loader2, X, Sparkles, TrendingUp, TrendingDown } from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);

const EXAMPLES = [
  "Show me all Swiggy orders above ₹500",
  "Food expenses last month",
  "All subscriptions this year",
  "Shopping above ₹2000",
  "Salary credits",
  "Recurring payments",
];

export default function NLSearch({ onResults }) {
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [open,    setOpen]    = useState(false);
  const inputRef = useRef(null);

  const search = async (q) => {
    const qr = q || query;
    if (!qr.trim()) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/ai/search", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ query: qr }),
      });
      const data = await res.json();
      setResult(data);
      if (onResults) onResults(data.transactions || []);
    } catch { alert("Search failed"); }
    finally { setLoading(false); }
  };

  const clear = () => { setQuery(""); setResult(null); if (onResults) onResults(null); };

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Search bar */}
      <div style={{ position:"relative" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10,
          background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
          borderRadius:14, padding:"10px 14px",
          transition:"border-color .2s",
        }}
        onFocus={() => setOpen(true)}>
          {loading
            ? <Loader2 size={16} style={{ color:"#a78bfa", animation:"spin 1s linear infinite", flexShrink:0 }}/>
            : <Sparkles size={16} style={{ color:"#a78bfa", flexShrink:0 }}/>
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            onFocus={() => setOpen(true)}
            placeholder='Ask in plain English: "Swiggy orders above ₹500 last month"'
            style={{ flex:1, background:"transparent", border:"none", outline:"none",
              color:"#f1f5f9", fontSize:".82rem" }}
          />
          {query && (
            <button onClick={clear} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", flexShrink:0 }}>
              <X size={14}/>
            </button>
          )}
          <button onClick={() => search()} disabled={loading || !query.trim()} style={{
            padding:"5px 14px", borderRadius:9999, fontSize:".76rem", fontWeight:700, flexShrink:0,
            background: query.trim() ? "linear-gradient(135deg,#a78bfa,#7c3aed)" : "rgba(255,255,255,.06)",
            border:"none", color: query.trim() ? "#fff" : "#475569", cursor:"pointer",
          }}>Search</button>
        </div>

        {/* Example queries */}
        {open && !result && (
          <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:50,
            background:"rgba(5,13,27,.97)", border:"1px solid rgba(167,139,250,.2)",
            borderRadius:14, padding:"12px", boxShadow:"0 10px 40px rgba(0,0,0,.5)" }}>
            <p style={{ fontSize:".65rem", color:"#64748b", fontWeight:700, textTransform:"uppercase",
              letterSpacing:".05em", margin:"0 0 8px" }}>Try asking…</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => { setQuery(ex); setOpen(false); search(ex); }}
                  style={{ padding:"5px 12px", borderRadius:9999, fontSize:".72rem",
                    background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.2)",
                    color:"#a78bfa", cursor:"pointer" }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      {result && (
        <div style={{ marginTop:12, padding:"14px 16px", borderRadius:14,
          background:"rgba(167,139,250,.05)", border:"1px solid rgba(167,139,250,.15)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div>
              <p style={{ fontWeight:700, color:"#a78bfa", margin:"0 0 2px", fontSize:".82rem" }}>
                {result.filters?.summary || `Results for: "${result.query}"`}
              </p>
              <p style={{ fontSize:".68rem", color:"#64748b", margin:0 }}>
                {result.stats?.count} transactions found
              </p>
            </div>
            <button onClick={clear} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
              borderRadius:"50%", width:28, height:28, display:"flex", alignItems:"center",
              justifyContent:"center", color:"#64748b", cursor:"pointer" }}>
              <X size={13}/>
            </button>
          </div>

          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:result.stats?.catBreakdown?.length ? 10 : 0 }}>
            {[
              { label:"Total",   value: fmt(result.stats?.total),   color:"#f1f5f9" },
              { label:"Income",  value: fmt(result.stats?.income),  color:"#34d399", icon: TrendingUp  },
              { label:"Expense", value: fmt(result.stats?.expense), color:"#f87171", icon: TrendingDown },
            ].map(s => (
              <div key={s.label} style={{ padding:"8px 10px", borderRadius:9, background:"rgba(255,255,255,.03)" }}>
                <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 2px" }}>{s.label}</p>
                <p style={{ fontWeight:800, color:s.color, margin:0, fontSize:".82rem" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {result.stats?.catBreakdown?.length > 0 && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {result.stats.catBreakdown.map((c, i) => (
                <span key={i} style={{ padding:"3px 9px", borderRadius:9999, fontSize:".65rem",
                  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", color:"#94a3b8" }}>
                  {c.category}: {fmt(c.amount)}
                </span>
              ))}
            </div>
          )}

          {/* Mini transaction list */}
          {result.transactions?.length > 0 && (
            <div style={{ maxHeight:280, overflowY:"auto", marginTop:10,
              borderRadius:10, border:"1px solid rgba(255,255,255,.06)", overflow:"hidden" }}>
              {result.transactions.slice(0,15).map((t, i) => (
                <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"8px 12px", borderBottom:"1px solid rgba(255,255,255,.04)",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.015)" }}>
                  <div>
                    <p style={{ fontSize:".74rem", fontWeight:600, color:"#f1f5f9", margin:"0 0 1px" }}>
                      {t.description || t.category}
                    </p>
                    <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>
                      {t.category} · {new Date(t.date).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span style={{ fontWeight:700, fontSize:".78rem",
                    color: t.type === "INCOME" ? "#34d399" : "#f87171" }}>
                    {t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}
                  </span>
                </div>
              ))}
              {result.transactions.length > 15 && (
                <p style={{ padding:"8px 12px", fontSize:".7rem", color:"#64748b", textAlign:"center", margin:0 }}>
                  +{result.transactions.length - 15} more results
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}