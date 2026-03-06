"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

/* ── SVG arc helper ──────────────────────────────────────────────────────── */
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/* ── Gauge ──────────────────────────────────────────────────────────────── */
function ScoreGauge({ score }) {
  const cx = 80;
  const cy = 80;
  const r = 60;

  const startAngle = -135;
  const totalSpan = 270;

  const endAngle = startAngle + (score / 100) * totalSpan;

  const trackPath = describeArc(cx, cy, r, startAngle, startAngle + totalSpan);
  const fillPath = describeArc(cx, cy, r, startAngle, endAngle);

  let color;
  let label;
  let textColor;

  if (score >= 70) {
    color = "#16a34a";
    label = "Excellent";
    textColor = "text-green-600";
  } else if (score >= 40) {
    color = "#d97706";
    label = "Good";
    textColor = "text-amber-500";
  } else {
    color = "#dc2626";
    label = "Needs Work";
    textColor = "text-red-500";
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="120" viewBox="0 0 160 120">
        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Fill */}
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Score */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fontSize="22"
          fontWeight="700"
          fill={color}
        >
          {score}
        </text>

        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fontSize="9"
          fill="#6b7280"
        >
          out of 100
        </text>
      </svg>

      <span className={`text-sm font-semibold -mt-2 ${textColor}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Breakdown bar ──────────────────────────────────────────────────────── */
function BreakdownBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">
          {value}/{max}
        </span>
      </div>

      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function FinanceScoreCard({ score = 0, breakdown }) {
  const bd = breakdown ?? {};

  return (
    <Card className="shadow-sm hover:shadow-md transition">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          💰 Financial Health Score
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

          {/* Gauge */}
          <ScoreGauge score={score} />

          {/* Breakdown */}
          <div className="flex-1 w-full space-y-3 pt-1">

            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Score Breakdown
            </p>

            <BreakdownBar
              label="Savings Rate"
              value={bd.savingsScore ?? 0}
              max={30}
              color="#16a34a"
            />

            <BreakdownBar
              label="Budget Usage"
              value={bd.budgetScore ?? 0}
              max={25}
              color="#2563eb"
            />

            <BreakdownBar
              label="Goal Progress"
              value={bd.goalScore ?? 0}
              max={25}
              color="#7c3aed"
            />

            <BreakdownBar
              label="Spending Stability"
              value={bd.stabilityScore ?? 0}
              max={20}
              color="#d97706"
            />

          </div>
        </div>
      </CardContent>
    </Card>
  );
}