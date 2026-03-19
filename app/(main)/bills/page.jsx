"use client";

import { useState, useEffect } from "react";
import {
  CalendarDays, AlertTriangle, Clock, ChevronLeft,
  ChevronRight, Bell, IndianRupee, CheckCircle2, Loader2,
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Interval badge ────────────────────────────────────────────────────────────
function IntervalBadge({ interval }) {
  const cfg = {
    MONTHLY: { label:"Monthly",  color:"#60a5fa" },
    WEEKLY:  { label:"Weekly",   color:"#a78bfa" },
    YEARLY:  { label:"Yearly",   color:"#34d399" },
    DAILY:   { label:"Daily",    color:"#f59e0b" },
  }[interval] || { label: interval, color:"#64748b" };
  return (
    <span style={{ padding:"1px 7px", borderRadius:9999, fontSize:".6rem", fontWeight:700,
      background:`${cfg.color}15`, border:`1px solid ${cfg.color}30`, color:cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Single Bill Row ───────────────────────────────────────────────────────────
function BillRow({ bill }) {
  const isIncome = bill.type === "INCOME";
  const urgency  = bill.isOverdue ? "overdue"
                 : bill.isDueSoon ? "soon"
                 : "normal";

  const urgencyStyle = {
    overdue: { bg:"rgba(248,113,113,.06)", border:"rgba(248,113,113,.2)",  badge:"#f87171", badgeBg:"rgba(248,113,113,.12)", label:"Overdue"  },
    soon:    { bg:"rgba(251,191,36,.06)",  border:"rgba(251,191,36,.2)",   badge:"#fbbf24", badgeBg:"rgba(251,191,36,.12)",  label:"Due soon" },
    normal:  { bg:"rgba(255,255,255,.02)", border:"rgba(255,255,255,.07)", badge:null,      badgeBg:null,                    label:null       },
  }[urgency];

  const dueLabel = bill.isOverdue
    ? `${Math.abs(bill.daysUntil)}d overdue`
    : bill.daysUntil === 0 ? "Due today"
    : bill.daysUntil === 1 ? "Due tomorrow"
    : `In ${bill.daysUntil} days`;

  return (
    <div style={{ padding:"12px 14px", borderRadius:14,
      background:urgencyStyle.bg, border:`1px solid ${urgencyStyle.border}`,
      display:"flex", alignItems:"center", gap:12 }}>

      {/* Icon */}
      <div style={{ width:38, height:38, borderRadius:11, flexShrink:0,
        background:`${bill.color}15`, border:`1px solid ${bill.color}25`,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.1rem" }}>
        {bill.emoji}
      </div>

      {/* Info */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:3 }}>
          <p style={{ fontWeight:700, fontSize:".82rem", color:"#f1f5f9", margin:0,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {bill.name}
          </p>
          <IntervalBadge interval={bill.interval}/>
          {urgencyStyle.badge && (
            <span style={{ padding:"1px 7px", borderRadius:9999, fontSize:".6rem", fontWeight:700,
              background:urgencyStyle.badgeBg, color:urgencyStyle.badge, display:"flex",
              alignItems:"center", gap:3, flexShrink:0 }}>
              {urgency === "overdue" ? <AlertTriangle size={9}/> : <Clock size={9}/>}
              {urgencyStyle.label}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <span style={{ fontSize:".7rem", color:"#64748b" }}>
            {new Date(bill.dueDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
          </span>
          <span style={{ fontSize:".7rem", color: bill.isOverdue ? "#f87171" : bill.isDueSoon ? "#fbbf24" : "#64748b", fontWeight:600 }}>
            {dueLabel}
          </span>
        </div>
      </div>

      {/* Amount */}
      <p style={{ fontWeight:800, fontSize:".95rem",
        color: isIncome ? "#34d399" : bill.isOverdue ? "#f87171" : "#f1f5f9",
        margin:0, flexShrink:0 }}>
        {isIncome ? "+" : "−"}{fmt(bill.amount)}
      </p>
    </div>
  );
}

// ── Calendar Grid ─────────────────────────────────────────────────────────────
function CalendarGrid({ year, month, byDate, onDayClick, selectedDay }) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month + 1, 0).getDate();
  const today     = new Date();
  const todayStr  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const cells = [];
  // Empty cells before month starts
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMo; d++) cells.push(d);

  return (
    <div>
      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:".65rem", color:"#475569",
            fontWeight:700, padding:"4px 0", textTransform:"uppercase" }}>{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dayBills = byDate[dateStr] || [];
          const isToday  = dateStr === todayStr;
          const isSel    = selectedDay === dateStr;
          const hasOver  = dayBills.some(b => b.isOverdue);
          const hasSoon  = dayBills.some(b => b.isDueSoon);
          const hasIncome= dayBills.some(b => b.type === "INCOME");

          return (
            <div key={day} onClick={() => onDayClick(dateStr)}
              style={{ padding:"6px 4px", borderRadius:10, textAlign:"center",
                cursor: dayBills.length ? "pointer" : "default",
                background: isSel ? "rgba(96,165,250,.15)"
                          : isToday ? "rgba(52,211,153,.1)" : "rgba(255,255,255,.02)",
                border: isSel ? "1px solid rgba(96,165,250,.4)"
                      : isToday ? "1px solid rgba(52,211,153,.3)" : "1px solid transparent",
                transition:"all .15s" }}>
              <p style={{ fontSize:".75rem", fontWeight: isToday ? 800 : 500,
                color: isToday ? "#34d399" : "#94a3b8", margin:"0 0 4px" }}>{day}</p>
              {/* Bill dots */}
              {dayBills.length > 0 && (
                <div style={{ display:"flex", gap:2, justifyContent:"center", flexWrap:"wrap" }}>
                  {dayBills.slice(0,3).map((b, bi) => (
                    <div key={bi} style={{ width:5, height:5, borderRadius:"50%",
                      background: hasOver ? "#f87171" : hasSoon ? "#fbbf24" : hasIncome ? "#34d399" : b.color }}/>
                  ))}
                  {dayBills.length > 3 && (
                    <span style={{ fontSize:".48rem", color:"#64748b" }}>+{dayBills.length-3}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillsPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear,  setViewYear]  = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeTab,   setActiveTab]   = useState("upcoming"); // upcoming | overdue | all

  useEffect(() => {
    fetch("/api/bills").then(r => r.json()).then(d => {
      setData(d); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); }
    else setViewMonth(m => m-1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); }
    else setViewMonth(m => m+1);
    setSelectedDay(null);
  };

  const selectedDayBills = selectedDay && data?.byDate?.[selectedDay] || [];

  const filteredBills = !data ? [] : (
    activeTab === "overdue"  ? data.overdue  :
    activeTab === "upcoming" ? data.bills.filter(b => b.daysUntil >= 0 && b.daysUntil <= 30) :
    data.bills
  );

  const summary = data?.summary;

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 20px" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h1 className="text-5xl gradient-title">Bill Reminders</h1>
          <p style={{ color:"#64748b", fontSize:".84rem", marginTop:6 }}>
            Upcoming payments, EMIs and recurring bills — next 60 days
          </p>
        </div>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"60px 0" }}>
          <Loader2 size={18} style={{ color:"#a78bfa", animation:"spin 1s linear infinite" }}/>
          <span style={{ color:"#64748b" }}>Loading your bills…</span>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[
              { label:"Due in 30 days", val:fmt(summary.totalDue30),   color:"#f87171", icon:"💸" },
              { label:"Upcoming Bills", val:summary.upcoming30,         color:"#60a5fa", icon:"📅" },
              { label:"Due Soon (3d)",  val:summary.dueSoonCount,       color:"#fbbf24", icon:"⏰" },
              { label:"Overdue",        val:summary.overdueCount,       color:"#f87171", icon:"🚨" },
            ].map(k => (
              <div key={k.label} style={{ padding:"14px", borderRadius:16,
                background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:"1rem" }}>{k.icon}</span>
                  <span style={{ fontSize:".65rem", color:"#64748b", fontWeight:700,
                    textTransform:"uppercase", letterSpacing:".05em" }}>{k.label}</span>
                </div>
                <p style={{ fontWeight:800, fontSize:"1.1rem", color:k.color, margin:0 }}>{k.val}</p>
              </div>
            ))}
          </div>

          {/* Overdue alert banner */}
          {summary.overdueCount > 0 && (
            <div style={{ padding:"14px 18px", borderRadius:14, background:"rgba(248,113,113,.07)",
              border:"1px solid rgba(248,113,113,.25)", marginBottom:18,
              display:"flex", alignItems:"center", gap:12 }}>
              <AlertTriangle size={18} style={{ color:"#f87171", flexShrink:0 }}/>
              <div>
                <p style={{ fontWeight:700, color:"#f87171", margin:"0 0 2px", fontSize:".85rem" }}>
                  {summary.overdueCount} overdue payment{summary.overdueCount > 1 ? "s" : ""}
                </p>
                <p style={{ fontSize:".72rem", color:"#94a3b8", margin:0 }}>
                  {data.overdue.map(b => b.name).join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Due soon banner */}
          {summary.dueSoonCount > 0 && summary.overdueCount === 0 && (
            <div style={{ padding:"12px 18px", borderRadius:14, background:"rgba(251,191,36,.06)",
              border:"1px solid rgba(251,191,36,.2)", marginBottom:18,
              display:"flex", alignItems:"center", gap:10 }}>
              <Bell size={15} style={{ color:"#fbbf24" }}/>
              <p style={{ fontSize:".78rem", color:"#fbbf24", margin:0, fontWeight:600 }}>
                {data.dueSoon.map(b => `${b.name} (${b.daysUntil === 0 ? "today" : `in ${b.daysUntil}d`})`).join(" · ")}
              </p>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:20 }}>

            {/* ── LEFT — List ── */}
            <div>
              {/* Tabs */}
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[
                  { id:"upcoming", label:`Upcoming (${summary.upcoming30})` },
                  { id:"overdue",  label:`Overdue (${summary.overdueCount})` },
                  { id:"all",      label:`All (${summary.totalCount})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    style={{ padding:"6px 14px", borderRadius:9999, fontSize:".75rem", fontWeight:700,
                      cursor:"pointer", transition:"all .15s",
                      background: activeTab===t.id ? "rgba(96,165,250,.12)" : "rgba(255,255,255,.04)",
                      border:     activeTab===t.id ? "1px solid rgba(96,165,250,.35)" : "1px solid rgba(255,255,255,.08)",
                      color:      activeTab===t.id ? "#60a5fa" : "#64748b" }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Bill list */}
              <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:520, overflowY:"auto" }}>
                {filteredBills.length === 0 ? (
                  <div style={{ padding:"32px", textAlign:"center", borderRadius:16,
                    background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
                    <CheckCircle2 size={28} style={{ color:"#34d399", margin:"0 auto 10px", display:"block" }}/>
                    <p style={{ color:"#34d399", fontWeight:700, margin:"0 0 4px" }}>All clear!</p>
                    <p style={{ color:"#64748b", fontSize:".78rem", margin:0 }}>No bills in this category</p>
                  </div>
                ) : (
                  filteredBills.map(b => <BillRow key={b.id} bill={b}/>)
                )}
              </div>
            </div>

            {/* ── RIGHT — Calendar ── */}
            <div>
              <div style={{ padding:"18px", borderRadius:20, background:"rgba(255,255,255,.025)",
                border:"1px solid rgba(255,255,255,.07)" }}>

                {/* Month navigation */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <button onClick={prevMonth}
                    style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center",
                      justifyContent:"center", background:"rgba(255,255,255,.05)",
                      border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer" }}>
                    <ChevronLeft size={14}/>
                  </button>
                  <p style={{ fontWeight:800, fontSize:".88rem", color:"#f1f5f9", margin:0 }}>
                    {MONTHS[viewMonth]} {viewYear}
                  </p>
                  <button onClick={nextMonth}
                    style={{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center",
                      justifyContent:"center", background:"rgba(255,255,255,.05)",
                      border:"1px solid rgba(255,255,255,.1)", color:"#64748b", cursor:"pointer" }}>
                    <ChevronRight size={14}/>
                  </button>
                </div>

                <CalendarGrid
                  year={viewYear} month={viewMonth}
                  byDate={data.byDate || {}}
                  onDayClick={setSelectedDay}
                  selectedDay={selectedDay}
                />

                {/* Legend */}
                <div style={{ display:"flex", gap:14, marginTop:14, justifyContent:"center" }}>
                  {[
                    { color:"#f87171", label:"Overdue"  },
                    { color:"#fbbf24", label:"Due soon" },
                    { color:"#60a5fa", label:"Upcoming" },
                    { color:"#34d399", label:"Income"   },
                  ].map(l => (
                    <div key={l.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:l.color }}/>
                      <span style={{ fontSize:".62rem", color:"#475569" }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected day panel */}
              {selectedDay && (
                <div style={{ marginTop:12, padding:"14px", borderRadius:16,
                  background:"rgba(96,165,250,.05)", border:"1px solid rgba(96,165,250,.18)" }}>
                  <p style={{ fontSize:".72rem", fontWeight:700, color:"#60a5fa",
                    textTransform:"uppercase", letterSpacing:".06em", margin:"0 0 10px" }}>
                    {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-IN",
                      { weekday:"long", day:"numeric", month:"long" })}
                  </p>
                  {selectedDayBills.length === 0 ? (
                    <p style={{ fontSize:".75rem", color:"#64748b", margin:0 }}>No bills on this date</p>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {selectedDayBills.map(b => <BillRow key={b.id} bill={b}/>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* No bills empty state */}
          {summary.totalCount === 0 && (
            <div style={{ padding:"48px", textAlign:"center", borderRadius:20,
              background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)" }}>
              <p style={{ fontSize:"3rem", margin:"0 0 14px" }}>🎉</p>
              <p style={{ color:"#f1f5f9", fontWeight:700, margin:"0 0 6px" }}>No recurring bills found</p>
              <p style={{ color:"#64748b", fontSize:".82rem", margin:0 }}>
                Mark transactions as recurring when adding them — they'll appear here as upcoming bills.
              </p>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 9999px; }
      `}</style>
    </div>
  );
}