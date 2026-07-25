"use client";

import { useState } from "react";
import { Zap, ChevronRight, Lock, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { verifyAndLogin } from "@/app/actions/auth";
import { useTheme } from "@/components/ThemeProvider";

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<"SDR" | "BDE">("SDR");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await verifyAndLogin(selectedRole, password);
      if (res.success) {
        if (selectedRole === "SDR") {
          window.location.href = "/dashboard/sdr";
        } else if (selectedRole === "BDE") {
          window.location.href = "/dashboard/bde";
        }
      } else {
        setErrorMsg(res.error || "Invalid credentials.");
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Invalid credentials.");
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "20px", position: "relative" }}>
      
      {/* Top Right Theme Switcher Button */}
      <button
        onClick={toggleTheme}
        className="theme-toggle-btn"
        style={{ position: "absolute", top: "20px", right: "20px" }}
        title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div style={{ width: "100%", maxWidth: "440px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "20px", padding: "40px 28px", boxShadow: "var(--shadow-card)" }}>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "54px",
              height: "54px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(108,92,231,0.45)",
              marginBottom: "16px"
            }}
          >
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: "4px", textAlign: "center" }}>
            Youistic OS Login
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0, textAlign: "center" }}>Select your module role to continue</p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "10px", padding: "12px 14px", color: "#ef4444", fontSize: "13px", fontWeight: 600, marginBottom: "20px" }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* SDR and BDE Role selector ONLY */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { id: "SDR", label: "SDR (Inside Sales)", subtitle: "Manage lead pool, calls & follow-ups", color: "#6c5ce7" },
              { id: "BDE", label: "BDE (Field Sales)", subtitle: "Manage field visits & warm lead uploads", color: "#e67e22" },
            ].map((item) => {
              const isSelected = selectedRole === item.id;
              return (
                <div 
                  key={item.id}
                  onClick={() => { setSelectedRole(item.id as "SDR" | "BDE"); setErrorMsg(""); }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "16px", 
                    borderRadius: "12px", 
                    border: isSelected ? `2px solid ${item.color}` : "1px solid var(--bg-border)",
                    background: isSelected ? `${item.color}15` : "var(--bg-input)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: isSelected ? item.color : "var(--text-primary)" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      {item.subtitle}
                    </div>
                  </div>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: isSelected ? `5px solid ${item.color}` : "1.5px solid var(--bg-border)", background: isSelected ? "var(--bg-card)" : "transparent", flexShrink: 0 }} />
                </div>
              );
            })}
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "8px", fontWeight: 700 }}>
              {selectedRole} Account Password *
            </label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
              <input
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "10px",
                  padding: "12px 40px 12px 40px",
                  fontSize: "14px",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontFamily: "monospace"
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoggingIn}
            style={{ 
              width: "100%", 
              padding: "14px", 
              background: selectedRole === "SDR" ? "linear-gradient(135deg, #6c5ce7 0%, #5b4bc4 100%)" : "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", 
              color: "white", 
              border: "none", 
              borderRadius: "12px", 
              fontWeight: 700, 
              fontSize: "14px",
              cursor: isLoggingIn ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: selectedRole === "SDR" ? "0 4px 14px rgba(108,92,231,0.35)" : "0 4px 14px rgba(230,126,34,0.35)",
              opacity: isLoggingIn ? 0.7 : 1
            }}
          >
            {isLoggingIn ? "Authenticating..." : `Sign In as ${selectedRole}`}
            {!isLoggingIn && <ChevronRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
