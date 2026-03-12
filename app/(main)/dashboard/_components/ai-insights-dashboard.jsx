"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain, AlertTriangle, Sparkles, TrendingUp,
  RefreshCw, Loader2, ChevronRight, ShieldAlert,
  Copy, Zap, User, ArrowRight,
} from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);

const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

export default function AiInsightsDashboard() {
  const [anomaly,     setAnomaly]     = useState(null);
  const [personality, setPersonality] = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/anomaly").then(r => r.json()).catch(() => null),
      fetch("/api/ai/personality").then(r => r.json()).catch(() => null),
    ]).then(([a, p]) => {
      setAnomaly(a);
      setPersonality(p);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem", gap:10, borderRadius:20, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
      <Loader2 size={16} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
      <span style={{ color:"#64748b", fontSize:".82rem" }}>Running AI analysis…</span>
    </div>
  );

  const hasAnomalies = anomaly?.totalFlags > 0;
  const arch = personality?.archetype;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

      {/* ── Anomaly Detection Panel ── */}
      <div style={{ borderRadius:18, background:"rgba(255,255,255,.025)", border:`1px solid ${hasAnomalies?"rgba(248,113,113,.25)":"rgba(255,255,255,.07)"}`, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:30, height:30, borderRadius:9, background:hasAnomalies?"rgba(248,113,113,.12)":"rgba(52,211,153,.1)", border:`1px solid ${hasAnomalies?"rgba(248,113,113,.3)":"rgba(52,211,153,.25)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <ShieldAlert size={14} style={{ color:hasAnomalies?"#f87171":"#34d399" }}/>
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:".82rem", margin:0 }}>Anomaly Detection</p>
              <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>AI-powered spending alerts</p>
            </div>
          </div>
          {hasAnomalies && (
            <span style={{ padding:"2px 8px", borderRadius:9999, background:"rgba(248,113,113,.12)", border:"1px solid rgba(248,113,113,.25)", color:"#f87171", fontSize:".65rem", fontWeight:700 }}>
              {anomaly.totalFlags} flags
            </span>
          )}
        </div>

        <div style={{ padding:"12px 16px" }}>
          {!hasAnomalies ? (
            <div style={{ textAlign:"center", padding:"12px 0" }}>
              <p style={{ color:"#34d399", fontWeight:700, fontSize:".85rem", margin:"0 0 3px" }}>✓ All Clear</p>
              <p style={{ color:"#475569", fontSize:".72rem", margin:0 }}>No unusual spending detected</p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {/* Top anomaly */}
              {anomaly.anomalies?.slice(0,2).map((a, i) => (
                <div key={a.id||i} style={{ padding:"8px 10px", borderRadius:10, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:".75rem", fontWeight:700, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.description}</p>
                      <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{a.category} · {new Date(a.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}</p>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0, marginLeft:8 }}>
                      <p style={{ color:"#f87171", fontWeight:700, fontSize:".78rem", margin:0 }}>{fmt(a.amount)}</p>
                      <p style={{ fontSize:".6rem", color:"#64748b", margin:0 }}>avg {fmt(a.categoryMean)}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Spending spikes */}
              {anomaly.spikes?.slice(0,1).map((s, i) => (
                <div key={i} style={{ padding:"8px 10px", borderRadius:10, background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:".73rem", color:"#f59e0b", margin:0 }}>⚠ {s.category} up +{s.pct}% this month</p>
                  <p style={{ fontSize:".7rem", color:"#64748b", margin:0 }}>{fmt(s.current)} vs avg {fmt(s.avg)}</p>
                </div>
              ))}

              {/* AI narrative */}
              {anomaly.aiNarrative && (
                <p style={{ fontSize:".7rem", color:"#94a3b8", margin:"4px 0 0", lineHeight:1.5, borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:8 }}>
                  🤖 {anomaly.aiNarrative}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Spending Personality Panel ── */}
      <div style={{ borderRadius:18, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <User size={14} style={{ color:"#a78bfa" }}/>
          </div>
          <div>
            <p style={{ fontWeight:700, fontSize:".82rem", margin:0 }}>Spending Personality</p>
            <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>ML behaviour analysis</p>
          </div>
        </div>

        <div style={{ padding:"12px 16px" }}>
          {!arch ? (
            <p style={{ color:"#475569", fontSize:".78rem", textAlign:"center", padding:"12px 0" }}>Add more transactions for personality analysis</p>
          ) : (
            <div>
              {/* Archetype badge */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ fontSize:"1.8rem", lineHeight:1 }}>{arch.emoji}</div>
                <div>
                  <p style={{ fontWeight:800, fontSize:".88rem", margin:0, color:arch.color }}>{arch.label}</p>
                  <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>{arch.desc}</p>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:10 }}>
                {[
                  { label:"Savings", val:`${personality.stats?.savingsRate}%`, color:"#34d399" },
                  { label:"Consistency", val:`${personality.stats?.consistency}`, color:"#60a5fa" },
                  { label:"Months", val:personality.stats?.totalMonths, color:"#a78bfa" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"center", padding:"6px", borderRadius:8, background:"rgba(255,255,255,.03)" }}>
                    <p style={{ fontSize:".9rem", fontWeight:800, color:s.color, margin:0 }}>{s.val}</p>
                    <p style={{ fontSize:".58rem", color:"#64748b", margin:0 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* AI insight */}
              {personality.aiInsight && (
                <p style={{ fontSize:".7rem", color:"#94a3b8", margin:0, lineHeight:1.55, borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:8 }}>
                  🤖 {personality.aiInsight}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}