"use client";

import { useState, useEffect } from "react";
import {
  Briefcase, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Clock, Loader2, RefreshCw, ChevronDown,
  ChevronUp, CircleDot, BadgeCheck, Wallet, Target,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const ALERT_CONFIG = {
  critical: { icon: AlertTriangle,  color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)" },
  warning:  { icon: Clock,          color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)"  },
  good:     { icon: CheckCircle,    color: "#34d399", bg: "rgba(52,211,153,0.08)",  border: "rgba(52,211,153,0.25)"  },
};

const PRIORITY_CONFIG = {
  "Immediate":    { color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  "This Month":   { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  "This Quarter": { color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
};

// ── Metric pill ───────────────────────────────────────────────────────────────
function MetricPill({ label, value, color, icon: Icon, sub }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-base font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ alert }) {
  const cfg = ALERT_CONFIG[alert.level] || ALERT_CONFIG.warning;
  const Icon = cfg.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon size={14} style={{ color: cfg.color, marginTop: 1, flexShrink: 0 }} />
      <div>
        <p className="text-xs font-semibold" style={{ color: cfg.color }}>{alert.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.detail}</p>
      </div>
    </div>
  );
}

// ── Advice card ───────────────────────────────────────────────────────────────
function AdviceCard({ item, index }) {
  const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG["This Quarter"];
  return (
    <div className="rounded-xl p-3.5 space-y-2"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa" }}>
            {index + 1}
          </span>
          <p className="text-xs font-bold text-foreground">{item.area}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}>
          {item.priority}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed pl-7">{item.recommendation}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function CAAdvisorCard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [expanded,  setExpanded]  = useState(true);
  const [activeTab, setActiveTab] = useState("alerts"); // alerts | advice

  const fetch_ = async () => {
    setLoading(true); setError(false);
    try {
      const res  = await fetch("/api/ca-advisor");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch_(); }, []);

  return (
    <Card className="w-full overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-sm font-bold">
            {/* CA badge */}
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.2),rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.35)" }}>
                <Briefcase size={16} style={{ color: "#fbbf24" }} />
              </div>
              <BadgeCheck size={12} style={{ color: "#34d399", position: "absolute", bottom: -2, right: -2 }} />
            </div>

            <div>
              <p className="leading-none" style={{ fontFamily: "'Sora',sans-serif" }}>CA Arjun</p>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">Chartered Accountant · Financial Advisor</p>
            </div>
          </CardTitle>

          <div className="flex items-center gap-2">
            <button onClick={fetch_} disabled={loading}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.04)" }}
              title="Refresh briefing">
              <RefreshCw size={13} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              {expanded
                ? <ChevronUp size={13} className="text-muted-foreground" />
                : <ChevronDown size={13} className="text-muted-foreground" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-4 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <Loader2 size={20} style={{ color: "#fbbf24", animation: "spin 1s linear infinite" }} />
              </div>
              <p className="text-sm text-muted-foreground">CA Arjun is reviewing your finances…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">Failed to load briefing.</p>
              <button onClick={fetch_} className="text-xs underline" style={{ color: "#fbbf24" }}>Try again</button>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* ── Greeting ── */}
              <div className="rounded-xl px-4 py-3"
                style={{ background: "linear-gradient(135deg,rgba(251,191,36,0.08),rgba(245,158,11,0.04))", border: "1px solid rgba(251,191,36,0.2)" }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
                    <Briefcase size={12} color="#fff" />
                  </div>
                  <div>
                    {data.greeting && (
                      <p className="text-xs font-semibold mb-1" style={{ color: "#fbbf24" }}>
                        {data.greeting}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {data.briefing || "Your financial briefing is ready."}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Key metrics ── */}
              {data.metrics && (
                <div className="grid grid-cols-2 gap-2">
                  <MetricPill label="Net Savings" value={fmt(data.metrics.savings)}
                    color={data.metrics.savings > 0 ? "#34d399" : "#f87171"}
                    icon={data.metrics.savings > 0 ? TrendingUp : TrendingDown}
                    sub={`${data.metrics.savingsRate}% savings rate`} />
                  <MetricPill label="Total Balance" value={fmt(data.metrics.totalBalance)}
                    color="#a78bfa" icon={Wallet}
                    sub={`${data.metrics.goalsCount} active goal${data.metrics.goalsCount !== 1 ? "s" : ""}`} />
                  <MetricPill label="3M Income" value={fmt(data.metrics.income)}
                    color="#34d399" icon={TrendingUp} sub="Last 3 months" />
                  <MetricPill label="3M Expenses" value={fmt(data.metrics.expense)}
                    color="#f87171" icon={TrendingDown}
                    sub={data.metrics.budgetUsed ? `${data.metrics.budgetUsed}% of budget` : "No budget set"} />
                </div>
              )}

              {/* ── Tab switcher ── */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {[
                  { key: "alerts", label: "⚠️ Alerts",    count: data.alerts?.length },
                  { key: "advice", label: "📋 Advice",    count: data.advice?.length },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className="flex-1 py-2 text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
                    style={{
                      background: activeTab === tab.key ? "rgba(251,191,36,0.12)" : "transparent",
                      color: activeTab === tab.key ? "#fbbf24" : "#64748b",
                      borderBottom: activeTab === tab.key ? "2px solid #fbbf24" : "2px solid transparent",
                    }}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className="w-4 h-4 rounded-full text-xs flex items-center justify-center"
                        style={{ background: activeTab === tab.key ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.08)", color: activeTab === tab.key ? "#fbbf24" : "#64748b" }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Alerts tab ── */}
              {activeTab === "alerts" && (
                <div className="space-y-2">
                  {data.alerts?.length > 0
                    ? data.alerts.map((a, i) => <AlertRow key={i} alert={a} />)
                    : <p className="text-xs text-muted-foreground text-center py-4">No alerts at this time.</p>
                  }
                </div>
              )}

              {/* ── Advice tab ── */}
              {activeTab === "advice" && (
                <div className="space-y-2">
                  {data.advice?.length > 0
                    ? data.advice.map((a, i) => <AdviceCard key={i} item={a} index={i} />)
                    : <p className="text-xs text-muted-foreground text-center py-4">No recommendations at this time.</p>
                  }
                </div>
              )}

              {/* ── CA sign-off ── */}
              {data.caNote && (
                <div className="flex items-center gap-2 pt-1"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <CircleDot size={11} style={{ color: "#fbbf24", flexShrink: 0 }} />
                  <p className="text-xs italic text-muted-foreground">{data.caNote}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Card>
  );
}