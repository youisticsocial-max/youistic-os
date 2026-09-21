"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, Plus, Building2, Phone, Calendar, Users, TrendingUp, ChevronRight, LayoutGrid, List, Mail, ExternalLink, Trash2 } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import type { Client } from "@/types";
import { getClients, createClient, deleteClient } from "@/app/actions/clients";

const statusConfig: Record<string, { label: string; className: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", className: "badge badge-active", color: "#00b894", bg: "rgba(0,184,148,0.12)" },
  CHURNED: { label: "Churned", className: "badge badge-churned", color: "#d63031", bg: "rgba(214,48,49,0.12)" },
  RENEWAL_DUE: { label: "Renewal Due", className: "badge badge-renewal", color: "#fdcb6e", bg: "rgba(253,203,110,0.15)" },
  ONBOARDING: { label: "Onboarding", className: "badge badge-onboarding", color: "#0984e3", bg: "rgba(9,132,227,0.12)" },
};

const svcConfig: Record<string, { color: string; bg: string }> = {
  FBP: { color: "#6c5ce7", bg: "rgba(108,92,231,0.12)" },
  TECH: { color: "#00cec9", bg: "rgba(0,206,201,0.12)" },
  HYBRID: { color: "#fdcb6e", bg: "rgba(253,203,110,0.12)" },
};

export default function CRMPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    serviceType: "TECH",
    billingModel: "ONE_TIME",
    status: "ACTIVE",
    contractValue: 0,
    renewalAmount: 0,
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const nextYearDate = new Date();
  nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
  const nextYearStr = nextYearDate.toISOString().split("T")[0];

  const [startDateInput, setStartDateInput] = useState(todayStr);
  const [renewalDateInput, setRenewalDateInput] = useState(nextYearStr);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");

  const handleStartDateChange = (val: string) => {
    setStartDateInput(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 1);
        setRenewalDateInput(d.toISOString().split("T")[0]);
      }
    }
  };

  const fetchDbClients = async () => {
    const dbClients = await getClients();
    if (dbClients && dbClients.length > 0) {
      const formatted: Client[] = dbClients.map((c: any) => ({
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email || "",
        phone: c.phone || "",
        serviceType: c.serviceType as any,
        billingModel: (c.billingModel as any) || "ONE_TIME",
        contractValue: c.contractValue || 0,
        renewalAmount: c.renewalAmount || 0,
        status: c.status as any,
        industry: c.industry || "General",
        salesCloseDate: c.salesCloseDate ? new Date(c.salesCloseDate) : new Date(),
        renewalDate: c.renewalDate ? new Date(c.renewalDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        createdAt: c.createdAt,
      }));
      setClients(formatted);
    } else {
      setClients([]);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchDbClients();
  }, []);

  const filtered = clients.filter((c) => {
    const matchSearch = c.companyName.toLowerCase().includes(search.toLowerCase()) || c.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchService = serviceFilter === "ALL" || c.serviceType === serviceFilter;
    return matchSearch && matchStatus && matchService;
  });

  const activeClients = clients.filter((c) => c.status === "ACTIVE");
  const totalProjectFees = activeClients.reduce((s, c) => s + (c.billingModel === "ONE_TIME" ? c.contractValue : 0), 0);
  const totalRenewalARR = activeClients.reduce((s, c) => s + (c.billingModel === "RECURRING" ? c.contractValue : (c.renewalAmount || 0)), 0);

  const handleDeleteClient = async (id: string, companyName: string) => {
    if (confirm(`Are you sure you want to delete client "${companyName}"?`)) {
      try {
        await deleteClient(id);
        fetchDbClients();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient({
        companyName: newClient.companyName || "",
        contactPerson: newClient.contactPerson || "",
        email: newClient.email || "",
        phone: newClient.phone || "",
        serviceType: (newClient.serviceType as any) || "TECH",
        billingModel: (newClient.billingModel as any) || "ONE_TIME",
        contractValue: Number(newClient.contractValue) || 0,
        renewalAmount: Number(newClient.renewalAmount) || 0,
        status: (newClient.status as any) || "ACTIVE",
        industry: newClient.industry || "Other",
        salesCloseDate: startDateInput,
        renewalDate: renewalDateInput,
      });
      fetchDbClients();
    } catch (err) {
      console.error(err);
    }
    setIsAddModalOpen(false);
    setNewClient({ serviceType: "TECH", billingModel: "ONE_TIME", status: "ACTIVE", contractValue: 0, renewalAmount: 0 });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="CRM" subtitle="Client Relationship Management — Gridded Directory & Vault" />
      
      <main style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-in">
        
        {/* Quick Stats 2x2 Responsive Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Clients", value: clients.length, icon: Users, color: "#6c5ce7", bg: "rgba(108,92,231,0.12)" },
            { label: "Active Clients", value: clients.filter(c => c.status === "ACTIVE").length, icon: TrendingUp, color: "#00b894", bg: "rgba(0,184,148,0.12)" },
            { label: "One-Time Project Revenue", value: formatCurrency(totalProjectFees), icon: Building2, color: "#00cec9", bg: "rgba(0,206,201,0.12)" },
            { label: "Annual Renewal ARR (Hosting & Retainer)", value: formatCurrency(totalRenewalARR), icon: Calendar, color: "#fdcb6e", bg: "rgba(253,203,110,0.12)" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card-youistic" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #1f2338" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={s.color} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(16px, 3.5vw, 20px)", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Controls & View Switcher Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "16px" }}>
          
          {/* Top Bar: Search Input & Add Client Button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 14px", flex: 1, minWidth: "220px" }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search clients by name, contact, industry..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%" }} 
              />
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)} 
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "linear-gradient(135deg, #6c5ce7 0%, #4338ca 100%)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(108,92,231,0.3)" }}
            >
              <Plus size={16} /> + Add Client
            </button>
          </div>

          {/* Bottom Bar: Status Filter, Service Filter & View Switcher */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", flex: 1 }}>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", padding: "8px 12px", outline: "none", cursor: "pointer", fontWeight: 600 }}>
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="RENEWAL_DUE">Renewal Due</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="CHURNED">Churned</option>
              </select>

              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", padding: "8px 12px", outline: "none", cursor: "pointer", fontWeight: 600 }}>
                <option value="ALL">All Services</option>
                <option value="FBP">FBP Solution</option>
                <option value="TECH">Tech Solution</option>
                <option value="HYBRID">Hybrid Model</option>
              </select>
            </div>

            {/* View Switcher: GRID vs TABLE */}
            <div style={{ display: "flex", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "3px", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setViewMode("GRID")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: viewMode === "GRID" ? "linear-gradient(135deg, #6c5ce7, #4f46e5)" : "transparent",
                  color: viewMode === "GRID" ? "white" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <LayoutGrid size={14} /> Grid Cards
              </button>

              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: viewMode === "TABLE" ? "linear-gradient(135deg, #6c5ce7, #4f46e5)" : "transparent",
                  color: viewMode === "TABLE" ? "white" : "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                <List size={14} /> Table View
              </button>
            </div>
          </div>
        </div>

        {/* CLIENTS DISPLAY: GRID CARDS VIEW OR TABLE VIEW */}
        {viewMode === "GRID" ? (
          /* GRID CARDS VIEW (Clean 1-Col / 2-Col Mobile Layout) */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {filtered.length === 0 ? (
              <div className="card-youistic" style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "#64748b" }}>
                No clients found matching your filters. Click <strong>+ Add Client</strong> to add one!
              </div>
            ) : (
              filtered.map((client) => {
                const svc = svcConfig[client.serviceType] || svcConfig.TECH;
                const sts = statusConfig[client.status] || statusConfig.ACTIVE;
                const days = getDaysUntil(client.renewalDate || null);

                return (
                  <div 
                    key={client.id} 
                    className="card-youistic" 
                    style={{ 
                      padding: "20px", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "14px", 
                      border: "1px solid var(--bg-border)", 
                      borderRadius: "14px", 
                      background: "var(--bg-card)",
                      position: "relative"
                    }}
                  >
                    {/* Header: Badge & Status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: svc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 800, color: svc.color, border: `1px solid ${svc.color}30` }}>
                          {client.companyName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                            {client.companyName}
                          </h3>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{client.industry || "Enterprise Client"}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "20px", background: sts.bg, color: sts.color, border: `1px solid ${sts.color}30` }}>
                          {sts.label}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.companyName); }}
                          title="Delete Client"
                          style={{ background: "rgba(214,48,49,0.1)", border: "1px solid rgba(214,48,49,0.25)", color: "#ff7675", width: "28px", height: "28px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Service & Contract Value Banner */}
                    <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Service & Model</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: svc.color }}>{client.serviceType}</span>
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "6px", background: client.billingModel === "RECURRING" ? "rgba(108,92,231,0.15)" : "rgba(0,206,201,0.15)", color: client.billingModel === "RECURRING" ? "#818cf8" : "#00cec9", border: `1px solid ${client.billingModel === "RECURRING" ? "rgba(108,92,231,0.3)" : "rgba(0,206,201,0.3)"}` }}>
                            {client.billingModel === "RECURRING" ? "🔄 Retainer" : "⚡ One-Time"}
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                          {client.billingModel === "RECURRING" ? "Annual Retainer" : "Project Fee"}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 800, color: "#00b894", fontFamily: "'Space Grotesk', sans-serif" }}>
                          {formatCurrency(client.contractValue)} 
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
                            {client.billingModel === "RECURRING" ? " /yr" : " (One-Time)"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Yearly Renewal Amount badge if set */}
                    {client.renewalAmount && client.renewalAmount > 0 ? (
                      <div style={{ fontSize: "11px", color: "#fdcb6e", background: "rgba(253,203,110,0.1)", border: "1px solid rgba(253,203,110,0.25)", padding: "6px 10px", borderRadius: "8px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>🛠️ Yearly Renewal / Maintenance:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{formatCurrency(client.renewalAmount)}/yr</strong>
                      </div>
                    ) : null}

                    {/* Contact Person Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "var(--text-secondary)" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>👤 {client.contactPerson}</div>
                      {client.phone && (
                        <a href={`tel:${client.phone}`} style={{ color: "#0284c7", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}>
                          <Phone size={12} /> {client.phone}
                        </a>
                      )}
                      {client.email && (
                        <a href={`mailto:${client.email}`} style={{ color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <Mail size={12} /> {client.email}
                        </a>
                      )}
                    </div>

                    {/* Renewal Badge & Actions Footer */}
                    <div style={{ borderTop: "1px solid var(--bg-border)", paddingTop: "10px", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", flexWrap: "wrap", gap: "6px" }}>
                      <div style={{ fontSize: "11px", display: "flex", flexDirection: "column", gap: "2px" }}>
                        {client.salesCloseDate && (
                          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                            🚀 Started: <strong>{formatDate(client.salesCloseDate)}</strong>
                          </span>
                        )}
                        {client.renewalDate ? (
                          <span style={{ color: days !== null && days < 30 ? "#e17055" : "var(--text-muted)", fontWeight: 600 }}>
                            📅 Renewal: <strong>{formatDate(client.renewalDate)}</strong> {days !== null ? (days > 0 ? `(${days}d left)` : "(Overdue)") : ""}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>No renewal set</span>
                        )}
                      </div>

                      <Link
                        href={`/dashboard/crm/${client.id}`}
                        style={{ background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.3)", color: "#6366f1", padding: "6px 12px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
                      >
                        Client 360 <ChevronRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* CLASSIC TABLE VIEW */
          <div className="card-youistic" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2235" }}>
                    {["Company", "Contact", "Service & Model", "Contract / Project Value", "Status", "Start & Renewal", "Action"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "14px 20px", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => {
                    const svc = svcConfig[client.serviceType] || svcConfig.TECH;
                    const sts = statusConfig[client.status] || statusConfig.ACTIVE;
                    const days = getDaysUntil(client.renewalDate || null);
                    return (
                      <tr key={client.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background 0.15s", cursor: "pointer" }}>
                        <td style={{ padding: "16px 20px" }}>
                          <Link href={`/dashboard/crm/${client.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{client.companyName}</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{client.industry || "General"}</div>
                          </Link>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{client.contactPerson}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{client.phone || client.email || "No direct contact info"}</div>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: svc.color }}>{client.serviceType}</span>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{client.billingModel === "RECURRING" ? "Retainer" : "One-Time"}</div>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "#00b894", fontFamily: "'Space Grotesk', sans-serif" }}>
                            {formatCurrency(client.contractValue)}
                          </div>
                          {client.renewalAmount && client.renewalAmount > 0 ? (
                            <div style={{ fontSize: "10px", color: "#fdcb6e", fontWeight: 600, marginTop: "2px" }}>
                              Renewal: {formatCurrency(client.renewalAmount)}/yr
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: "16px 20px" }}><span className={sts.className}>{sts.label}</span></td>
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            {client.salesCloseDate && (
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                Start: <strong>{formatDate(client.salesCloseDate)}</strong>
                              </div>
                            )}
                            {client.renewalDate ? (
                              <div>
                                <div style={{ fontSize: "12px", color: days !== null && days < 30 ? "#e17055" : "var(--text-muted)", fontWeight: 600 }}>
                                  Renewal: {formatDate(client.renewalDate)}
                                </div>
                                {days !== null && <div style={{ fontSize: "10px", color: days < 30 ? "#e17055" : days < 90 ? "#fdcb6e" : "var(--text-muted)" }}>{days > 0 ? `${days} days left` : "Overdue"}</div>}
                              </div>
                            ) : <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>}
                          </div>
                        </td>
                        <td style={{ padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Link href={`/dashboard/crm/${client.id}`} style={{ background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.2)", color: "#6366f1", padding: "6px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                              Client 360 <ChevronRight size={12} />
                            </Link>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id, client.companyName); }}
                              title="Delete Client"
                              style={{ background: "rgba(214,48,49,0.1)", border: "1px solid rgba(214,48,49,0.25)", color: "#ff7675", width: "28px", height: "28px", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Client Modal - Portaled to document.body */}
      {isAddModalOpen && mounted && createPortal(
        <div 
          style={{ 
            position: "fixed", 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: "100vw", 
            height: "100vh", 
            background: "rgba(5, 7, 13, 0.85)", 
            backdropFilter: "blur(12px)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            zIndex: 999999, 
            padding: "16px" 
          }}
        >
          <div 
            className="card-youistic animate-in" 
            style={{ 
              width: "100%", 
              maxWidth: "560px", 
              maxHeight: "90vh", 
              display: "flex", 
              flexDirection: "column", 
              background: "var(--bg-card)", 
              border: "1px solid var(--bg-border)", 
              color: "var(--text-primary)", 
              borderRadius: "20px", 
              boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.7)", 
              overflow: "hidden" 
            }}
          >
            {/* Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0, background: "var(--bg-card)" }}>
              <div className="section-title" style={{ fontSize: "18px", margin: 0, color: "var(--text-primary)", fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>Add New Client</div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "20px" }}>&times;</button>
            </div>
            
            {/* Scrollable Form Body */}
            <form onSubmit={handleAddClient} style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Company Name *</label>
                  <input required type="text" placeholder="e.g. Humjoli Ethnic" value={newClient.companyName || ""} onChange={(e) => setNewClient({...newClient, companyName: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Contact Person *</label>
                  <input required type="text" placeholder="e.g. Sohail" value={newClient.contactPerson || ""} onChange={(e) => setNewClient({...newClient, contactPerson: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Email</label>
                  <input type="email" placeholder="client@email.com" value={newClient.email || ""} onChange={(e) => setNewClient({...newClient, email: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Phone</label>
                  <input type="text" placeholder="742505198" value={newClient.phone || ""} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>
              </div>

              {/* Billing Structure & Service Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Service Type</label>
                  <select value={newClient.serviceType} onChange={(e) => setNewClient({...newClient, serviceType: e.target.value as any})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}>
                    <option value="TECH">Tech Solution</option>
                    <option value="FBP">FBP Solution</option>
                    <option value="HYBRID">Hybrid Model</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Billing Structure</label>
                  <select value={newClient.billingModel || "ONE_TIME"} onChange={(e) => setNewClient({...newClient, billingModel: e.target.value as any})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}>
                    <option value="ONE_TIME">⚡ One-Time Project + Yearly Renewal Fee</option>
                    <option value="RECURRING">🔄 Recurring Retainer (Annual / Monthly)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Contract Value vs Renewal Amount Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                    {newClient.billingModel === "RECURRING" ? "Annual Retainer Value (₹/yr) *" : "Initial Project Fee (One-Time ₹) *"}
                  </label>
                  <input type="number" placeholder={newClient.billingModel === "RECURRING" ? "e.g. 120000" : "e.g. 25000"} value={newClient.contractValue || ""} onChange={(e) => setNewClient({...newClient, contractValue: Number(e.target.value)})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                    Yearly Renewal Fee (₹/yr)
                  </label>
                  <input type="number" placeholder="e.g. 3000 (Domain/Server/Maint.)" value={newClient.renewalAmount || ""} onChange={(e) => setNewClient({...newClient, renewalAmount: Number(e.target.value)})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>
              </div>

              {/* Project Start Date & Next Renewal Date Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                    Project Start Date 🚀 *
                  </label>
                  <input 
                    required 
                    type="date" 
                    value={startDateInput} 
                    onChange={(e) => handleStartDateChange(e.target.value)} 
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} 
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>
                    Next Year Renewal Date 📅
                  </label>
                  <input 
                    type="date" 
                    value={renewalDateInput} 
                    onChange={(e) => setRenewalDateInput(e.target.value)} 
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} 
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div style={{ position: "sticky", bottom: 0, background: "var(--bg-card)", marginTop: "12px", borderTop: "1px solid var(--bg-border)", paddingTop: "14px", display: "flex", justifyContent: "flex-end", gap: "12px", zIndex: 10 }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "10px 16px", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ padding: "10px 20px", background: "linear-gradient(135deg, #6c5ce7, #4f46e5)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer" }}>Save Client</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
