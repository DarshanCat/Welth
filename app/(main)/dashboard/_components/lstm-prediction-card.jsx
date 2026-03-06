"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Brain, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

function monthLabel(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

// Build monthly totals from raw transactions
function buildMonthlyTotals(transactions) {
  const map = {};
  transactions
    .filter((t) => t.type === "EXPENSE")
    .forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(t.amount);
    });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({
      month: monthLabel(key + "-01"),
      amount: Math.round(total),
    }));
}

// Simple linear regression for trend + naive forecast
function forecastNext(history) {
  if (history.length < 2) return null;
  const n = history.length;
  const xs = history.map((_, i) => i);
  const ys = history.map((h) => h.amount);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  const slope =
    xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0) /
    xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  return Math.max(0, Math.round(intercept + slope * n));
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(52,211,153,0.3)",
        color: "#e2e8f0",
      }}
    >
      <p className="font-semibold mb-1" style={{ color: "#34d399" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey}>
          {p.name === "forecast" ? "🔮 Forecast" : "💸 Actual"}:{" "}
          <span className="font-bold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export function LSTMPredictionCard({ transactions = [] }) {
  const [lstmPrediction, setLstmPrediction] = useState(null);
  const [lstmLoading, setLstmLoading] = useState(true);
  const [lstmError, setLstmError] = useState(false);

  // Build chart data from transactions
  const history = buildMonthlyTotals(transactions);
  const trendForecast = forecastNext(history);

  // Next month label
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthLabel = nextMonth.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });

  // Build chart: history + forecast bar
  const chartData = [
    ...history.slice(-6),
    ...(trendForecast
      ? [{ month: nextMonthLabel, forecast: trendForecast, amount: null }]
      : []),
  ];

  // Trend direction
  const last = history.at(-1)?.amount ?? 0;
  const prev = history.at(-2)?.amount ?? 0;
  const trendUp = last > prev;
  const trendPct = prev ? Math.abs(((last - prev) / prev) * 100).toFixed(1) : null;

  // Try LSTM microservice
  useEffect(() => {
    fetch("/api/ml/lstm-predict")
      .then((r) => r.json())
      .then((d) => {
        if (d.predicted_expense) setLstmPrediction(d.predicted_expense);
        else setLstmError(true);
      })
      .catch(() => setLstmError(true))
      .finally(() => setLstmLoading(false));
  }, []);

  // The best available forecast: LSTM if available, else linear trend
  const bestForecast = lstmPrediction ?? trendForecast;
  const forecastSource = lstmPrediction ? "LSTM Neural Network" : "Linear Trend";

  if (history.length === 0) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Brain className="w-4 h-4 text-violet-400" />
          AI Expense Forecast
          <span
            className="ml-auto text-xs font-normal px-2 py-0.5 rounded-full"
            style={{
              background: lstmPrediction
                ? "rgba(124,58,237,0.15)"
                : "rgba(52,211,153,0.1)",
              color: lstmPrediction ? "#a78bfa" : "#34d399",
              border: `1px solid ${lstmPrediction ? "rgba(124,58,237,0.3)" : "rgba(52,211,153,0.2)"}`,
            }}
          >
            {lstmLoading ? "Loading…" : forecastSource}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── Top stats row ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* This month */}
          <div
            className="rounded-xl p-3 space-y-1"
            style={{
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.15)",
            }}
          >
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-lg font-bold">{fmt(last)}</p>
            {trendPct && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${
                  trendUp ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {trendUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trendPct}% vs last month
              </div>
            )}
          </div>

          {/* Next month forecast */}
          <div
            className="rounded-xl p-3 space-y-1 col-span-2"
            style={{
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <p className="text-xs text-muted-foreground">
              🔮 Predicted Next Month ({nextMonthLabel})
            </p>
            {lstmLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Fetching LSTM model…</span>
              </div>
            ) : bestForecast ? (
              <>
                <p className="text-2xl font-bold" style={{ color: "#a78bfa" }}>
                  {fmt(bestForecast)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lstmError && !lstmPrediction
                    ? "⚠️ ML service offline — using trend estimate"
                    : "Confidence based on your spending history"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not enough data for prediction
              </p>
            )}
          </div>
        </div>

        {/* ── Chart ── */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">
            6-Month Spending History + Forecast
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`
                }
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Divider between history and forecast */}
              {trendForecast && (
                <ReferenceLine
                  x={nextMonthLabel}
                  stroke="rgba(167,139,250,0.4)"
                  strokeDasharray="4 3"
                  label={{
                    value: "Forecast →",
                    position: "insideTopLeft",
                    fontSize: 10,
                    fill: "#a78bfa",
                  }}
                />
              )}

              {/* Actual spending area */}
              <Area
                type="monotone"
                dataKey="amount"
                name="actual"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#actualGrad)"
                dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#34d399" }}
                connectNulls={false}
              />

              {/* Forecast area */}
              <Area
                type="monotone"
                dataKey="forecast"
                name="forecast"
                stroke="#a78bfa"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#forecastGrad)"
                dot={{ r: 5, fill: "#a78bfa", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Insight tip ── */}
        {bestForecast && last > 0 && (
          <div
            className="flex items-start gap-3 rounded-xl p-3 text-xs"
            style={{
              background:
                bestForecast > last
                  ? "rgba(239,68,68,0.06)"
                  : "rgba(52,211,153,0.06)",
              border: `1px solid ${
                bestForecast > last
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(52,211,153,0.2)"
              }`,
            }}
          >
            <AlertCircle
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{
                color: bestForecast > last ? "#f87171" : "#34d399",
              }}
            />
            <p className="text-muted-foreground leading-relaxed">
              {bestForecast > last ? (
                <>
                  Your spending is projected to{" "}
                  <span className="font-semibold text-red-400">
                    increase by {fmt(bestForecast - last)}
                  </span>{" "}
                  next month. Consider cutting discretionary expenses to stay on
                  track.
                </>
              ) : (
                <>
                  Great news! Your spending is projected to{" "}
                  <span className="font-semibold text-emerald-400">
                    decrease by {fmt(last - bestForecast)}
                  </span>{" "}
                  next month. Keep up the good habits!
                </>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}