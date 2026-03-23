"use client";

import { useState, useEffect } from "react";
import { Pencil, Check, X, Target } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { updateBudget } from "@/actions/budget";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export function BudgetProgress({ initialBudget, currentExpenses }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newBudget, setNewBudget] = useState(initialBudget?.amount?.toString() || "");

  const { loading, fn: updateBudgetFn, data: updatedBudget, error } = useFetch(updateBudget);

  const percentUsed = initialBudget ? Math.min((currentExpenses / initialBudget.amount) * 100, 100) : 0;
  const barColor    = percentUsed >= 90 ? "#f87171" : percentUsed >= 75 ? "#fbbf24" : "#34d399";

  const handleUpdate = async () => {
    const amount = parseFloat(newBudget);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    await updateBudgetFn(amount);
  };

  useEffect(() => {
    if (updatedBudget?.success) { setIsEditing(false); toast.success("Budget updated"); }
  }, [updatedBudget]);

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to update budget");
  }, [error]);

  return (
    <div style={{
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 20, padding: "20px 22px", height: "100%",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${barColor}18`, border: `1px solid ${barColor}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Target size={15} style={{ color: barColor }}/>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: ".82rem", color: "#f1f5f9", margin: 0 }}>Monthly Budget</p>
            <p style={{ fontSize: ".65rem", color: "#64748b", margin: 0 }}>Default account</p>
          </div>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} style={{
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(255,255,255,.1)", color: "#64748b", cursor: "pointer",
          }}>
            <Pencil size={12}/>
          </button>
        )}
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="number" value={newBudget} autoFocus disabled={loading}
            onChange={e => setNewBudget(e.target.value)}
            placeholder="Enter budget amount"
            style={{
              flex: 1, padding: "9px 12px", borderRadius: 10,
              background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
              color: "#f1f5f9", fontSize: ".82rem", outline: "none",
            }}
          />
          <button onClick={handleUpdate} disabled={loading} style={{
            width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(52,211,153,.15)",
            border: "1px solid rgba(52,211,153,.3)", color: "#34d399", cursor: "pointer",
          }}><Check size={14}/></button>
          <button onClick={() => { setNewBudget(initialBudget?.amount?.toString() || ""); setIsEditing(false); }} style={{
            width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center",
            justifyContent: "center", background: "rgba(248,113,113,.1)",
            border: "1px solid rgba(248,113,113,.25)", color: "#f87171", cursor: "pointer",
          }}><X size={14}/></button>
        </div>
      ) : null}

      {/* Budget amounts */}
      {initialBudget ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: ".68rem", color: "#64748b", margin: "0 0 2px" }}>Spent</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: barColor, margin: 0 }}>
                {fmt(currentExpenses)}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: ".68rem", color: "#64748b", margin: "0 0 2px" }}>Limit</p>
              <p style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
                {fmt(initialBudget.amount)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 8, borderRadius: 9999, background: "rgba(255,255,255,.06)", overflow: "hidden", marginBottom: 8 }}>
            <div style={{
              height: "100%", borderRadius: 9999, width: `${percentUsed}%`,
              background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
              transition: "width .6s ease",
            }}/>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: ".68rem", color: "#64748b" }}>
              {fmt(initialBudget.amount - currentExpenses)} remaining
            </span>
            <span style={{ fontSize: ".68rem", fontWeight: 700, color: barColor }}>
              {percentUsed.toFixed(1)}% used
            </span>
          </div>

          {percentUsed >= 90 && (
            <div style={{
              marginTop: 12, padding: "8px 12px", borderRadius: 9,
              background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.2)",
            }}>
              <p style={{ fontSize: ".72rem", color: "#f87171", margin: 0 }}>
                ⚠️ {percentUsed >= 100 ? "Budget exceeded!" : "Approaching budget limit"}
              </p>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ color: "#64748b", fontSize: ".8rem", margin: "0 0 12px" }}>No budget set yet</p>
          <button onClick={() => setIsEditing(true)} style={{
            padding: "8px 16px", borderRadius: 9999, fontSize: ".75rem", fontWeight: 700,
            background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.25)",
            color: "#34d399", cursor: "pointer",
          }}>Set Budget</button>
        </div>
      )}
    </div>
  );
}