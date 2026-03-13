"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Bot, User, Loader2, X, Mic, CheckCircle2,
  Sparkles, TrendingUp, AlertTriangle,
  BarChart2, Shield, Briefcase, ChevronRight,
  PieChart,
} from "lucide-react";

const SUGGESTIONS = {
  ca:     ["analyse my spending", "how is my financial health?", "how can I save more?", "what is my savings rate?"],
  invest: ["where should I invest my savings?", "suggest SIP for ₹5000/month", "best mutual funds for beginners", "stocks or mutual funds?"],
  tax:    ["how can I save tax?", "what is section 80C?", "old or new tax regime?", "how much tax will I pay?"],
  quick:  ["spent ₹300 on food today", "received ₹50000 salary", "paid ₹1200 for groceries", "save ₹60000 in 5 months"],
};

const MODES = [
  { key: "ca",     label: "CA Advisor", icon: Briefcase,  color: "#fbbf24", desc: "Financial health & advice" },
  { key: "invest", label: "Invest",     icon: TrendingUp, color: "#34d399", desc: "Stocks & mutual funds" },
  { key: "tax",    label: "Tax",        icon: Shield,     color: "#60a5fa", desc: "Tax planning & savings" },
  { key: "quick",  label: "Quick Add",  icon: BarChart2,  color: "#a78bfa", desc: "Log transactions fast" },
];

const responseCache = new Map();

// ── Confirm bubble ────────────────────────────────────────────────────────────
function ConfirmBubble({ text }) {
  const lines   = text.split("\n").filter(Boolean);
  const title   = lines[0];
  const details = lines.slice(1).filter(l => l.startsWith("•"));
  const footer  = lines.find(l => l.includes("CA Arjun") || l.includes("dashboard"));
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.06))", border: "1px solid rgba(52,211,153,.3)", borderRadius: "1rem 1rem 1rem .2rem", overflow: "hidden", fontSize: ".8rem" }}>
      <div style={{ background: "rgba(16,185,129,.18)", padding: ".45rem .8rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
        <CheckCircle2 size={13} color="#34d399" />
        <span style={{ fontWeight: 700, color: "#6ee7b7" }}>{title}</span>
      </div>
      <div style={{ padding: ".5rem .8rem", display: "flex", flexDirection: "column", gap: 3 }}>
        {details.map((l, i) => <p key={i} style={{ color: "#94a3b8", margin: 0 }}>{l}</p>)}
        {footer && <p style={{ color: "#34d399", margin: "4px 0 0", fontSize: ".72rem", fontStyle: "italic" }}>{footer}</p>}
      </div>
    </div>
  );
}

// ── Investment recommendation card ────────────────────────────────────────────
function InvestmentCard({ data }) {
  const [expanded, setExpanded] = useState(false);
  const riskColor = { Low: "#34d399", Medium: "#fbbf24", High: "#f87171" };
  const fmt = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

  if (!data?.recommendations) return null;

  return (
    <div style={{ fontSize: ".8rem", borderRadius: "1rem 1rem 1rem .2rem", overflow: "hidden", border: "1px solid rgba(52,211,153,.22)" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,rgba(16,185,129,.14),rgba(52,211,153,.07))", padding: ".6rem .85rem", borderBottom: "1px solid rgba(52,211,153,.14)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <TrendingUp size={13} color="#34d399" />
          <span style={{ fontWeight: 700, color: "#34d399" }}>Investment Plan · CA Arjun</span>
        </div>
        <p style={{ color: "#94a3b8", margin: 0, lineHeight: 1.55, fontSize: ".78rem" }}>{data.summary}</p>
      </div>

      {/* Monthly investable strip */}
      <div style={{ padding: ".45rem .85rem", background: "rgba(52,211,153,.04)", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#64748b", fontSize: ".72rem" }}>Monthly investable amount</span>
        <span style={{ fontWeight: 800, color: "#34d399", fontSize: ".88rem" }}>{fmt(data.monthlyInvestable)}</span>
      </div>

      {/* Recommendation rows */}
      <div style={{ padding: ".5rem .55rem", display: "flex", flexDirection: "column", gap: 5 }}>
        {(data.recommendations || []).map((r, i) => (
          <div key={i} style={{ background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: ".5rem .65rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 18, height: 18, borderRadius: 9999, background: "rgba(52,211,153,.15)", color: "#34d399", fontSize: ".62rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</span>
                <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: ".8rem" }}>{r.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: ".65rem", color: riskColor[r.risk] || "#94a3b8", padding: "1px 6px", borderRadius: 9999, background: `${riskColor[r.risk] || "#94a3b8"}18` }}>{r.risk}</span>
                <span style={{ fontWeight: 800, color: "#34d399", fontSize: ".82rem" }}>{fmt(r.monthlyAmount)}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".7rem", color: "#64748b", marginBottom: 3 }}>
              <span>{r.type} · {r.allocation}%</span>
              <span style={{ color: "#a78bfa" }}>~{r.expectedReturn}</span>
            </div>
            <p style={{ color: "#94a3b8", margin: 0, fontSize: ".72rem", lineHeight: 1.45 }}>{r.why}</p>
            {expanded && r.howTo && (
              <p style={{ color: "#60a5fa", margin: "3px 0 0", fontSize: ".7rem" }}>▶ {r.howTo}</p>
            )}
          </div>
        ))}
      </div>

      {/* Expand */}
      <button onClick={() => setExpanded(v => !v)}
        style={{ width: "100%", padding: ".4rem", background: "rgba(255,255,255,.025)", border: "none", borderTop: "1px solid rgba(255,255,255,.06)", color: "#64748b", fontSize: ".72rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        {expanded ? "Hide how to start" : "Show how to start"}
        <ChevronRight size={11} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>

      {/* Footer */}
      {(data.nextStep || data.warnings?.length > 0 || data.caNote) && (
        <div style={{ padding: ".55rem .85rem", background: "rgba(0,0,0,.2)", borderTop: "1px solid rgba(255,255,255,.06)", display: "flex", flexDirection: "column", gap: 4 }}>
          {data.nextStep && (
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <ChevronRight size={11} color="#34d399" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ color: "#34d399", margin: 0, fontSize: ".75rem", fontWeight: 600 }}>{data.nextStep}</p>
            </div>
          )}
          {(data.warnings || []).map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <AlertTriangle size={10} color="#fbbf24" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ color: "#64748b", margin: 0, fontSize: ".7rem", fontStyle: "italic" }}>{w}</p>
            </div>
          ))}
          {data.caNote && <p style={{ color: "#fbbf24", margin: 0, fontSize: ".72rem", fontStyle: "italic" }}>— {data.caNote}</p>}
        </div>
      )}
    </div>
  );
}

// ── Voice bars ────────────────────────────────────────────────────────────────
function VoiceBars({ color = "#f87171" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {[0, .12, .24, .12, 0].map((d, i) => (
        <span key={i} style={{ width: 2, height: 12, borderRadius: 2, background: color, display: "inline-block", animation: "vBar .65s ease-in-out infinite alternate", animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChatBot() {
  const [isOpen,      setIsOpen]      = useState(false);
  const [mode,        setMode]        = useState("ca");
  const [showModes,   setShowModes]   = useState(false);
  const [messages,    setMessages]    = useState([{
    role: "bot", type: "text",
    text: "Good day! I am CA Arjun, your personal Chartered Accountant & Investment Advisor.\n\nI can help you with:\n💼 Financial health & spending analysis\n📈 Stock & mutual fund recommendations\n🛡️ Tax planning & ITR tips\n➕ Quick transaction logging\n\nSelect a mode or just ask me anything!",
  }]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [voiceOk,     setVoiceOk]     = useState(false);

  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => setVoiceOk(typeof navigator !== "undefined" && !!navigator.mediaDevices), []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 200); }, [isOpen]);

  const currentMode = MODES.find(m => m.key === mode) || MODES[0];

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(p => [...p, { role: "user", type: "text", text: trimmed }]);
    setInput(""); setTranscript("");
    setLoading(true);

    const isWrite = /^(add|spent|paid|received|save\s+₹|\d)/i.test(trimmed);
    const cacheKey = `${mode}::${trimmed.toLowerCase()}`;

    if (!isWrite && responseCache.has(cacheKey)) {
      const c = responseCache.get(cacheKey);
      setMessages(p => [...p, { ...c, role: "bot" }]);
      setLoading(false);
      return;
    }

    try {
      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, mode }),
      });
      const data = await res.json();
      const msg  = { role: "bot", type: data.type || "text", text: data.reply || data.text, action: data.action, data: data.data };
      if (!isWrite) responseCache.set(cacheKey, msg);
      setMessages(p => [...p, msg]);
    } catch {
      setMessages(p => [...p, { role: "bot", type: "text", text: "⚠️ Server error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, mode]);

  // ── Voice — Whisper (HF) primary, Web Speech API fallback ────────────────
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);

  const startListening = useCallback(async () => {
    setIsListening(true);
    audioChunksRef.current = [];

    // ── Try Whisper via MediaRecorder ────────────────────────────────────
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsListening(false);

        const blob   = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 500) return; // too short — nothing recorded

        setLoading(true);
        setMessages(p => [...p, { role: "bot", type: "text", text: "🎤 Transcribing with Whisper…" }]);

        try {
          const res  = await fetch("/api/hf/transcribe", {
            method:  "POST",
            headers: { "Content-Type": "audio/webm" },
            body:    blob,
          });
          const data = await res.json();

          if (res.status === 503) {
            // Model cold start — fallback to Web Speech
            setMessages(p => p.slice(0, -1)); // remove "transcribing…" msg
            _fallbackWebSpeech();
            return;
          }

          if (data.text) {
            setMessages(p => p.slice(0, -1)); // remove "transcribing…" msg
            setInput(data.text);
            setTimeout(() => sendMessage(data.text), 100);
          } else {
            setMessages(p => [...p.slice(0, -1), { role:"bot", type:"text", text:"🎤 Couldn't hear clearly. Try again." }]);
          }
        } catch {
          setMessages(p => [...p.slice(0, -1), { role:"bot", type:"text", text:"🎤 Whisper unavailable — try typing." }]);
        } finally {
          setLoading(false);
        }
      };

      recorder.start();
      // Auto-stop after 8 seconds
      setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 8000);

    } catch (err) {
      // No mic permission or MediaRecorder not supported → fallback
      setIsListening(false);
      if (err.name === "NotAllowedError") {
        setMessages(p => [...p, { role:"bot", type:"text", text:"🎤 Mic permission blocked. Allow it in browser settings." }]);
      } else {
        _fallbackWebSpeech();
      }
    }
  }, [sendMessage]);

  // ── Web Speech fallback (for Whisper cold-start) ─────────────────────────
  const _fallbackWebSpeech = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR(); recognitionRef.current = r;
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false;
    let cap = "";
    r.onstart  = () => { cap = ""; setIsListening(true); };
    r.onresult = e => {
      let fi = "", it = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fi += t; else it += t;
      }
      cap = (cap + fi) || it;
      setTranscript(cap || it); setInput(cap || it);
    };
    r.onend   = () => { setIsListening(false); recognitionRef.current = null; const t = cap.trim(); if (t) setTimeout(() => sendMessage(t), 150); };
    r.onerror = e => {
      setIsListening(false); recognitionRef.current = null;
      const msgs = { "not-allowed": "🎤 Mic blocked.", "no-speech": "🎤 Nothing heard." };
      setMessages(p => [...p, { role:"bot", type:"text", text: msgs[e.error] || `🎤 ${e.error}` }]);
    };
    r.start();
  }, [sendMessage]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
  }, []);

  const handleModeChange = (key) => {
    setMode(key);
    setShowModes(false);
    const m = MODES.find(m => m.key === key);
    setMessages(p => [...p, { role: "bot", type: "text", text: `Switched to ${m.label} mode.\n${m.desc}. Try a suggestion below or ask anything!` }]);
  };

  return (
    <>
      {/* ── Trigger pill ── */}
      <button onClick={() => setIsOpen(v => !v)}
        style={{
          position: "fixed", top: "4.8rem", right: "1.25rem", zIndex: 9999,
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 16px 8px 10px", borderRadius: 9999,
          background: isOpen ? "linear-gradient(135deg,#065f46,#047857)" : "rgba(3,7,18,.88)",
          border: `1px solid ${isOpen ? "rgba(52,211,153,.5)" : "rgba(52,211,153,.3)"}`,
          boxShadow: isOpen ? "0 0 24px rgba(16,185,129,.4)" : "0 0 16px rgba(52,211,153,.18),0 2px 8px rgba(0,0,0,.3)",
          cursor: "pointer", transition: "all .25s",
        }}>
        <div style={{ width: 28, height: 28, borderRadius: 9999, background: isOpen ? "rgba(255,255,255,.15)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(16,185,129,.5)", animation: !isOpen ? "aiPulse 2.5s ease-in-out infinite" : "none" }}>
          {loading ? <Loader2 size={13} color="#fff" style={{ animation: "spin 1s linear infinite" }} /> : isOpen ? <X size={13} color="#fff" /> : <Sparkles size={13} color="#fff" />}
        </div>
        <span style={{ fontSize: ".8rem", fontWeight: 700, color: isOpen ? "#fff" : "#34d399", fontFamily: "'Sora',sans-serif" }}>
          {isOpen ? "Close" : "Ask CA"}
        </span>
        {!isOpen && <span style={{ width: 6, height: 6, borderRadius: 9999, background: "#34d399", boxShadow: "0 0 6px #34d399", animation: "liveDot 1.5s ease-in-out infinite" }} />}
      </button>

      {/* ── Panel ── */}
      <div style={{
        position: "fixed", top: "8rem", right: "1.25rem", zIndex: 9998,
        width: "23rem", maxWidth: "calc(100vw - 2rem)", height: "36rem",
        background: "rgba(5,13,27,.97)", border: "1px solid rgba(52,211,153,.18)",
        borderRadius: "1.25rem", boxShadow: "0 30px 70px rgba(0,0,0,.65),0 0 40px rgba(16,185,129,.06)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0) scale(1)" : "translateY(-14px) scale(.96)",
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity .22s ease,transform .22s ease",
        backdropFilter: "blur(24px)",
      }}>

        {/* Header */}
        <div style={{ padding: ".65rem 1rem", background: "linear-gradient(135deg,rgba(16,185,129,.1),rgba(52,211,153,.05))", borderBottom: "1px solid rgba(52,211,153,.12)", display: "flex", alignItems: "center", gap: ".65rem", flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9999, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(16,185,129,.45)", animation: "aiPulse 3s ease-in-out infinite", flexShrink: 0 }}>
            <Briefcase size={15} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#f0fdf4", fontWeight: 800, fontSize: ".85rem", margin: 0, fontFamily: "'Sora',sans-serif" }}>CA Arjun</p>
            <p style={{ color: currentMode.color, fontSize: ".68rem", margin: 0, transition: "color .2s" }}>
              {isListening ? "🎤 Listening…" : loading ? "Thinking…" : `${currentMode.label} Mode`}
            </p>
          </div>
          <button onClick={() => setShowModes(v => !v)}
            style={{ padding: "4px 10px", borderRadius: 9999, background: `${currentMode.color}18`, border: `1px solid ${currentMode.color}40`, color: currentMode.color, fontSize: ".7rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all .2s" }}>
            <PieChart size={10} /> Mode
          </button>
        </div>

        {/* Mode grid */}
        {showModes && (
          <div style={{ padding: ".5rem .55rem", background: "rgba(0,0,0,.45)", borderBottom: "1px solid rgba(255,255,255,.07)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, flexShrink: 0 }}>
            {MODES.map(m => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button key={m.key} onClick={() => handleModeChange(m.key)}
                  style={{ padding: "8px 9px", borderRadius: 10, background: active ? `${m.color}15` : "rgba(255,255,255,.03)", border: `1px solid ${active ? m.color + "50" : "rgba(255,255,255,.08)"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all .18s" }}>
                  <Icon size={13} style={{ color: m.color, flexShrink: 0 }} />
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: ".74rem", fontWeight: 700, color: active ? m.color : "#e2e8f0", margin: 0 }}>{m.label}</p>
                    <p style={{ fontSize: ".62rem", color: "#64748b", margin: 0 }}>{m.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Listening banner */}
        {isListening && (
          <div style={{ padding: ".4rem 1rem", background: "rgba(239,68,68,.1)", borderBottom: "1px solid rgba(239,68,68,.18)", display: "flex", alignItems: "center", gap: ".6rem", flexShrink: 0 }}>
            <VoiceBars />
            <p style={{ color: "#fca5a5", fontSize: ".75rem", flex: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {transcript ? `"${transcript}"` : "Speak now…"}
            </p>
            <button onClick={stopListening} style={{ background: "rgba(239,68,68,.4)", border: "none", color: "#fff", fontSize: ".68rem", padding: "2px 8px", borderRadius: 9999, cursor: "pointer" }}>Done</button>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: ".75rem", display: "flex", flexDirection: "column", gap: ".65rem" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: ".45rem", alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: 9999, flexShrink: 0, background: msg.role === "user" ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                {msg.role === "user" ? <User size={12} color="#fff" /> : <Sparkles size={12} color="#fff" />}
              </div>
              <div style={{ maxWidth: "86%" }}>
                {msg.type === "investment" && msg.data
                  ? <InvestmentCard data={msg.data} />
                  : msg.role === "bot" && (msg.action === "transaction_added" || msg.action === "goal_added")
                  ? <ConfirmBubble text={msg.text} />
                  : (
                    <div style={msg.role === "user"
                      ? { background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "#fff", padding: ".45rem .75rem", borderRadius: "1rem 1rem .2rem 1rem", fontSize: ".82rem", lineHeight: 1.55, whiteSpace: "pre-wrap" }
                      : { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", color: "#e2e8f0", padding: ".5rem .75rem", borderRadius: "1rem 1rem 1rem .2rem", fontSize: ".82rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }
                    }>
                      {msg.text}
                    </div>
                  )
                }
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: ".45rem", alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: 9999, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles size={12} color="#fff" />
              </div>
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", padding: ".5rem .8rem", borderRadius: "1rem 1rem 1rem .2rem", display: "flex", gap: 4, alignItems: "center" }}>
                {[0,160,320].map(d => <span key={d} style={{ width: 6, height: 6, borderRadius: 9999, background: currentMode.color, display: "inline-block", animation: `bounce 1s ease infinite ${d}ms` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 2 && (
          <div style={{ padding: "0 .7rem .5rem", display: "flex", flexWrap: "wrap", gap: ".35rem", flexShrink: 0 }}>
            {(SUGGESTIONS[mode] || []).map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                style={{ fontSize: ".68rem", padding: "3px 10px", borderRadius: 9999, border: `1px solid ${currentMode.color}30`, color: currentMode.color, background: `${currentMode.color}08`, cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: ".55rem .65rem", display: "flex", alignItems: "center", gap: ".4rem", flexShrink: 0, background: "rgba(0,0,0,.25)" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
            placeholder={isListening ? "Listening…" : currentMode.desc + "…"}
            disabled={loading}
            style={{ flex: 1, fontSize: ".8rem", borderRadius: 9999, padding: ".42rem .9rem", background: "rgba(255,255,255,.06)", border: `1px solid ${isListening ? "rgba(239,68,68,.45)" : `${currentMode.color}25`}`, color: "#e2e8f0", outline: "none", transition: "border-color .2s" }}
          />
          {voiceOk && (
            <button onClick={isListening ? stopListening : startListening} disabled={loading}
              style={{ width: 32, height: 32, borderRadius: 9999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: isListening ? "rgba(239,68,68,.8)" : "rgba(255,255,255,.07)", border: isListening ? "none" : "1px solid rgba(255,255,255,.1)", boxShadow: isListening ? "0 0 14px rgba(239,68,68,.5)" : "none", cursor: "pointer", transition: "all .2s" }}>
              {isListening ? <VoiceBars color="#fff" /> : <Mic size={13} color="#94a3b8" />}
            </button>
          )}
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            style={{ width: 32, height: 32, borderRadius: 9999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: input.trim() && !loading ? `linear-gradient(135deg,${currentMode.color},${currentMode.color}cc)` : "rgba(255,255,255,.06)", border: "none", boxShadow: input.trim() && !loading ? `0 0 12px ${currentMode.color}50` : "none", cursor: !input.trim() || loading ? "not-allowed" : "pointer", transition: "all .2s", opacity: !input.trim() || loading ? .4 : 1 }}>
            {loading ? <Loader2 size={13} color="#94a3b8" style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} color={input.trim() ? "#fff" : "#94a3b8"} />}
          </button>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap');
        @keyframes bounce  { 0%,100%{transform:translateY(0);opacity:.4} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes vBar    { from{transform:scaleY(.2);opacity:.4} to{transform:scaleY(1.3);opacity:1} }
        @keyframes aiPulse { 0%,100%{box-shadow:0 0 10px rgba(16,185,129,.4)} 50%{box-shadow:0 0 22px rgba(16,185,129,.75)} }
        @keyframes liveDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>
    </>
  );
}