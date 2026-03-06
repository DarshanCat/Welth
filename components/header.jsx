import React from "react";
import { PenBox, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemedLogo } from "@/components/themed-logo";

const Header = async () => {
  return (
    <header className="welth-header fixed top-0 w-full z-50">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center">
          <ThemedLogo height={40} />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center space-x-8">
          <SignedOut>
            <a href="#features" className="welth-nav-link text-sm font-medium">Features</a>
            <a href="#testimonials" className="welth-nav-link text-sm font-medium">Testimonials</a>
          </SignedOut>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link href="/dashboard">
              <button className="welth-btn-ghost hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium">
                <LayoutDashboard size={15} />
                Dashboard
              </button>
            </Link>
            <a href="/transaction/create">
              <button className="welth-btn-primary flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold">
                <PenBox size={15} />
                <span className="hidden md:inline">Add Transaction</span>
              </button>
            </a>
          </SignedIn>

          <SignedOut>
            <SignInButton forceRedirectUrl="/dashboard">
              <button className="welth-btn-primary px-5 py-2 rounded-lg text-sm font-semibold">
                Login
              </button>
            </SignInButton>
          </SignedOut>

          <ThemeToggle />

          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
};

export default Header;