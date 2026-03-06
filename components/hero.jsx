"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

const HeroSection = () => {
  const imageRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      if (!imageRef.current) return;
      const scrollY = window.scrollY;
      imageRef.current.style.transform = `perspective(1200px) rotateX(${
        Math.max(0, 18 - scrollY * 0.06)
      }deg) translateY(${scrollY * 0.08}px)`;
      imageRef.current.style.opacity = Math.max(0, 1 - scrollY * 0.002);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleMouse = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 10,
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-10 px-4">
      {/* Background glow orbs */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(52,211,153,0.18) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        }}
      />

      {/* Animated grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(52,211,153,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.15) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 80%)",
        }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            background: `rgba(52,211,153,${0.3 + i * 0.05})`,
            left: `${10 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            animation: `float ${3 + i}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.5}s`,
            boxShadow: `0 0 ${8 + i * 4}px rgba(52,211,153,0.4)`,
          }}
        />
      ))}

      {/* Badge */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <span
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase px-4 py-2 rounded-full"
          style={{
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.35)",
            color: "#34d399",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }}
          />
          AI-Powered Finance Platform
        </span>
      </div>

      {/* Headline */}
      <h1
        className="text-center font-black leading-none tracking-tight mb-6 max-w-5xl"
        style={{
          fontSize: "clamp(2.8rem, 8vw, 7rem)",
          fontFamily: "'Sora', sans-serif",
          transform: `translate(${mousePos.x * 0.015}px, ${mousePos.y * 0.01}px)`,
          transition: "transform 0.3s ease",
        }}
      >
        {/* Solid white — guaranteed visible on any dark bg */}
        <span style={{ color: "#f1f5f9" }}>
          Manage Your Finances
        </span>
        <br />
        <span
          style={{
            background: "linear-gradient(135deg, #34d399 0%, #059669 50%, #6ee7b7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 40px rgba(52,211,153,0.3))",
          }}
        >
          with Intelligence
        </span>
      </h1>

      {/* Subheading */}
      <p
        className="text-center max-w-xl mb-10 leading-relaxed"
        style={{
          color: "#94a3b8",
          fontSize: "clamp(1rem, 2vw, 1.2rem)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        An AI-powered financial platform that tracks, predicts, and optimises
        your spending — with a conversational assistant that actually understands
        your money.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-wrap justify-center gap-4 mb-16">
        <Link href="/dashboard">
          <button
            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              fontFamily: "'Sora', sans-serif",
              boxShadow: "0 0 30px rgba(16,185,129,0.4), 0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Get Started Free
          </button>
        </Link>

        <Link href="https://www.youtube.com/roadsidecoder" target="_blank">
          <button
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0",
              fontFamily: "'Sora', sans-serif",
              backdropFilter: "blur(12px)",
            }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Demo
          </button>
        </Link>
      </div>

      {/* Dashboard preview */}
      <div
        className="relative w-full max-w-5xl mx-auto"
        style={{ perspective: "1200px" }}
      >
        <div
          ref={imageRef}
          style={{
            transform: "perspective(1200px) rotateX(18deg)",
            transformOrigin: "center top",
            transition: "transform 0.1s linear",
          }}
        >
          {/* Glowing border frame */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(52,211,153,0.25)",
              boxShadow:
                "0 0 0 1px rgba(52,211,153,0.1), 0 40px 80px rgba(0,0,0,0.6), 0 0 100px rgba(52,211,153,0.1)",
            }}
          >
            {/* Browser chrome bar */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{
                background: "rgba(15,23,42,0.9)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
                <div className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
              </div>
              <div
                className="flex-1 mx-4 px-3 py-1 rounded-md text-xs text-center"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#64748b",
                  fontFamily: "monospace",
                }}
              >
                welth.app/dashboard
              </div>
            </div>

            {/* Actual banner image */}
            <img
              src="/banner.jpeg"
              alt="Welth Dashboard"
              className="w-full block"
              style={{ display: "block" }}
            />
          </div>

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, transparent, #030712)",
            }}
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500&display=swap');
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-18px) scale(1.1); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.7s ease both; }
      `}</style>
    </section>
  );
};

export default HeroSection;