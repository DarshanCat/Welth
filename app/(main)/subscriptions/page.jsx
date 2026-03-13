"use client";

import { useState, useEffect } from "react";
import {
  Zap, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, Calendar, IndianRupee,
  Sparkles, CreditCard, BarChart2, X,
} from "lucide-react";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtNum = (n) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n ?? 0);

const CAT_COLORS = {
  Streaming:    "#e50914", Music:       "#1db954", Food:        "#fc8019",
  Cloud:        "#4285f4", Productivity:"#d83b01", AI:          "#10a37f",
  Design:       "#7d2ae8", Learning:    "#0056d2", Gaming:      "#107c10",
  Fitness:      "#f59e0b", Telecom:     "#0066cc", News:        "#cc0000",
  Other:        "#64748b",
};

export default function SubscriptionsPage() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState("all"); // all | unused | known
  const [dismissed,  setDismissed]  = useState(new Set());

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/subscriptions");
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const subs = (data?.subscriptions || []).filter(s => !dismissed.has(s.id));
  const filtered = subs.filter(s => {
    if (filter === "unused") return s.potentiallyUnused;
    if (filter === "known")  return s.isKnown;
    return true;
  });

  const summary = data?.summary;

  return (
    <div className="max-w-5xl mx-auto px-5 py-8">

      {/* ── Page header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <h1 className="text-5xl gradient-title">Subscriptions</h1>
          <p style={{ color:"#64748b", fontSize:".85rem", marginTop:6 }}>
            AI-detected recurring charges from your transaction history
          </p>
        </div>
        <button onClick={load} disabled={loading}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:9999,
            background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
            color:"#64748b", fontSize:".78rem", fontWeight:600, cursor:"pointer" }}>
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/>
          Refresh
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          padding:"60px 0", gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"rgba(52,211,153,.1)",
            border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Zap size={22} style={{ color:"#34d399" }}/>
          </div>
          <div style={{ textAlign:"center" }}>
            <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 4px" }}>Scanning your transactions…</p>
            <p style={{ color:"#64748b", fontSize:".78rem", margin:0 }}>Detecting recurring charges & subscriptions</p>
          </div>
          <Loader2 size={18} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div style={{ padding:"20px", borderRadius:14, background:"rgba(248,113,113,.06)",
          border:"1px solid rgba(248,113,113,.2)", textAlign:"center" }}>
          <p style={{ color:"#f87171", fontWeight:600, margin:"0 0 8px" }}>Detection failed</p>
          <button onClick={load} style={{ color:"#64748b", fontSize:".78rem", cursor:"pointer", background:"none", border:"none" }}>Try again</button>
        </div>
      )}

      {/* ── Insufficient data ── */}
      {!loading && data?.insufficient && (
        <div style={{ padding:"32px", borderRadius:20, background:"rgba(255,255,255,.02)",
          border:"1px solid rgba(255,255,255,.07)", textAlign:"center" }}>
          <p style={{ fontSize:"2rem", margin:"0 0 10px" }}>📊</p>
          <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>Not enough data yet</p>
          <p style={{ color:"#64748b", fontSize:".82rem", margin:0 }}>
            Add at least 5 transactions and come back in a month — we'll detect your subscriptions automatically.
          </p>
        </div>
      )}

      {/* ── Main content ── */}
      {!loading && !error && data && !data.insufficient && (
        <>
          {/* ── KPI row ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Monthly Burn",  val: fmt(summary?.monthlyBurn),    color:"#f87171", icon:IndianRupee  },
              { label:"Yearly Burn",   val: fmt(summary?.yearlyBurn),     color:"#f59e0b", icon:Calendar     },
              { label:"Subscriptions", val: summary?.totalCount,          color:"#60a5fa", icon:CreditCard   },
              { label:"Could Save",    val: fmt(summary?.unusedSavings),  color:"#34d399", icon:TrendingDown },
            ].map(k => {
              const Icon = k.icon;
              return (
                <div key={k.label} style={{ padding:"16px", borderRadius:16,
                  background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                    <Icon size={13} style={{ color:k.color }}/>
                    <span style={{ fontSize:".68rem", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:".05em" }}>{k.label}</span>
                  </div>
                  <p style={{ fontWeight:800, fontSize:"1.15rem", color:k.color, margin:0 }}>{k.val}</p>
                </div>
              );
            })}
          </div>

          {/* ── AI Insight ── */}
          {data.aiInsight && (
            <div style={{ padding:"16px 18px", borderRadius:14, background:"rgba(167,139,250,.06)",
              border:"1px solid rgba(167,139,250,.2)", marginBottom:20,
              display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"rgba(167,139,250,.12)",
                border:"1px solid rgba(167,139,250,.25)", display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0 }}>
                <Sparkles size={15} style={{ color:"#a78bfa" }}/>
              </div>
              <div>
                <p style={{ fontSize:".72rem", fontWeight:700, color:"#a78bfa", margin:"0 0 5px",
                  textTransform:"uppercase", letterSpacing:".05em" }}>AI Analysis</p>
                <p style={{ fontSize:".8rem", color:"#94a3b8", margin:0, lineHeight:1.6 }}>{data.aiInsight}</p>
              </div>
            </div>
          )}

          {/* ── Category breakdown ── */}
          {summary?.byCategory && Object.keys(summary.byCategory).length > 1 && (
            <div style={{ padding:"16px 18px", borderRadius:16, background:"rgba(255,255,255,.02)",
              border:"1px solid rgba(255,255,255,.06)", marginBottom:20 }}>
              <p style={{ fontSize:".72rem", fontWeight:700, color:"#64748b", textTransform:"uppercase",
                letterSpacing:".06em", margin:"0 0 12px" }}>By Category</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {Object.entries(summary.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, amt]) => (
                    <div key={cat} style={{ padding:"6px 12px", borderRadius:9999,
                      background:`${CAT_COLORS[cat] || "#64748b"}15`,
                      border:`1px solid ${CAT_COLORS[cat] || "#64748b"}30`,
                      display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:".72rem", fontWeight:700, color: CAT_COLORS[cat] || "#64748b" }}>{cat}</span>
                      <span style={{ fontSize:".7rem", color:"#64748b" }}>{fmt(amt)}/mo</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Filter tabs ── */}
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {[
              { id:"all",    label:`All (${subs.length})` },
              { id:"unused", label:`⚠ Unused (${subs.filter(s=>s.potentiallyUnused).length})` },
              { id:"known",  label:`✓ Known Services (${subs.filter(s=>s.isKnown).length})` },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{ padding:"7px 16px", borderRadius:9999, fontSize:".78rem", fontWeight:700,
                  cursor:"pointer", transition:"all .15s",
                  background: filter===f.id ? "rgba(52,211,153,.12)" : "rgba(255,255,255,.04)",
                  border:     filter===f.id ? "1px solid rgba(52,211,153,.35)" : "1px solid rgba(255,255,255,.08)",
                  color:      filter===f.id ? "#34d399" : "#64748b" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Subscription cards ── */}
          {filtered.length === 0 ? (
            <div style={{ padding:"32px", textAlign:"center", borderRadius:16,
              background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ color:"#64748b", fontSize:".85rem" }}>No subscriptions in this filter</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {filtered.map(sub => (
                <SubCard key={sub.id} sub={sub} onDismiss={() => setDismissed(p => new Set([...p, sub.id]))}/>
              ))}
            </div>
          )}

          {/* ── Empty state ── */}
          {subs.length === 0 && (
            <div style={{ padding:"40px", textAlign:"center", borderRadius:20,
              background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize:"2.5rem", margin:"0 0 12px" }}>🎉</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, fontSize:"1rem", margin:"0 0 6px" }}>No recurring charges detected</p>
              <p style={{ color:"#64748b", fontSize:".82rem", margin:0 }}>
                Your transactions don't show any recurring patterns yet. Add more transactions and check back.
              </p>
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Subscription Card ─────────────────────────────────────────────────────────
function SubCard({ sub, onDismiss }) {
  const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);
  const isUnused  = sub.potentiallyUnused;
  const nextDate  = sub.nextExpected ? new Date(sub.nextExpected).toLocaleDateString("en-IN", { day:"2-digit", month:"short" }) : null;
  const lastDate  = new Date(sub.lastCharged).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });

  return (
    <div style={{ padding:"16px 18px", borderRadius:16,
      background: isUnused ? "rgba(248,113,113,.04)" : "rgba(255,255,255,.025)",
      border: isUnused ? "1px solid rgba(248,113,113,.2)" : "1px solid rgba(255,255,255,.07)",
      display:"flex", alignItems:"center", gap:14, transition:"all .2s" }}>

      {/* Emoji / logo */}
      <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
        background:`${sub.color}15`, border:`1px solid ${sub.color}30`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>
        {sub.emoji}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
          <p style={{ fontWeight:700, fontSize:".9rem", color:"#f1f5f9", margin:0,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {sub.knownService?.name || sub.description}
          </p>
          {sub.isKnown && (
            <span style={{ padding:"1px 7px", borderRadius:9999, background:`${sub.color}15`,
              border:`1px solid ${sub.color}30`, color:sub.color, fontSize:".6rem", fontWeight:700,
              flexShrink:0 }}>{sub.category}</span>
          )}
          {isUnused && (
            <span style={{ padding:"1px 7px", borderRadius:9999, background:"rgba(248,113,113,.12)",
              border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:".6rem", fontWeight:700,
              display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
              <AlertTriangle size={9}/> Possibly unused
            </span>
          )}
          {sub.markedByUser && (
            <span style={{ padding:"1px 7px", borderRadius:9999, background:"rgba(52,211,153,.1)",
              border:"1px solid rgba(52,211,153,.25)", color:"#34d399", fontSize:".6rem", fontWeight:700,
              display:"flex", alignItems:"center", gap:3, flexShrink:0 }}>
              <CheckCircle2 size={9}/> Marked recurring
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
          <span style={{ fontSize:".7rem", color:"#64748b" }}>
            Last charged: {lastDate} ({sub.daysSinceLast}d ago)
          </span>
          {nextDate && (
            <span style={{ fontSize:".7rem", color:"#60a5fa" }}>
              Next: ~{nextDate}
            </span>
          )}
          <span style={{ fontSize:".7rem", color:"#64748b" }}>
            {sub.occurrences} charges detected
          </span>
          <span style={{ fontSize:".7rem", color:"#64748b", textTransform:"capitalize" }}>
            {sub.frequency}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign:"right", flexShrink:0 }}>
        <p style={{ fontWeight:800, fontSize:"1rem", color: isUnused ? "#f87171" : "#f1f5f9", margin:"0 0 2px" }}>
          {fmt(sub.amount)}
        </p>
        <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>
          {fmt(sub.monthlyAmount)}/mo
        </p>
      </div>

      {/* Dismiss */}
      <button onClick={onDismiss}
        style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center",
          justifyContent:"center", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)",
          color:"#475569", cursor:"pointer", flexShrink:0 }}>
        <X size={12}/>
      </button>
    </div>
  );
}