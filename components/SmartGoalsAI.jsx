"use client";
import { useState, useEffect } from "react";
import { Target, TrendingUp, TrendingDown, Sparkles, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const fmt   = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);
const fmtCr = (n) => n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(1)}L`:fmt(n);

export default function SmartGoalsAI() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [selGoal, setSelGoal] = useState(0);

  useEffect(() => {
    fetch("/api/ai/goals-ai")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"40px", gap:10 }}>
      <Loader2 size={20} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
      <span style={{ color:"#64748b", fontSize:".8rem" }}>Analysing your goals…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (data?.noGoals || !data?.goals?.length) return (
    <div style={{ padding:"30px", textAlign:"center", borderRadius:16,
      background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
      <p style={{ fontSize:"1.8rem", margin:"0 0 10px" }}>🎯</p>
      <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>No goals yet</p>
      <p style={{ color:"#64748b", fontSize:".78rem" }}>Add savings goals to get AI-powered predictions.</p>
    </div>
  );

  const g = data.goals[selGoal];
  if (!g) return null;

  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20 }}>
      {/* Header */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"rgba(167,139,250,.12)",
          border:"1px solid rgba(167,139,250,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Target size={15} style={{ color:"#a78bfa" }}/>
        </div>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700, fontSize:".84rem", color:"#f1f5f9", margin:0 }}>Smart Goals AI</p>
          <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>Predicts completion · suggests adjustments</p>
        </div>
      </div>

      <div style={{ padding:"16px 20px" }}>
        {/* Goal selector tabs */}
        {data.goals.length > 1 && (
          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
            {data.goals.map((goal, i) => (
              <button key={i} onClick={() => setSelGoal(i)} style={{
                padding:"5px 12px", borderRadius:9999, fontSize:".72rem", fontWeight:700, cursor:"pointer",
                background: selGoal===i ? "rgba(167,139,250,.15)" : "rgba(255,255,255,.04)",
                border:     selGoal===i ? "1px solid rgba(167,139,250,.4)" : "1px solid rgba(255,255,255,.08)",
                color:      selGoal===i ? "#a78bfa" : "#64748b",
              }}>{fmtCr(goal.target)}</button>
            ))}
          </div>
        )}

        {/* Status banner */}
        <div style={{ padding:"12px 14px", borderRadius:12, marginBottom:14,
          background: g.onTrack ? "rgba(52,211,153,.06)" : "rgba(248,113,113,.06)",
          border:`1px solid ${g.onTrack ? "rgba(52,211,153,.2)" : "rgba(248,113,113,.2)"}`,
          display:"flex", alignItems:"center", gap:10 }}>
          {g.onTrack
            ? <CheckCircle size={16} style={{ color:"#34d399", flexShrink:0 }}/>
            : <AlertTriangle size={16} style={{ color:"#f87171", flexShrink:0 }}/>
          }
          <div>
            <p style={{ fontWeight:700, color: g.onTrack ? "#34d399" : "#f87171", margin:0, fontSize:".8rem" }}>
              {g.onTrack ? "On Track ✅" : `Behind by ${fmt(g.deficit)}`}
            </p>
            <p style={{ fontSize:".68rem", color:"#64748b", margin:0 }}>
              {g.projectedMonths !== null
                ? `At current rate: completes in ${g.projectedMonths} months ${g.onTimeRisk ? "⚠️ (may be late)" : "✅"}`
                : "Add income transactions to project timeline"}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:14 }}>
          {[
            { l:"Target",         v: fmtCr(g.target),      c:"#a78bfa" },
            { l:"Saved So Far",   v: fmtCr(g.totalSavings), c:"#34d399" },
            { l:"Remaining",      v: fmtCr(g.remaining),    c:"#f87171" },
          ].map(k => (
            <div key={k.l} style={{ padding:"10px 12px", borderRadius:10,
              background:`${k.c}08`, border:`1px solid ${k.c}18` }}>
              <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 3px" }}>{k.l}</p>
              <p style={{ fontWeight:800, color:k.c, margin:0, fontSize:".85rem" }}>{k.v}</p>
            </div>
          ))}
        </div>

        {/* Projection chart */}
        {g.projection?.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <p style={{ fontSize:".68rem", color:"#64748b", fontWeight:700, textTransform:"uppercase",
              letterSpacing:".05em", margin:"0 0 8px" }}>Projected vs Required Savings</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={g.projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.04)"/>
                <XAxis dataKey="month" tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false}
                  tickFormatter={m => `M${m}`} interval={Math.ceil(g.projection.length/6)}/>
                <YAxis tick={{ fontSize:10, fill:"#64748b" }} axisLine={false} tickLine={false}
                  tickFormatter={fmtCr} width={48}/>
                <Tooltip contentStyle={{ background:"rgba(5,13,27,.97)", border:"1px solid rgba(255,255,255,.1)",
                  borderRadius:10, fontSize:".72rem" }} formatter={v => [fmtCr(v)]}/>
                <ReferenceLine y={g.target} stroke="#64748b" strokeDasharray="4 2"
                  label={{ value:"Goal", fill:"#64748b", fontSize:10 }}/>
                <Line type="monotone" dataKey="projected" name="Your Projection"
                  stroke="#a78bfa" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="needed" name="Required Pace"
                  stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="5 3"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* What to cut */}
        {!g.onTrack && g.cuttableCats?.length > 0 && (
          <div style={{ padding:"12px 14px", borderRadius:12,
            background:"rgba(251,191,36,.05)", border:"1px solid rgba(251,191,36,.15)", marginBottom:14 }}>
            <p style={{ fontSize:".7rem", fontWeight:700, color:"#fbbf24", margin:"0 0 8px" }}>
              💡 Cut these to save an extra {fmt(g.neededExtra)}/month
            </p>
            {g.cuttableCats.map((c, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"5px 0", borderBottom: i < g.cuttableCats.length-1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                <span style={{ fontSize:".74rem", color:"#94a3b8" }}>{c.category}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontSize:".72rem", color:"#f87171", textDecoration:"line-through" }}>{fmt(c.currentSpend)}</span>
                  <span style={{ fontSize:".72rem", color:"#34d399" }}>→ {fmt(c.newSpend)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI advice */}
        {g.aiAdvice && (
          <div style={{ padding:"12px 14px", borderRadius:12,
            background:"rgba(167,139,250,.06)", border:"1px solid rgba(167,139,250,.2)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <Sparkles size={12} style={{ color:"#a78bfa" }}/>
              <span style={{ fontSize:".65rem", fontWeight:700, color:"#a78bfa",
                textTransform:"uppercase", letterSpacing:".05em" }}>CA Arjun's Advice</span>
            </div>
            <p style={{ fontSize:".75rem", color:"#94a3b8", margin:0, lineHeight:1.6 }}>{g.aiAdvice}</p>
          </div>
        )}
      </div>
    </div>
  );
}