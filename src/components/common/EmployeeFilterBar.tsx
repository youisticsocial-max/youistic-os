"use client";

import { useEffect, useState } from "react";
import { User, Lock, Crown } from "lucide-react";

interface EmployeeFilterBarProps {
  roleLabel: "SDR" | "BDE";
  options: string[];
  selected: string;
  onSelect: (selected: string) => void;
}

export default function EmployeeFilterBar({
  roleLabel,
  options,
  selected,
  onSelect,
}: EmployeeFilterBarProps) {
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string }>({ role: "", name: "" });

  useEffect(() => {
    const roleMatch = document.cookie.match(/(?:^|; )user_role=([^;]*)/);
    const nameMatch = document.cookie.match(/(?:^|; )user_name=([^;]*)/);
    const role = roleMatch ? decodeURIComponent(roleMatch[1]).toUpperCase() : "CEO";
    const name = nameMatch ? decodeURIComponent(nameMatch[1]) : (role === "SDR" ? "Suhani" : role === "BDE" ? "Kiyam" : "CEO");
    setCurrentUser({ role, name });
    
    // Auto lock selection if logged in as employee
    if (role !== "CEO" && name && name !== "CEO") {
      onSelect(name);
    }
  }, []);

  const isCEO = currentUser.role === "CEO";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--bg-card)",
        border: "1px solid var(--bg-border)",
        borderRadius: "12px",
        padding: "10px 16px",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-primary)",
            fontWeight: 800,
            letterSpacing: "0.04em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            textTransform: "uppercase",
          }}
        >
          {isCEO ? <Crown size={15} color="#a855f7" /> : <Lock size={14} color="#818cf8" />}
          {isCEO ? `CEO ${roleLabel} CONTROL:` : `DEDICATED ${roleLabel} WORKSPACE:`}
        </span>

        {isCEO ? (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {options.map((opt) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onSelect(opt)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "1px solid #6366f1"
                      : "1px solid var(--bg-border)",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35))"
                      : "var(--bg-input)",
                    color: isSelected ? "#ffffff" : "var(--text-secondary)",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    boxShadow: isSelected
                      ? "0 2px 10px rgba(99, 102, 241, 0.3)"
                      : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {opt === "ALL" ? "All Team Members" : opt}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "5px 14px",
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.2)",
              border: "1px solid #6366f1",
              color: "#f8fafc",
              fontSize: "12px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <User size={14} color="#818cf8" /> Logged in as: {currentUser.name}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isCEO ? (
          <span
            style={{
              fontSize: "12px",
              color: "#a855f7",
              background: "rgba(168, 85, 247, 0.12)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              padding: "4px 12px",
              borderRadius: "20px",
              fontWeight: 600,
            }}
          >
            CEO View — {selected === "ALL" ? "All Leads Overview" : `Filtered to ${selected}`}
          </span>
        ) : (
          <span
            style={{
              fontSize: "12px",
              color: "#818cf8",
              background: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              padding: "4px 12px",
              borderRadius: "20px",
              fontWeight: 600,
            }}
          >
            🔒 Private Module — Showing work assigned to <strong>{currentUser.name}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
