"use client";

import { useState, useEffect } from "react";
import ProposalModal from "@/components/proposal/ProposalModal";
import NegotiationModal from "@/components/proposal/NegotiationModal";
import ClosedWonModal from "@/components/proposal/ClosedWonModal";
import { getLeads, updateLeadStatus, convertLeadToClient, scheduleLeadFollowUp } from "@/app/actions/leads";
import { Phone, Mail, Kanban as KanbanIcon, Calendar, Search, MapPin, DollarSign, CheckCircle2, FileText, Handshake, Flame, X, Clock, Plus, Filter, UserCheck, TrendingUp, AlertCircle, Sparkles, Trophy, Rocket } from "lucide-react";
import { format, isToday } from "date-fns";
import EmployeeFilterBar from "@/components/common/EmployeeFilterBar";
import type { Lead, LeadStatus } from "@prisma/client";

type ExtendedLead = Lead & { 
  imageUrl?: string | null; 
  followUpDate?: Date | string | null; 
  followUpNote?: string | null; 
};

function parseScrapedDetails(comment: string | null) {
  if (!comment) return { sno: "-", address: "-", city: "-", instagram: "-" };

  const trimmed = comment.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const data = JSON.parse(trimmed);
      return {
        sno: data.sno || "-",
        address: data.address || "-",
        city: data.city || "-",
        instagram: data.instagram && data.instagram.toUpperCase() !== "N/A" ? data.instagram : "-",
      };
    } catch (e) {
      // ignore
    }
  }

  const res = { sno: "-", address: "-", city: "-", instagram: "-" };
  const parts = comment.split("|").map((p) => p.trim());
  parts.forEach((part) => {
    const colonIdx = part.indexOf(":");
    if (colonIdx !== -1) {
      const key = part.slice(0, colonIdx).trim().toLowerCase();
      const val = part.slice(colonIdx + 1).trim();
      if (key.includes("sno")) res.sno = val;
      else if (key.includes("address")) res.address = val;
      else if (key.includes("city")) res.city = val;
      else if (key.includes("instagram") || key.includes("insta")) {
        res.instagram = val.toUpperCase() !== "N/A" ? val : "-";
      }
    }
  });

  if (res.address === "-" && comment && !comment.startsWith("{")) {
    let cleanAddr = comment.replace(/^SNo:\s*\d+\s*\|\s*/i, "").replace(/^Address:\s*/i, "").trim();
    res.address = cleanAddr || "-";
  }

  return res;
}

const STAGE_OPTIONS: { id: any; label: string; icon: string; bg: string; color: string; border: string }[] = [
  { id: "HOT_LEAD", label: "Hot Lead / Meeting 🎯", icon: "🔥", bg: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
  { id: "PROPOSAL_SENT", label: "Proposal Sent 📄", icon: "📄", bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  { id: "NEGOTIATION", label: "Negotiation 🤝", icon: "🤝", bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  { id: "CONVERTED", label: "Closed Won 🎉", icon: "🎉", bg: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  { id: "NOT_INTERESTED", label: "Closed Lost ❌", icon: "❌", bg: "rgba(100, 116, 139, 0.12)", color: "#94a3b8", border: "rgba(100, 116, 139, 0.3)" },
];

export function SDRPipelineContent() {
  const [leads, setLeads] = useState<ExtendedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"closer" | "all" | "list">("closer");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Convert Modal state
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  // Follow-up Modal state
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);

  // Proposal Modal state
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalLead, setProposalLead] = useState<ExtendedLead | null>(null);

  // Negotiation Modal state
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [negotiationLead, setNegotiationLead] = useState<ExtendedLead | null>(null);

  // Closed Won Onboarding Modal state
  const [isClosedWonModalOpen, setIsClosedWonModalOpen] = useState(false);
  const [closedWonLead, setClosedWonLead] = useState<ExtendedLead | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeadsData = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const handleStageChange = async (leadId: string, newStage: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStage as LeadStatus } : l))
    );
    try {
      await updateLeadStatus(leadId, newStage as LeadStatus);
    } catch (err) {
      console.error(err);
      fetchLeadsData();
    }
  };

  const handleConvertClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!convertingLeadId) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const monthlyRetainer = parseFloat(formData.get("monthlyRetainer") as string) || 0;
    const notes = formData.get("notes") as string;

    try {
      await convertLeadToClient(convertingLeadId, monthlyRetainer, notes);
      setIsConvertModalOpen(false);
      setConvertingLeadId(null);
      fetchLeadsData();
    } catch (err) {
      console.error(err);
      alert("Failed to convert lead to active client.");
    }
    setIsSubmitting(false);
  };

  const handleSaveFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!followUpLeadId) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get("followUpDate") as string;
    const note = formData.get("followUpNote") as string;

    try {
      await scheduleLeadFollowUp(followUpLeadId, dateStr, note);
      setIsFollowUpModalOpen(false);
      setFollowUpLeadId(null);
      fetchLeadsData();
    } catch (err) {
      console.error(err);
      alert("Failed to schedule follow-up.");
    }
    setIsSubmitting(false);
  };

  // Filter Leads by Employee & Search
  const filteredLeads = leads.filter((l) => {
    if (selectedEmployee !== "ALL") {
      const assignedName = (l as any).assignedSdr?.name;
      if (assignedName && !assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const details = parseScrapedDetails(l.comment);
    return (
      l.clientName.toLowerCase().includes(q) ||
      (l.businessName && l.businessName.toLowerCase().includes(q)) ||
      (l.clientPhone && l.clientPhone.includes(q)) ||
      (details.address && details.address.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const hotLeadsCount = filteredLeads.filter((l) => l.status === "HOT_LEAD").length;
  const proposalCount = filteredLeads.filter((l) => l.status === "PROPOSAL_SENT").length;
  const negotiationCount = filteredLeads.filter((l) => l.status === "NEGOTIATION").length;
  const convertedCount = filteredLeads.filter((l) => l.status === "CONVERTED").length;
  const targetMonthlyDeals = 3;
  const progressPercent = Math.min(100, Math.round((convertedCount / targetMonthlyDeals) * 100));

  const closerColumns = [
    { id: "HOT_LEAD", label: "🔥 Hot Leads / Meetings", filter: (l: Lead) => l.status === "HOT_LEAD", color: "#f87171", bg: "rgba(239, 68, 68, 0.1)", icon: Flame },
    { id: "PROPOSAL_SENT", label: "📄 Proposal Sent", filter: (l: Lead) => l.status === "PROPOSAL_SENT", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.1)", icon: FileText },
    { id: "NEGOTIATION", label: "🤝 Negotiation", filter: (l: Lead) => l.status === "NEGOTIATION", color: "#c084fc", bg: "rgba(168, 85, 247, 0.1)", icon: Handshake },
    { id: "CONVERTED", label: "🎉 Closed Won", filter: (l: Lead) => l.status === "CONVERTED", color: "#34d399", bg: "rgba(16, 185, 129, 0.1)", icon: CheckCircle2 },
    { id: "NOT_INTERESTED", label: "❌ Closed Lost", filter: (l: Lead) => l.status === "NOT_INTERESTED", color: "#94a3b8", bg: "rgba(100, 116, 139, 0.1)", icon: X },
  ];

  const allPoolColumns = [
    { id: "NEW", label: "🟡 New Lead", filter: (l: Lead) => l.status === "NEW", color: "#facc15" },
    { id: "NO_ANSWER", label: "📵 No Answer", filter: (l: Lead) => (l.status as string) === "NO_ANSWER", color: "#f87171" },
    { id: "WARM_LEAD", label: "⏰ Follow-up", filter: (l: Lead) => l.status === "WARM_LEAD", color: "#fb923c" },
    { id: "HOT_LEAD", label: "🔥 Hot Lead", filter: (l: Lead) => l.status === "HOT_LEAD", color: "#ef4444" },
    { id: "PROPOSAL_SENT", label: "📄 Proposal", filter: (l: Lead) => l.status === "PROPOSAL_SENT", color: "#3b82f6" },
    { id: "NEGOTIATION", label: "🤝 Negotiation", filter: (l: Lead) => l.status === "NEGOTIATION", color: "#a855f7" },
    { id: "CONVERTED", label: "🎉 Closed Won", filter: (l: Lead) => l.status === "CONVERTED", color: "#10b981" },
    { id: "NOT_INTERESTED", label: "❌ Closed Lost", filter: (l: Lead) => l.status === "NOT_INTERESTED", color: "#64748b" },
  ];

  const renderKanbanCard = (lead: ExtendedLead) => {
    const details = parseScrapedDetails(lead.comment);
    const isHot = lead.status === "HOT_LEAD";
    const isProposal = lead.status === "PROPOSAL_SENT";
    const isNegotiation = lead.status === "NEGOTIATION";
    const isClosedWon = lead.status === "CONVERTED";

    return (
      <div
        key={lead.id}
        className="card-youistic"
        style={{
          padding: "14px",
          borderRadius: "12px",
          backgroundColor: "var(--bg-card)",
          border: isClosedWon
            ? "1px solid #10b981"
            : isHot
            ? "1px solid rgba(239, 68, 68, 0.4)"
            : "1px solid var(--bg-border)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "relative",
          boxShadow: isHot ? "0 4px 14px rgba(239,68,68,0.15)" : "var(--shadow-card)",
        }}
      >
        {/* Card Header: Title & Phone */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", lineHeight: "1.3" }}>
            {lead.businessName || lead.clientName}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {lead.clientName && lead.clientName !== lead.businessName ? `${lead.clientName} • ` : ""}
            <span style={{ color: "#a29bfe" }}>{lead.service || "Web / Marketing"}</span>
          </div>

          {lead.clientPhone && (
            <a
              href={`tel:${lead.clientPhone}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                color: "#34d399",
                fontWeight: 600,
                fontFamily: "monospace",
                textDecoration: "none",
                marginTop: "6px",
              }}
            >
              <Phone size={11} /> {lead.clientPhone}
            </a>
          )}
        </div>

        {/* Location & Address */}
        {details.address !== "-" && (
          <div style={{ fontSize: "10px", color: "#cbd5e1", display: "flex", alignItems: "flex-start", gap: "4px" }}>
            <MapPin size={11} className="text-slate-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{details.address}</span>
          </div>
        )}

        {/* Follow-up Date Badge if Scheduled */}
        {lead.followUpDate && (
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: "#fb923c",
              background: "rgba(249, 115, 22, 0.12)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              padding: "4px 8px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Clock size={10} />
            <span>
              {isToday(new Date(lead.followUpDate))
                ? "Today @ " + format(new Date(lead.followUpDate), "hh:mm a")
                : format(new Date(lead.followUpDate), "MMM dd, hh:mm a")}
            </span>
          </div>
        )}

        {/* Action Buttons depending on Stage */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingTop: "4px", borderTop: "1px dashed #1f2235" }}>
          
          {/* Create Commercial Proposal Button */}
          {(isHot || isProposal) && (
            <button
              onClick={() => {
                setProposalLead(lead);
                setIsProposalModalOpen(true);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                border: "none",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(59, 130, 246, 0.25)",
              }}
            >
              <FileText size={12} /> Create Proposal PDF
            </button>
          )}

          {/* Negotiate Deal Details Button */}
          {isNegotiation && (
            <button
              onClick={() => {
                setNegotiationLead(lead);
                setIsNegotiationModalOpen(true);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                border: "none",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(168, 85, 247, 0.25)",
              }}
            >
              <Handshake size={12} /> Negotiate Deal
            </button>
          )}

          {/* Closed Won Action Button */}
          {isClosedWon ? (
            <button
              onClick={() => {
                setClosedWonLead(lead);
                setIsClosedWonModalOpen(true);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #10b981",
                color: "#34d399",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Rocket size={12} /> Onboard CRM & Start Project 🚀
            </button>
          ) : (
            <button
              onClick={() => {
                setConvertingLeadId(lead.id);
                setIsConvertModalOpen(true);
              }}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "#34d399",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <CheckCircle2 size={12} /> Close Deal & Convert
            </button>
          )}

          {/* Quick Stage Selector Dropdown */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
            <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600 }}>STAGE:</span>
            <select
              value={lead.status}
              onChange={(e) => handleStageChange(lead.id, e.target.value)}
              style={{
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--bg-border)",
                borderRadius: "6px",
                padding: "4px 6px",
                fontSize: "10px",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
                flex: 1,
              }}
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.icon} {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }} className="animate-in">
      
      {/* Universal SDR Team Member Filter */}
      <EmployeeFilterBar
        roleLabel="SDR"
        options={["ALL", "Suhani", "Kajal Sharma"]}
        selected={selectedEmployee}
        onSelect={setSelectedEmployee}
      />

      {/* MOTIVATIONAL SDR CLOSING GOAL BANNER */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "16px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "10px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", borderRadius: "12px", color: "#fff", boxShadow: "0 4px 14px rgba(16,185,129,0.4)" }}>
              <Trophy size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Closing Goal: {convertedCount} / {targetMonthlyDeals} Deals Closed Won 🎉
                </h3>
                <span style={{ fontSize: "10px", fontWeight: 700, background: progressPercent >= 100 ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)", color: progressPercent >= 100 ? "#34d399" : "#818cf8", border: `1px solid ${progressPercent >= 100 ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`, padding: "2px 8px", borderRadius: "20px" }}>
                  {progressPercent}% Target Hit 🔥
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                {targetMonthlyDeals - convertedCount > 0 ? `Close ${targetMonthlyDeals - convertedCount} more deals in negotiation to hit your target!` : "🎉 Monthly Closing Target Achieved!"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--bg-input)", padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
            <Flame size={18} className="text-amber-400" />
            <div>
              <span style={{ fontSize: "10px", color: "var(--text-secondary)", display: "block" }}>Active Deals in Funnel</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{hotLeadsCount + proposalCount + negotiationCount} Deals</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", background: "var(--bg-border)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #6366f1 0%, #10b981 100%)", borderRadius: "4px", transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* KPI METRIC CARDS 2x2 GRID */}
      <div className="pipeline-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.15)", borderRadius: "10px", color: "#f87171" }}>
            <Flame size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Hot Leads (Ready)</p>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f87171", margin: "2px 0 0" }}>{hotLeadsCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(59, 130, 246, 0.15)", borderRadius: "10px", color: "#60a5fa" }}>
            <FileText size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Proposals Sent</p>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#60a5fa", margin: "2px 0 0" }}>{proposalCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "10px", color: "#c084fc" }}>
            <Handshake size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>In Negotiation</p>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#c084fc", margin: "2px 0 0" }}>{negotiationCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "10px", color: "#34d399" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Closed Won (Clients)</p>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#34d399", margin: "2px 0 0" }}>{convertedCount}</h3>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "4px", flexWrap: "wrap" }}>
          <button
            onClick={() => { setView("closer"); setStageFilter("ALL"); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: view === "closer" ? "#6c5ce7" : "transparent",
              color: view === "closer" ? "#fff" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <KanbanIcon size={14} />
            Closer Funnel Board
          </button>
          <button
            onClick={() => { setView("all"); setStageFilter("ALL"); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: view === "all" ? "#6c5ce7" : "transparent",
              color: view === "all" ? "#fff" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            <Sparkles size={14} />
            All Pool Stages
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
          <div style={{ position: "relative", minWidth: "180px", flex: 1, maxWidth: "300px" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={15} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                backgroundColor: "var(--bg-input)",
                border: "1px solid var(--bg-border)",
                borderRadius: "8px",
                padding: "8px 12px 8px 36px",
                fontSize: "13px",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-secondary)", background: "var(--bg-input)", border: "1px solid var(--bg-border)", padding: "8px 12px", borderRadius: "8px", fontWeight: 600, fontFamily: "monospace" }}>
            Total: {filteredLeads.length}
          </span>
        </div>
      </div>

      {/* Sleek Stage Filter Selector Pills Bar */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", whiteSpace: "nowrap", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "10px 14px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginRight: "4px", flexShrink: 0 }}>
          🎯 Select Stage View:
        </span>
        <button
          onClick={() => setStageFilter("ALL")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: stageFilter === "ALL" ? 700 : 500,
            backgroundColor: stageFilter === "ALL" ? "#312e81" : "var(--bg-input)",
            color: stageFilter === "ALL" ? "#a5b4fc" : "var(--text-secondary)",
            border: stageFilter === "ALL" ? "1px solid #6366f1" : "1px solid var(--bg-border)",
            cursor: "pointer",
            flexShrink: 0
          }}
        >
          All Stages ({filteredLeads.length})
        </button>

        {(view === "closer" ? closerColumns : allPoolColumns).map((col) => {
          const isSelected = stageFilter === col.id;
          const colCount = filteredLeads.filter(col.filter).length;

          return (
            <button
              key={col.id}
              onClick={() => setStageFilter(col.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? "rgba(108,92,231,0.25)" : "var(--bg-input)",
                color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                border: `1px solid ${isSelected ? "#6c5ce7" : "var(--bg-border)"}`,
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              <span>{col.label}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, opacity: 0.8, background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: "10px" }}>
                {colCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* CLOSER FUNNEL KANBAN BOARD */}
      {view === "closer" && (
        <div 
          className="pipeline-kanban-row" 
          style={{ 
            display: "grid", 
            gridTemplateColumns: stageFilter === "ALL" ? "repeat(5, 1fr)" : "1fr", 
            gap: "16px", 
            alignItems: "stretch" 
          }}
        >
          {(stageFilter === "ALL" ? closerColumns : closerColumns.filter(c => c.id === stageFilter)).map((col) => {
            const colLeads = filteredLeads.filter(col.filter);
            const Icon = col.icon;

            return (
              <div key={col.id} className="pipeline-kanban-col" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", overflow: "hidden", minHeight: "500px", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-card)" }}>
                {/* Column Header */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--bg-border)", background: col.bg, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Icon size={16} color={col.color} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: col.color, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "6px" }}>
                    {colLeads.length} Deals
                  </span>
                </div>

                {/* Column Cards */}
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
                  {loading ? (
                    <div style={{ textAlign: "center", padding: "20px", fontSize: "12px", color: "var(--text-muted)" }}>Loading leads...</div>
                  ) : colLeads.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 10px", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No deals in {col.label}
                    </div>
                  ) : (
                    colLeads.map((lead) => renderKanbanCard(lead))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ALL STAGES KANBAN BOARD */}
      {view === "all" && (
        <div 
          className="pipeline-kanban-row" 
          style={{ 
            display: "grid", 
            gridTemplateColumns: stageFilter === "ALL" ? "repeat(4, 1fr)" : "1fr", 
            gap: "16px", 
            alignItems: "stretch" 
          }}
        >
          {(stageFilter === "ALL" ? allPoolColumns : allPoolColumns.filter(c => c.id === stageFilter)).map((col) => {
            const colLeads = filteredLeads.filter(col.filter);

            return (
              <div key={col.id} className="pipeline-kanban-col" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", overflow: "hidden", minHeight: "460px", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-card)" }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: col.color, background: `${col.color}15`, padding: "2px 8px", borderRadius: "6px" }}>
                    {colLeads.length} Deals
                  </span>
                </div>

                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
                  {loading ? (
                    <div style={{ textAlign: "center", padding: "20px", fontSize: "12px", color: "var(--text-muted)" }}>Loading...</div>
                  ) : colLeads.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", fontSize: "12px", color: "var(--text-muted)" }}>No leads in stage</div>
                  ) : (
                    colLeads.map((lead) => renderKanbanCard(lead))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Convert Lead to Active Client Modal */}
      {isConvertModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #10b981", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(16, 185, 129, 0.2)" }}>
            <button onClick={() => { setIsConvertModalOpen(false); setConvertingLeadId(null); }} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "12px", color: "#34d399" }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>Convert to Active Client 🎉</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Onboard client & start active project tracking</p>
              </div>
            </div>

            <form onSubmit={handleConvertClient} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>Monthly Retainer Value (₹)</label>
                <input
                  type="number"
                  name="monthlyRetainer"
                  placeholder="e.g. 45000"
                  required
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f8fafc", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>Client Onboarding Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Agreement terms, service inclusions, scope..."
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f8fafc", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => { setIsConvertModalOpen(false); setConvertingLeadId(null); }}
                  style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid #1f2235", background: "transparent", color: "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}
                >
                  {isSubmitting ? "Converting..." : "Confirm & Convert"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commercial PDF Proposal Generator Modal */}
      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setProposalLead(null);
        }}
        lead={proposalLead}
        onSuccess={() => {
          fetchLeadsData();
        }}
      />

      {/* Negotiation Commercial Agreement Modal */}
      <NegotiationModal
        isOpen={isNegotiationModalOpen}
        onClose={() => {
          setIsNegotiationModalOpen(false);
          setNegotiationLead(null);
        }}
        lead={negotiationLead}
        onSuccess={() => {
          fetchLeadsData();
        }}
      />

      {/* Closed Won Onboarding & Client Project Sync Modal */}
      <ClosedWonModal
        isOpen={isClosedWonModalOpen}
        onClose={() => {
          setIsClosedWonModalOpen(false);
          setClosedWonLead(null);
        }}
        lead={closedWonLead}
        onSuccess={() => {
          fetchLeadsData();
        }}
      />
    </main>
  );
}
