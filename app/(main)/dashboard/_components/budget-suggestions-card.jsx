"use client";

import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const IMPACT_CONFIG = {
  High:   { color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  Medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.25)" },
  Low:    { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
};

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function SuggestionCard({ item, index }) {
  const cfg = IMPACT_CONFIG[item.impact] || IMPACT_CONFIG.Low;
  return (
    <div
      className="rounded-xl p-4 space-y-2 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: cfg.color, color: "#000" }}
          >
            {index + 1}
          </span>
          <p className="text-sm font-semibold" style={{ color: cfg.color }}>
            {item.title}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {item.impact}
          </span>
        </div>
      </div>

      {/* Suggestion text */}
      <p className="text-xs leading-relaxed text-muted-foreground pl-7">
        {item.suggestion}
      </p>

      {/* Potential saving */}
      {item.saving > 0 && (
        <div className="flex items-center gap-1.5 pl-7">
          <TrendingDown className="w-3 h-3" style={{ color: "#34d399" }} />
          <span className="text-xs font-medium" style={{ color: "#34d399" }}>
            Save up to {fmt(item.saving)}/month
          </span>
        </div>
      )}
    </div>
  );
}

export function BudgetSuggestionsCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/budget-suggestions");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const totalPotentialSaving = data?.suggestions?.reduce(
    (s, item) => s + (item.saving || 0), 0
  ) || 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
            </div>
            AI Budget Suggestions
            {!loading && data?.suggestions?.length > 0 && (
              <span
                className="text-xs font-normal px-2 py-0.5 rounded-full ml-1"
                style={{
                  background: "rgba(139,92,246,0.1)",
                  color: "#a78bfa",
                  border: "1px solid rgba(139,92,246,0.25)",
                }}
              >
                {data.suggestions.length} tips
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              onClick={fetchSuggestions}
              disabled={loading}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.05)" }}
              title="Refresh suggestions"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`}
              />
            </button>
            {/* Collapse */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              {expanded
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Total potential saving banner */}
        {!loading && totalPotentialSaving > 0 && expanded && (
          <div
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(52,211,153,0.07)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#34d399" }} />
            <span className="text-muted-foreground">
              Following all suggestions could save you{" "}
              <span className="font-bold" style={{ color: "#34d399" }}>
                {fmt(totalPotentialSaving)}/month
              </span>
            </span>
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.1)" }}
              >
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#a78bfa" }} />
              </div>
              <p className="text-sm text-muted-foreground">
                Analysing your spending patterns…
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Failed to generate suggestions.
              </p>
              <button
                onClick={fetchSuggestions}
                className="text-xs underline"
                style={{ color: "#a78bfa" }}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && data?.suggestions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              {data?.summary || "Add more transactions to get personalised suggestions."}
            </p>
          )}

          {!loading && !error && data?.suggestions?.map((item, i) => (
            <SuggestionCard key={i} item={item} index={i} />
          ))}

          {/* Spending snapshot */}
          {!loading && !error && data?.meta && (
            <div
              className="mt-2 grid grid-cols-3 gap-2 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              {[
                { label: "Income", value: fmt(data.meta.totalIncome), color: "#34d399" },
                { label: "Spent", value: fmt(data.meta.totalExpense), color: "#f87171" },
                { label: "Saved", value: `${data.meta.savingsRate}%`, color: "#a78bfa" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-xs font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {lastUpdated && (
            <p className="text-xs text-muted-foreground text-right pt-1">
              Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}