"use client";

const glassCard = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
};

const emeraldGlow = "0 0 30px rgba(52,211,153,0.12)";

export function FeatureCard({ feature }) {
  return (
    <div
      className="rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-1"
      style={{
        ...glassCard,
        boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.border = "1px solid rgba(52,211,153,0.25)";
        e.currentTarget.style.boxShadow = emeraldGlow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: "rgba(52,211,153,0.1)",
          border: "1px solid rgba(52,211,153,0.2)",
        }}
      >
        <div style={{ color: "#34d399" }}>{feature.icon}</div>
      </div>
      <h3
        className="font-bold text-lg mb-2"
        style={{ fontFamily: "'Sora', sans-serif", color: "#f1f5f9" }}
      >
        {feature.title}
      </h3>
      <p style={{ color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
        {feature.description}
      </p>
    </div>
  );
}