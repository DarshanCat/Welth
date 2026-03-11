"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, TrendingDown, Plus, Search, RefreshCw,
  Loader2, Trash2, X, ChevronUp, ChevronDown,
  Briefcase, BarChart2, PieChart, Star, IndianRupee,
} from "lucide-react";
import {
  PieChart as RPie, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis,
} from "recharts";

const fmt  = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);
const fmtN = (n, d = 2) => Number(n ?? 0).toFixed(d);

const TYPE_CFG = {
  STOCK:       { color: "#60a5fa", label: "Stock",        bg: "rgba(96,165,250,.12)"  },
  MUTUAL_FUND: { color: "#a78bfa", label: "Mutual Fund",  bg: "rgba(167,139,250,.12)" },
  ETF:         { color: "#34d399", label: "ETF",          bg: "rgba(52,211,153,.12)"  },
};
const PIE_COLORS = ["#60a5fa","#a78bfa","#34d399","#fbbf24","#f87171","#06b6d4","#ec4899","#84cc16","#f97316","#8b5cf6"];

// ── Gain badge ────────────────────────────────────────────────────────────────
function GainBadge({ val, pct, size = "md" }) {
  const pos  = val >= 0;
  const Icon = pos ? TrendingUp : TrendingDown;
  const c    = pos ? "#34d399" : "#f87171";
  const fs   = size === "sm" ? ".7rem" : ".78rem";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Icon size={size === "sm" ? 11 : 13} style={{ color: c }} />
      <span style={{ color: c, fontWeight: 700, fontSize: fs }}>
        {pos ? "+" : ""}{fmt(val)} ({pos ? "+" : ""}{fmtN(pct)}%)
      </span>
    </div>
  );
}

// ── Holding row card ──────────────────────────────────────────────────────────
function HoldingCard({ h, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cfg  = TYPE_CFG[h.type] || TYPE_CFG.STOCK;
  const isUp = h.gain >= 0;

  return (
    <div style={{ background: "rgba(255,255,255,.025)", border: `1px solid rgba(255,255,255,.07)`, borderRadius: 16, overflow: "hidden", marginBottom: 10 }}>
      {/* Main row */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
           onClick={() => setExpanded(v => !v)}>
        {/* Symbol badge */}
        <div style={{ width: 44, height: 44, borderRadius: 13, background: cfg.bg, border: `1px solid ${cfg.color}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: ".6rem", fontWeight: 800, color: cfg.color, letterSpacing: ".03em" }}>
            {h.symbol.length > 5 ? h.symbol.slice(0,4) : h.symbol}
          </span>
          <span style={{ fontSize: ".5rem", color: cfg.color, opacity: .7 }}>{h.exchange}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <p style={{ fontWeight: 700, fontSize: ".88rem", color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</p>
            <span style={{ fontSize: ".6rem", padding: "1px 6px", borderRadius: 9999, background: cfg.bg, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{cfg.label}</span>
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: ".72rem", color: "#64748b" }}>
            <span>{fmtN(h.quantity)} units</span>
            <span>Avg: {fmt(h.avgBuyPrice)}</span>
            {h.live && (
              <span style={{ color: h.live.changePct >= 0 ? "#34d399" : "#f87171" }}>
                Day: {h.live.changePct >= 0 ? "+" : ""}{fmtN(h.live.changePct)}%
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontWeight: 800, color: "#f1f5f9", fontSize: ".92rem", margin: 0, fontFamily: "'Sora',sans-serif" }}>
            {fmt(h.currentValue)}
          </p>
          <GainBadge val={h.gain} pct={h.gainPct} size="sm" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onDelete(h.id); }}
            style={{ width: 26, height: 26, borderRadius: 9999, background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash2 size={11} style={{ color: "#f87171" }} />
          </button>
          {expanded ? <ChevronUp size={13} style={{ color: "#64748b" }} /> : <ChevronDown size={13} style={{ color: "#64748b" }} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
            {[
              { label: "Invested",     val: fmt(h.investedAmt),    color: "#60a5fa" },
              { label: "Current",      val: fmt(h.currentValue),   color: isUp ? "#34d399" : "#f87171" },
              { label: "Live Price",   val: fmt(h.currentPrice),   color: "#fbbf24" },
              { label: "52W High",     val: h.live?.high52 ? fmt(h.live.high52) : "—",  color: "#34d399" },
              { label: "52W Low",      val: h.live?.low52  ? fmt(h.live.low52)  : "—",  color: "#f87171" },
              { label: "P/L",          val: `${isUp ? "+" : ""}${fmtN(h.gainPct)}%`,    color: isUp ? "#34d399" : "#f87171" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>{s.label}</p>
                <p style={{ fontSize: ".82rem", fontWeight: 700, color: s.color, margin: "3px 0 0" }}>{s.val}</p>
              </div>
            ))}
          </div>
          {h.live && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,.025)", borderRadius: 10, display: "flex", gap: 14, fontSize: ".72rem" }}>
              <span style={{ color: "#64748b" }}>Prev Close: <span style={{ color: "#94a3b8" }}>{fmt(h.live.prevClose)}</span></span>
              <span style={{ color: h.live.change >= 0 ? "#34d399" : "#f87171" }}>
                Day Change: {h.live.change >= 0 ? "+" : ""}{fmt(h.live.change)}
              </span>
              {h.live.marketState && (
                <span style={{ color: h.live.marketState === "REGULAR" ? "#34d399" : "#fbbf24" }}>
                  Market: {h.live.marketState}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add holding modal ─────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }) {
  const [searchType, setSearchType] = useState("STOCK");
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [qty,        setQty]        = useState("");
  const [price,      setPrice]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/portfolio/search?q=${encodeURIComponent(q)}&type=${searchType}`);
      const d = await r.json();
      setResults(d.results || []);
    } finally { setSearching(false); }
  }, [searchType]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
  }, [query, search]);

  const handleAdd = async () => {
    if (!selected || !qty || !price) return;
    setSaving(true);
    try {
      await onAdd({
        symbol:     selected.symbol,
        name:       selected.name,
        type:       selected.type,
        exchange:   selected.exchange,
        quantity:   qty,
        avgBuyPrice: price,
      });
      onClose();
    } finally { setSaving(false); }
  };

  const preview = selected && qty && price
    ? { invested: parseFloat(qty) * parseFloat(price) }
    : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "1rem" }}>
      <div style={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
        {/* Header */}
        <div style={{ padding: "1.1rem 1.2rem .8rem", borderBottom: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontWeight: 800, fontSize: "1rem", color: "#f1f5f9", margin: 0, fontFamily: "'Sora',sans-serif" }}>Add to Portfolio</p>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.07)", border: "none", borderRadius: 9999, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={13} style={{ color: "#94a3b8" }} />
          </button>
        </div>

        <div style={{ padding: "1rem 1.2rem" }}>
          {/* Type toggle */}
          <div style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 14 }}>
            {[{ key: "STOCK", label: "📈 Stocks" }, { key: "MF", label: "🏦 Mutual Funds" }].map(t => (
              <button key={t.key} onClick={() => { setSearchType(t.key); setResults([]); setSelected(null); setQuery(""); }}
                style={{ flex: 1, padding: "7px", borderRadius: 10, background: searchType === t.key ? "rgba(96,165,250,.15)" : "transparent", color: searchType === t.key ? "#60a5fa" : "#64748b", fontWeight: searchType === t.key ? 700 : 500, fontSize: ".8rem", border: searchType === t.key ? "1px solid rgba(96,165,250,.3)" : "1px solid transparent", cursor: "pointer" }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          {!selected && (
            <>
              <div style={{ position: "relative", marginBottom: 10 }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                <input value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={searchType === "MF" ? "Search mutual fund (e.g. HDFC Flexi Cap)…" : "Search stock (e.g. Reliance, INFY)…"}
                  style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".82rem", outline: "none", boxSizing: "border-box" }} />
                {searching && <Loader2 size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", animation: "spin 1s linear infinite" }} />}
              </div>

              {results.length > 0 && (
                <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                  {results.map((r, i) => (
                    <div key={i} onClick={() => setSelected(r)}
                      style={{ padding: "10px 12px", cursor: "pointer", borderBottom: i < results.length-1 ? "1px solid rgba(255,255,255,.05)" : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div>
                        <p style={{ fontWeight: 700, color: "#e2e8f0", fontSize: ".82rem", margin: 0 }}>{r.symbol}</p>
                        <p style={{ color: "#64748b", fontSize: ".72rem", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{r.name}</p>
                      </div>
                      <span style={{ fontSize: ".65rem", padding: "2px 8px", borderRadius: 9999, background: "rgba(96,165,250,.12)", color: "#60a5fa", flexShrink: 0 }}>{r.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Selected + qty/price form */}
          {selected && (
            <div>
              <div style={{ padding: "10px 12px", background: "rgba(96,165,250,.08)", border: "1px solid rgba(96,165,250,.2)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontWeight: 700, color: "#60a5fa", fontSize: ".88rem", margin: 0 }}>{selected.symbol}</p>
                  <p style={{ color: "#64748b", fontSize: ".72rem", margin: "2px 0 0" }}>{selected.name}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: searchType === "MF" ? "Units" : "Qty (shares)", key: "qty", val: qty, set: setQty, placeholder: "e.g. 10" },
                  { label: "Buy Price (₹)", key: "price", val: price, set: setPrice, placeholder: "e.g. 450.50" },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: ".72rem", color: "#64748b", display: "block", marginBottom: 4 }}>{f.label}</label>
                    <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", color: "#e2e8f0", fontSize: ".82rem", outline: "none", boxSizing: "border-box" }} />
                  </div>
                ))}
              </div>

              {preview && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(52,211,153,.06)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 9, fontSize: ".78rem", color: "#34d399" }}>
                  Total Invested: <strong>{fmt(preview.invested)}</strong>
                </div>
              )}
            </div>
          )}

          <button onClick={handleAdd} disabled={!selected || !qty || !price || saving}
            style={{ marginTop: 16, width: "100%", padding: "11px", borderRadius: 11, background: selected && qty && price ? "linear-gradient(135deg,#3b82f6,#2563eb)" : "rgba(255,255,255,.06)", border: "none", color: selected && qty && price ? "#fff" : "#475569", fontWeight: 700, fontSize: ".85rem", cursor: !selected || !qty || !price ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {saving ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Adding…</> : <><Plus size={14} /> Add to Portfolio</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [tab,      setTab]      = useState("holdings");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/portfolio");
      const d = await r.json();
      setData(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (body) => {
    const r = await fetch("/api/portfolio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) await load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this holding?")) return;
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    setData(d => d ? { ...d, holdings: d.holdings.filter(h => h.id !== id) } : d);
  };

  const { holdings = [], summary = {} } = data || {};

  // Pie data by value
  const pieData = holdings.slice(0, 8).map((h, i) => ({
    name: h.symbol, value: h.currentValue, color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  // Gain/loss breakdown
  const winners = [...holdings].filter(h => h.gain > 0).sort((a,b) => b.gainPct - a.gainPct).slice(0,5);
  const losers  = [...holdings].filter(h => h.gain < 0).sort((a,b) => a.gainPct - b.gainPct).slice(0,5);

  return (
    <div style={{ minHeight: "100vh", padding: "1rem 1rem 6rem", maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,rgba(52,211,153,.2),rgba(16,185,129,.1))", border: "1px solid rgba(52,211,153,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={20} style={{ color: "#34d399" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", fontFamily: "'Sora',sans-serif", margin: 0, lineHeight: 1 }}>Portfolio</h1>
            <p style={{ fontSize: ".72rem", color: "#64748b", margin: "3px 0 0" }}>Live prices · Stocks & Mutual Funds</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading}
            style={{ width: 36, height: 36, borderRadius: 9999, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RefreshCw size={14} style={{ color: "#64748b", animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9999, background: "linear-gradient(135deg,rgba(52,211,153,.18),rgba(16,185,129,.1))", border: "1px solid rgba(52,211,153,.4)", color: "#34d399", fontSize: ".8rem", fontWeight: 700, cursor: "pointer" }}>
            <Plus size={13} /> Add Holding
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 14 }}>
          <Loader2 size={24} style={{ color: "#34d399", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "#64748b", margin: 0 }}>Fetching live prices…</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr) repeat(2,1fr)", gap: 10, marginBottom: 18 }}>
            {[
              { label: "Total Invested",  val: fmt(summary.totalInvested),  color: "#60a5fa", sub: `${summary.count || 0} holdings` },
              { label: "Current Value",   val: fmt(summary.totalValue),     color: summary.totalGain >= 0 ? "#34d399" : "#f87171", sub: "Live prices" },
              { label: "Total P&L",       val: (summary.totalGain >= 0 ? "+" : "") + fmt(summary.totalGain), color: summary.totalGain >= 0 ? "#34d399" : "#f87171", sub: `${summary.totalGain >= 0 ? "+" : ""}${fmtN(summary.totalGainPct)}%` },
              { label: "Today's Change",  val: fmt(holdings.reduce((s,h) => s + (h.live?.change ?? 0) * h.quantity, 0)), color: "#fbbf24", sub: "Across portfolio" },
            ].map(c => (
              <div key={c.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "14px 16px" }}>
                <p style={{ fontSize: ".7rem", color: "#64748b", margin: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>{c.label}</p>
                <p style={{ fontSize: "1.15rem", fontWeight: 800, color: c.color, margin: "6px 0 2px", fontFamily: "'Sora',sans-serif" }}>{c.val}</p>
                <p style={{ fontSize: ".68rem", color: "#475569", margin: 0 }}>{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 16, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", marginBottom: 18 }}>
            {[
              { key: "holdings", label: "Holdings",   icon: BarChart2 },
              { key: "analysis", label: "Analysis",   icon: PieChart },
            ].map(t => {
              const Icon = t.icon;
              const a    = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, padding: "8px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: ".8rem", fontWeight: a ? 700 : 500, background: a ? "rgba(52,211,153,.15)" : "transparent", color: a ? "#34d399" : "#64748b", border: a ? "1px solid rgba(52,211,153,.3)" : "1px solid transparent", cursor: "pointer" }}>
                  <Icon size={13} />{t.label}
                </button>
              );
            })}
          </div>

          {/* Holdings tab */}
          {tab === "holdings" && (
            <>
              {holdings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 1rem", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18 }}>
                  <TrendingUp size={40} style={{ color: "#475569", margin: "0 auto 12px", display: "block" }} />
                  <p style={{ color: "#64748b", margin: 0 }}>No holdings yet.</p>
                  <p style={{ color: "#475569", fontSize: ".78rem", margin: "6px 0 0" }}>Add stocks or mutual funds to track live prices & P&L.</p>
                  <button onClick={() => setShowAdd(true)}
                    style={{ marginTop: 14, padding: "9px 20px", borderRadius: 9999, background: "rgba(52,211,153,.15)", border: "1px solid rgba(52,211,153,.35)", color: "#34d399", fontWeight: 700, fontSize: ".8rem", cursor: "pointer" }}>
                    + Add First Holding
                  </button>
                </div>
              ) : (
                holdings.map(h => <HoldingCard key={h.id} h={h} onDelete={handleDelete} />)
              )}
            </>
          )}

          {/* Analysis tab */}
          {tab === "analysis" && holdings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Allocation pie + legend */}
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14 }}>
                <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px", textAlign: "center" }}>Portfolio Allocation</p>
                  <ResponsiveContainer width={180} height={180}>
                    <RPie>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 8, fontSize: 11 }} />
                    </RPie>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem" }}>
                  <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px" }}>By Allocation</p>
                  {pieData.map((p, i) => {
                    const pct = summary.totalValue ? Math.round(p.value / summary.totalValue * 100) : 0;
                    return (
                      <div key={i} style={{ marginBottom: 9 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".75rem", marginBottom: 3 }}>
                          <span style={{ color: "#94a3b8" }}>{p.name}</span>
                          <span style={{ color: p.color, fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.07)" }}>
                          <div style={{ height: "100%", borderRadius: 3, width: `${pct}%`, background: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Winners & Losers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "🏆 Top Gainers", list: winners, color: "#34d399" },
                  { label: "📉 Top Losers",  list: losers,  color: "#f87171" },
                ].map(s => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem" }}>
                    <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 10px" }}>{s.label}</p>
                    {s.list.length === 0
                      ? <p style={{ color: "#475569", fontSize: ".75rem" }}>None</p>
                      : s.list.map(h => (
                        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: ".8rem", color: "#e2e8f0", margin: 0 }}>{h.symbol}</p>
                            <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>{fmt(h.currentValue)}</p>
                          </div>
                          <GainBadge val={h.gain} pct={h.gainPct} size="sm" />
                        </div>
                      ))
                    }
                  </div>
                ))}
              </div>

              {/* Type breakdown */}
              <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16, padding: "1rem" }}>
                <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 12px" }}>Asset Class Breakdown</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {["STOCK","MUTUAL_FUND","ETF"].map(type => {
                    const cfg   = TYPE_CFG[type];
                    const group = holdings.filter(h => h.type === type);
                    const val   = group.reduce((s,h) => s + h.currentValue, 0);
                    const pct   = summary.totalValue ? Math.round(val / summary.totalValue * 100) : 0;
                    return (
                      <div key={type} style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 12, padding: "12px", textAlign: "center" }}>
                        <p style={{ fontSize: ".65rem", color: cfg.color, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>{cfg.label}</p>
                        <p style={{ fontSize: ".95rem", fontWeight: 800, color: cfg.color, margin: "5px 0 2px", fontFamily: "'Sora',sans-serif" }}>{pct}%</p>
                        <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>{group.length} holdings</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}