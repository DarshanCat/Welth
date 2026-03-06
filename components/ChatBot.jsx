"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, CheckCircle2 } from "lucide-react";

const SUGGESTIONS = [
  "spent ₹300 on food today",
  "paid ₹1200 for groceries",
  "received ₹50000 salary",
  "analyse my spending",
  "save ₹30000 in 3 months",
];

// ── Transaction confirmation bubble ──────────────────────────────────────────
function ConfirmBubble({ text }) {
  const lines = text.split("\n").filter(Boolean);
  const title = lines[0];
  const details = lines.slice(1).filter((l) => l.startsWith("•"));
  const footer = lines.find((l) => l.includes("dashboard"));

  return (
    <div
      className="rounded-2xl rounded-tl-sm overflow-hidden text-sm"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.06))",
        border: "1px solid rgba(52,211,153,0.3)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ background: "rgba(16,185,129,0.15)" }}
      >
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold text-emerald-300 text-xs">{title}</span>
      </div>
      <div className="px-3 py-2 space-y-1">
        {details.map((line, i) => (
          <p key={i} className="text-xs" style={{ color: "#94a3b8" }}>
            {line}
          </p>
        ))}
        {footer && (
          <p className="text-xs mt-2" style={{ color: "#64748b" }}>
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi 👋 I'm your Welth assistant.\n\nYou can talk to me naturally:\n• \"spent ₹500 on food today\"\n• \"received ₹45000 salary\"\n• \"save ₹60000 in 5 months\"\n• \"analyse my spending\"",
      action: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed, action: null }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply, action: data.action || null },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Failed to reach the server. Please try again.", action: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open assistant"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 focus:outline-none"
        style={{
          background: "linear-gradient(135deg, #10b981, #059669)",
          boxShadow: "0 4px 20px rgba(16,185,129,0.45), 0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* ── Chat panel ── */}
      <div
        className="fixed bottom-24 right-5 z-50 flex flex-col overflow-hidden rounded-2xl transition-all duration-300 origin-bottom-right"
        style={{
          width: "22rem",
          maxWidth: "calc(100vw - 2.5rem)",
          height: "34rem",
          background: "var(--bg, #0f172a)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(52,211,153,0.08)",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1)" : "scale(0.92)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{
            background: "linear-gradient(135deg, #065f46, #047857)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-none">Welth Assistant</p>
            <p className="text-xs text-emerald-200 mt-0.5">NLP • Always learning</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1 hover:bg-white/20 transition-colors"
          >
            <Minimize2 className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white mt-0.5"
                style={{
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                      : "linear-gradient(135deg, #10b981, #059669)",
                }}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              {/* Bubble */}
              <div className="max-w-[80%]">
                {msg.role === "bot" &&
                (msg.action === "transaction_added" || msg.action === "goal_added") ? (
                  <ConfirmBubble text={msg.text} />
                ) : (
                  <div
                    className="px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                            color: "#fff",
                            borderRadius: "1rem 1rem 0.25rem 1rem",
                          }
                        : {
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e2e8f0",
                            borderRadius: "1rem 1rem 1rem 0.25rem",
                          }
                    }
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-600">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div
                className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    style={{ animation: `bounce 1s ease infinite ${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick suggestions */}
        {messages.length === 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs px-2.5 py-1 rounded-full transition-colors"
                style={{
                  border: "1px solid rgba(52,211,153,0.3)",
                  color: "#34d399",
                  background: "rgba(52,211,153,0.06)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. spent ₹200 on lunch..."
            disabled={loading}
            className="flex-1 text-sm rounded-full px-4 py-2 outline-none disabled:opacity-50"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}