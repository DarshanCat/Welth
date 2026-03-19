import React from "react";
import { Button } from "./ui/button";
import { PenBox, LayoutDashboard, Briefcase, Calculator, TrendingUp, Brain, Settings, Zap, Receipt, CreditCard, FileText, Bell, Target } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { checkUser } from "@/lib/checkUser";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./theme-toggle";

const Header = async () => {
  await checkUser();

  return (
    <header className="fixed top-0 w-full backdrop-blur-md z-50 flex flex-col"
      style={{ background: "rgba(3,7,18,0.85)" }}>
      
      {/* ───────────────── TOP ROW: Main Nav ───────────────── */}
      <div className="w-full border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <nav className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <Image src="/logo-white.png" alt="Welth Logo" width={120} height={40} className="h-9 w-auto object-contain" />
          </Link>

          <div className="flex items-center justify-end flex-1 gap-2">
            <SignedIn>
              <div className="flex items-center gap-2 shrink-0">
                <Link href="/dashboard" className="flex items-center">
                  <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs"
                    style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8" }}>
                    <LayoutDashboard size={14} />
                    <span className="hidden md:inline">Dashboard</span>
                  </Button>
                </Link>

                <Link href="/transaction/create" className="flex items-center">
                  <Button size="sm" className="flex items-center gap-1.5 text-xs"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)", border: "none" }}>
                    <PenBox size={14} />
                    <span className="hidden md:inline">Add Transaction</span>
                  </Button>
                </Link>

                <Link href="/settings" className="flex items-center">
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

                <NotificationBell />
                <ThemeToggle />

                <div className="flex items-center h-full">
                  <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                </div>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton forceRedirectUrl="/dashboard">
                <Button variant="outline" size="sm">Login</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      </div>

      {/* ───────────────── BOTTOM ROW: Tools ───────────────── */}
      <SignedIn>
        <div className="w-full border-b" style={{ borderColor: "rgba(255,255,255,0.03)", background: "rgba(255,255,255,0.01)" }}>
          <div className="container mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto hide-scroll" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <style dangerouslySetInnerHTML={{__html: `
              .hide-scroll::-webkit-scrollbar { display: none; }
            `}} />
            
            <Link href="/emi" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/bills" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(251,191,36,0.18),rgba(245,158,11,0.1))",
                border: "1px solid rgba(251,191,36,0.45)",
                color: "#fbbf24", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(251,191,36,0.15)",
              }}>
                <Bell size={14} />
                Bills
              </button>
            </Link>

            <Link href="/subscriptions" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/tax" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/credit-score" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/bank-parser" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/portfolio" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/ca-dashboard" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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

            <Link href="/trading-planner" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
                background: "linear-gradient(135deg,rgba(236,72,153,0.18),rgba(219,39,119,0.1))",
                border: "1px solid rgba(236,72,153,0.45)",
                color: "#f472b6", fontSize: ".8rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "'Sora',sans-serif",
                boxShadow: "0 0 14px rgba(236,72,153,0.15)",
              }}>
                <Target size={14} />
                Plan
              </button>
            </Link>

            <Link href="/predictions" className="shrink-0 flex items-center">
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 9999,
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
          </div>
        </div>
      </SignedIn>
    </header>
  );
};

export default Header;