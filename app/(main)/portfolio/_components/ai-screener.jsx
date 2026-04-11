"use client";
import { useState, useEffect } from "react";
import { Loader2, TrendingUp, AlertTriangle, Brain, Sparkles, LineChart as ChartIcon } from "lucide-react";
import { LineChart as RLine, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

function ScreenerSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
         <div style={{height: 100, background: "rgba(255,255,255,.05)", borderRadius: 16, animation: "spin 1s" }} />
    </div>
  );
}

export default function AIScreenerTab() {
  const [screener, setScreener] = useState(null);
  const [sLoading, setSLoading] = useState(true);
  
  const [symbol, setSymbol] = useState("RELIANCE.NS");
  const [predict, setPredict] = useState(null);
  const [pLoading, setPLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ml/stock-screener")
      .then(r => r.json())
      .then(d => { setScreener(d); setSLoading(false); })
      .catch(() => setSLoading(false));
  }, []);

  const loadPrediction = async (sym) => {
    setSymbol(sym);
    setPLoading(true);
    try {
      const r = await fetch(`/api/ml/stock-predict?symbol=${sym}`);
      const d = await r.json();
      setPredict(d);
    } catch {
    } finally {
      setPLoading(false);
    }
  };

  useEffect(() => { loadPrediction("RELIANCE.NS"); }, []);

  const chartData = predict && predict.historical ? [...predict.historical, ...predict.prediction].map(d => ({
    date: new Date(d.date).toLocaleDateString("en-IN", {day:"numeric", month:"short"}),
    price: d.price || null,
    predicted: d.predicted_price || null 
  })) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 20% Yield Momentum Screener */}
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1.2rem", animation: "slideIn 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "rgba(167,139,250,.15)", padding: 8, borderRadius: 10 }}>
            <Sparkles size={18} color="#a78bfa" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: "1.1rem" }}>Momentum Screener</h3>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem" }}>AI identifies NIFTY highly liquid stocks poised for ~20% upside based on recent breakout momentum.</p>
          </div>
        </div>
        
        {sLoading ? <ScreenerSkeleton /> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {screener?.recommendations?.map(rec => (
                   <div key={rec.symbol} onClick={() => loadPrediction(rec.symbol)} 
                        style={{ background: symbol === rec.symbol ? "rgba(167,139,250,.1)" : "rgba(255,255,255,.04)", 
                                 border: symbol === rec.symbol ? "1px solid rgba(167,139,250,.6)" : "1px solid rgba(167,139,250,.2)", 
                                 borderRadius: 12, padding: "1rem", cursor: "pointer", transition: "all .2s" }} 
                        onMouseEnter={(e)=>e.currentTarget.style.borderColor="rgba(167,139,250,.6)"} 
                        onMouseLeave={(e)=>{if(symbol !== rec.symbol) e.currentTarget.style.borderColor="rgba(167,139,250,.2)"}}>
                       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                           <strong style={{ color: "#f1f5f9" }}>{rec.symbol.replace(".NS", "")}</strong>
                           <span style={{ color: "#34d399", fontWeight: "bold", fontSize: "0.85rem" }}>+{rec.momentum_pct}% MT</span>
                       </div>
                       <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#94a3b8", marginBottom: 10 }}>
                           <span>Price: {fmt(rec.current_price)}</span>
                           <span style={{ color: "#a78bfa", fontWeight: 700 }}>Target: {fmt(rec.target_price)}</span>
                       </div>
                       <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", lineHeight: 1.4 }}>{rec.rationale}</p>
                   </div>
                ))}
            </div>
        )}
      </div>

      {/* LSTM Prediction */}
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1.2rem", display: "flex", flexDirection: "column" }}>
         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
             <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                 <div style={{ background: "rgba(56,189,248,.15)", padding: 8, borderRadius: 10 }}>
                     <Brain size={18} color="#38bdf8" />
                 </div>
                 <div>
                     <h3 style={{ margin: 0, color: "#f1f5f9", fontSize: "1.1rem" }}>LSTM Price Predictor</h3>
                     <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem" }}>2-year deep learning model predicting next 30 days for <strong>{symbol.replace(".NS", "")}</strong></p>
                 </div>
             </div>
             
             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                 <input 
                    type="text" 
                    placeholder="Search any symbol (e.g. ITC.NS)"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                            let val = e.currentTarget.value.toUpperCase();
                            if (!val.endsWith(".NS") && !val.endsWith(".BO")) val += ".NS"; // default to NSE
                            loadPrediction(val);
                            e.currentTarget.value = "";
                        }
                    }}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#f1f5f9", outline: "none", fontSize: "0.85rem", width: "200px" }}
                 />
                 {pLoading && <Loader2 size={18} color="#38bdf8" style={{ animation: "spin 1s linear infinite" }}/>}
             </div>
         </div>
         
         <div style={{ height: 350, width: "100%", marginTop: 10 }}>
            {pLoading && !predict ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                    <Loader2 size={32} color="#38bdf8" style={{ animation: "spin 1s linear infinite" }}/>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Training LSTM on 2 years of history...</span>
                </div>
            ) : predict?.error ? (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
                  <AlertTriangle size={24} style={{ marginRight: 8 }} />
                  {predict.error || "Failed to load prediction"}
                </div>
            ) : (
                <ResponsiveContainer>
                    <RLine>
                        <XAxis dataKey="date" stroke="#475569" fontSize={11} tickMargin={10} minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={11} width={50} tickFormatter={(v)=>`₹${v}`} />
                        <Tooltip contentStyle={{background:"#0f172a", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, fontSize:12, zIndex: 100}} />
                        <Line data={chartData} type="monotone" dataKey="price" stroke="#94a3b8" strokeWidth={2} dot={false} name="Actual" />
                        <Line data={chartData} type="monotone" dataKey="predicted" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 5" dot={false} name="AI Predicted" />
                    </RLine>
                </ResponsiveContainer>
            )}
         </div>
         {predict && !pLoading && !predict.error && (
             <div style={{ marginTop: 20, padding: "12px", background: "rgba(56,189,248,.1)", border: "1px solid rgba(56,189,248,.3)", borderRadius: 12, textAlign: "center", fontSize: "0.85rem", color: "#38bdf8" }}>
                 The AI model projects a <strong>{predict.trend}</strong> trend over the next 30 days.
             </div>
         )}
      </div>

    </div>
  );
}
