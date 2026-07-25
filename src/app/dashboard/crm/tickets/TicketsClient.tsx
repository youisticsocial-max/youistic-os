"use client";

import { useState, useEffect } from "react";
import { Plus, Search, AlertCircle, Clock, CheckCircle, XCircle, X, UserCheck, Lock, FileText, Trash2 } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { formatDate } from "@/lib/utils";
import { getTickets, createTicket, updateTicketStatus, deleteTicket } from "@/app/actions/tickets";
import { getClients } from "@/app/actions/clients";
import { TicketPriority, TicketStatus } from "@prisma/client";

interface Ticket {
  id: string;
  title: string;
  description?: string;
  client: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignee: string;
  createdByName?: string;
  createdAt: Date | string;
  tags: string[];
}

const priorCfg: Record<string, { color: string; bg: string; border: string }> = {
  LOW: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" },
  MEDIUM: { color: "#fdcb6e", bg: "rgba(253,203,110,0.12)", border: "rgba(253,203,110,0.3)" },
  HIGH: { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)" },
  CRITICAL: { color: "#fd79a8", bg: "rgba(253,121,168,0.15)", border: "rgba(253,121,168,0.4)" },
};

const statusIcon: Record<string, React.ReactNode> = {
  OPEN: <AlertCircle size={15} color="#fdcb6e" />,
  IN_PROGRESS: <Clock size={15} color="#00cec9" />,
  RESOLVED: <CheckCircle size={15} color="#00b894" />,
  CLOSED: <XCircle size={15} color="#64748b" />,
};

const statusBadgeStyle: Record<string, React.CSSProperties> = {
  OPEN: { backgroundColor: "rgba(253, 203, 110, 0.12)", color: "#fdcb6e", border: "1px solid rgba(253, 203, 110, 0.3)" },
  IN_PROGRESS: { backgroundColor: "rgba(0, 206, 201, 0.12)", color: "#00cec9", border: "1px solid rgba(0, 206, 201, 0.3)" },
  RESOLVED: { backgroundColor: "rgba(0, 184, 148, 0.12)", color: "#00b894", border: "1px solid rgba(0, 184, 148, 0.3)" },
  CLOSED: { backgroundColor: "rgba(100, 116, 139, 0.12)", color: "#94a3b8", border: "1px solid rgba(100, 116, 139, 0.3)" },
};

export default function TicketsClient({
  userRole,
  loggedInName,
}: {
  userRole: string;
  loggedInName: string;
}) {
  const isCeo = userRole === "CEO" || userRole === "ADMIN" || loggedInName === "CEO";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [ceoScopeFilter, setCeoScopeFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = async (scope?: string) => {
    setLoading(true);
    try {
      const filterScope = isCeo ? (scope ?? ceoScopeFilter) : loggedInName;
      const res = await getTickets(filterScope);
      setTickets(res.tickets as any);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    async function loadClients() {
      const cls = await getClients();
      if (cls) setClientsList(cls);
    }
    loadClients();
  }, []);

  const handleScopeChange = (scope: string) => {
    setCeoScopeFilter(scope);
    fetchTickets(scope);
  };

  const handleStatusChange = async (id: string, newStatus: Ticket["status"]) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    try {
      await updateTicketStatus(id, newStatus as TicketStatus);
    } catch (err) {
      console.error(err);
      fetchTickets();
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    setTickets((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTicket(id);
      fetchTickets();
    } catch (err) {
      console.error(err);
      fetchTickets();
    }
  };

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createTicket({
        title: formData.get("title") as string,
        clientName: formData.get("client") as string,
        description: formData.get("description") as string,
        priority: formData.get("priority") as TicketPriority,
        tags: ((formData.get("tags") as string) || "Support, Tech").split(",").map((t) => t.trim()),
      });
      setIsModalOpen(false);
      fetchTickets();
    } catch (err) {
      console.error(err);
      alert("Failed to create ticket.");
    }
    setIsSubmitting(false);
  };

  const counts = {
    open: tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: tickets.filter((t) => t.status === "RESOLVED").length,
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.client.toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      (t.createdByName || "").toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="Support Tickets" subtitle="Role-Based Issue Tracking & Client Resolution Engine" />

      <main style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }} className="animate-in">

        {/* WORKSPACE ACCESS BANNER — Compact Single Row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "8px 12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ padding: "6px", background: isCeo ? "rgba(16,185,129,0.15)" : "rgba(108,92,231,0.15)", borderRadius: "8px", color: isCeo ? "#059669" : "#6c5ce7", display: "flex", alignItems: "center" }}>
              {isCeo ? <UserCheck size={16} /> : <Lock size={16} />}
            </div>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>
                Logged in as: <span style={{ color: "#6c5ce7" }}>{loggedInName}</span> <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>({userRole})</span>
              </span>
            </div>
          </div>

          {/* CEO-ONLY scope switcher */}
          {isCeo && (
            <div style={{ display: "flex", gap: "4px", overflowX: "auto", scrollbarWidth: "none" }}>
              {[
                { id: "ALL", label: "👑 All" },
                { id: "Suhani", label: "Suhani" },
                { id: "Kajal Sharma", label: "Kajal" },
                { id: "Kiyam", label: "Kiyam" },
              ].map((usr) => {
                const isSelected = ceoScopeFilter === usr.id;
                return (
                  <button
                    key={usr.id}
                    onClick={() => handleScopeChange(usr.id)}
                    style={{
                      padding: "3px 10px", borderRadius: "14px", fontSize: "10px",
                      fontWeight: isSelected ? 700 : 500,
                      backgroundColor: isSelected ? "#6c5ce7" : "var(--bg-input)",
                      color: isSelected ? "#ffffff" : "var(--text-secondary)",
                      border: `1px solid ${isSelected ? "#6c5ce7" : "var(--bg-border)"}`,
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    {usr.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* KPI CARDS — Compact Single Row Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {[
            { label: "Open", value: counts.open, color: "#d97706", bg: "rgba(253,203,110,0.15)", icon: <AlertCircle size={14} color="#d97706" /> },
            { label: "In Progress", value: counts.inProgress, color: "#0284c7", bg: "rgba(0,206,201,0.15)", icon: <Clock size={14} color="#0284c7" /> },
            { label: "Resolved", value: counts.resolved, color: "#059669", bg: "rgba(0,184,148,0.15)", icon: <CheckCircle size={14} color="#059669" /> },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.icon}</div>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* CONTROLS BAR — Compact Row with Search + Button + Status Pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
              <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={14} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "7px 12px 7px 32px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }}
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: 700, color: "white", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <Plus size={14} /> Raise Ticket
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", overflowX: "auto", scrollbarWidth: "none" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", marginRight: "2px", flexShrink: 0 }}>Status:</span>
            {[
              { id: "ALL", label: "All", count: tickets.length },
              { id: "OPEN", label: "Open", count: counts.open },
              { id: "IN_PROGRESS", label: "In Progress", count: counts.inProgress },
              { id: "RESOLVED", label: "Resolved", count: counts.resolved },
            ].map((st) => {
              const isSelected = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "16px", fontSize: "11px", fontWeight: isSelected ? 700 : 500, backgroundColor: isSelected ? "rgba(108,92,231,0.25)" : "var(--bg-input)", color: isSelected ? "#6c5ce7" : "var(--text-secondary)", border: `1px solid ${isSelected ? "#6c5ce7" : "var(--bg-border)"}`, cursor: "pointer", flexShrink: 0 }}
                >
                  {st.label}
                  <span style={{ fontSize: "9px", background: "rgba(108,92,231,0.15)", padding: "1px 5px", borderRadius: "8px" }}>{st.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TICKET LIST — Compact High-Density Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              🔄 Loading tickets...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--bg-border)" }}>
              <p style={{ marginBottom: "4px", fontSize: "13px" }}>No tickets found for <strong style={{ color: "#6c5ce7" }}>{loggedInName}</strong>.</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Click <strong>+ Raise Ticket</strong> to log an issue.</p>
            </div>
          ) : (
            filtered.map((ticket) => {
              const pr = priorCfg[ticket.priority] || priorCfg["LOW"];
              const stStyle = statusBadgeStyle[ticket.status] || statusBadgeStyle["OPEN"];
              return (
                <div key={ticket.id} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", boxShadow: "var(--shadow-card)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "180px" }}>
                      <div style={{ flexShrink: 0 }}>{statusIcon[ticket.status]}</div>
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.2 }}>{ticket.title}</h4>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span>🏢 {ticket.client}</span>
                          <span>•</span>
                          <span style={{ color: "#6c5ce7", fontWeight: 600 }}>👤 {ticket.createdByName}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: pr.color, backgroundColor: pr.bg, border: `1px solid ${pr.border}`, padding: "2px 7px", borderRadius: "5px", textTransform: "uppercase" }}>
                        {ticket.priority}
                      </span>
                      <select value={ticket.status} onChange={(e) => handleStatusChange(ticket.id, e.target.value as Ticket["status"])}
                        style={{ backgroundColor: stStyle.backgroundColor, color: stStyle.color, border: stStyle.border, padding: "3px 8px", borderRadius: "14px", fontSize: "10px", fontWeight: 700, outline: "none", cursor: "pointer" }}>
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED ✅</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        title="Delete Ticket"
                        style={{ background: "rgba(225, 112, 85, 0.1)", border: "1px solid rgba(225, 112, 85, 0.3)", color: "#e17055", borderRadius: "6px", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Ticket Description Details if present */}
                  {ticket.description && (
                    <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px", color: "var(--text-primary)", whiteSpace: "pre-line", lineHeight: 1.4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "2px" }}>
                        <FileText size={11} /> Requirements / Details:
                      </div>
                      {ticket.description}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", paddingTop: "6px", borderTop: "1px dashed var(--bg-border)", fontSize: "10px" }}>
                    <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={11} /> {formatDate(ticket.createdAt)}
                    </span>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      {ticket.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: "9px", color: "#6c5ce7", background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.25)", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* CREATE TICKET MODAL */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid #6c5ce7", borderRadius: "16px", padding: "20px", width: "92%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(108,92,231,0.25)" }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>Raise Support Ticket</h3>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                Logged as <span style={{ color: "#6c5ce7", fontWeight: 700 }}>{loggedInName}</span>
              </p>
            </div>
            <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Issue Title *</label>
                <input required type="text" name="title" defaultValue="Changes needed" placeholder="e.g. Changes needed" style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Client Name *</label>
                  {clientsList.length > 0 ? (
                    <select name="client" defaultValue="Humjoli Ethnic" style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
                      {clientsList.map((c) => (
                        <option key={c.id} value={c.companyName}>
                          {c.companyName}
                        </option>
                      ))}
                      <option value="Humjoli Ethnic">Humjoli Ethnic</option>
                    </select>
                  ) : (
                    <input required type="text" name="client" defaultValue="Humjoli Ethnic" placeholder="e.g. Humjoli Ethnic" style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }} />
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Priority</label>
                  <select name="priority" defaultValue="HIGH" style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }}>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL 🚨</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Changes & Details (Points)</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={`1. Total value of stock\n2. Use article code rather than name during billing`}
                  placeholder="e.g. 1. Total value of stock&#10;2. Use article code rather than name during billing"
                  style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Tags (comma separated)</label>
                <input type="text" name="tags" defaultValue="Tech, Billing, Stock" placeholder="e.g. FBP, Delivery, Tech" style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "var(--text-primary)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid var(--bg-border)", background: "transparent", color: "var(--text-secondary)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)", color: "white", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                  {isSubmitting ? "Saving..." : "Raise Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
