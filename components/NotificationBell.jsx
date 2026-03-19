"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/actions/notifications";

export default function NotificationBell({ initialNotifications = [] }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    };
    fetchNotifs();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 34, height: 34, borderRadius: 9999,
          background: isOpen ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isOpen ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
          color: isOpen ? "#34d399" : "#64748b", cursor: "pointer", position: "relative",
          transition: "all 0.2s"
        }}>
        <Bell size={15} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: 9999,
            background: "#ef4444", color: "#fff",
            fontSize: "9px", fontWeight: "bold",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 6px rgba(239,68,68,0.5)"
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{ 
          position: "absolute", top: "calc(100% + 8px)", right: 0, 
          width: 320, maxHeight: 400, overflow: "hidden", zIndex: 50,
          background: "rgba(5,13,27,0.98)", border: "1px solid rgba(52,211,153,0.2)", 
          borderRadius: "0.75rem", boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)", display: "flex", flexDirection: "column"
        }}>
          <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <h4 className="font-semibold text-sm text-gray-200 m-0">Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} style={{ 
                background: "transparent", border: "none", color: "#34d399", fontSize: "0.7rem", 
                cursor: "pointer", display: "flex", alignItems: "center", gap: 3 
              }}>
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>
          
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 340 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} 
                  onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                  style={{
                    padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", 
                    cursor: notif.isRead ? "default" : "pointer",
                    background: notif.isRead ? "transparent" : "rgba(52,211,153,0.05)",
                    transition: "background 0.2s"
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 style={{ margin: 0, fontSize: "0.8rem", fontWeight: notif.isRead ? 500 : 700, color: notif.isRead ? "#cbd5e1" : "#34d399", display: "flex", alignItems: "center", gap: 5 }}>
                        {notif.type === "OFFER" ? "🎯" : "ℹ️"} {notif.title}
                      </h5>
                      <p style={{ margin: "4px 0 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4 }}>{notif.message}</p>
                      <span style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 6, display: "block" }}>
                        {new Date(notif.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <span style={{ width: 6, height: 6, borderRadius: 9999, background: "#34d399", flexShrink: 0, marginTop: 4, boxShadow: "0 0 6px rgba(52,211,153,0.5)" }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
