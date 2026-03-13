"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wallet, Target, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, PlusCircle, Sparkles,
  BarChart2, Shield, Brain, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { createAccount } from "@/actions/dashboard";
import { updateBudget } from "@/actions/budget";
import useFetch from "@/hooks/use-fetch";

const fmt = (n) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(n??0);

const accountSchema = z.object({
  name:    z.string().min(1, "Account name required"),
  type:    z.enum(["CURRENT", "SAVINGS"]),
  balance: z.string().min(1, "Opening balance required"),
});

const budgetSchema = z.object({
  amount: z.string().min(1, "Budget amount required"),
});

const STEPS = [
  { id:0, label:"Welcome",  icon:Sparkles },
  { id:1, label:"Account",  icon:Wallet   },
  { id:2, label:"Budget",   icon:Target   },
  { id:3, label:"Done",     icon:CheckCircle2 },
];

const FEATURES = [
  { icon:Brain,     color:"#a78bfa", title:"AI-Powered",    desc:"LLaMA & LSTM predict your expenses" },
  { icon:TrendingUp,color:"#34d399", title:"Live Portfolio",  desc:"Real-time NSE stock & MF tracking"  },
  { icon:Shield,    color:"#60a5fa", title:"Anomaly Alerts", desc:"Flags unusual spending automatically" },
  { icon:BarChart2, color:"#f59e0b", title:"Smart Budgets",  desc:"Auto suggestions based on your habits"},
];

export default function OnboardingPage() {
  const router   = useRouter();
  const [step,   setStep]   = useState(0);
  const [skipBudget, setSkipBudget] = useState(false);

  // Account form
  const accForm = useForm({ resolver: zodResolver(accountSchema), defaultValues: { name:"", type:"SAVINGS", balance:"" } });
  const { loading: accLoading, fn: createAccountFn, data: newAccount } = useFetch(createAccount);

  // Budget form
  const budForm = useForm({ resolver: zodResolver(budgetSchema), defaultValues: { amount:"" } });
  const [budgLoading, setBudgLoading] = useState(false);

  const handleCreateAccount = async (data) => {
    const res = await createAccountFn({ ...data, balance: parseFloat(data.balance), isDefault: true });
    if (res?.success) { toast.success("Account created!"); setStep(2); }
    else toast.error("Failed to create account");
  };

  const handleSetBudget = async (data) => {
    setBudgLoading(true);
    try {
      const res = await updateBudget(parseFloat(data.amount));
      if (res?.success) { toast.success("Budget set!"); setStep(3); }
      else toast.error("Failed to set budget");
    } finally { setBudgLoading(false); }
  };

  const handleSkipBudget = () => { setSkipBudget(true); setStep(3); };
  const handleFinish     = () => router.push("/dashboard");

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#030712 0%,#0c1a2e 50%,#030712 100%)",
      padding:"24px 16px", position:"relative", overflow:"hidden" }}>

      {/* Background glows */}
      <div style={{ position:"absolute", top:-100, right:-100, width:400, height:400, borderRadius:"50%", background:"rgba(52,211,153,.05)", filter:"blur(80px)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-100, left:-100, width:350, height:350, borderRadius:"50%", background:"rgba(96,165,250,.04)", filter:"blur(60px)", pointerEvents:"none" }}/>

      <div style={{ width:"100%", maxWidth:520, position:"relative" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:"1.8rem", fontWeight:800, color:"#34d399", letterSpacing:"-1px", fontFamily:"'Sora',sans-serif" }}>welth.</div>
          <p style={{ color:"#64748b", fontSize:".78rem", margin:"4px 0 0" }}>Your AI-powered finance companion</p>
        </div>

        {/* Stepper */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginBottom:28 }}>
          {STEPS.map((s, i) => {
            const Icon  = s.icon;
            const done  = step > s.id;
            const active= step === s.id;
            return (
              <div key={s.id} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div style={{ width:34, height:34, borderRadius:"50%",
                    background: done?"#10b981":active?"rgba(52,211,153,.15)":"rgba(255,255,255,.04)",
                    border: done?"2px solid #10b981":active?"2px solid rgba(52,211,153,.6)":"2px solid rgba(255,255,255,.08)",
                    display:"flex", alignItems:"center", justifyContent:"center", transition:"all .3s" }}>
                    {done
                      ? <CheckCircle2 size={16} style={{ color:"#fff" }}/>
                      : <Icon size={14} style={{ color:active?"#34d399":"#475569" }}/>}
                  </div>
                  <span style={{ fontSize:".6rem", color:active?"#34d399":done?"#10b981":"#475569", fontWeight:active||done?700:500 }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width:50, height:2, background: step > s.id?"rgba(52,211,153,.4)":"rgba(255,255,255,.06)", margin:"0 6px 16px", transition:"all .3s" }}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:24, overflow:"hidden", backdropFilter:"blur(12px)" }}>

          {/* ── STEP 0: Welcome ── */}
          {step === 0 && (
            <div style={{ padding:"32px 28px" }}>
              <h2 style={{ fontWeight:800, fontSize:"1.3rem", color:"#f1f5f9", margin:"0 0 6px" }}>Welcome to Welth 👋</h2>
              <p style={{ color:"#64748b", fontSize:".82rem", margin:"0 0 24px", lineHeight:1.6 }}>
                Set up your account in 2 quick steps. It takes less than a minute.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:24 }}>
                {FEATURES.map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.title} style={{ padding:"12px 14px", borderRadius:12,
                      background:`${f.color}0d`, border:`1px solid ${f.color}25` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                        <Icon size={13} style={{ color:f.color }}/>
                        <span style={{ fontSize:".72rem", fontWeight:700, color:f.color }}>{f.title}</span>
                      </div>
                      <p style={{ fontSize:".65rem", color:"#64748b", margin:0, lineHeight:1.4 }}>{f.desc}</p>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setStep(1)}
                style={{ width:"100%", padding:"12px", borderRadius:12,
                  background:"linear-gradient(135deg,#10b981,#059669)", border:"none",
                  color:"#fff", fontWeight:700, fontSize:".9rem", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                Get Started <ArrowRight size={16}/>
              </button>
            </div>
          )}

          {/* ── STEP 1: Create Account ── */}
          {step === 1 && (
            <form onSubmit={accForm.handleSubmit(handleCreateAccount)} style={{ padding:"28px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:"rgba(52,211,153,.12)", border:"1px solid rgba(52,211,153,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Wallet size={16} style={{ color:"#34d399" }}/>
                </div>
                <div>
                  <h2 style={{ fontWeight:800, fontSize:"1.05rem", color:"#f1f5f9", margin:0 }}>Create your first account</h2>
                  <p style={{ color:"#64748b", fontSize:".72rem", margin:0 }}>This will be your default account</p>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <Field label="Account Name" error={accForm.formState.errors.name?.message}>
                  <input {...accForm.register("name")} placeholder="e.g. SBI Savings, HDFC Current"
                    style={inputStyle}/>
                </Field>

                <Field label="Account Type" error={accForm.formState.errors.type?.message}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {["SAVINGS","CURRENT"].map(t => {
                      const sel = accForm.watch("type") === t;
                      return (
                        <button type="button" key={t} onClick={() => accForm.setValue("type", t)}
                          style={{ padding:"10px", borderRadius:10, cursor:"pointer",
                            background: sel?"rgba(52,211,153,.12)":"rgba(255,255,255,.03)",
                            border: sel?"1px solid rgba(52,211,153,.4)":"1px solid rgba(255,255,255,.08)",
                            color: sel?"#34d399":"#64748b", fontWeight: sel?700:500, fontSize:".8rem" }}>
                          {t === "SAVINGS" ? "🏦 Savings" : "💼 Current"}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Opening Balance (₹)" error={accForm.formState.errors.balance?.message}>
                  <input {...accForm.register("balance")} type="number" placeholder="e.g. 25000"
                    style={inputStyle}/>
                </Field>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:22 }}>
                <button type="button" onClick={() => setStep(0)}
                  style={{ ...outlineBtn, width:44 }}>
                  <ArrowLeft size={15}/>
                </button>
                <button type="submit" disabled={accLoading}
                  style={{ ...primaryBtn, flex:1 }}>
                  {accLoading ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> : <><PlusCircle size={15}/> Create Account</>}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2: Set Budget ── */}
          {step === 2 && (
            <form onSubmit={budForm.handleSubmit(handleSetBudget)} style={{ padding:"28px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
                <div style={{ width:36, height:36, borderRadius:11, background:"rgba(245,158,11,.12)", border:"1px solid rgba(245,158,11,.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Target size={16} style={{ color:"#f59e0b" }}/>
                </div>
                <div>
                  <h2 style={{ fontWeight:800, fontSize:"1.05rem", color:"#f1f5f9", margin:0 }}>Set a monthly budget</h2>
                  <p style={{ color:"#64748b", fontSize:".72rem", margin:0 }}>We'll alert you before you overspend</p>
                </div>
              </div>

              <div style={{ padding:"14px 16px", borderRadius:12, background:"rgba(245,158,11,.06)", border:"1px solid rgba(245,158,11,.15)", marginBottom:18 }}>
                <p style={{ fontSize:".75rem", color:"#94a3b8", margin:0, lineHeight:1.55 }}>
                  💡 A good rule of thumb: set your budget at <b style={{ color:"#f59e0b" }}>80% of your monthly income</b>. This leaves room for savings and unexpected expenses.
                </p>
              </div>

              <Field label="Monthly Budget (₹)" error={budForm.formState.errors.amount?.message}>
                <input {...budForm.register("amount")} type="number" placeholder="e.g. 40000"
                  style={inputStyle}/>
              </Field>

              <div style={{ display:"flex", gap:8, marginTop:22 }}>
                <button type="button" onClick={handleSkipBudget}
                  style={{ ...outlineBtn, fontSize:".75rem", padding:"10px 16px", whiteSpace:"nowrap" }}>
                  Skip for now
                </button>
                <button type="submit" disabled={budgLoading}
                  style={{ ...primaryBtn, flex:1 }}>
                  {budgLoading ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> : <><Target size={15}/> Set Budget</>}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: Done ── */}
          {step === 3 && (
            <div style={{ padding:"32px 28px", textAlign:"center" }}>
              <div style={{ width:64, height:64, borderRadius:"50%",
                background:"rgba(52,211,153,.12)", border:"2px solid rgba(52,211,153,.4)",
                display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                <CheckCircle2 size={28} style={{ color:"#34d399" }}/>
              </div>
              <h2 style={{ fontWeight:800, fontSize:"1.2rem", color:"#f1f5f9", margin:"0 0 8px" }}>
                You're all set! 🎉
              </h2>
              <p style={{ color:"#64748b", fontSize:".82rem", lineHeight:1.6, margin:"0 0 24px" }}>
                Your account is ready. Head to the dashboard to add transactions, track investments, and let AI do the heavy lifting.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24, textAlign:"left" }}>
                {[
                  "Add your first transaction",
                  "Set up savings goals",
                  "Track your investments in Portfolio",
                  "Ask CA Arjun any finance question",
                ].map((tip, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
                    borderRadius:10, background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.06)" }}>
                    <span style={{ width:20, height:20, borderRadius:"50%", background:"rgba(52,211,153,.15)", border:"1px solid rgba(52,211,153,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".65rem", fontWeight:700, color:"#34d399", flexShrink:0 }}>{i+1}</span>
                    <span style={{ fontSize:".78rem", color:"#94a3b8" }}>{tip}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleFinish}
                style={{ ...primaryBtn, width:"100%", justifyContent:"center" }}>
                Go to Dashboard <ArrowRight size={15}/>
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign:"center", color:"#334155", fontSize:".68rem", marginTop:16 }}>
          Welth · Your data stays private and secure
        </p>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Mini helpers ──────────────────────────────────────────────────────────────
function Field({ label, error, children }) {
  return (
    <div>
      <label style={{ fontSize:".72rem", color:"#94a3b8", fontWeight:600, display:"block", marginBottom:5 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize:".68rem", color:"#f87171", margin:"4px 0 0" }}>{error}</p>}
    </div>
  );
}

const inputStyle = {
  width:"100%", padding:"10px 12px", borderRadius:10,
  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
  color:"#f1f5f9", fontSize:".82rem", outline:"none",
};
const primaryBtn = {
  display:"flex", alignItems:"center", gap:7, padding:"11px 18px", borderRadius:12,
  background:"linear-gradient(135deg,#10b981,#059669)", border:"none",
  color:"#fff", fontWeight:700, fontSize:".85rem", cursor:"pointer",
};
const outlineBtn = {
  display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"11px 14px", borderRadius:12,
  background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)",
  color:"#64748b", fontWeight:600, fontSize:".82rem", cursor:"pointer",
};