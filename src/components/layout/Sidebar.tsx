"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Headphones,
  Kanban,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  PhoneCall,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";

const navItems = [
  {
    section: "Overview",
    items: [
      {
        label: "Sales & MIS",
        href: "/ceo/dashboard",
        icon: LayoutDashboard,
        color: "#6c5ce7",
      },
      {
        label: "Finance",
        href: "/dashboard/finance",
        icon: DollarSign,
        color: "#00b894",
      },
      {
        label: "Assets 🔐",
        href: "/dashboard/assets",
        icon: ShieldCheck,
        color: "#a855f7",
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        label: "CRM",
        href: "/dashboard/crm",
        icon: Users,
        color: "#00cec9",
      },
      {
        label: "Lead Pool (SDR)",
        href: "/dashboard/sdr",
        icon: PhoneCall,
        color: "#f39c12",
      },
      {
        label: "Field Sales (BDE)",
        href: "/dashboard/bde",
        icon: MapPin,
        color: "#d35400",
      },
      {
        label: "Support",
        href: "/dashboard/support",
        icon: Headphones,
        color: "#fd79a8",
      },
      {
        label: "Projects",
        href: "/dashboard/projects",
        icon: Kanban,
        color: "#74b9ff",
      },
      {
        label: "Renewals 🔄",
        href: "/dashboard/renewals",
        icon: Zap,
        color: "#10b981",
      },
    ],
  },
  {
    section: "People",
    items: [
      {
        label: "Team",
        href: "/dashboard/team",
        icon: BarChart3,
        color: "#a29bfe",
      },
    ],
  },
];

export default function Sidebar({ role = "CEO" }: { role?: string }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string>("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )user_name=([^;]*)/);
    if (match) setUserName(decodeURIComponent(match[1]));

    const handleToggle = () => setIsMobileOpen(prev => !prev);
    const handleClose = () => setIsMobileOpen(false);
    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("close-mobile-sidebar", handleClose);
    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  // Use passed role (defaults to CEO so CEO gets full enterprise view everywhere)
  const effectiveRole = (role || "CEO").toUpperCase();

  // Filter sections and items based on effectiveRole
  const filteredNavItems = navItems.map(section => {
    // If CEO / ADMIN, return all items
    if (effectiveRole === "CEO" || effectiveRole === "ADMIN") return section;

    // If SDR, keep SDR & Support links
    if (effectiveRole === "SDR") {
      const allowedItems = section.items
        .filter(item => item.href === "/dashboard/sdr" || item.href === "/dashboard/support" || item.href === "/dashboard/crm/tickets");
      return { ...section, items: allowedItems };
    }

    // If BDE, keep BDE & Support links
    if (effectiveRole === "BDE") {
      const allowedItems = section.items
        .filter(item => item.href === "/dashboard/bde" || item.href === "/dashboard/support" || item.href === "/dashboard/crm/tickets");
      return { ...section, items: allowedItems };
    }

    return section;
  }).filter(section => section.items.length > 0);

  return (
    <>
      {/* Mobile Dark Overlay */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)} 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 90 }}
        />
      )}

      <aside
        className={`youistic-sidebar ${isMobileOpen ? "mobile-open" : ""}`}
        style={{
          width: "240px",
          minHeight: "100dvh",
          background: "linear-gradient(180deg, #0d0f18 0%, #0a0b0f 100%)",
          borderRight: "1px solid #1f2235",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          overflowY: "auto",
          transition: "transform 0.3s ease",
        }}
      >
        {/* Logo & Close button on mobile */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #1f2235",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 16px rgba(108,92,231,0.4)",
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  fontSize: "16px",
                  color: "#f8fafc",
                  letterSpacing: "-0.02em",
                }}
              >
                Youistic OS
              </div>
              <div style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>
                Enterprise Platform
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="mobile-close-btn"
            style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "none" }}
          >
            <X size={20} />
          </button>
        </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {filteredNavItems.map((section) => (
          <div key={section.section} style={{ marginBottom: "24px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#475569",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0 8px",
                marginBottom: "8px",
              }}
            >
              {section.section}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 10px",
                      borderRadius: "8px",
                      textDecoration: "none",
                      fontSize: "13.5px",
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? "#f8fafc" : "#94a3b8",
                      background: isActive
                        ? "rgba(108,92,231,0.12)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(108,92,231,0.2)"
                        : "1px solid transparent",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.color = "#f8fafc";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                      }
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "28px",
                        height: "28px",
                        borderRadius: "7px",
                        background: isActive
                          ? `${item.color}22`
                          : "rgba(255,255,255,0.04)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        size={14}
                        color={isActive ? item.color : "#64748b"}
                      />
                    </span>
                    {item.label}
                    {isActive && (
                      <ChevronRight
                        size={12}
                        style={{ marginLeft: "auto", color: "#6c5ce7" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #1f2235",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        <Link
          href="/dashboard/settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 10px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: 500,
            color: "#94a3b8",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.color = "#f8fafc";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <Settings size={14} color="#64748b" />
          </span>
          Settings
        </Link>
        {/* Logged in User Badge */}
        <div style={{ padding: "8px 10px", background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.25)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#6c5ce7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white" }}>
              👤
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#f8fafc" }}>Active User</div>
              <div style={{ fontSize: "10px", color: "#a5b4fc" }}>Session Logged In</div>
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            await logoutAction();
            window.location.reload();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 10px",
            borderRadius: "8px",
            border: "none",
            background: "transparent",
            fontSize: "13.5px",
            fontWeight: 500,
            color: "#94a3b8",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(225,112,85,0.08)";
            (e.currentTarget as HTMLElement).style.color = "#e17055";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#94a3b8";
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "7px",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <LogOut size={14} color="#64748b" />
          </span>
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
