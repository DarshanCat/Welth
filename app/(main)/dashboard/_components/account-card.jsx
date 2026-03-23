"use client";

import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import useFetch from "@/hooks/use-fetch";
import Link from "next/link";
import { updateDefaultAccount } from "@/actions/account";
import { toast } from "sonner";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

export function AccountCard({ account }) {
  const { name, type, balance, id, isDefault } = account;

  const { loading, fn: updateDefaultFn, data: updatedAccount, error } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (e) => {
    e.preventDefault();
    if (isDefault) { toast.warning("Need at least 1 default account"); return; }
    await updateDefaultFn(id);
  };

  useEffect(() => {
    if (updatedAccount?.success) toast.success("Default account updated");
  }, [updatedAccount]);

  useEffect(() => {
    if (error) toast.error(error.message || "Failed to update");
  }, [error]);

  const typeColor = type === "SAVINGS" ? "#34d399" : "#60a5fa";

  return (
    <div style={{
      background: "rgba(255,255,255,.025)",
      border: "1px solid rgba(255,255,255,.07)",
      borderRadius: 16, overflow: "hidden",
      transition: "border-color .2s, transform .2s",
      cursor: "pointer",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.14)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <Link href={`/account/${id}`} style={{ textDecoration: "none", display: "block", padding: "16px 18px" }}>

        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${typeColor}15`, border: `1px solid ${typeColor}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wallet size={14} style={{ color: typeColor }}/>
            </div>
            <div>
              <p style={{ fontSize: ".78rem", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{name}</p>
              <p style={{ fontSize: ".62rem", color: "#64748b", margin: 0 }}>
                {type.charAt(0) + type.slice(1).toLowerCase()} Account
              </p>
            </div>
          </div>
          <div onClick={e => e.preventDefault()}>
            <Switch checked={isDefault} onClick={handleDefaultChange} disabled={loading}/>
          </div>
        </div>

        {/* Balance */}
        <p style={{ fontSize: "1.3rem", fontWeight: 900, color: "#f1f5f9", margin: "0 0 12px",
          fontFamily: "'Sora', sans-serif" }}>
          {fmt(parseFloat(balance))}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between",
          paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowUpRight size={12} style={{ color: "#34d399" }}/>
            <span style={{ fontSize: ".68rem", color: "#64748b" }}>Income</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowDownRight size={12} style={{ color: "#f87171" }}/>
            <span style={{ fontSize: ".68rem", color: "#64748b" }}>Expense</span>
          </div>
        </div>
      </Link>
    </div>
  );
}