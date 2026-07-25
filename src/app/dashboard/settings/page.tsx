"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { User, Building, Shield, Bell, CreditCard, CheckCircle2 } from "lucide-react";
import { getProfile, updateProfile, updatePassword } from "@/app/actions/settings";

export default function SettingsPage() {
  const [userRole, setUserRole] = useState("CEO");
  const [userName, setUserName] = useState("CEO");
  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Password Security Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  useEffect(() => {
    // Read logged in cookies
    const roleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_role="))
      ?.split("=")[1];

    const nameCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_name="))
      ?.split("=")[1];

    if (roleCookie) setUserRole(decodeURIComponent(roleCookie));
    if (nameCookie) setUserName(decodeURIComponent(nameCookie));

    // Fetch live profile from DB
    async function loadProfile() {
      try {
        const res = await getProfile();
        if (res.user) {
          const profileName = res.user.name || res.loggedInName || "CEO";
          setUserName(profileName);
          if (res.userRole) setUserRole(res.userRole);
          const parts = profileName.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
          setEmail(res.user.email || (profileName === "Suhani" ? "suhani@youistic.com" : profileName === "Kajal Sharma" ? "kajal@youistic.com" : "ceo@youistic.os"));
          setPhone(res.user.phone || (profileName === "Suhani" ? "+91 98765 11001" : profileName === "Kajal Sharma" ? "+91 98765 11002" : "+91 98765 11000"));
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg("");
    try {
      const full = `${firstName} ${lastName}`.trim();
      const res = await updateProfile({ name: full, email, phone });
      if (res.success) {
        setSaveSuccessMsg("🎉 Profile information updated successfully!");
        setUserName(full);
        document.cookie = `user_name=${encodeURIComponent(full)}; path=/; max-age=${60 * 60 * 24 * 7}`;
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg("");
    setPasswordErrorMsg("");

    if (newPassword.length < 6) {
      setPasswordErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg("New password and confirm password do not match.");
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await updatePassword({ currentPassword, newPassword });
      if (res.error) {
        setPasswordErrorMsg(res.error);
      } else if (res.success) {
        setPasswordSuccessMsg("🎉 Password updated successfully! Please use your new password next time you login.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccessMsg(""), 6000);
      }
    } catch (err) {
      console.error(err);
      setPasswordErrorMsg("An unexpected error occurred while updating password.");
    }
    setIsSubmittingPassword(false);
  };

  const isBDE = userRole === "BDE" || userName === "Kiyam";
  const isSDR = userRole === "SDR" || userName === "Suhani" || userName === "Kajal Sharma";
  const roleTitle = isBDE ? "BDE Field Agent" : isSDR ? "SDR Specialist" : "Chief Executive Officer";
  const roleSubtitle = isBDE ? "Ground Client Relations & Visit Specialist" : isSDR ? "Lead Prospecting & Closing Manager" : "Enterprise Master Administrator";
  const role = userRole;

  const tabs = isBDE
    ? [
        { id: "profile", label: "My BDE Profile", icon: User },
        { id: "field_preferences", label: "Daily Field Goals", icon: Building },
        { id: "notifications", label: "Field Alerts & Reminders", icon: Bell },
        { id: "security", label: "Security & Login", icon: Shield },
      ]
    : isSDR
    ? [
        { id: "profile", label: "My SDR Profile", icon: User },
        { id: "notifications", label: "Calling Reminders", icon: Bell },
        { id: "security", label: "Security & Login", icon: Shield },
      ]
    : [
        { id: "profile", label: "My Profile", icon: User },
        { id: "company", label: "Company", icon: Building },
        { id: "security", label: "Security", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "billing", label: "Billing", icon: CreditCard },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="Settings & Preferences" subtitle={`${roleTitle} Account & Preferences`} />
      
      <main style={{ padding: "16px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }} className="animate-in">
        
        {/* Settings Sidebar Tabs */}
        <div style={{ width: "100%", maxWidth: "220px", minWidth: "180px", flex: "1 1 200px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", borderRadius: "10px", border: "1px solid",
                  borderColor: isActive ? "rgba(99, 102, 241, 0.4)" : "var(--bg-border)",
                  cursor: "pointer",
                  background: isActive ? "rgba(99, 102, 241, 0.18)" : "var(--bg-card)",
                  color: isActive ? "#818cf8" : "var(--text-primary)",
                  fontSize: "13px", fontWeight: 700, transition: "all 0.2s",
                  textAlign: "left"
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content Container */}
        <div style={{ flex: "1 1 300px", minWidth: 0, maxWidth: "760px" }}>
          
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="card-youistic" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
                👤 {roleTitle} Profile Information
              </h3>

              {saveSuccessMsg && (
                <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#059669", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}>
                  {saveSuccessMsg}
                </div>
              )}
              
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "4px" }}>
                  <div style={{ width: "54px", height: "54px", borderRadius: "12px", background: isBDE ? "linear-gradient(135deg, #e67e22, #d35400)" : isSDR ? "linear-gradient(135deg, #6366f1, #4338ca)" : "linear-gradient(135deg, #a855f7, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.4)", flexShrink: 0 }}>
                    <User size={24} color="white" />
                  </div>
                  <div>
                    <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{userName} ({role})</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0", fontWeight: 600 }}>{roleTitle} · {roleSubtitle}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>First Name</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Last Name</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Phone Number (Mobile)</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Work Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                {isBDE && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Assigned Field Territory / Region</label>
                    <input type="text" defaultValue="Jodhpur Main Commercial Belt (Zone 1)" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "#e67e22", fontWeight: 600, padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                )}

                <div style={{ marginTop: "10px", paddingTop: "14px", borderTop: "1px solid var(--bg-border)", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" style={{ padding: "8px 20px", background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Save Profile</button>
                </div>
              </div>
            </form>
          )}

          {/* FIELD GOALS & PREFERENCES TAB (BDE Only) */}
          {activeTab === "field_preferences" && (
            <div className="card-youistic" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
                🎯 Daily Field Goals & Preferences
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 700 }}>Daily Field Visits Target</label>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 6px" }}>Set your personal daily goal for ground visits to track progress on your BDE dashboard.</p>
                  <select defaultValue="5" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                    <option value="3">3 Field Visits / Day</option>
                    <option value="5">5 Field Visits / Day (Recommended)</option>
                    <option value="8">8 Field Visits / Day (High Velocity)</option>
                    <option value="10">10 Field Visits / Day (Pro BDE)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 700 }}>Default City / Location</label>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 6px" }}>Auto-populates when uploading new warm leads from field.</p>
                  <input type="text" defaultValue="Jodhpur, Rajasthan" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 700 }}>Default Service Category</label>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 6px" }}>Default category suggestion for warm lead upload form.</p>
                  <input type="text" defaultValue="Hardware Shop" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                </div>

                <div style={{ marginTop: "6px", paddingTop: "14px", borderTop: "1px solid var(--bg-border)", display: "flex", justifyContent: "flex-end" }}>
                  <button style={{ padding: "8px 20px", background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Save Preferences</button>
                </div>
              </div>
            </div>
          )}

          {/* FIELD ALERTS & NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="card-youistic" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 16px" }}>
                🔔 {isBDE ? "Field Alerts & Reminders" : "Notification Settings"}
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Today's Scheduled Visit Popup Alert</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>Show reminder popup alert on dashboard load for today's visits.</p>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: "#e67e22", cursor: "pointer" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Overdue Follow-up Warnings</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>Highlight overdue follow-up leads in red glow on pipeline.</p>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: "#e67e22", cursor: "pointer" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>SDR Deal Closing & Proposal Notifications</h4>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>Receive notification when SDR sends proposal or converts your lead.</p>
                  </div>
                  <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px", accentColor: "#e67e22", cursor: "pointer" }} />
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="card-youistic" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>
                🔒 Security & Password Settings
              </h3>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "0 0 16px" }}>
                Update your account password. Use a strong password to keep your account secure.
              </p>

              {passwordSuccessMsg && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: "8px", padding: "10px 14px", color: "#059669", fontSize: "12px", fontWeight: 600, marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <CheckCircle2 size={16} /> {passwordSuccessMsg}
                </div>
              )}

              {passwordErrorMsg && (
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "10px 14px", color: "#ef4444", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}>
                  ⚠️ {passwordErrorMsg}
                </div>
              )}

              <form onSubmit={handlePasswordUpdate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Current Password</label>
                  <input
                    required
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>New Password</label>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Confirm New Password</label>
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "6px", paddingTop: "14px", borderTop: "1px solid var(--bg-border)", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isSubmittingPassword} style={{ padding: "8px 20px", background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "13px", cursor: isSubmittingPassword ? "not-allowed" : "pointer", opacity: isSubmittingPassword ? 0.7 : 1 }}>
                    {isSubmittingPassword ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* COMPANY TAB */}
          {activeTab === "company" && !isBDE && (
            <div className="card-youistic" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "16px", color: "var(--text-primary)", margin: "0 0 16px", fontWeight: 700 }}>🏢 Company Settings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Company Name</label>
                  <input type="text" defaultValue="Youistic OS Enterprise" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Corporate Office Address</label>
                  <input type="text" defaultValue="Main Commercial Hub, Jodhpur, Rajasthan" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                </div>
              </div>
            </div>
          )}

          {/* BILLING & BANK DETAILS TAB */}
          {activeTab === "billing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Header Banner */}
              <div style={{ background: "var(--bg-card)", border: "1px solid #4338ca", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "14px", boxShadow: "var(--shadow-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.4)", color: "white", flexShrink: 0 }}>
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                      🏦 Official Company Bank & Payment Settings
                    </h3>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                      Auto-populates on all client Proposals, Invoices, and Live PDF Previews.
                    </p>
                  </div>
                </div>

                <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(16,185,129,0.15)", color: "#059669", border: "1px solid rgba(16,185,129,0.3)", padding: "3px 10px", borderRadius: "20px" }}>
                  ✓ Live Active for Invoices
                </span>
              </div>

              {/* Official Bank Account Form */}
              <div className="card-youistic" style={{ padding: "20px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  🏛️ Primary Company Bank Account
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Account Holder / Business Name</label>
                      <input type="text" defaultValue="YOUISTIC OS PRIVATE LIMITED" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", fontWeight: 700 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Bank Name</label>
                      <input type="text" defaultValue="HDFC Bank Ltd." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Account Number</label>
                      <input type="text" defaultValue="50200088991122" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "#6366f1", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace", fontWeight: 700 }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>IFSC Code</label>
                      <input type="text" defaultValue="HDFC0001234" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Branch Name & City</label>
                      <input type="text" defaultValue="Main Commercial Branch, Jodhpur, Rajasthan" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Account Type</label>
                      <select defaultValue="CURRENT" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                        <option value="CURRENT">Current Business Account</option>
                        <option value="SAVINGS">Savings Account</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPI & QR Code Details Card */}
              <div className="card-youistic" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                  <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
                    <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      📱 UPI & Quick QR Payment Collection
                    </h4>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Official UPI ID / VPA</label>
                      <input type="text" defaultValue="youistic@hdfcbank" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "#0284c7", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace", fontWeight: 700 }} />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Company GSTIN Number</label>
                      <input type="text" defaultValue="08AAAAA0000A1Z5" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "8px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-primary)", marginBottom: "4px", fontWeight: 600 }}>Default Proposal Advance Term</label>
                      <input type="text" defaultValue="50% Advance on Proposal Approval, 50% on Final Project Delivery" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-secondary)", padding: "8px 12px", fontSize: "12px", outline: "none" }} />
                    </div>
                  </div>

                  {/* QR Preview Box */}
                  <div style={{ width: "160px", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "center" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "8px", textAlign: "center" }}>Live Invoice QR Preview</div>
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=upi://pay?pa=youistic@hdfcbank&pn=YOUISTIC" 
                      alt="UPI QR Code"
                      style={{ width: "110px", height: "110px", borderRadius: "8px", border: "2px solid #312e81" }}
                    />
                    <div style={{ fontSize: "10px", color: "#059669", fontWeight: 700, marginTop: "6px" }}>✓ Auto-renders on PDF</div>
                  </div>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--bg-border)", display: "flex", justifyContent: "flex-end" }}>
                  <button 
                    onClick={() => alert("🎉 Official Company Bank & Payment details saved successfully!")}
                    style={{ padding: "8px 20px", background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}
                  >
                    Save Official Bank Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
