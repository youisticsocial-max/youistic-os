"use client";

import { useState, useEffect } from "react";
import ClientOnly from "@/components/ClientOnly";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { User, TrendingUp, Target, CheckSquare, Plus, Search, X, Mail, Phone, Shield, UserCheck } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatPercent, getInitials } from "@/lib/utils";
import { getTeamMembers, createTeamMember } from "@/app/actions/team";
import { UserRole } from "@prisma/client";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  dealsClosedCount: number;
  assignedContractValue?: number;
  revenueGenerated: number;
  closingRatio: number;
  tasksCompleted: number;
  leadsGenerated: number;
  activityLabel: string;
  avatarColor: string;
  status: "ONLINE" | "IN_MEETING" | "FIELD_VISIT";
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await getTeamMembers();
      setMembers(data as any);
    } catch (err) {
      console.error("Failed to load team members:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as UserRole;
    const department = formData.get("department") as string;
    const phone = formData.get("phone") as string;

    try {
      await createTeamMember({ name, email, role, department, phone });
      setIsAddModalOpen(false);
      fetchMembers();
    } catch (err) {
      console.error(err);
      alert("Failed to add team member.");
    }
    setIsSubmitting(false);
  };

  const filteredMembers = members.filter((m) => {
    if (selectedDept !== "ALL" && m.department.toUpperCase() !== selectedDept.toUpperCase() && m.role !== selectedDept) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q) || m.department.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const chartData = filteredMembers.map((m) => ({
    name: m.name.split(" ")[0],
    tasks: m.tasksCompleted,
    leads: m.leadsGenerated,
    revenue: m.revenueGenerated / 1000, // in Thousands
  }));

  const totalTasks = members.reduce((s, m) => s + m.tasksCompleted, 0);
  const totalRevenue = members.reduce((s, m) => s + m.revenueGenerated, 0);
  const bestClosing = members.length > 0 ? Math.max(...members.map((m) => m.closingRatio)) : 0;
  const activeMembersCount = members.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="Team Performance & DSR" subtitle="Real-time employee activity, conversion tracking & Prisma database sync" />

      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-in">
        
        {/* SUMMARY STATS 2x2 / 4-COL RESPONSIVE GRID */}
        <div className="team-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(108,92,231,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <User size={20} color="#6c5ce7" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, whiteSpace: "nowrap" }}>{activeMembersCount} Members</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>Active Team Force</div>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(0,184,148,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CheckSquare size={20} color="#00b894" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 800, color: "#059669", lineHeight: 1.1, whiteSpace: "nowrap" }}>{totalTasks} Tasks</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>Total Completed</div>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(253,203,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Target size={20} color="#d97706" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 800, color: "#d97706", lineHeight: 1.1, whiteSpace: "nowrap" }}>{formatPercent(bestClosing)}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>Best Closing %</div>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(0,206,201,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TrendingUp size={20} color="#0284c7" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", fontWeight: 800, color: "#0284c7", lineHeight: 1.1, whiteSpace: "nowrap" }}>{formatCurrency(totalRevenue)}</div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.2 }}>Generated Revenue</div>
            </div>
          </div>
        </div>

        {/* CONTROLS CARD: SEARCH, ADD MEMBER BUTTON & ROLE FILTERS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px" }}>
          
          {/* Row 1: 100% Full Width Search Bar */}
          <div style={{ position: "relative", width: "100%" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={15} />
            <input
              type="text"
              placeholder="Search team member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 16px 10px 36px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
            />
          </div>

          {/* Row 2: 100% Full Width Purple Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 18px",
              background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(108,92,231,0.35)",
            }}
          >
            <Plus size={16} /> Add Team Member
          </button>

          {/* Row 3: Department / Role Filter Pills */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", whiteSpace: "nowrap", width: "100%", paddingTop: "2px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginRight: "4px" }}>
              Filter Role:
            </span>
            {[
              { id: "ALL", label: "All Members" },
              { id: "SDR", label: "SDR Team" },
              { id: "BDE", label: "BDE Field Sales" },
              { id: "ADMIN", label: "CEO & Managers" },
            ].map((dept) => {
              const isSelected = selectedDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? "rgba(108,92,231,0.25)" : "var(--bg-input)",
                    color: isSelected ? "#6c5ce7" : "var(--text-secondary)",
                    border: `1px solid ${isSelected ? "#6c5ce7" : "var(--bg-border)"}`,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  {dept.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN 2-COLUMN GRID: CHART LEFT, ENHANCED REAL TEAM CARDS RIGHT */}
        <div className="team-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "16px", alignItems: "start" }}>
          
          {/* LEFT: TEAM ACTIVITY BAR CHART */}
          <div className="card-youistic" style={{ padding: "22px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--shadow-card)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                Team Activity & Output Comparison
              </h3>
              <span style={{ fontSize: "10px", color: "#059669", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
                PRISMA DB SYNCED ⚡
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 20px" }}>
              Tasks completed vs leads generated & closing rates across roles
            </p>

            <ClientOnly fallback={<div style={{ height: 320 }} />}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }} />
                  <Bar dataKey="tasks" name="Tasks / Calls" fill="#6c5ce7" radius={[6, 6, 0, 0]} fillOpacity={0.9} />
                  <Bar dataKey="leads" name="Leads / Visits" fill="#00cec9" radius={[6, 6, 0, 0]} fillOpacity={0.9} />
                </BarChart>
              </ResponsiveContainer>
            </ClientOnly>

            {/* Chart Legend Footer */}
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed var(--bg-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-primary)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: "#6c5ce7" }} />
                <span>Tasks / Calls Completed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-primary)" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: "#00cec9" }} />
                <span>Leads / Field Visits</span>
              </div>
            </div>
          </div>

          {/* RIGHT: REAL PRISMA TEAM MEMBER SCORECARDS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Team Members ({filteredMembers.length})
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Click member for DSR</span>
            </div>

            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                Loading real team members from database...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="card-youistic" style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                No team members found matching your filter.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMember?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className="card-youistic"
                    style={{
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                      backgroundColor: isSelected ? "var(--bg-input)" : "var(--bg-card)",
                      border: isSelected ? "1px solid #6c5ce7" : "1px solid var(--bg-border)",
                      borderRadius: "14px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      boxShadow: isSelected ? "0 4px 20px rgba(108,92,231,0.25)" : "var(--shadow-card)",
                    }}
                  >
                    {/* Top Row: Avatar, Online Dot, Name & Role Badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div
                            style={{
                              width: "44px",
                              height: "44px",
                              borderRadius: "12px",
                              background: `linear-gradient(135deg, ${m.avatarColor}33, ${m.avatarColor}99)`,
                              border: `1.5px solid ${m.avatarColor}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              fontWeight: 800,
                              color: "#ffffff",
                            }}
                          >
                            {getInitials(m.name)}
                          </div>
                          <span
                            style={{
                              position: "absolute",
                              bottom: "-2px",
                              right: "-2px",
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              backgroundColor: m.status === "ONLINE" ? "#10b981" : m.status === "FIELD_VISIT" ? "#e67e22" : "#fdcb6e",
                              border: "2px solid var(--bg-card)",
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: "1.2" }} className="truncate">
                            {m.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }} className="truncate">
                            {m.department || m.role}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: m.avatarColor,
                          background: `${m.avatarColor}18`,
                          border: `1px solid ${m.avatarColor}40`,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          flexShrink: 0,
                        }}
                      >
                        {m.role}
                      </span>
                    </div>

                    {/* Middle Row: Live DSR Activity Badge & Assigned Client Contract Value */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "6px 10px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{m.activityLabel}</span>
                      {(m.assignedContractValue || m.revenueGenerated || 0) > 0 && (
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#00cec9" }} title="Assigned Client Contract Value">
                          {formatCurrency(m.assignedContractValue || m.revenueGenerated)}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Closing Ratio % or Tasks Count Badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "var(--text-secondary)" }}>
                      <span>Conversion Rate:</span>
                      {m.role === "EDITOR" ? (
                        <span style={{ fontWeight: 700, color: "#d97706" }}>{m.tasksCompleted} Tasks Done</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 800, color: m.closingRatio >= 45 ? "#059669" : m.closingRatio >= 35 ? "#0284c7" : "#d97706" }}>
                            {formatPercent(m.closingRatio)}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>({m.dealsClosedCount} Closed)</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* MEMBER DSR DETAILED MODAL */}
      {selectedMember && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: `1px solid ${selectedMember.avatarColor}`, borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
            <button onClick={() => setSelectedMember(null)} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }}>
              <div style={{ width: "50px", height: "50px", borderRadius: "14px", background: `linear-gradient(135deg, ${selectedMember.avatarColor}44, ${selectedMember.avatarColor})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, color: "#fff" }}>
                {getInitials(selectedMember.name)}
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>{selectedMember.name}</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0" }}>{selectedMember.department || selectedMember.role} • {selectedMember.phone}</p>
                <p style={{ fontSize: "11px", color: "#6c5ce7", margin: 0 }}>{selectedMember.email}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "#14161f", border: "1px solid #1f2235", borderRadius: "10px", padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Today's Output</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc" }}>{selectedMember.activityLabel}</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Deals Closed</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#34d399" }}>{selectedMember.dealsClosedCount} Deals</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Generated Revenue</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa" }}>{formatCurrency(selectedMember.revenueGenerated)}</span>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Closing Ratio</span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#fdcb6e" }}>{formatPercent(selectedMember.closingRatio)}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)", color: "white", fontSize: "13px", fontWeight: 700, cursor: "pointer", marginTop: "8px" }}
              >
                Close DSR Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW TEAM MEMBER MODAL */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #6c5ce7", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(108, 92, 231, 0.25)" }}>
            <button onClick={() => setIsAddModalOpen(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "10px", background: "rgba(108, 92, 231, 0.15)", borderRadius: "12px", color: "#a29bfe" }}>
                <Plus size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>Add New Team Member</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Create employee profile in Prisma database</p>
              </div>
            </div>

            <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Full Name *</label>
                <input required type="text" name="name" placeholder="e.g. Ramesh Verma" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Work Email *</label>
                <input required type="email" name="email" placeholder="ramesh@youistic.com" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Role *</label>
                  <select name="role" defaultValue="SDR" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }}>
                    <option value="SDR">SDR</option>
                    <option value="BDE">BDE</option>
                    <option value="ADMIN">ADMIN / Manager</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="SUPPORT">SUPPORT</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Department / Title</label>
                  <input type="text" name="department" placeholder="e.g. Calling Queue Specialist" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Phone Number</label>
                <input type="tel" name="phone" placeholder="+91 98765 43210" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #1f2235", background: "transparent", color: "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "9px 20px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(108,92,231,0.3)" }}>
                  {isSubmitting ? "Creating..." : "Save Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
