import React from "react";
import { Button } from "./ui/button";
import { PenBox, LayoutDashboard, Settings, Brain, Target } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { checkUser } from "@/lib/checkUser";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./theme-toggle";
import FinancialToolsDropdown from "./FinancialToolsDropdown";

const Header = async () => {
  await checkUser();

  return (
    <header
      className="fixed top-0 w-full z-50 backdrop-blur-md"
      style={{
        background:   "rgba(3,7,18,0.90)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between gap-6">

        {/* ── Logo ── */}
        <Link href="/" className="shrink-0">
          <Image src="/logo-white.png" alt="Welth" width={110} height={36} className="h-8 w-auto object-contain"/>
        </Link>

        {/* ── Centre nav — AI + Tools ── */}
        <SignedIn>
          <div className="flex items-center gap-2 flex-1 justify-center">

            <Link href="/trading-planner">
              <button style={{
                display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:9999,
                background:"linear-gradient(135deg,rgba(236,72,153,0.15),rgba(219,39,119,0.08))",
                border:"1px solid rgba(236,72,153,0.35)",color:"#f472b6",
                fontSize:".83rem",fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",
              }}>
                <Target size={14}/>Plan (AI)
              </button>
            </Link>

            <Link href="/predictions">
              <button style={{
                display:"flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:9999,
                background:"linear-gradient(135deg,rgba(167,139,250,0.15),rgba(139,92,246,0.08))",
                border:"1px solid rgba(167,139,250,0.35)",color:"#a78bfa",
                fontSize:".83rem",fontWeight:700,cursor:"pointer",fontFamily:"'Sora',sans-serif",
              }}>
                <Brain size={14}/>Predict (AI)
              </button>
            </Link>

            <FinancialToolsDropdown />

          </div>
        </SignedIn>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-2 shrink-0">
          <SignedIn>

            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="hidden md:flex items-center gap-1.5 text-xs"
                style={{ borderColor:"rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#94a3b8" }}>
                <LayoutDashboard size={13}/><span className="hidden md:inline">Dashboard</span>
              </Button>
            </Link>

            <Link href="/transaction/create">
              <Button size="sm" className="flex items-center gap-1.5 text-xs"
                style={{ background:"linear-gradient(135deg,#10b981,#059669)", border:"none" }}>
                <PenBox size={13}/><span className="hidden md:inline">Add Transaction</span>
              </Button>
            </Link>

            <Link href="/settings">
              <button style={{
                width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",
                justifyContent:"center",background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",
              }}><Settings size={15}/></button>
            </Link>

            <NotificationBell/>
            <ThemeToggle/>
            <UserButton appearance={{ elements:{ avatarBox:"w-8 h-8" }}}/>

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