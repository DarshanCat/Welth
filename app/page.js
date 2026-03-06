import React from "react";
import Link from "next/link";
import Image from "next/image";
import HeroSection from "@/components/hero";
import { FeatureCard } from "@/components/feature-card";
import {
  featuresData,
  howItWorksData,
  statsData,
  testimonialsData,
} from "@/data/landing";

// ── Helpers ───────────────────────────────────────────────────────────────────

const glassCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
};

// ── Page ─────────────────────────────────────────────────────────────────────

const LandingPage = () => {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#030712",
        fontFamily: "'DM Sans', sans-serif",
        color: "#e2e8f0",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: rgba(52,211,153,0.3); color: #fff; }
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <section className="py-16 relative">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(52,211,153,0.04) 30%, rgba(52,211,153,0.04) 70%, transparent)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsData.map((stat, i) => (
              <div key={i} className="text-center group">
                <div
                  className="text-4xl font-black mb-1 transition-all duration-300 group-hover:scale-110"
                  style={{
                    fontFamily: "'Sora', sans-serif",
                    background:
                      "linear-gradient(135deg, #34d399, #10b981)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-sm font-medium tracking-wide uppercase"
                  style={{ color: "#64748b", letterSpacing: "0.08em" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Section header */}
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
              style={{
                color: "#34d399",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              Features
            </span>
            <h2
              className="font-black leading-tight"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                background: "linear-gradient(135deg, #f1f5f9 40%, #64748b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Everything you need to{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #34d399, #6ee7b7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                master your money
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuresData.map((feature, i) => (
              <FeatureCard key={i} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Bg decoration */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(ellipse, rgba(52,211,153,0.4) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="container mx-auto max-w-5xl relative">
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
              style={{
                color: "#34d399",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              How It Works
            </span>
            <h2
              className="font-black"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                background: "linear-gradient(135deg, #f1f5f9 40%, #64748b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Up and running in minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div
              className="hidden md:block absolute top-10 left-[calc(33%-20px)] right-[calc(33%-20px)] h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(52,211,153,0.4), transparent)",
              }}
            />

            {howItWorksData.map((step, i) => (
              <div key={i} className="text-center relative">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.05))",
                    border: "1px solid rgba(52,211,153,0.3)",
                    boxShadow: "0 0 30px rgba(52,211,153,0.1)",
                  }}
                >
                  <div style={{ color: "#34d399" }}>{step.icon}</div>
                  <div
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      fontFamily: "'Sora', sans-serif",
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <h3
                  className="font-bold text-lg mb-3"
                  style={{ fontFamily: "'Sora', sans-serif", color: "#f1f5f9" }}
                >
                  {step.title.replace(/^\d+\.\s/, "")}
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-semibold tracking-widest uppercase mb-4 px-3 py-1.5 rounded-full"
              style={{
                color: "#34d399",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              Testimonials
            </span>
            <h2
              className="font-black"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                background: "linear-gradient(135deg, #f1f5f9 40%, #64748b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Loved by our users
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonialsData.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl p-6 flex flex-col gap-4"
                style={{
                  ...glassCard,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4" fill="#f59e0b" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    flex: 1,
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <Image
                    src={t.image}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                    style={{ border: "2px solid rgba(52,211,153,0.3)" }}
                  />
                  <div>
                    <div
                      className="font-semibold text-sm"
                      style={{ fontFamily: "'Sora', sans-serif", color: "#f1f5f9" }}
                    >
                      {t.name}
                    </div>
                    <div className="text-xs" style={{ color: "#475569" }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-28 px-4 relative overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(52,211,153,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(52,211,153,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container mx-auto max-w-3xl text-center relative">
          <div
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-6 px-3 py-1.5 rounded-full"
            style={{
              color: "#34d399",
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
              style={{ boxShadow: "0 0 6px #34d399" }}
            />
            Free to get started
          </div>

          <h2
            className="font-black mb-5"
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.1,
              background: "linear-gradient(135deg, #f1f5f9 30%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Ready to take control of{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #34d399, #6ee7b7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              your finances?
            </span>
          </h2>

          <p
            className="mb-10 max-w-xl mx-auto leading-relaxed"
            style={{ color: "#64748b", fontSize: "1.05rem" }}
          >
            Join users who are already managing their money smarter with Welth's
            AI-powered insights and automation.
          </p>

          <Link href="/dashboard">
            <button
              className="inline-flex items-center gap-3 px-10 py-4 rounded-xl font-bold text-base transition-all duration-300 hover:scale-105"
              style={{
                fontFamily: "'Sora', sans-serif",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff",
                boxShadow:
                  "0 0 50px rgba(16,185,129,0.35), 0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              Start for free — no card needed
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-4 text-center text-sm"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          color: "#334155",
        }}
      >
        © {new Date().getFullYear()} Welth. Built with ❤️ as a final year project.
      </footer>
    </div>
  );
};

export default LandingPage;