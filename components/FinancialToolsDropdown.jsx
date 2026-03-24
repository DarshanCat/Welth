"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Calculator, Bell, Zap, Receipt, CreditCard,
  FileText, TrendingUp, Briefcase, PieChart,
  ChevronDown, Wrench, Bot, Lightbulb, ShieldAlert,
} from "lucide-react";

const TOOLS = [
  { href: "/emi",          icon: Calculator, label: "EMI",       color: "#60a5fa", desc: "EMI Tracker"        },
  { href: "/bills",        icon: Bell,       label: "Bills",     color: "#fbbf24", desc: "Bill Reminders"     },
  { href: "/subscriptions",icon: Zap,        label: "Subs",      color: "#f87171", desc: "Subscriptions"      },
  { href: "/tax",          icon: Receipt,    label: "Tax",       color: "#fb923c", desc: "Tax Estimator"      },
  { href: "/credit-score", icon: CreditCard, label: "CIBIL",     color: "#a78bfa", desc: "Credit Score"       },
  { href: "/bank-parser",  icon: FileText,   label: "Parse",     color: "#34d399", desc: "Bank Statement"     },
  { href: "/portfolio",    icon: TrendingUp, label: "Portfolio", color: "#10b981", desc: "Live Portfolio"      },
  { href: "/sip",          icon: PieChart,   label: "SIP",       color: "#22d3ee", desc: "SIP Analysis"       },
  { href: "/ca-dashboard", icon: Briefcase,  label: "CA Report", color: "#fbbf24", desc: "CA Dashboard"       },
  { href: "/robo-advisor", icon: Bot,        label: "Robo AI",   color: "#34d399", desc: "Robo Advisor"       },
  { href: "/insights",     icon: Lightbulb,  label: "Insights",  color: "#f472b6", desc: "4 Real Problems"    },
  { href: "/xai",          icon: ShieldAlert,label: "XAI",       color: "#f87171", desc: "Explain AI"         },
];

export default function FinancialToolsDropdown() {
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display:    "flex", alignItems: "center", gap: 6,
          padding:    "8px 16px", borderRadius: 9999,
          background: open
            ? "linear-gradient(135deg,rgba(99,102,241,0.25),rgba(79,70,229,0.15))"
            : "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(79,70,229,0.08))",
          border:     `1px solid ${open ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.35)"}`,
          color:      "#818cf8", fontSize: ".85rem", fontWeight: 700,
          cursor:     "pointer", fontFamily: "'Sora',sans-serif",
          boxShadow:  open ? "0 0 20px rgba(99,102,241,0.25)" : "0 0 12px rgba(99,102,241,0.1)",
          transition: "all .2s",
        }}
      >
        <Wrench size={14} />
        Financial Tools
        <ChevronDown
          size={13}
          style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:   "absolute", top: "calc(100% + 10px)", left: "50%",
          transform:  "translateX(-50%)",
          width:      420, zIndex: 100,
          background: "rgba(5,13,27,0.97)",
          border:     "1px solid rgba(99,102,241,0.25)",
          borderRadius: 18,
          boxShadow:  "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99,102,241,0.08)",
          backdropFilter: "blur(20px)",
          padding:    "14px",
          animation:  "dropIn .15s ease",
        }}>
          {/* Header */}
          <div style={{ padding: "8px 10px 12px", borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 10 }}>
            <p style={{ fontSize: ".72rem", fontWeight: 700, color: "#818cf8",
              textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
              Financial Tools
            </p>
            <p style={{ fontSize: ".65rem", color: "#475569", margin: "2px 0 0" }}>
              12 AI-powered tools
            </p>
          </div>

          {/* 2-col grid for 10 items */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 6 }}>
            {TOOLS.map(tool => {
              const Icon = tool.icon;
              return (
                <Link key={tool.href} href={tool.href} onClick={() => setOpen(false)}
                  style={{ textDecoration: "none" }}>
                  <div style={{
                    padding:    "11px 10px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.03)",
                    border:     "1px solid rgba(255,255,255,.06)",
                    display:    "flex", flexDirection: "column", alignItems: "center",
                    gap:        6, cursor: "pointer", transition: "all .15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${tool.color}12`;
                    e.currentTarget.style.borderColor = `${tool.color}35`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,.06)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: `${tool.color}18`, border: `1px solid ${tool.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Icon size={15} style={{ color: tool.color }}/>
                    </div>
                    <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#e2e8f0" }}>
                      {tool.label}
                    </span>
                    <span style={{ fontSize: ".6rem", color: "#475569", textAlign: "center", lineHeight: 1.3 }}>
                      {tool.desc}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}