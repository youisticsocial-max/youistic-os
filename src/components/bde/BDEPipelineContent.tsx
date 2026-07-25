"use client";

import { useState, useEffect } from "react";
import ProposalModal from "@/components/proposal/ProposalModal";
import NegotiationModal from "@/components/proposal/NegotiationModal";
import ClosedWonModal from "@/components/proposal/ClosedWonModal";
import { getLeads, updateLeadStatus, convertLeadToClient, scheduleLeadFollowUp, createRawLead } from "@/app/actions/leads";
import { uploadBase64Image } from "@/app/actions/upload";
import { Phone, MapPin, Search, DollarSign, CheckCircle2, FileText, Handshake, Flame, X, Clock, Image as ImageIcon, Plus, Trophy, Zap, AlertTriangle, TrendingUp, ChevronDown, Sparkles, Rocket } from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
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

const BDE_STAGES = [
  { id: "WARM_LEAD", label: "Field Visit / Warm 📍", bg: "rgba(230, 126, 34, 0.12)", color: "#e67e22", border: "rgba(230, 126, 34, 0.3)" },
  { id: "HOT_LEAD", label: "Meeting Scheduled 🎯", bg: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" },
  { id: "PROPOSAL_SENT", label: "Proposal Sent 📄", bg: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" },
  { id: "NEGOTIATION", label: "Negotiation 🤝", bg: "rgba(168, 85, 247, 0.12)", color: "#c084fc", border: "rgba(168, 85, 247, 0.3)" },
  { id: "CONVERTED", label: "Closed Won 🎉", bg: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" },
  { id: "NOT_INTERESTED", label: "Closed Lost ❌", bg: "rgba(100, 116, 139, 0.12)", color: "#94a3b8", border: "rgba(100, 116, 139, 0.3)" },
];

export function BDEPipelineContent() {
  const [bdeLeads, setBdeLeads] = useState<ExtendedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [activeFilterTab, setActiveFilterTab] = useState<"ALL" | "DUE_TODAY">("ALL");

  // Modals state
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
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

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeadsData = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setBdeLeads(data.filter((l) => l.source === "BDE Field" || l.status === "WARM_LEAD" || l.status === "HOT_LEAD" || l.status === "PROPOSAL_SENT" || l.status === "NEGOTIATION" || l.status === "CONVERTED"));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const handleStageChange = async (leadId: string, newStage: string) => {
    setBdeLeads((prev) =>
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
      alert("Failed to convert BDE lead to active client.");
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
      alert("Failed to schedule field visit / follow-up.");
    }
    setIsSubmitting(false);
  };

  const handleAddBDELead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      let uploadedImageUrl = undefined;
      if (previewImage) {
        uploadedImageUrl = await uploadBase64Image(previewImage);
      }

      await createRawLead({
        clientName: formData.get("clientName") as string,
        businessName: formData.get("businessName") as string,
        clientPhone: formData.get("clientPhone") as string,
        service: (formData.get("service") as string) || "General Field Visit",
        comment: formData.get("address") ? `Address: ${formData.get("address")}` : "Field lead captured by BDE",
        source: "BDE Field",
        imageUrl: uploadedImageUrl,
      });

      setIsLeadModalOpen(false);
      setPreviewImage(null);
      fetchLeadsData();
    } catch (err) {
      console.error(err);
      alert("Failed to create warm field lead.");
    }
    setIsSubmitting(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          ctx2d.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setPreviewImage(compressedBase64);
        }
      };
    };
  };

  // Filter BDE Leads by Employee, Search & Today's Follow-up
  const filteredBdeLeads = bdeLeads.filter((l, index) => {
    if (selectedEmployee !== "ALL") {
      const assignedName = (l as any).assignedBde?.name || "Kiyam";
      if (!assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
    }
    if (activeFilterTab === "DUE_TODAY") {
      if (!l.followUpDate) return false;
      const fDate = new Date(l.followUpDate);
      if (!isToday(fDate) && !isBefore(fDate, startOfDay(new Date()))) return false;
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
  const warmVisitsCount = filteredBdeLeads.filter((l) => l.status === "WARM_LEAD").length;
  const meetingsScheduledCount = filteredBdeLeads.filter((l) => l.status === "HOT_LEAD").length;
  const proposalsSentCount = filteredBdeLeads.filter((l) => l.status === "PROPOSAL_SENT").length;
  const inNegotiationCount = filteredBdeLeads.filter((l) => l.status === "NEGOTIATION").length;
  const closedWonCount = filteredBdeLeads.filter((l) => l.status === "CONVERTED").length;

  const dueTodayCount = bdeLeads.filter((l) => {
    if (!l.followUpDate) return false;
    const fDate = new Date(l.followUpDate);
    return isToday(fDate) || isBefore(fDate, startOfDay(new Date()));
  }).length;

  const targetMonthlyDeals = 4;
  const progressPercent = Math.min(100, Math.round((closedWonCount / targetMonthlyDeals) * 100));

  const columns = [
    { id: "WARM_LEAD", label: "📍 Warm Field Leads", filter: (l: Lead) => l.status === "WARM_LEAD" || l.status === "NEW", color: "#e67e22", bg: "rgba(230, 126, 34, 0.1)" },
    { id: "HOT_LEAD", label: "🎯 Meeting Scheduled", filter: (l: Lead) => l.status === "HOT_LEAD", color: "#f87171", bg: "rgba(239, 68, 68, 0.1)" },
    { id: "PROPOSAL_SENT", label: "📄 Proposal Sent", filter: (l: Lead) => l.status === "PROPOSAL_SENT", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.1)" },
    { id: "NEGOTIATION", label: "🤝 Negotiation", filter: (l: Lead) => l.status === "NEGOTIATION", color: "#c084fc", bg: "rgba(168, 85, 247, 0.1)" },
    { id: "CONVERTED", label: "🎉 Closed Won", filter: (l: Lead) => l.status === "CONVERTED", color: "#34d399", bg: "rgba(16, 185, 129, 0.1)" },
  ];

  const renderKanbanCard = (lead: ExtendedLead) => {
    const details = parseScrapedDetails(lead.comment);
    const isHot = lead.status === "HOT_LEAD";
    const isProposal = lead.status === "PROPOSAL_SENT";
    const isNegotiation = lead.status === "NEGOTIATION";
    const isClosedWon = lead.status === "CONVERTED";

    const isDueToday = lead.followUpDate && (isToday(new Date(lead.followUpDate)) || isBefore(new Date(lead.followUpDate), startOfDay(new Date())));

    return (
      <div
        key={lead.id}
        className="card-youistic"
        style={{
          padding: "14px",
          borderRadius: "12px",
          backgroundColor: "#14161f",
          border: isClosedWon
            ? "1px solid #10b981"
            : isDueToday
            ? "1px solid #f87171"
            : isHot
            ? "1px solid rgba(239, 68, 68, 0.4)"
            : "1px solid #1f2235",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          position: "relative",
          boxShadow: isDueToday ? "0 4px 14px rgba(248,113,113,0.2)" : "none",
        }}
      >
        {/* Due Today Alert Badge */}
        {isDueToday && (
          <div style={{ position: "absolute", top: "-10px", right: "12px", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "#fff", fontSize: "9px", fontWeight: 800, padding: "2px 8px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(239,68,68,0.4)" }}>
            ⚡ VISIT DUE TODAY
          </div>
        )}

        {/* Card Header: Title & Phone */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc", lineHeight: "1.3" }}>
            {lead.businessName || lead.clientName}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
            {lead.clientName && lead.clientName !== lead.businessName ? `${lead.clientName} • ` : ""}
            <span style={{ color: "#e67e22" }}>{lead.service || "BDE Field Visit"}</span>
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
            <MapPin size={11} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{details.address}</span>
          </div>
        )}

        {/* Photo Thumbnail if uploaded by BDE */}
        {lead.imageUrl && (
          <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #1f2235", maxHeight: "100px" }}>
            <img src={lead.imageUrl} alt="Visiting Card" style={{ width: "100%", height: "100px", objectFit: "cover" }} />
          </div>
        )}

        {/* Scheduled Visit / Follow-up Badge */}
        {lead.followUpDate && (
          <div
            style={{
              fontSize: "10px",
              fontWeight: 700,
              color: isDueToday ? "#f87171" : "#fb923c",
              background: isDueToday ? "rgba(239,68,68,0.12)" : "rgba(249, 115, 22, 0.12)",
              border: `1px solid ${isDueToday ? "rgba(239,68,68,0.3)" : "rgba(249, 115, 22, 0.3)"}`,
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
          
          {/* Schedule Field Visit / Follow-up */}
          <button
            onClick={() => {
              setFollowUpLeadId(lead.id);
              setIsFollowUpModalOpen(true);
            }}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: "6px",
              background: "rgba(249, 115, 22, 0.12)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              color: "#fb923c",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            <Clock size={11} /> Schedule Field Visit
          </button>

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
            <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600 }}>STAGE:</span>
            <select
              value={lead.status}
              onChange={(e) => handleStageChange(lead.id, e.target.value)}
              style={{
                backgroundColor: "#0f111a",
                border: "1px solid #1f2235",
                borderRadius: "6px",
                padding: "4px 6px",
                fontSize: "10px",
                color: "#f8fafc",
                outline: "none",
                cursor: "pointer",
                flex: 1,
              }}
            >
              {BDE_STAGES.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
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
      
      {/* Universal BDE Team Member Filter */}
      <EmployeeFilterBar
        roleLabel="BDE"
        options={["ALL", "Kiyam"]}
        selected={selectedEmployee}
        onSelect={setSelectedEmployee}
      />

      {/* BDE FIELD SALES MOTIVATIONAL BANNER */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "16px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "var(--shadow-card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "10px", background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", borderRadius: "12px", color: "#fff", boxShadow: "0 4px 14px rgba(230,126,34,0.4)" }}>
              <Trophy size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                  Field Closing Goal: {closedWonCount} / {targetMonthlyDeals} Clients Converted
                </h3>
                <span style={{ fontSize: "10px", fontWeight: 700, background: progressPercent >= 100 ? "rgba(16,185,129,0.2)" : "rgba(230,126,34,0.2)", color: progressPercent >= 100 ? "#34d399" : "#f39c12", border: `1px solid ${progressPercent >= 100 ? "rgba(16,185,129,0.3)" : "rgba(230,126,34,0.3)"}`, padding: "2px 8px", borderRadius: "20px" }}>
                  {progressPercent}% Hit 🔥
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                {targetMonthlyDeals - closedWonCount > 0 ? `Convert ${targetMonthlyDeals - closedWonCount} more field prospects to hit target!` : "🎉 Monthly Field Conversion Target Completed!"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsLeadModalOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)",
              border: "none",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              color: "white",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(230,126,34,0.35)",
            }}
          >
            <Plus size={16} /> + Upload Warm Lead
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", background: "var(--bg-border)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg, #e67e22 0%, #10b981 100%)", borderRadius: "4px", transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* KPI METRIC CARDS 2x2 GRID */}
      <div className="pipeline-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(230, 126, 34, 0.15)", borderRadius: "10px", color: "#e67e22" }}>
            <MapPin size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Warm Visits</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#e67e22", margin: "2px 0 0" }}>{warmVisitsCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.15)", borderRadius: "10px", color: "#f87171" }}>
            <Flame size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Meetings</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f87171", margin: "2px 0 0" }}>{meetingsScheduledCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(59, 130, 246, 0.15)", borderRadius: "10px", color: "#60a5fa" }}>
            <FileText size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Proposals</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#60a5fa", margin: "2px 0 0" }}>{proposalsSentCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "10px", color: "#c084fc" }}>
            <Handshake size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Negotiation</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#c084fc", margin: "2px 0 0" }}>{inNegotiationCount}</h3>
          </div>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "10px", color: "#34d399" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Closed Won</p>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#34d399", margin: "2px 0 0" }}>{closedWonCount}</h3>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "4px", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveFilterTab("ALL")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeFilterTab === "ALL" ? "#e67e22" : "transparent",
              color: activeFilterTab === "ALL" ? "#fff" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            All BDE Deals ({filteredBdeLeads.length})
          </button>

          <button
            onClick={() => setActiveFilterTab("DUE_TODAY")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeFilterTab === "DUE_TODAY" ? "rgba(239, 68, 68, 0.2)" : "transparent",
              color: activeFilterTab === "DUE_TODAY" ? "#f87171" : "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚡ Visits Due Today ({dueTodayCount})
          </button>
        </div>

        <div style={{ position: "relative", minWidth: "180px", flex: 1, maxWidth: "300px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={15} />
          <input
            type="text"
            placeholder="Search BDE pipeline..."
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
      </div>

      {/* BDE KANBAN BOARD */}
      <div className="pipeline-kanban-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", alignItems: "stretch" }}>
        {columns.map((col) => {
          const colLeads = filteredBdeLeads.filter(col.filter);

          return (
            <div key={col.id} className="pipeline-kanban-col" style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", overflow: "hidden", minHeight: "500px", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-card)" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--bg-border)", background: col.bg, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>{col.label}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: col.color, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: "6px" }}>
                  {colLeads.length} Deals
                </span>
              </div>

              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ textAlign: "center", padding: "20px", fontSize: "12px", color: "var(--text-muted)" }}>Loading deals...</div>
                ) : colLeads.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 10px", fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    No deals in stage
                  </div>
                ) : (
                  colLeads.map((lead) => renderKanbanCard(lead))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload BDE Warm Lead Modal */}
      {isLeadModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #e67e22", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "480px", position: "relative", boxShadow: "0 20px 40px rgba(230, 126, 34, 0.25)" }}>
            <button onClick={() => { setIsLeadModalOpen(false); setPreviewImage(null); }} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{ padding: "10px", background: "rgba(230, 126, 34, 0.15)", borderRadius: "12px", color: "#e67e22" }}>
                <Plus size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>+ Upload Warm Field Lead</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Capture on-field prospect details & business card</p>
              </div>
            </div>

            <form onSubmit={handleAddBDELead} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Business / Shop Name *</label>
                <input required type="text" name="businessName" placeholder="e.g. Royal Hardware & Sanitary" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Owner Name *</label>
                  <input required type="text" name="clientName" placeholder="Owner full name" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Contact Number *</label>
                  <input required type="tel" name="clientPhone" placeholder="+91 98765 43210" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Service Pitch</label>
                <input type="text" name="service" placeholder="e.g. ERP Software / Website Redesign" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Location / Address</label>
                <input type="text" name="address" placeholder="e.g. Shop #42, Main Market, Jodhpur" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: "#f8fafc", outline: "none" }} />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "4px" }}>Attach Visiting Card / Shop Photo</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#94a3b8", outline: "none" }} />
              </div>

              {previewImage && (
                <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #1f2235", maxHeight: "120px" }}>
                  <img src={previewImage} alt="Card Preview" style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button type="button" onClick={() => { setIsLeadModalOpen(false); setPreviewImage(null); }} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #1f2235", background: "transparent", color: "#94a3b8", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(230,126,34,0.3)" }}>
                  {isSubmitting ? "Uploading..." : "Save Warm Lead"}
                </button>
              </div>
            </form>
          </div>
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

      {/* Schedule Follow-up Date/Time Modal */}
      {isFollowUpModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #1f2235", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px", position: "relative" }}>
            <button onClick={() => { setIsFollowUpModalOpen(false); setFollowUpLeadId(null); }} style={{ position: "absolute", top: "24px", right: "24px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Clock size={20} color="#fb923c" />
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "white", margin: 0 }}>Schedule Field Visit / Follow-up</h2>
            </div>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "20px" }}>Set a date & time to visit or call this lead.</p>

            <form onSubmit={handleSaveFollowUp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "8px" }}>Visit Date & Time *</label>
                <input
                  required
                  type="datetime-local"
                  name="followUpDate"
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "10px 12px", color: "white", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "8px" }}>Objective / Meeting Note</label>
                <textarea
                  name="followUpNote"
                  rows={3}
                  placeholder="e.g. Field visit to demonstrate ERP mobile app..."
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "10px 12px", color: "white", outline: "none", resize: "none" }}
                ></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => { setIsFollowUpModalOpen(false); setFollowUpLeadId(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1f2235", borderRadius: "8px", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "8px 20px", background: "#e67e22", border: "none", borderRadius: "8px", color: "white", fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Schedule Visit"}
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
