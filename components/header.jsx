import React from "react";
import { Button } from "./ui/button";
import { PenBox, LayoutDashboard, Briefcase, Calculator, TrendingUp, Brain, Settings, Zap, Receipt, CreditCard, FileText } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { checkUser } from "@/lib/checkUser";
import Image from "next/image";

const Header = async () => {
  await checkUser();

  return (
    <header className="fixed top-0 w-full backdrop-blur-md z-50 border-b"
      style={{ background: "rgba(3,7,18,0.85)", borderColor: "rgba(255,255,255,0.07)" }}>
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">

        <Link href="/">
          <Image src="/logo-white.png" alt="Welth Logo" width={120} height={40} className="h-9 w-auto object-contain" />
        </Link>

        <div className="flex items-center gap-2">
          <SignedIn>

            {/* ── EMI Manager button ── */}
            <Link href="/emi">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(96,165,250,0.18),rgba(59,130,246,0.1))",
                border: "1px solid rgba(96,165,250,0.45)",
                color: "#60a5fa", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(96,165,250,0.15)",
              }}>
                <Calculator size={14} />
                EMI
              </button>
            </Link>

            {/* ── Subscriptions button ── */}
            <Link href="/subscriptions">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(248,113,113,0.18),rgba(239,68,68,0.1))",
                border: "1px solid rgba(248,113,113,0.45)",
                color: "#f87171", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(248,113,113,0.15)",
              }}>
                <Zap size={14} />
                Subs
              </button>
            </Link>

            {/* ── Tax Estimator button ── */}
            <Link href="/tax">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.45)",
                color: "#fbbf24", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(251,191,36,0.15)",
              }}>
                <Receipt size={14} />
                Tax
              </button>
            </Link>

            {/* ── Credit Score button ── */}
            <Link href="/credit-score">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(96,165,250,0.18),rgba(59,130,246,0.1))",
                border: "1px solid rgba(96,165,250,0.45)",
                color: "#60a5fa", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(96,165,250,0.15)",
              }}>
                <CreditCard size={14} />
                CIBIL
              </button>
            </Link>

            {/* ── Bank Parser button ── */}
            <Link href="/bank-parser">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.1))",
                border: "1px solid rgba(52,211,153,0.45)",
                color: "#34d399", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(52,211,153,0.15)",
              }}>
                <FileText size={14} />
                Parse
              </button>
            </Link>

            {/* ── Portfolio button ── */}
            <Link href="/portfolio">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(52,211,153,0.18),rgba(16,185,129,0.1))",
                border: "1px solid rgba(52,211,153,0.45)",
                color: "#34d399", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(52,211,153,0.15)",
              }}>
                <TrendingUp size={14} />
                Portfolio
              </button>
            </Link>
            <Link href="/ca-dashboard">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.45)",
                color: "#fbbf24", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(251,191,36,0.15)",
              }}>
                <Briefcase size={14} />
                CA Report
              </button>
            </Link>

            {/* ── Predict button ── */}
            <Link href="/predictions">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(167,139,250,0.18),rgba(139,92,246,0.1))",
                border: "1px solid rgba(167,139,250,0.45)",
                color: "#a78bfa", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(167,139,250,0.15)",
              }}>
                <Brain size={14} />
                Predict
              </button>
            </Link>

            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs"
                style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                <LayoutDashboard size={14} />
                <span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            <Link href="/transaction/create">
              <Button size="sm" className="flex items-center gap-1.5 text-xs"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none" }}>
                <PenBox size={14} />
                <span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>

            <Link href="/settings">
              <button style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 9999,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#64748b", cursor: "pointer",
              }}>
                <Settings size={15} />
              </button>
            </Link>

            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
          </SignedIn>

          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <Button variant="outline" size="sm">Login</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
};

export default Header;