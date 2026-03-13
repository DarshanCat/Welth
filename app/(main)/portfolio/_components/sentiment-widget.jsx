"use client";

import { useState, useEffect } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, Newspaper } from "lucide-react";

const SENTIMENT_CFG = {
  positive: { color: "#34d399", bg: "rgba(52,211,153,.1)",  border: "rgba(52,211,153,.25)",  icon: TrendingUp,  label: "Bullish" },
  negative: { color: "#f87171", bg: "rgba(248,113,113,.1)", border: "rgba(248,113,113,.25)", icon: TrendingDown, label: "Bearish" },
  neutral:  { color: "#94a3b8", bg: "rgba(148,163,184,.08)",border: "rgba(148,163,184,.2)",  icon: Minus,        label: "Neutral" },
};

function SentimentBar({ positive = 0, negative = 0, neutral = 0 }) {
  const total = (positive + negative + neutral) || 1;
  return (
    <div style={{ display:"flex", height:5, borderRadius:9999, overflow:"hidden", gap:1, minWidth:80 }}>
      <div style={{ width:`${positive/total*100}%`, background:"#34d399", transition:"width .5s" }}/>
      <div style={{ width:`${neutral/total*100}%`,  background:"#475569", transition:"width .5s" }}/>
      <div style={{ width:`${negative/total*100}%`, background:"#f87171", transition:"width .5s" }}/>
    </div>
  );
}

export default function SentimentWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/hf/sentiment");
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const overallCfg  = data?.overall ? SENTIMENT_CFG[data.overall.label] : null;
  const OverallIcon = overallCfg?.icon || Minus;

  return (
    <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)", borderRadius:20, overflow:"hidden" }}>

      {/* Header */}
      <div style={{ padding:"14px 18px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:"rgba(167,139,250,.12)", border:"1px solid rgba(167,139,250,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Brain size={15} style={{ color:"#a78bfa" }}/>
          </div>
          <div>
            <p style={{ fontWeight:700, fontSize:".82rem", margin:0 }}>News Sentiment</p>
            <p style={{ fontSize:".62rem", color:"#64748b", margin:0 }}>FinBERT · Finance-trained NLP</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)", color:"#64748b", cursor:"pointer" }}>
          <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }}/>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding:"14px 18px" }}>

        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"20px 0", justifyContent:"center" }}>
            <Loader2 size={15} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
            <span style={{ fontSize:".75rem", color:"#64748b" }}>Analysing news with FinBERT…</span>
          </div>
        )}

        {!loading && error && (
          <div style={{ padding:"14px", borderRadius:12, background:"rgba(248,113,113,.06)", border:"1px solid rgba(248,113,113,.15)", textAlign:"center" }}>
            <p style={{ fontSize:".75rem", color:"#f87171", margin:0 }}>
              {error === "HF_TOKEN not configured" ? "⚙️ Add HF_TOKEN to .env to enable FinBERT" : error}
            </p>
          </div>
        )}

        {!loading && data?.noHoldings && (
          <p style={{ fontSize:".75rem", color:"#64748b", textAlign:"center", padding:"16px 0" }}>
            Add stock holdings to see news sentiment
          </p>
        )}

        {!loading && !error && data?.holdings && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

            {/* Overall portfolio sentiment pill */}
            {overallCfg && (
              <div style={{ padding:"12px 14px", borderRadius:12, background:overallCfg.bg, border:`1px solid ${overallCfg.border}`, marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <OverallIcon size={16} style={{ color:overallCfg.color }}/>
                    <div>
                      <p style={{ fontWeight:800, fontSize:".85rem", color:overallCfg.color, margin:0 }}>
                        Portfolio: {overallCfg.label}
                      </p>
                      <p style={{ fontSize:".62rem", color:"#64748b", margin:"2px 0 0" }}>Weighted by invested amount</p>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <SentimentBar positive={data.overall.positive} negative={data.overall.negative} neutral={data.overall.neutral}/>
                    <div style={{ display:"flex", gap:8, marginTop:4, justifyContent:"flex-end" }}>
                      <span style={{ fontSize:".6rem", color:"#34d399" }}>▲ {(data.overall.positive*100).toFixed(0)}%</span>
                      <span style={{ fontSize:".6rem", color:"#94a3b8" }}>{(data.overall.neutral*100).toFixed(0)}%</span>
                      <span style={{ fontSize:".6rem", color:"#f87171" }}>▼ {(data.overall.negative*100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Per-holding rows */}
            {data.holdings.map(h => {
              const s   = h.sentiment;
              const cfg = s ? SENTIMENT_CFG[s.label] : SENTIMENT_CFG.neutral;
              const Icon = cfg.icon;
              return (
                <div key={h.symbol} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
                  borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ width:38, height:38, borderRadius:10, flexShrink:0, background:"rgba(255,255,255,.04)",
                    border:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:".58rem", fontWeight:800, color:"#60a5fa", textAlign:"center", lineHeight:1.1 }}>
                      {h.symbol.slice(0,5)}
                    </span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:".75rem", fontWeight:700, color:"#f1f5f9", margin:"0 0 4px",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h.name}</p>
                    {s
                      ? <SentimentBar positive={s.positive} negative={s.negative} neutral={s.neutral}/>
                      : <p style={{ fontSize:".62rem", color:"#475569", margin:0 }}>{h.error || "Awaiting data"}</p>
                    }
                  </div>
                  {s && (
                    <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                      <Icon size={12} style={{ color:cfg.color }}/>
                      <span style={{ fontSize:".7rem", fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Footer note */}
            <div style={{ display:"flex", alignItems:"center", gap:5, paddingTop:6 }}>
              <Newspaper size={10} style={{ color:"#334155" }}/>
              <p style={{ fontSize:".6rem", color:"#334155", margin:0 }}>
                Live news · FinBERT (ProsusAI) · Not financial advice
              </p>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}