"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Target, 
  Brain, 
  FileText, 
  Wallet,
  Settings,
  PieChart
} from "lucide-react";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";
import NotificationBell from "./NotificationBell";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/transaction/create", icon: ArrowLeftRight },
    { name: "Data Scanner", href: "/bank-parser", icon: FileText },
    { name: "Plan (AI)", href: "/trading-planner", icon: Target },
    { name: "Predict (AI)", href: "/predictions", icon: Brain },
    { name: "AI Insights", href: "/insights", icon: PieChart },
    { name: "Tax Planner", href: "/tax", icon: Wallet },
    { name: "Explainable AI", href: "/xai", icon: Brain },
  ];

  return (
    <div className="w-64 h-full hidden md:flex flex-col border-r border-[#ffffff15] bg-[#030712] relative z-20">
      <div className="p-6 pb-2">
        <Link href="/" className="inline-block">
          <Image src="/logo-white.png" alt="Welth" width={110} height={36} className="h-8 w-auto object-contain" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.85rem] font-semibold transition-all duration-200",
                isActive 
                  ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              )}
            >
              <link.icon size={16} />
              {link.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-[#ffffff15] flex items-center justify-between bg-black/20">
        <SignedIn>
          <div className="flex items-center gap-2">
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
            <Link href="/settings" className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <Settings size={18} />
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton forceRedirectUrl="/dashboard">
            <button className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold text-sm hover:bg-emerald-500/20 transition-all">
              Login
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </div>
  );
}
