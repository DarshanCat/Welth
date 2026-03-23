"use client";

import { Target, TrendingUp, AlertTriangle } from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export function GoalsCard({ goals }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 20, padding: "20px 22px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(167,139,250,.12)", border: "1px solid rgba(167,139,250,.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Target size={15} style={{ color: "#a78bfa" }}/>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", margin: 0 }}>Savings Goals</p>
          <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>{goals.length} active goal{goals.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Goals list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {goals.map((goal) => {
          const progress = Math.min(Math.round((goal.currentSavings / goal.targetAmount) * 100), 100);
          const barColor = goal.isBehind ? "#f87171" : progress >= 75 ? "#34d399" : "#a78bfa";

          return (
            <div key={goal.id} style={{
              padding: "14px 16px", borderRadius: 14,
              background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)",
            }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: "0 0 2px" }}>
                    {fmt(goal.targetAmount)}
                  </p>
                  <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>
                    Saved {fmt(goal.currentSavings)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {goal.isBehind && <AlertTriangle size={11} style={{ color: "#f87171" }}/>}
                  <span style={{
                    padding: "2px 9px", borderRadius: 9999, fontSize: ".65rem", fontWeight: 700,
                    background: `${barColor}18`, border: `1px solid ${barColor}30`, color: barColor,
                  }}>{progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, borderRadius: 9999, background: "rgba(255,255,255,.06)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 9999,
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${barColor}, ${barColor}bb)`,
                  transition: "width .6s ease",
                }}/>
              </div>

              {goal.isBehind && (
                <p style={{ fontSize: ".65rem", color: "#f87171", margin: "6px 0 0" }}>
                  Behind by {fmt(goal.expectedSavings - goal.currentSavings)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}