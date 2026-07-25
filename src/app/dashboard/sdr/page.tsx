"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import ProposalModal from "@/components/proposal/ProposalModal";
import { Plus, Search, Filter, Phone, Mail, MoreHorizontal, Calendar, X, Trash2, Image as ImageIcon, MapPin, User, Globe, ChevronDown, Clock, BellRing, PhoneCall, AlertCircle, Trophy, Sparkles, Kanban as KanbanIcon } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { getLeads, updateLeadStatus, createRawLead, deleteRawLead, bulkCreateRawLeads, scheduleLeadFollowUp } from "@/app/actions/leads";
import { createMeeting } from "@/app/actions/meetings";
import { Upload } from "lucide-react";
import type { Lead, LeadStatus } from "@prisma/client";

import EmployeeFilterBar from "@/components/common/EmployeeFilterBar";
import { SDRPipelineContent } from "@/components/sdr/SDRPipelineContent";

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

  // Legacy string format like "SNo: 49 | Address: Aanchal Complex..."
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

export default function SDRDashboard() {
  const [leads, setLeads] = useState<ExtendedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"INBOUND" | "SCRAPED" | "BDE">("INBOUND");

  // Modal states
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Follow-up modal states
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpLeadId, setFollowUpLeadId] = useState<string | null>(null);
  const [isTodayAlertDismissed, setIsTodayAlertDismissed] = useState(false);
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [sdrViewMode, setSdrViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [sdrSection, setSdrSection] = useState<"POOL" | "PIPELINE">("POOL");

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdownId(null);
      setOpenStatusDropdownId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = () => {
    getLeads().then((data) => {
      setLeads(data);
      setLoading(false);
    });
  };

  const getDefaultFollowUpDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSaveFollowUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!followUpLeadId) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const dateVal = formData.get("followUpDate") as string;
    const noteVal = formData.get("followUpNote") as string;
    try {
      const parsedDate = dateVal ? new Date(dateVal) : new Date();
      const isoString = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      await scheduleLeadFollowUp(followUpLeadId, isoString, noteVal);
      setIsFollowUpModalOpen(false);
      setFollowUpLeadId(null);
      fetchLeads();
    } catch (err: any) {
      console.error("Failed to schedule follow up:", err);
      alert("Failed to schedule follow up: " + (err?.message || "Unknown error"));
    }
    setIsSubmitting(false);
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await deleteRawLead(id);
        fetchLeads();
      } catch (err) {
        console.error(err);
        alert("Failed to delete lead");
      }
    }
  };
  
  const STATUS_OPTIONS: { id: LeadStatus; label: string; bg: string; color: string; border: string; dot: string }[] = [
    { id: "PENDING", label: "New Lead 🆕", bg: "rgba(234, 179, 8, 0.12)", color: "#facc15", border: "rgba(234, 179, 8, 0.25)", dot: "#eab308" },
    { id: "CALL_COMPLETED", label: "No Answer 📵", bg: "rgba(148, 163, 184, 0.12)", color: "#cbd5e1", border: "rgba(148, 163, 184, 0.25)", dot: "#94a3b8" },
    { id: "WARM_LEAD", label: "Follow-up / Warm ⏰", bg: "rgba(249, 115, 22, 0.12)", color: "#fb923c", border: "rgba(249, 115, 22, 0.25)", dot: "#f97316" },
    { id: "HOT_LEAD", label: "Hot Lead 🔥", bg: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "rgba(239, 68, 68, 0.25)", dot: "#ef4444" },
    { id: "PROPOSAL_SENT", label: "Proposal Sent 📄", bg: "rgba(99, 102, 241, 0.12)", color: "#818cf8", border: "rgba(99, 102, 241, 0.25)", dot: "#6366f1" },
    { id: "NOT_INTERESTED", label: "Not Interested ❌", bg: "rgba(100, 116, 139, 0.12)", color: "#94a3b8", border: "rgba(100, 116, 139, 0.25)", dot: "#64748b" },
  ];

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalLead, setProposalLead] = useState<any>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "WARM_LEAD") {
      setFollowUpLeadId(id);
      setIsFollowUpModalOpen(true);
      return;
    }
    if (newStatus === "PROPOSAL_SENT") {
      const target = leads.find((l) => l.id === id);
      setProposalLead(target || null);
      setIsProposalModalOpen(true);
      return;
    }

    setLeads(leads.map(lead => lead.id === id ? { ...lead, status: newStatus as LeadStatus } : lead));
    try {
      await updateLeadStatus(id, newStatus as LeadStatus);
      // Auto open Schedule Meeting Modal when marked as HOT_LEAD
      if (newStatus === "HOT_LEAD") {
        setSelectedLeadId(id);
        setIsMeetingModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  const handleAddRawLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createRawLead({
        clientName: formData.get("clientName") as string,
        clientPhone: formData.get("clientPhone") as string,
        clientEmail: formData.get("clientEmail") as string,
        businessName: formData.get("businessName") as string,
        source: formData.get("source") as string,
        service: formData.get("service") as string,
        comment: formData.get("comment") as string,
      });
      setIsLeadModalOpen(false);
      fetchLeads();
    } catch (error) {
      console.error(error);
      alert("Failed to add lead.");
    }
    setIsSubmitting(false);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      
      // Robust CSV parser supporting quotes, commas, tabs, semicolons
      const parseCSV = (str: string) => {
        const firstLine = str.split("\n")[0] || "";
        let delim = ",";
        if (!firstLine.includes(",") && firstLine.includes("\t")) delim = "\t";
        else if (!firstLine.includes(",") && firstLine.includes(";")) delim = ";";

        const rows: string[][] = [];
        let currentRow: string[] = [""];
        let insideQuote = false;

        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          const nextChar = str[i + 1];

          if (char === '"') {
            if (insideQuote && nextChar === '"') {
              currentRow[currentRow.length - 1] += '"';
              i++;
            } else {
              insideQuote = !insideQuote;
            }
          } else if (char === delim && !insideQuote) {
            currentRow.push("");
          } else if ((char === "\n" || char === "\r") && !insideQuote) {
            if (char === "\r" && nextChar === "\n") {
              i++;
            }
            if (currentRow.some(cell => cell.trim() !== "")) {
              rows.push(currentRow);
            }
            currentRow = [""];
          } else {
            currentRow[currentRow.length - 1] += char;
          }
        }
        if (currentRow.some(cell => cell.trim() !== "")) {
          rows.push(currentRow);
        }
        return rows;
      };

      const rows = parseCSV(text);
      if (rows.length < 2) {
        alert("Invalid or empty CSV file.");
        setIsSubmitting(false);
        return;
      }

      const rawHeaders = rows[0].map((h: string) => h.trim());
      const normalizedHeaders = rawHeaders.map((h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

      // Flexible getVal logic matching exact or partial header names
      const getVal = (row: string[], aliases: string[]) => {
        for (const alias of aliases) {
          const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, "");
          
          // 1. Exact clean match
          const exactIdx = normalizedHeaders.indexOf(cleanAlias);
          if (exactIdx !== -1 && row[exactIdx] !== undefined) {
            const val = row[exactIdx].trim();
            if (val) return val;
          }

          // 2. Partial / substring match
          const containsIdx = normalizedHeaders.findIndex(h => h.includes(cleanAlias) || cleanAlias.includes(h));
          if (containsIdx !== -1 && row[containsIdx] !== undefined) {
            const val = row[containsIdx].trim();
            if (val) return val;
          }
        }
        return "";
      };

      const mappedLeads = rows.slice(1).map(row => {
        const sno = getVal(row, ["sno", "s.no", "serial", "sr"]);
        const businessName = getVal(row, ["businessname", "business", "companyname", "company", "firmname", "firm", "title", "store", "shop"]);
        let ownerName = getVal(row, ["ownername", "owner", "clientname", "client", "contactperson", "person", "name"]);
        const contactNo = getVal(row, ["contactnumber", "contactno", "contactn", "contact", "phonenumber", "phoneno", "phone", "mobilenumber", "mobileno", "mobile", "number", "tel", "cell"]);
        const email = getVal(row, ["emailaddress", "email", "mail"]);
        const category = getVal(row, ["category", "service", "type", "niche", "industry"]);
        const address = getVal(row, ["address", "fulladdress", "location", "street"]);
        const city = getVal(row, ["city", "district", "place", "town"]);
        const state = getVal(row, ["state", "province"]);
        const instagram = getVal(row, ["instagram", "insta", "social"]);
        const website = getVal(row, ["website", "site", "url", "web"]);

        // Clean out meaningless "N/A" owner names
        if (ownerName.toUpperCase() === "N/A" || ownerName.toUpperCase() === "NULL" || ownerName.toUpperCase() === "NONE") {
          ownerName = "";
        }

        // Fallback display names
        const finalClientName = ownerName || businessName || "Scraped Lead";
        const finalBusinessName = businessName || (ownerName ? `${ownerName}'s Business` : "");

        const commentParts: string[] = [];
        if (sno) commentParts.push(`SNo: ${sno}`);
        if (address) commentParts.push(`Address: ${address}`);
        if (city) commentParts.push(`City: ${city}`);
        if (state) commentParts.push(`State: ${state}`);
        if (instagram) commentParts.push(`Instagram: ${instagram}`);
        if (website) commentParts.push(`Website: ${website}`);

        // Include any leftover custom columns
        rawHeaders.forEach((h, idx) => {
          const val = row[idx]?.trim();
          if (val && !["sno", "s.no", "business name", "business", "owner name", "owner", "contact number", "contact no", "contact", "phone", "mobile", "address", "city", "category", "service", "instagram", "insta"].includes(h.toLowerCase())) {
            commentParts.push(`${h}: ${val}`);
          }
        });

        return {
          clientName: finalClientName,
          businessName: finalBusinessName,
          clientPhone: contactNo || undefined,
          clientEmail: email || undefined,
          service: category || "General",
          source: "Scraped",
          comment: commentParts.join(" | ") || "Scraped Lead",
        };
      });

      try {
        const res = await bulkCreateRawLeads(mappedLeads);
        alert(`Successfully uploaded ${res.count} scraped leads!`);
        setIsBulkModalOpen(false);
        setActiveTab("SCRAPED");
        fetchLeads();
      } catch (err) {
        console.error(err);
        alert("Failed to bulk upload leads.");
      }
      setIsSubmitting(false);
    };
    reader.readAsText(file);
  };

  const handleScheduleMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createMeeting({
        title: formData.get("title") as string,
        meetingDate: new Date(formData.get("meetingDate") as string),
        notes: formData.get("notes") as string,
        leadId: selectedLeadId || undefined,
        assignedRole: (formData.get("assignedRole") as any) || "BDE",
      });
      setIsMeetingModalOpen(false);
      setSelectedLeadId(null);
      alert("Meeting scheduled & assigned successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to schedule meeting.");
    }
    setIsSubmitting(false);
  };

  // Motivational & Urgency SDR Target Metrics
  const todaysWorkedLeadsCount = leads.filter((l) => l.status !== "PENDING" && isToday(new Date(l.updatedAt))).length;
  const todayDueLeads = leads.filter((l) => {
    if (!l.followUpDate) return false;
    const d = new Date(l.followUpDate);
    return isToday(d) || isPast(d);
  });
  const todayDueCount = todayDueLeads.length;
  const dailyTarget = 20;
  const targetPercentage = Math.min(100, Math.round((todaysWorkedLeadsCount / dailyTarget) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <Topbar title={sdrSection === "POOL" ? "SDR Lead Pool" : "SDR / Closer Pipeline Board"} subtitle={sdrSection === "POOL" ? "Minimal, Actionable & Gamified Calling Funnel" : "Stage-by-Stage Deal Closing & Negotiation Engine"} />

      {/* Merged SDR Sub-Module Navigation Switcher */}
      <div style={{ padding: "20px 28px 0 28px" }}>
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
          <button
            onClick={() => setSdrSection("POOL")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              background: sdrSection === "POOL" ? "linear-gradient(135deg, #f39c12 0%, #d35400 100%)" : "transparent",
              color: sdrSection === "POOL" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: sdrSection === "POOL" ? "0 4px 14px rgba(243,156,18,0.3)" : "none"
            }}
          >
            <PhoneCall size={15} /> SDR Lead Pool
          </button>
          <button
            onClick={() => setSdrSection("PIPELINE")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              background: sdrSection === "PIPELINE" ? "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" : "transparent",
              color: sdrSection === "PIPELINE" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: sdrSection === "PIPELINE" ? "0 4px 14px rgba(108,92,231,0.3)" : "none"
            }}
          >
            <KanbanIcon size={15} /> SDR Pipeline Board
          </button>
        </div>
      </div>

      {sdrSection === "PIPELINE" ? (
        <SDRPipelineContent />
      ) : (
        <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }} className="animate-in">
        
        {/* SDR Team Member Universal Filter */}
        <EmployeeFilterBar
          roleLabel="SDR"
          options={["ALL", "Suhani", "Kajal Sharma"]}
          selected={selectedEmployee}
          onSelect={setSelectedEmployee}
        />

        {/* MOTIVATIONAL SDR CALLING & CONVERSION TARGET BANNER */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "16px", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "var(--shadow-card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ padding: "10px", background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", borderRadius: "12px", color: "#fff", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
                <Trophy size={22} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                    Daily SDR Goal: {todaysWorkedLeadsCount} / {dailyTarget} Calls Logged
                  </h3>
                  <span style={{ fontSize: "10px", fontWeight: 700, background: targetPercentage >= 100 ? "rgba(16,185,129,0.2)" : "rgba(99,102,241,0.2)", color: targetPercentage >= 100 ? "#34d399" : "#6366f1", border: `1px solid ${targetPercentage >= 100 ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`, padding: "2px 8px", borderRadius: "20px" }}>
                    {targetPercentage}% Hit 🔥
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                  {dailyTarget - todaysWorkedLeadsCount > 0 ? `Log ${dailyTarget - todaysWorkedLeadsCount} more calls today for bonus target!` : "🎉 Daily Calling Target Completed!"}
                </p>
              </div>
            </div>

            {todayDueCount > 0 && (
              <button
                onClick={() => setStatusFilter("WARM_LEAD")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "10px",
                  color: "#f87171",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <AlertCircle size={14} /> ⚠️ {todayDueCount} Urgent Follow-ups Due Today!
              </button>
            )}
          </div>

          {/* Target Progress Bar */}
          <div style={{ width: "100%", height: "6px", background: "var(--bg-border)", borderRadius: "10px", overflow: "hidden" }}>
            <div style={{ width: `${targetPercentage}%`, height: "100%", background: "linear-gradient(90deg, #6366f1, #34d399)", borderRadius: "10px", transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Clean Actions & Search Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px" }}>
          
          {/* Full Width Search Input */}
          <div style={{ position: "relative", width: "100%" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
            <input 
              type="text" 
              placeholder="Search leads, phone number, business, city..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 16px 10px 36px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Gridded 2-Column Action Buttons */}
          <div className="sdr-actions-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", backgroundColor: "#10b981", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 12px rgba(16,185,129,0.25)" }}
            >
              <Upload size={15} /> Bulk Upload CSV
            </button>
            <button 
              onClick={() => setIsLeadModalOpen(true)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}
            >
              <Plus size={15} /> + Add Raw Lead
            </button>
          </div>
        </div>

        {/* Lead Category Segmented 3-Tab Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", background: "var(--bg-card)", padding: "4px", borderRadius: "12px", border: "1px solid var(--bg-border)" }}>
          <button 
            onClick={() => setActiveTab("INBOUND")}
            style={{ 
              padding: "10px 4px", 
              background: activeTab === "INBOUND" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent", 
              borderRadius: "8px", 
              color: activeTab === "INBOUND" ? "#ffffff" : "var(--text-secondary)", 
              fontSize: "12px", 
              fontWeight: 700, 
              border: "none",
              cursor: "pointer", 
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            Inbound ({leads.filter(l => l.source !== "BDE Field" && l.source !== "Scraped").length})
          </button>

          <button 
            onClick={() => setActiveTab("SCRAPED")}
            style={{ 
              padding: "10px 4px", 
              background: activeTab === "SCRAPED" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent", 
              borderRadius: "8px", 
              color: activeTab === "SCRAPED" ? "#ffffff" : "var(--text-secondary)", 
              fontSize: "12px", 
              fontWeight: 700, 
              border: "none",
              cursor: "pointer", 
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            Scraped ({leads.filter(l => l.source === "Scraped").length})
          </button>

          <button 
            onClick={() => setActiveTab("BDE")}
            style={{ 
              padding: "10px 4px", 
              background: activeTab === "BDE" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent", 
              borderRadius: "8px", 
              color: activeTab === "BDE" ? "#ffffff" : "var(--text-secondary)", 
              fontSize: "12px", 
              fontWeight: 700, 
              border: "none",
              cursor: "pointer", 
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            BDE Field ({leads.filter(l => l.source === "BDE Field").length})
          </button>
        </div>

        {/* Status Filters Bar & View Switcher — Sleek 2-Row Control Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "12px 14px" }}>
          
          {/* Header Row: Filter Title & View Switcher */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚡ Filter by Status</span>
            </div>

            {/* View Switcher: GRID vs TABLE */}
            <div style={{ display: "flex", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "3px", gap: "4px" }}>
              <button
                type="button"
                onClick={() => setSdrViewMode("GRID")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: sdrViewMode === "GRID" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent",
                  color: sdrViewMode === "GRID" ? "white" : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🎴 Cards View
              </button>
              <button
                type="button"
                onClick={() => setSdrViewMode("TABLE")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: sdrViewMode === "TABLE" ? "linear-gradient(135deg, #6366f1, #4338ca)" : "transparent",
                  color: sdrViewMode === "TABLE" ? "white" : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                📋 Table
              </button>
            </div>
          </div>

          {/* Smooth Horizontal Touch Scrollable Status Pills Row */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", whiteSpace: "nowrap" }}>
            <button
              onClick={() => setStatusFilter("ALL")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: statusFilter === "ALL" ? 700 : 500,
                backgroundColor: statusFilter === "ALL" ? "#312e81" : "var(--bg-input)",
                color: statusFilter === "ALL" ? "#ffffff" : "var(--text-secondary)",
                border: statusFilter === "ALL" ? "1px solid #6366f1" : "1px solid var(--bg-border)",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              All Statuses ({leads.filter((l) => activeTab === "BDE" ? l.source === "BDE Field" : activeTab === "SCRAPED" ? l.source === "Scraped" : l.source !== "BDE Field" && l.source !== "Scraped").length})
            </button>
            {STATUS_OPTIONS.map((opt) => {
              const isActive = statusFilter === opt.id;
              const count = leads.filter((l) => {
                const isCorrectTab = activeTab === "BDE" ? l.source === "BDE Field" : activeTab === "SCRAPED" ? l.source === "Scraped" : l.source !== "BDE Field" && l.source !== "Scraped";
                const s = l.status === "NEW" ? "PENDING" : l.status;
                return isCorrectTab && s === opt.id;
              }).length;

              return (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: isActive ? 700 : 500,
                    backgroundColor: isActive ? opt.bg : "var(--bg-input)",
                    color: isActive ? opt.color : "var(--text-secondary)",
                    border: `1px solid ${isActive ? opt.border : "var(--bg-border)"}`,
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: opt.dot }} />
                  <span>{opt.label}</span>
                  <span style={{ fontSize: "10px", opacity: 0.7 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* DISPLAY: SDR CARDS GRID VIEW OR TABLE VIEW */}
        {sdrViewMode === "GRID" ? (
          /* GRIDDED LEADS CARDS VIEW (DEFAULT ON MOBILE) */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {leads.filter((l) => {
              // SDR Employee filter: unassigned pool leads are visible to ALL SDRs
              if (selectedEmployee !== "ALL") {
                const assignedName = (l as any).assignedSdr?.name;
                if (assignedName && !assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
              }
              // Tab filter
              if (activeTab === "BDE" && l.source !== "BDE Field") return false;
              if (activeTab === "SCRAPED" && l.source !== "Scraped") return false;
              if (activeTab === "INBOUND" && (l.source === "BDE Field" || l.source === "Scraped")) return false;
              // Status filter chip
              if (statusFilter !== "ALL") {
                const s = l.status === "NEW" ? "PENDING" : l.status;
                if (s !== statusFilter) return false;
              }
              // Search query
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = l.clientName?.toLowerCase().includes(q);
                const matchBiz = l.businessName?.toLowerCase().includes(q);
                const matchPhone = l.clientPhone?.toLowerCase().includes(q);
                if (!matchName && !matchBiz && !matchPhone) return false;
              }
              return true;
            }).length === 0 ? (
              <div className="card-youistic" style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "#64748b" }}>
                No SDR leads found matching your search and filter criteria.
              </div>
            ) : (
              leads.filter((l) => {
                if (selectedEmployee !== "ALL") {
                  const assignedName = (l as any).assignedSdr?.name;
                  if (assignedName && !assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
                }
                if (activeTab === "BDE" && l.source !== "BDE Field") return false;
                if (activeTab === "SCRAPED" && l.source !== "Scraped") return false;
                if (activeTab === "INBOUND" && (l.source === "BDE Field" || l.source === "Scraped")) return false;
                if (statusFilter !== "ALL") {
                  const s = l.status === "NEW" ? "PENDING" : l.status;
                  if (s !== statusFilter) return false;
                }
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  const matchName = l.clientName?.toLowerCase().includes(q);
                  const matchBiz = l.businessName?.toLowerCase().includes(q);
                  const matchPhone = l.clientPhone?.toLowerCase().includes(q);
                  if (!matchName && !matchBiz && !matchPhone) return false;
                }
                return true;
              }).map((lead, index) => {
                const details = parseScrapedDetails(lead.comment);
                const currentStatus = lead.status === "NEW" ? "PENDING" : lead.status;
                const statusObj = STATUS_OPTIONS.find((o) => o.id === currentStatus) || STATUS_OPTIONS[0];
                const phone = lead.clientPhone?.trim();
                const assignedSdrName = (lead as any).assignedSdr?.name || "Shared Pool";

                return (
                  <div 
                    key={lead.id} 
                    className="card-youistic" 
                    style={{ 
                      padding: "18px", 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: "12px", 
                      border: "1px solid var(--bg-border)", 
                      borderRadius: "14px", 
                      background: "var(--bg-card)",
                      position: "relative"
                    }}
                  >
                    {/* Card Top: S.No, Title & Status Pill */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: "#6366f1", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", padding: "2px 6px", borderRadius: "6px" }}>
                          #{details.sno !== "-" ? details.sno : index + 1}
                        </span>
                        <h4 style={{ fontSize: "15px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {lead.businessName || lead.clientName}
                        </h4>
                      </div>

                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "20px", background: statusObj.bg, color: statusObj.color, border: `1px solid ${statusObj.border}` }}>
                        {statusObj.label}
                      </span>
                    </div>

                    {/* Owner & Location Info */}
                    <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "12px" }}>
                      <div style={{ color: "var(--text-primary)" }}>
                        <strong>Owner / Person:</strong> {lead.clientName}
                      </div>
                      {details.address !== "-" && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
                          <strong>Location:</strong> {details.address} {details.city !== "-" ? `(${details.city})` : ""}
                        </div>
                      )}
                      {lead.service && (
                        <div style={{ color: "#6366f1", fontSize: "11px", fontWeight: 600 }}>
                          <strong>Category / Niche:</strong> {lead.service}
                        </div>
                      )}
                    </div>

                    {/* SDR Owner Badge & Status Dropdown */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#059669", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                        👤 {assignedSdrName}
                      </span>

                      {/* Status Update Quick Select */}
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                        style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "6px", color: statusObj.color, fontSize: "11px", fontWeight: 700, padding: "4px 8px", outline: "none", cursor: "pointer" }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 1-Tap Action Dock: Call Now & Follow-up */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                      {phone ? (
                        <a 
                          href={`tel:${phone}`} 
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "8px", color: "white", fontSize: "12px", fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
                        >
                          <Phone size={14} /> Call {phone}
                        </a>
                      ) : (
                        <button disabled style={{ padding: "8px", background: "var(--bg-input)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "12px" }}>No Phone</button>
                      )}

                      <button 
                        onClick={() => { setFollowUpLeadId(lead.id); setIsFollowUpModalOpen(true); }} 
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(99, 102, 241, 0.12)", border: "1px solid #6366f1", borderRadius: "8px", color: "#6366f1", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                      >
                        <Calendar size={14} /> Follow-up
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* CLASSIC TABLE VIEW */
          <div className="card-youistic" style={{ padding: 0, overflow: 'hidden', minHeight: '400px' }}>
            <div style={{ overflowX: "auto", width: "100%", minHeight: '400px', scrollbarWidth: 'thin' }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: activeTab === "SCRAPED" ? "1140px" : "1050px", tableLayout: "fixed" }}>
              <colgroup>
                {activeTab === "SCRAPED" ? (
                  <>
                    <col style={{ width: "45px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "95px" }} />
                    <col style={{ width: "135px" }} />
                    <col style={{ width: "135px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "85px" }} />
                    <col style={{ width: "165px" }} />
                    <col style={{ width: "80px" }} />
                  </>
                ) : (
                  <>
                    <col style={{ width: "95px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "140px" }} />
                    <col style={{ width: "160px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "165px" }} />
                    <col style={{ width: "80px" }} />
                  </>
                )}
              </colgroup>
              <thead style={{ background: "var(--bg-input)" }}>
                <tr>
                  {(activeTab === "SCRAPED" 
                    ? ["S.No.", "Business Name", "Owner Name", "Contact Number", "Category", "Address & City", "Instagram", "Status", "Action"]
                    : ["Date", "Client & Business", "Service / Source", "Contact Info", "Pain Points", "Status", "Action"]
                  ).map((h) => (
                    <th 
                      key={h} 
                      style={{ 
                        textAlign: "left", 
                        padding: "10px 10px", 
                        fontSize: "10px", 
                        fontWeight: 700, 
                        color: "var(--text-secondary)", 
                        textTransform: "uppercase", 
                        letterSpacing: "0.05em", 
                        borderBottom: "1px solid var(--bg-border)", 
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={activeTab === "SCRAPED" ? 9 : 7} className="text-center py-10 text-slate-400">Loading leads...</td>
                  </tr>
                ) : leads.filter((l) => {
                  // SDR Employee filter: unassigned pool leads visible to ALL SDRs
                  if (selectedEmployee !== "ALL") {
                    const assignedName = (l as any).assignedSdr?.name;
                    if (assignedName && !assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
                  }

                  // Tab filter
                  if (activeTab === "BDE" && l.source !== "BDE Field") return false;
                  if (activeTab === "SCRAPED" && l.source !== "Scraped") return false;
                  if (activeTab === "INBOUND" && (l.source === "BDE Field" || l.source === "Scraped")) return false;

                  // Status filter chip
                  if (statusFilter !== "ALL") {
                    const s = l.status === "NEW" ? "PENDING" : l.status;
                    if (s !== statusFilter) return false;
                  }

                  // Search query
                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchName = l.clientName?.toLowerCase().includes(q);
                    const matchBiz = l.businessName?.toLowerCase().includes(q);
                    const matchPhone = l.clientPhone?.toLowerCase().includes(q);
                    const matchEmail = l.clientEmail?.toLowerCase().includes(q);
                    const matchService = l.service?.toLowerCase().includes(q);
                    if (!matchName && !matchBiz && !matchPhone && !matchEmail && !matchService) return false;
                  }

                  return true;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "SCRAPED" ? 9 : 7} className="text-center py-10 text-slate-400">No leads match your criteria.</td>
                  </tr>
                ) : leads.filter((l) => {
                  if (selectedEmployee !== "ALL") {
                    const assignedName = (l as any).assignedSdr?.name;
                    if (assignedName && !assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
                  }
                  if (activeTab === "BDE" && l.source !== "BDE Field") return false;
                  if (activeTab === "SCRAPED" && l.source !== "Scraped") return false;
                  if (activeTab === "INBOUND" && (l.source === "BDE Field" || l.source === "Scraped")) return false;

                  if (statusFilter !== "ALL") {
                    const s = l.status === "NEW" ? "PENDING" : l.status;
                    if (s !== statusFilter) return false;
                  }

                  if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchName = l.clientName?.toLowerCase().includes(q);
                    const matchBiz = l.businessName?.toLowerCase().includes(q);
                    const matchPhone = l.clientPhone?.toLowerCase().includes(q);
                    const matchEmail = l.clientEmail?.toLowerCase().includes(q);
                    const matchService = l.service?.toLowerCase().includes(q);
                    if (!matchName && !matchBiz && !matchPhone && !matchEmail && !matchService) return false;
                  }

                  return true;
                }).map((lead, idx) => {
                  const details = parseScrapedDetails(lead.comment);

                  return (
                    <tr key={lead.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background 0.15s" }}>
                      {activeTab === "SCRAPED" ? (
                        <>
                          {/* S.No. */}
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }} className="font-mono font-medium">
                              {details.sno !== "-" ? `#${details.sno}` : `#${idx + 1}`}
                            </span>
                          </td>

                          {/* Business Name */}
                          <td style={{ padding: "6px 8px" }}>
                            <div 
                              style={{ 
                                fontSize: "12px", 
                                fontWeight: 600, 
                                color: "var(--text-primary)", 
                                lineHeight: "1.3",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}
                              title={lead.businessName || lead.clientName || ""}
                            >
                              {lead.businessName || lead.clientName || "Unspecified Business"}
                            </div>
                          </td>

                          {/* Owner Name */}
                          <td style={{ padding: "6px 8px" }}>
                            {lead.clientName &&
                            lead.clientName.trim() !== "" &&
                            lead.clientName !== lead.businessName &&
                            lead.clientName.toUpperCase() !== "N/A" &&
                            lead.clientName.toLowerCase() !== "scraped lead" ? (
                              <div style={{ fontSize: "11px", color: "var(--text-primary)" }} className="font-medium truncate" title={lead.clientName}>
                                {lead.clientName}
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs font-mono">—</span>
                            )}
                          </td>

                          {/* Contact Number */}
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                            {lead.clientPhone && lead.clientPhone.toUpperCase() !== "N/A" ? (
                              <div style={{ fontSize: "11px" }} className="font-mono text-indigo-300 flex items-center gap-1">
                                <Phone size={11} className="text-indigo-400 shrink-0" />
                                <span>{lead.clientPhone}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-xs font-mono">—</span>
                            )}
                          </td>

                          {/* Category */}
                          <td style={{ padding: "6px 8px" }}>
                            <div 
                              style={{ 
                                fontSize: "11px", 
                                color: "#818cf8", 
                                fontWeight: 500,
                                lineHeight: "1.3",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}
                              title={lead.service || "General"}
                            >
                              {lead.service || "General"}
                            </div>
                          </td>

                          {/* Address & City */}
                          <td style={{ padding: "6px 8px" }}>
                            <div 
                              style={{ 
                                fontSize: "11px", 
                                color: "#cbd5e1", 
                                lineHeight: "1.3",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}
                              title={details.address}
                            >
                              {details.address}
                            </div>
                            {details.city !== "-" && (
                              <div style={{ fontSize: "10px" }} className="text-sky-400 font-semibold mt-0.5 flex items-center gap-0.5">
                                <MapPin size={10} className="text-sky-400 shrink-0" />
                                <span className="truncate">{details.city}</span>
                              </div>
                            )}
                          </td>

                          {/* Instagram */}
                          <td style={{ padding: "6px 8px" }}>
                            {details.instagram !== "-" ? (
                              <a
                                href={
                                  details.instagram.startsWith("http")
                                    ? details.instagram
                                    : `https://instagram.com/${details.instagram.replace("@", "").trim()}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#38bdf8", fontSize: "11px" }}
                                className="font-mono font-medium hover:underline truncate block"
                                title={details.instagram}
                              >
                                {details.instagram.startsWith("@") ? details.instagram : `@${details.instagram}`}
                              </a>
                            ) : (
                              <span className="text-slate-600 text-xs font-mono">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Date */}
                          <td style={{ padding: "6px 8px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-primary)" }}>{format(new Date(lead.createdAt), "MMM dd, yyyy")}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }}>{format(new Date(lead.createdAt), "hh:mm a")}</div>
                          </td>

                          {/* Client & Business */}
                          <td style={{ padding: "6px 8px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }} className="truncate" title={lead.clientName}>{lead.clientName}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }} className="truncate mt-0.5" title={lead.businessName || ""}>{lead.businessName || "N/A"}</div>
                          </td>

                          {/* Service / Source */}
                          <td style={{ padding: "6px 8px" }}>
                            <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600 }} className="truncate" title={lead.service || "Unspecified"}>{lead.service || "Unspecified"}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-secondary)" }} className="truncate mt-0.5">{lead.source || "Website Form"}</div>
                          </td>

                          {/* Contact Info */}
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: "11px", color: "#0284c7" }} className="flex items-center gap-1 font-mono">
                              <Phone size={11} className="shrink-0" style={{ color: "#0284c7" }} /> 
                              <span>{lead.clientPhone || "N/A"}</span>
                            </div>
                            {lead.clientEmail && (
                              <div style={{ fontSize: "10px", color: "var(--text-secondary)" }} className="flex items-center gap-1 truncate mt-0.5" title={lead.clientEmail}>
                                <Mail size={10} className="shrink-0" style={{ color: "var(--text-muted)" }} /> 
                                <span className="truncate">{lead.clientEmail}</span>
                              </div>
                            )}
                          </td>

                          {/* Pain Points */}
                          <td style={{ padding: "6px 8px" }}>
                            <p 
                              style={{ 
                                fontSize: "11px", 
                                color: "var(--text-primary)", 
                                lineHeight: "1.3",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }} 
                              title={lead.comment || ""}
                            >
                              {lead.comment || "No pain points provided"}
                            </p>
                          </td>
                        </>
                      )}

                      {/* Functional Dark Status Pill Select Badge */}
                      <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                        {(() => {
                          const currentStatus = lead.status === "NEW" ? "PENDING" : lead.status;
                          const statusStylesMap: Record<string, { bg: string; color: string; border: string }> = {
                            "PENDING": { bg: "rgba(234, 179, 8, 0.15)", color: "#facc15", border: "rgba(234, 179, 8, 0.35)" },
                            "CALL_COMPLETED": { bg: "rgba(148, 163, 184, 0.15)", color: "#cbd5e1", border: "rgba(148, 163, 184, 0.35)" },
                            "WARM_LEAD": { bg: "rgba(249, 115, 22, 0.15)", color: "#fb923c", border: "rgba(249, 115, 22, 0.35)" },
                            "HOT_LEAD": { bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(239, 68, 68, 0.35)" },
                            "PROPOSAL_SENT": { bg: "rgba(99, 102, 241, 0.15)", color: "#818cf8", border: "rgba(99, 102, 241, 0.35)" },
                            "NOT_INTERESTED": { bg: "rgba(100, 116, 139, 0.15)", color: "#94a3b8", border: "rgba(100, 116, 139, 0.35)" },
                          };
                          const style = statusStylesMap[currentStatus] || statusStylesMap["PENDING"];

                          return (
                            <div>
                              <select
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  backgroundColor: style.bg,
                                  color: style.color,
                                  border: `1px solid ${style.border}`,
                                  padding: "3px 18px 3px 8px",
                                  borderRadius: "9999px",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  maxWidth: "150px",
                                  outline: "none",
                                  cursor: "pointer",
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                  backgroundRepeat: "no-repeat",
                                  backgroundPosition: "right 6px center",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <option value="PENDING" style={{ backgroundColor: "#0f111a", color: "#facc15" }}>🟡 New Lead</option>
                                <option value="CALL_COMPLETED" style={{ backgroundColor: "#0f111a", color: "#cbd5e1" }}>📵 No Answer / Retry</option>
                                <option value="WARM_LEAD" style={{ backgroundColor: "#0f111a", color: "#fb923c" }}>⏰ Follow-up / Warm</option>
                                <option value="HOT_LEAD" style={{ backgroundColor: "#0f111a", color: "#f87171" }}>🔥 Hot Lead (Schedule Meeting)</option>
                                <option value="PROPOSAL_SENT" style={{ backgroundColor: "#0f111a", color: "#818cf8" }}>📄 Proposal Sent (Generate PDF)</option>
                                <option value="NOT_INTERESTED" style={{ backgroundColor: "#0f111a", color: "#94a3b8" }}>❌ Not Interested</option>
                              </select>

                              {lead.status === "WARM_LEAD" && lead.followUpDate && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFollowUpLeadId(lead.id);
                                    setIsFollowUpModalOpen(true);
                                  }}
                                  style={{
                                    marginTop: "6px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    color: "#fb923c",
                                    background: "rgba(249, 115, 22, 0.1)",
                                    border: "1px solid rgba(249, 115, 22, 0.3)",
                                    borderRadius: "6px",
                                    padding: "3px 6px",
                                    cursor: "pointer"
                                  }}
                                  title={lead.followUpNote ? `Note: ${lead.followUpNote}` : "Click to reschedule follow-up"}
                                >
                                  <Clock size={11} color="#fb923c" />
                                  <span>
                                    {isToday(new Date(lead.followUpDate))
                                      ? `Today @ ${format(new Date(lead.followUpDate), "hh:mm a")}`
                                      : format(new Date(lead.followUpDate), "MMM dd, hh:mm a")}
                                  </span>
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                          {lead.imageUrl && (
                            <button 
                              onClick={() => setViewingImage(lead.imageUrl || null)}
                              style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                              title="View Visiting Card"
                            >
                              <ImageIcon size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => { setSelectedLeadId(lead.id); setIsMeetingModalOpen(true); }}
                            style={{ padding: '8px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'none', borderRadius: '8px', cursor: 'pointer' }} 
                            title="Schedule Meeting"
                          >
                            <Calendar size={16} />
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              e.nativeEvent.stopImmediatePropagation();
                              setOpenDropdownId(openDropdownId === lead.id ? null : lead.id); 
                            }}
                            style={{ padding: '8px', backgroundColor: 'transparent', color: '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {openDropdownId === lead.id && (
                            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', width: '160px', backgroundColor: '#0f111a', border: '1px solid #1f2235', borderRadius: '12px', padding: '8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                              <button 
                                onClick={() => handleDeleteLead(lead.id)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f87171', cursor: 'pointer', textAlign: 'left' }}
                              >
                                <Trash2 size={14} /> Delete Lead
                              </button>
                            </div>
                          )}
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
      )}

      {/* Add Raw Lead Modal */}
      {isLeadModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #6c5ce7', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', position: 'relative', boxShadow: '0 20px 40px rgba(108,92,231,0.25)' }}>
            <button onClick={() => setIsLeadModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Add Raw Lead</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Enter manual lead details into the pool.</p>
            
            <form onSubmit={handleAddRawLead} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Client Name *</label>
                <input required name="clientName" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} placeholder="John Doe" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Phone</label>
                  <input name="clientPhone" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} placeholder="+91 9999999999" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Email</label>
                  <input type="email" name="clientEmail" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} placeholder="john@example.com" />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Business Name</label>
                <input name="businessName" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} placeholder="Doe Enterprises" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Source</label>
                  <select name="source" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="Website Form">Website Form</option>
                    <option value="Scraped">Scraped</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Referral">Referral</option>
                    <option value="Manual Entry">Manual Entry</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Service</label>
                  <select name="service" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                    <option value="FBP">FBP</option>
                    <option value="TECH">TECH</option>
                    <option value="HYBRID">HYBRID</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Notes / Comments</label>
                <textarea name="comment" rows={3} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} placeholder="Any specific requirements..."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsLeadModalOpen(false)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bg-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '13px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Adding...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload CSV Modal */}
      {isBulkModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #6c5ce7', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px', position: 'relative', boxShadow: '0 20px 40px rgba(108,92,231,0.25)' }}>
            <button onClick={() => setIsBulkModalOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Upload Scraped Leads</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              Upload a CSV file containing scraped leads. Expected column headers:<br />
              <code style={{ fontSize: '11px', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: '6px', color: '#a29bfe', border: '1px solid var(--bg-border)', display: 'inline-block', marginTop: '4px' }}>
                Sno., business name, owner name, contact no, address, category, city, instagram
              </code>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', padding: '28px 20px', border: '2px dashed #6c5ce7', borderRadius: '14px', backgroundColor: 'rgba(108,92,231,0.04)', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(108,92,231,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={24} color="#6c5ce7" />
              </div>

              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                  {isSubmitting ? 'Uploading & Processing Leads...' : 'Select a CSV file from your computer'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Supports .csv files with standard lead headers
                </p>
              </div>

              <label
                htmlFor="sdr-csv-file-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(108,92,231,0.3)',
                  marginTop: '6px',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                📁 {isSubmitting ? 'Processing...' : 'Choose CSV File'}
              </label>

              <input 
                id="sdr-csv-file-input"
                type="file" 
                accept=".csv" 
                onChange={handleBulkUpload}
                disabled={isSubmitting}
                style={{ display: 'none' }}
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" onClick={() => setIsBulkModalOpen(false)} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bg-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {isMeetingModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #6c5ce7', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 20px 40px rgba(108,92,231,0.25)' }}>
            <button onClick={() => { setIsMeetingModalOpen(false); setSelectedLeadId(null); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Schedule Meeting</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Assign this meeting to the CEO or BDE team for closing.</p>
            
            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Assign Call / Meeting To *</label>
                <select name="assignedRole" defaultValue="BDE" required style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                  <option value="BDE">BDE Team (Business Development Executive)</option>
                  <option value="CEO">CEO (Executive Escalation & Closing)</option>
                  <option value="SDR">SDR Team (Sales Development Rep)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Meeting Title *</label>
                <input required name="title" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} placeholder="Discovery Call - Tech Setup" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Date & Time *</label>
                <input required type="datetime-local" name="meetingDate" style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Agenda / Notes</label>
                <textarea name="notes" rows={3} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }} placeholder="Discuss hybrid service plan..."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => { setIsMeetingModalOpen(false); setSelectedLeadId(null); }} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bg-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '13px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Date/Time Modal */}
      {isFollowUpModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #6c5ce7', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', position: 'relative', boxShadow: '0 20px 40px rgba(108,92,231,0.25)' }}>
            <button onClick={() => { setIsFollowUpModalOpen(false); setFollowUpLeadId(null); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Clock size={20} color="#fb923c" />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Schedule Lead Follow-up</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Set a date & time to follow up with this lead. An alert popup will remind you on that day.</p>

            <form onSubmit={handleSaveFollowUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Follow-up Date & Time *</label>
                <input 
                  required 
                  type="datetime-local" 
                  name="followUpDate" 
                  defaultValue={getDefaultFollowUpDateTime()}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Follow-up Note / Objective</label>
                <textarea 
                  name="followUpNote" 
                  rows={3} 
                  placeholder="e.g. Call back regarding pricing quotation..." 
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--bg-border)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-primary)', outline: 'none', resize: 'none' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => { setIsFollowUpModalOpen(false); setFollowUpLeadId(null); }} style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--bg-border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, fontSize: '13px', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Saving...' : 'Set Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Today's Scheduled Follow-up Reminder Modal Popup */}
      {(() => {
        const todayFollowups = leads.filter((l) => {
          if (l.status !== "WARM_LEAD" || !l.followUpDate) return false;
          const fDate = new Date(l.followUpDate);
          return isToday(fDate) || isPast(fDate);
        });

        if (todayFollowups.length === 0 || isTodayAlertDismissed) return null;

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div style={{ backgroundColor: '#0f111a', border: '1px solid #f97316', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '540px', position: 'relative', boxShadow: '0 20px 40px rgba(249, 115, 22, 0.25)' }}>
              <button onClick={() => setIsTodayAlertDismissed(true)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(249, 115, 22, 0.15)', borderRadius: '12px', color: '#fb923c' }}>
                  <BellRing size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>⏰ Today's Scheduled Follow-ups ({todayFollowups.length})</h2>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>You have follow-ups scheduled for today! Please contact leads below:</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', margin: '16px 0', paddingRight: '4px' }}>
                {todayFollowups.map((lead) => {
                  const fDate = new Date(lead.followUpDate!);
                  const isOverdue = isPast(fDate) && !isToday(fDate);

                  return (
                    <div key={lead.id} style={{ padding: '14px', background: 'rgba(20, 22, 31, 0.8)', border: '1px solid #1f2235', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                            {lead.businessName || lead.clientName || 'Lead'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Client: {lead.clientName} &bull; {lead.service || 'General'}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px', backgroundColor: isOverdue ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)', color: isOverdue ? '#f87171' : '#fb923c', border: isOverdue ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(249,115,22,0.3)' }}>
                          {isOverdue ? `⚠️ Overdue (${format(fDate, "MMM dd, hh:mm a")})` : `⏰ Today @ ${format(fDate, "hh:mm a")}`}
                        </span>
                      </div>

                      {lead.followUpNote && (
                        <div style={{ fontSize: '12px', color: '#cbd5e1', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid #fb923c' }}>
                          <strong>Note:</strong> {lead.followUpNote}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                        {lead.clientPhone ? (
                          <a href={`tel:${lead.clientPhone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#34d399', fontWeight: 600, textDecoration: 'none' }}>
                            <PhoneCall size={14} /> {lead.clientPhone}
                          </a>
                        ) : <span style={{ fontSize: '12px', color: '#64748b' }}>No Phone</span>}

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            onClick={() => handleStatusChange(lead.id, "HOT_LEAD")} 
                            style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            🔥 Hot Lead
                          </button>
                          <button 
                            onClick={() => {
                              setFollowUpLeadId(lead.id);
                              setIsFollowUpModalOpen(true);
                            }} 
                            style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                          >
                            📅 Reschedule
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  onClick={() => setIsTodayAlertDismissed(true)} 
                  style={{ padding: '8px 20px', background: '#f97316', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                >
                  Got it, Close Alert
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Image Lightbox */}
      {viewingImage && (
        <div 
          onClick={() => setViewingImage(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <button 
              onClick={() => setViewingImage(null)} 
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <img src={viewingImage} alt="Visiting Card" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }} />
          </div>
        </div>
      )}

      {/* In-House Commercial PDF Proposal Generator Modal */}
      <ProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => {
          setIsProposalModalOpen(false);
          setProposalLead(null);
        }}
        lead={proposalLead}
        onSuccess={() => {
          fetchLeads();
        }}
      />
    </div>
  );
}
