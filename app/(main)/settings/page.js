"use client";

import { useState, useEffect } from "react";
import {
  User, Bell, Palette, Shield, Save, Loader2,
  Mail, MessageSquare, BarChart2, Moon, Sun,
  CheckCircle2, AlertCircle, ChevronRight, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

const TABS = [
  { id: "profile",       label: "Profile",       icon: User    },
  { id: "notifications", label: "Notifications",  icon: Bell    },
  { id: "preferences",   label: "Preferences",    icon: Palette },
  { id: "danger",        label: "Danger Zone",    icon: Shield  },
];

const CURRENCIES = ["INR","USD","EUR","GBP","JPY","AED","SGD","AUD","CAD"];
const VIEWS      = [
  { value:"dashboard", label:"Dashboard"  },
  { value:"portfolio", label:"Portfolio"  },
  { value:"predictions",label:"Predictions"},
];

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const [tab,     setTab]     = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const [form, setForm] = useState({
    name:    "",
    email:   "",
    notifications: {
      emailBudgetAlert:   true,
      emailMonthlyReport: true,
      emailGoalAlert:     true,
      whatsappAlerts:     false,
      whatsappPhone:      "",
    },
    preferences: {
      currency:    "INR",
      defaultView: "dashboard",
      theme:       "dark",
    },
  });

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const set = (path, value) => {
    setForm(prev => {
      const next = structuredClone(prev);
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        toast.success("Settings saved!");
        setTimeout(() => setSaved(false), 2500);
      } else {
        toast.error("Failed to save");
      }
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", gap:10 }}>
      <Loader2 size={20} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
      <span style={{ color:"#64748b" }}>Loading settings…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 className="text-5xl gradient-title">Settings</h1>
        <p style={{ color:"#64748b", fontSize:".85rem", marginTop:6 }}>Manage your profile, notifications, and preferences</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr", gap:20 }}>

        {/* ── Sidebar ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12,
                  background:   active ? "rgba(167,139,250,.12)" : "transparent",
                  border:       active ? "1px solid rgba(167,139,250,.25)" : "1px solid transparent",
                  color:        active ? "#a78bfa" : "#64748b",
                  fontWeight:   active ? 700 : 500,
                  fontSize:     ".82rem", cursor:"pointer", textAlign:"left",
                  transition:   "all .15s",
                }}>
                <Icon size={15}/>
                {t.label}
                {active && <ChevronRight size={12} style={{ marginLeft:"auto" }}/>}
              </button>
            );
          })}
        </div>

        {/* ── Content panel ── */}
        <div style={{ background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)",
          borderRadius:20, padding:28, minHeight:420 }}>

          {/* ──── PROFILE ──── */}
          {tab === "profile" && (
            <div>
              <SectionTitle icon={User} title="Profile" color="#a78bfa"/>

              {/* Avatar from Clerk */}
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28,
                padding:"16px 18px", borderRadius:14, background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                {clerkUser?.imageUrl
                  ? <img src={clerkUser.imageUrl} alt="avatar" style={{ width:52, height:52, borderRadius:"50%", border:"2px solid rgba(167,139,250,.4)" }}/>
                  : <div style={{ width:52, height:52, borderRadius:"50%", background:"rgba(167,139,250,.15)", border:"2px solid rgba(167,139,250,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <User size={22} style={{ color:"#a78bfa" }}/>
                    </div>
                }
                <div>
                  <p style={{ fontWeight:700, fontSize:".9rem", color:"#f1f5f9", margin:0 }}>{clerkUser?.fullName || form.name || "Your Name"}</p>
                  <p style={{ fontSize:".73rem", color:"#64748b", margin:"2px 0 0" }}>{form.email}</p>
                  <p style={{ fontSize:".65rem", color:"#475569", margin:"4px 0 0" }}>Profile picture managed via Clerk</p>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                <Field label="Display Name">
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder="Your full name" style={inputSt}/>
                </Field>
                <Field label="Email Address">
                  <input value={form.email} disabled
                    style={{ ...inputSt, opacity:.5, cursor:"not-allowed" }}/>
                  <p style={{ fontSize:".68rem", color:"#475569", margin:"4px 0 0" }}>Email is managed by your auth provider</p>
                </Field>
              </div>
            </div>
          )}

          {/* ──── NOTIFICATIONS ──── */}
          {tab === "notifications" && (
            <div>
              <SectionTitle icon={Bell} title="Notifications" color="#60a5fa"/>

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <p style={{ fontSize:".75rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 4px" }}>Email</p>

                <Toggle label="Budget Alert Emails" desc="Get notified when you reach 80% of your monthly budget"
                  icon={Mail} color="#60a5fa"
                  checked={form.notifications.emailBudgetAlert}
                  onChange={v => set("notifications.emailBudgetAlert", v)}/>

                <Toggle label="Monthly Report Emails" desc="Receive a summary of your finances on the 1st of each month"
                  icon={BarChart2} color="#34d399"
                  checked={form.notifications.emailMonthlyReport}
                  onChange={v => set("notifications.emailMonthlyReport", v)}/>

                <Toggle label="Savings Goal Alerts" desc="Email when you fall behind on a savings goal"
                  icon={Bell} color="#f59e0b"
                  checked={form.notifications.emailGoalAlert}
                  onChange={v => set("notifications.emailGoalAlert", v)}/>

                <p style={{ fontSize:".75rem", fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", margin:"16px 0 4px" }}>WhatsApp (via Twilio)</p>

                <Toggle label="WhatsApp Alerts" desc="Receive budget and goal alerts on WhatsApp"
                  icon={MessageSquare} color="#25d366"
                  checked={form.notifications.whatsappAlerts}
                  onChange={v => set("notifications.whatsappAlerts", v)}/>

                {form.notifications.whatsappAlerts && (
                  <Field label="WhatsApp Phone Number">
                    <input value={form.notifications.whatsappPhone}
                      onChange={e => set("notifications.whatsappPhone", e.target.value)}
                      placeholder="+91 98765 43210" style={inputSt}/>
                    <p style={{ fontSize:".68rem", color:"#475569", margin:"4px 0 0" }}>
                      Include country code · Needs TWILIO_SID + TWILIO_TOKEN in .env
                    </p>
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* ──── PREFERENCES ──── */}
          {tab === "preferences" && (
            <div>
              <SectionTitle icon={Palette} title="Preferences" color="#f59e0b"/>

              <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                <Field label="Default Currency">
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {CURRENCIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => set("preferences.currency", c)}
                        style={{ padding:"6px 14px", borderRadius:9999, fontSize:".78rem", fontWeight:700, cursor:"pointer",
                          background: form.preferences.currency===c ? "rgba(245,158,11,.15)" : "rgba(255,255,255,.04)",
                          border:     form.preferences.currency===c ? "1px solid rgba(245,158,11,.4)" : "1px solid rgba(255,255,255,.08)",
                          color:      form.preferences.currency===c ? "#f59e0b" : "#64748b",
                        }}>{c}</button>
                    ))}
                  </div>
                </Field>

                <Field label="Default Landing Page">
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {VIEWS.map(v => (
                      <button key={v.value} type="button"
                        onClick={() => set("preferences.defaultView", v.value)}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12,
                          background: form.preferences.defaultView===v.value ? "rgba(245,158,11,.08)" : "rgba(255,255,255,.03)",
                          border:     form.preferences.defaultView===v.value ? "1px solid rgba(245,158,11,.3)" : "1px solid rgba(255,255,255,.06)",
                          color:      form.preferences.defaultView===v.value ? "#f59e0b" : "#64748b",
                          fontSize:".82rem", fontWeight: form.preferences.defaultView===v.value ? 700:500, cursor:"pointer",
                        }}>
                        {form.preferences.defaultView===v.value && <CheckCircle2 size={14}/>}
                        {v.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Theme">
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[{v:"dark",label:"Dark",icon:Moon},{v:"light",label:"Light",icon:Sun}].map(t => {
                      const Icon = t.icon;
                      const sel  = form.preferences.theme===t.v;
                      return (
                        <button key={t.v} type="button" onClick={() => set("preferences.theme", t.v)}
                          style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 16px", borderRadius:12,
                            background: sel ? "rgba(167,139,250,.12)" : "rgba(255,255,255,.03)",
                            border:     sel ? "1px solid rgba(167,139,250,.3)" : "1px solid rgba(255,255,255,.06)",
                            color:      sel ? "#a78bfa" : "#64748b",
                            fontWeight: sel ? 700 : 500, fontSize:".82rem", cursor:"pointer" }}>
                          <Icon size={15}/> {t.label}
                          {sel && <CheckCircle2 size={12} style={{ marginLeft:"auto" }}/>}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ──── DANGER ZONE ──── */}
          {tab === "danger" && (
            <div>
              <SectionTitle icon={Shield} title="Danger Zone" color="#ef4444"/>

              <div style={{ padding:"18px 20px", borderRadius:14, background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.2)", marginBottom:16 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <AlertCircle size={18} style={{ color:"#ef4444", flexShrink:0, marginTop:2 }}/>
                  <div>
                    <p style={{ fontWeight:700, color:"#f87171", fontSize:".85rem", margin:"0 0 5px" }}>Delete Account</p>
                    <p style={{ fontSize:".75rem", color:"#94a3b8", margin:"0 0 14px", lineHeight:1.6 }}>
                      Permanently delete your Welth account and all data — transactions, accounts, portfolio, goals. This cannot be undone.
                    </p>
                    <button
                      onClick={() => toast.error("To delete your account, go to your Clerk profile settings or contact support.")}
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10,
                        background:"rgba(239,68,68,.12)", border:"1px solid rgba(239,68,68,.3)",
                        color:"#ef4444", fontSize:".78rem", fontWeight:700, cursor:"pointer" }}>
                      <Trash2 size={13}/> Delete My Account
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ padding:"18px 20px", borderRadius:14, background:"rgba(245,158,11,.05)", border:"1px solid rgba(245,158,11,.15)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <AlertCircle size={18} style={{ color:"#f59e0b", flexShrink:0, marginTop:2 }}/>
                  <div>
                    <p style={{ fontWeight:700, color:"#f59e0b", fontSize:".85rem", margin:"0 0 5px" }}>Clear All Transactions</p>
                    <p style={{ fontSize:".75rem", color:"#94a3b8", margin:"0 0 14px", lineHeight:1.6 }}>
                      Delete all your transactions but keep accounts, goals, and portfolio intact.
                    </p>
                    <button
                      onClick={() => toast.error("Please contact support to clear transaction data.")}
                      style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", borderRadius:10,
                        background:"rgba(245,158,11,.1)", border:"1px solid rgba(245,158,11,.25)",
                        color:"#f59e0b", fontSize:".78rem", fontWeight:700, cursor:"pointer" }}>
                      <Trash2 size={13}/> Clear Transactions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Save button (not on danger tab) ── */}
          {tab !== "danger" && (
            <div style={{ marginTop:28, display:"flex", justifyContent:"flex-end" }}>
              <button onClick={handleSave} disabled={saving}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 22px", borderRadius:12,
                  background: saved ? "rgba(52,211,153,.15)" : "linear-gradient(135deg,#10b981,#059669)",
                  border:     saved ? "1px solid rgba(52,211,153,.4)" : "none",
                  color:      saved ? "#34d399" : "#fff",
                  fontWeight:700, fontSize:".85rem", cursor:saving?"wait":"pointer", transition:"all .2s" }}>
                {saving
                  ? <><Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> Saving…</>
                  : saved
                  ? <><CheckCircle2 size={15}/> Saved!</>
                  : <><Save size={15}/> Save Changes</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:22, paddingBottom:14, borderBottom:"1px solid rgba(255,255,255,.06)" }}>
      <div style={{ width:34, height:34, borderRadius:10, background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={16} style={{ color }}/>
      </div>
      <h2 style={{ fontWeight:800, fontSize:"1rem", color:"#f1f5f9", margin:0 }}>{title}</h2>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:".73rem", color:"#94a3b8", fontWeight:600, display:"block", marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, icon: Icon, color, checked, onChange }) {
  return (
    <div onClick={() => onChange(!checked)}
      style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:13,
        background: checked ? `${color}0a` : "rgba(255,255,255,.02)",
        border:     checked ? `1px solid ${color}25` : "1px solid rgba(255,255,255,.06)",
        cursor:"pointer", transition:"all .15s" }}>
      <div style={{ width:34, height:34, borderRadius:9, background:`${color}12`, border:`1px solid ${color}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={15} style={{ color }}/>
      </div>
      <div style={{ flex:1 }}>
        <p style={{ fontWeight:700, fontSize:".82rem", color:"#f1f5f9", margin:0 }}>{label}</p>
        <p style={{ fontSize:".68rem", color:"#64748b", margin:"2px 0 0" }}>{desc}</p>
      </div>
      {/* Toggle pill */}
      <div style={{ width:42, height:24, borderRadius:12, background: checked ? color : "rgba(255,255,255,.08)", transition:"background .2s", flexShrink:0, position:"relative" }}>
        <div style={{ position:"absolute", top:3, left: checked ? 20 : 3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.3)" }}/>
      </div>
    </div>
  );
}

const inputSt = {
  width:"100%", padding:"10px 14px", borderRadius:10,
  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
  color:"#f1f5f9", fontSize:".82rem", outline:"none",
};