"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, ArrowRight, RefreshCw,
  Loader2, BarChart2, AlertTriangle, Plus,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const fmt    = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);
const fmtDec = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", minimumFractionDigits:2, maximumFractionDigits:2 }).format(n??0);
const fmtN   = (n, d=2) => Number(n??0).toFixed(d);

const COLORS = ["#10b981","#3b82f6","#f59e0b","#8b5cf6","#ef4444","#06b6d4"];

export default function InvestmentWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/portfolio");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error||"Failed");
      setData(d);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const { holdings=[], summary={} } = data||{};
  const isGain  = (summary.totalGain??0) >= 0;
  const pieData = holdings.slice(0,6).map((h,i) => ({ name:h.symbol, value:h.currentValue, color:COLORS[i%COLORS.length] }));
  const top     = [...holdings].sort((a,b)=>b.currentValue-a.currentValue).slice(0,5);
  const dayChange = holdings.reduce((s,h)=>s+(h.live?.change??0)*h.quantity,0);
  const dayUp     = dayChange >= 0;

  /* ── Empty ── */
  if (!loading && !error && holdings.length===0) return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <TrendingUp size={15} style={{ color:"#34d399" }}/>
        </div>
        <h2 style={{ fontWeight:700, fontSize:".88rem", margin:0 }}>Investment Portfolio</h2>
      </div>
      <div style={{ padding:"2.5rem", textAlign:"center" }}>
        <div style={{ width:56, height:56, borderRadius:16, background:"rgba(52,211,153,.08)", border:"1px solid rgba(52,211,153,.15)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
          <TrendingUp size={24} style={{ color:"#34d399", opacity:.6 }}/>
        </div>
        <p style={{ color:"#94a3b8", fontWeight:600, margin:"0 0 4px" }}>No investments tracked</p>
        <p style={{ color:"#475569", fontSize:".78rem", margin:"0 0 16px" }}>Start tracking your stocks and mutual funds</p>
        <Link href="/portfolio">
          <button style={{ padding:"9px 20px", borderRadius:9999, background:"linear-gradient(135deg,rgba(52,211,153,.18),rgba(16,185,129,.1))", border:"1px solid rgba(52,211,153,.35)", color:"#34d399", fontSize:".8rem", fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6 }}>
            <Plus size={13}/> Add First Holding
          </button>
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <TrendingUp size={15} style={{ color:"#34d399" }}/>
          </div>
          <div>
            <h2 style={{ fontWeight:700, fontSize:".88rem", margin:0 }}>Investment Portfolio</h2>
            {!loading && data && <p style={{ fontSize:".65rem", color:"#64748b", margin:0 }}>{summary.count||0} holdings · Live NSE prices</p>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={load} disabled={loading} style={{ width:28, height:28, borderRadius:9999, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <RefreshCw size={12} style={{ color:"#64748b", animation:loading?"spin 1s linear infinite":"none" }}/>
          </button>
          <Link href="/portfolio">
            <button style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 12px", borderRadius:9999, background:"rgba(52,211,153,.1)", border:"1px solid rgba(52,211,153,.25)", color:"#34d399", fontSize:".72rem", fontWeight:700, cursor:"pointer" }}>
              View All <ArrowRight size={11}/>
            </button>
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"2.5rem", gap:10 }}>
          <Loader2 size={18} style={{ color:"#34d399", animation:"spin 1s linear infinite" }}/>
          <span style={{ color:"#64748b", fontSize:".82rem" }}>Fetching live prices…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding:"1rem 1.2rem", display:"flex", gap:8, alignItems:"flex-start" }}>
          <AlertTriangle size={14} style={{ color:"#f87171", flexShrink:0, marginTop:2 }}/>
          <div>
            <p style={{ color:"#f87171", fontSize:".8rem", margin:"0 0 2px", fontWeight:600 }}>Could not load portfolio</p>
            <p style={{ color:"#64748b", fontSize:".71rem", margin:0 }}>{error.includes("findMany") ? "Run: npx prisma migrate dev --name add_holdings" : error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && data && holdings.length > 0 && (
        <>
          {/* KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            {[
              { label:"INVESTED",   val:fmt(summary.totalInvested), color:"#94a3b8" },
              { label:"CURRENT",    val:fmt(summary.totalValue),    color:isGain?"#34d399":"#f87171" },
              { label:"TOTAL P&L",  val:(isGain?"+":"")+fmt(summary.totalGain), color:isGain?"#34d399":"#f87171", sub:`${isGain?"+":""}${fmtN(summary.totalGainPct)}%` },
              { label:"TODAY",      val:(dayUp?"+":"")+fmt(dayChange), color:dayUp?"#34d399":"#f87171", sub:"Day change" },
            ].map((k,i) => (
              <div key={k.label} style={{ padding:"12px 16px", borderRight:i<3?"1px solid rgba(255,255,255,.05)":"none" }}>
                <p style={{ fontSize:".6rem", color:"#64748b", margin:"0 0 5px", fontWeight:600, letterSpacing:".06em" }}>{k.label}</p>
                <p style={{ fontSize:"1rem", fontWeight:800, color:k.color, margin:0, lineHeight:1 }}>{k.val}</p>
                {k.sub && <p style={{ fontSize:".65rem", color:k.color, margin:"3px 0 0", opacity:.8 }}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Holdings + Chart */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 180px", minHeight:180 }}>
            {/* Holdings table */}
            <div style={{ padding:"14px 16px" }}>
              <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 12px", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Top Holdings</p>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {top.map((h) => {
                  const up  = h.gain >= 0;
                  const cfg = h.type==="MUTUAL_FUND"
                    ? { color:"#a78bfa", bg:"rgba(167,139,250,.1)", border:"rgba(167,139,250,.2)" }
                    : { color:"#60a5fa", bg:"rgba(96,165,250,.1)",  border:"rgba(96,165,250,.2)" };
                  return (
                    <div key={h.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:34, height:34, borderRadius:9, background:cfg.bg, border:`1px solid ${cfg.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <span style={{ fontSize:".55rem", fontWeight:800, color:cfg.color }}>{h.symbol.slice(0,4)}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:".78rem", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name}</p>
                        <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>{fmtN(h.quantity)} units · {h.exchange}</p>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <p style={{ fontWeight:700, fontSize:".8rem", margin:0 }}>{fmt(h.currentValue)}</p>
                        <div style={{ display:"flex", alignItems:"center", gap:3, justifyContent:"flex-end" }}>
                          {up ? <TrendingUp size={9} style={{ color:"#34d399" }}/> : <TrendingDown size={9} style={{ color:"#f87171" }}/>}
                          <span style={{ fontSize:".62rem", fontWeight:700, color:up?"#34d399":"#f87171" }}>{up?"+":""}{fmtN(h.gainPct)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {holdings.length > 5 && (
                <Link href="/portfolio">
                  <p style={{ fontSize:".68rem", color:"#64748b", margin:"10px 0 0", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    +{holdings.length-5} more <ArrowRight size={10}/>
                  </p>
                </Link>
              )}
            </div>

            {/* Donut */}
            <div style={{ borderLeft:"1px solid rgba(255,255,255,.05)", padding:"14px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              <p style={{ fontSize:".62rem", color:"#64748b", margin:"0 0 8px", fontWeight:600, textTransform:"uppercase", letterSpacing:".06em" }}>Allocation</p>
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={46} innerRadius={26} paddingAngle={2}>
                    {pieData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{ background:"#0d1a2d", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, fontSize:10 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:6, width:"100%" }}>
                {pieData.slice(0,4).map((p,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <div style={{ width:6, height:6, borderRadius:9999, background:p.color, flexShrink:0 }}/>
                    <span style={{ fontSize:".6rem", color:"#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{p.name}</span>
                    <span style={{ fontSize:".6rem", color:p.color, fontWeight:600, flexShrink:0 }}>
                      {summary.totalValue?Math.round(p.value/summary.totalValue*100):0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}