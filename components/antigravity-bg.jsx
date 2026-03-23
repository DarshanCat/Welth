"use client";

import { useEffect, useState } from "react";

const COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335", "#A142F4", "#22d3ee"];

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

function generateParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(2, 98),
    y: randomBetween(2, 98),
    size: randomBetween(2, 5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    isTriangle: Math.random() > 0.6,
    duration: randomBetween(10, 22),
    delay: randomBetween(0, 12),
    opacity: randomBetween(0.15, 0.7),
    animClass: i % 6,
  }));
}

export default function AntigravityBg() {
  const [mounted, setMounted] = useState(false);
  const [particles] = useState(() => generateParticles(150));

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {particles.map((p) =>
          p.isTriangle ? (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: 0,
                height: 0,
                borderLeft: `${p.size}px solid transparent`,
                borderRight: `${p.size}px solid transparent`,
                borderBottom: `${p.size * 2}px solid ${p.color}`,
                opacity: p.opacity,
                animation: `wbg${p.animClass} ${p.duration}s ${p.delay}s infinite ease-in-out`,
              }}
            />
          ) : (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size * 2,
                height: p.size * 2,
                borderRadius: "50%",
                background: p.color,
                opacity: p.opacity,
                animation: `wbg${p.animClass} ${p.duration}s ${p.delay}s infinite ease-in-out`,
              }}
            />
          )
        )}
      </div>

      <style>{`
        @keyframes wbg0 {
          0%,100% { transform:translate(0,0) rotate(0deg); opacity:.15; }
          25%  { transform:translate(25px,-35px) rotate(90deg);  opacity:.7; }
          50%  { transform:translate(-15px,-60px) rotate(180deg); opacity:.3; }
          75%  { transform:translate(-30px,-20px) rotate(270deg); opacity:.6; }
        }
        @keyframes wbg1 {
          0%,100% { transform:translate(0,0); opacity:.2; }
          33%  { transform:translate(-40px,-50px) rotate(120deg); opacity:.6; }
          66%  { transform:translate(30px,-70px) rotate(240deg); opacity:.15; }
        }
        @keyframes wbg2 {
          0%,100% { transform:translate(0,0) scale(1);    opacity:.35; }
          50%  { transform:translate(45px,-55px) scale(1.4); opacity:.7; }
        }
        @keyframes wbg3 {
          0%,100% { transform:translate(0,0) rotate(0deg);   opacity:.4; }
          25%  { transform:translate(-25px,30px) rotate(90deg);  opacity:.15; }
          75%  { transform:translate(40px,-40px) rotate(270deg); opacity:.8; }
        }
        @keyframes wbg4 {
          0%,100% { transform:translate(0,0);                   opacity:.25; }
          40%  { transform:translate(-45px,-65px) rotate(160deg); opacity:.6; }
          80%  { transform:translate(25px,-30px)  rotate(320deg); opacity:.15; }
        }
        @keyframes wbg5 {
          0%,100% { transform:translate(0,0) scale(1);               opacity:.5; }
          30%  { transform:translate(30px,-40px) scale(.8) rotate(108deg); opacity:.15; }
          60%  { transform:translate(-25px,-80px) scale(1.2) rotate(216deg); opacity:.6; }
        }
      `}</style>
    </>
  );
}