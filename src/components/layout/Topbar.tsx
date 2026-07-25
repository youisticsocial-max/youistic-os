"use client";

import { Bell, Search, User, LogOut, Settings, X, CheckCircle2, Menu, Sun, Moon, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { logoutAction } from "@/app/actions/auth";
import { useTheme } from "@/components/ThemeProvider";
import { getMeetings } from "@/app/actions/meetings";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);

  const [userName, setUserName] = useState("Suhani");
  const [userRole, setUserRole] = useState("SDR");
  const [userEmail, setUserEmail] = useState("suhani@youistic.com");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const roleMatch = document.cookie.match(/(?:^|; )user_role=([^;]*)/);
    const nameMatch = document.cookie.match(/(?:^|; )user_name=([^;]*)/);
    const r = roleMatch ? decodeURIComponent(roleMatch[1]).toUpperCase() : "SDR";
    const n = nameMatch ? decodeURIComponent(nameMatch[1]) : (r === "SDR" ? "Suhani" : r === "BDE" ? "Kiyam" : "CEO");
    
    setUserRole(r);
    setUserName(n);

    if (n === "Kajal Sharma") {
      setUserEmail("kajal@youistic.com");
    } else if (n === "Kiyam") {
      setUserEmail("kiyam@youistic.com");
    } else if (n === "CEO") {
      setUserEmail("ceo@youistic.com");
    } else {
      setUserEmail("suhani@youistic.com");
    }

    async function loadNotifs() {
      try {
        const meetings = await getMeetings();
        if (meetings && meetings.length > 0) {
          const formatted = meetings.map((m: any) => ({
            id: m.id,
            title: `📅 ${m.title || "Client Meeting"}`,
            desc: `Host: ${m.host?.name || "CEO/BDE"} • ${new Date(m.meetingDate).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}`,
            notes: m.notes ? `Note: ${m.notes}` : undefined,
            time: new Date(m.createdAt || m.meetingDate).toLocaleDateString("en-IN"),
          }));
          setNotifications(formatted);
        } else {
          setNotifications([
            {
              id: "def-1",
              title: "🎉 Welcome to Youistic OS",
              desc: "No upcoming meetings or critical alerts right now.",
              time: "Today",
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadNotifs();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      style={{
        height: "64px",
        background: "var(--bg-topbar, rgba(10,11,15,0.9))",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--bg-border, #1f2235)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Page Title & Mobile Hamburger */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("toggle-mobile-sidebar"))}
          className="mobile-hamburger-btn"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--bg-border)",
            borderRadius: "8px",
            padding: "8px",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "none"
          }}
        >
          <Menu size={18} />
        </button>

        <div>
          <h1
            className="truncate max-w-[150px] sm:max-w-none"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
            title={title}
          >
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }} className="hidden md:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        {/* Desktop Search Bar */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:flex"
          style={{
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-input)",
            border: "1px solid var(--bg-border)",
            borderRadius: "8px",
            padding: "7px 12px",
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Search...
          </span>
          <kbd
            style={{
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              fontFamily: "monospace",
              border: "1px solid var(--bg-border)"
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Mobile Search Button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex sm:hidden"
          style={{
            background: "var(--bg-input)",
            border: "1px solid var(--bg-border)",
            borderRadius: "8px",
            padding: "8px",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          <Search size={16} />
        </button>

        {/* Notifications */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setIsNotifOpen(!isNotifOpen); setIsProfileOpen(false); }}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "var(--bg-input)",
              border: "1px solid var(--bg-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              transition: "all 0.2s",
              color: "var(--text-primary)"
            }}
          >
            <Bell size={15} color="var(--text-primary)" />
            {notifications.length > 0 && notifications[0].id !== "def-1" && (
              <span style={{ position: "absolute", top: "7px", right: "7px", width: "7px", height: "7px", background: "#6366f1", borderRadius: "50%", border: "1.5px solid var(--bg-card)" }} />
            )}
          </button>
          
          {isNotifOpen && (
            <div style={{ position: "absolute", right: 0, top: "48px", width: "320px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", boxShadow: "0 14px 40px rgba(0,0,0,0.3)", overflow: "hidden", zIndex: 50 }} className="animate-in">
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-input)" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>Notifications ({notifications.length})</span>
                <span onClick={() => setIsNotifOpen(false)} style={{ fontSize: "12px", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>Close</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", maxHeight: "320px", overflowY: "auto" }}>
                {notifications.map((item) => (
                  <div key={item.id} style={{ padding: "14px 16px", borderBottom: "1px solid var(--bg-border)", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Calendar size={15} />
                    </div>
                    <div style={{ width: "100%", overflow: "hidden" }}>
                      <p style={{ margin: "0 0 3px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 700 }}>{item.title}</p>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.4 }}>{item.desc}</p>
                      {item.notes && <p style={{ margin: "3px 0 0", fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic" }}>{item.notes}</p>}
                      <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotifOpen(false); }}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(108,92,231,0.3)",
            }}
          >
            <User size={16} color="white" />
          </div>

          {isProfileOpen && (
            <div style={{ position: "absolute", right: 0, top: "48px", width: "220px", background: "#14161f", border: "1px solid #1f2235", borderRadius: "12px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden", zIndex: 50 }} className="animate-in">
              <div style={{ padding: "16px", borderBottom: "1px solid #1f2235", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "linear-gradient(135deg, #6c5ce7, #a29bfe)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={18} color="white" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>{userName} ({userRole})</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{userEmail}</p>
                </div>
              </div>
              <div style={{ padding: "8px" }}>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    window.location.href = "/dashboard/settings";
                  }}
                  style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", background: "transparent", border: "none", color: "#cbd5e1", fontSize: "13px", cursor: "pointer", borderRadius: "6px", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#1a1d28"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <Settings size={15} /> Account Settings
                </button>
                <button
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await logoutAction();
                    window.location.reload();
                  }}
                  style={{ width: "100%", padding: "10px 12px", display: "flex", alignItems: "center", gap: "10px", background: "transparent", border: "none", color: "#e17055", fontSize: "13px", cursor: "pointer", borderRadius: "6px", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(225,112,85,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh", zIndex: 100 }}>
          <div className="card-youistic animate-in" style={{ width: "100%", maxWidth: "560px", padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1f2235", gap: "12px" }}>
              <Search size={18} color="#64748b" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search clients, invoices, tasks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", background: "transparent", border: "none", color: "#f8fafc", fontSize: "16px", outline: "none" }} 
              />
              <kbd onClick={() => setIsSearchOpen(false)} style={{ background: "#1a1d28", color: "#64748b", fontSize: "11px", padding: "4px 8px", borderRadius: "6px", fontFamily: "monospace", cursor: "pointer", border: "1px solid #1f2235" }}>ESC</kbd>
            </div>
            
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Recent Searches</p>
              {["Veda Wellness Website", "July Ad Spends", "Q3 Revenue Report"].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", cursor: "pointer", border: "1px solid transparent", transition: "all 0.2s" }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(108,92,231,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(108,92,231,0.2)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; }}>
                  <Search size={14} color="#6c5ce7" />
                  <span style={{ fontSize: "14px", color: "#cbd5e1" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
