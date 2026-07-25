"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import ProposalModal from "@/components/proposal/ProposalModal";
import { Plus, Search, Filter, Phone, MapPin, MoreHorizontal, Calendar, ArrowRight, Trash2, X, Camera, Clock, CheckCircle2, FileText, ImageIcon, Flame, Eye, Kanban as KanbanIcon } from "lucide-react";
import { format, isToday } from "date-fns";
import { getMeetings, updateMeetingStatus, updateMeetingDetails, deleteMeeting } from "@/app/actions/meetings";
import { createRawLead, getLeads } from "@/app/actions/leads";
import { uploadBase64Image } from "@/app/actions/upload";
import EmployeeFilterBar from "@/components/common/EmployeeFilterBar";
import { BDEPipelineContent } from "@/components/bde/BDEPipelineContent";
import type { Meeting, Lead, MeetingStatus } from "@prisma/client";

type ExtendedMeeting = Meeting & { lead?: Lead | null };

export default function BDEDashboard() {
  const [activeTab, setActiveTab] = useState<"APPOINTMENTS" | "LEADS">("APPOINTMENTS");
  const [appointments, setAppointments] = useState<ExtendedMeeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [bdeViewMode, setBdeViewMode] = useState<"GRID" | "TABLE">("GRID");
  const [bdeSection, setBdeSection] = useState<"VISITS" | "PIPELINE">("VISITS");

  // Proposal modal
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [proposalLead, setProposalLead] = useState<any>(null);

  // Lead upload modal
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Complete & Reschedule Modals
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Photo view modal
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apptsData, leadsData] = await Promise.all([
        getMeetings(),
        getLeads()
      ]);
      setAppointments(apptsData as ExtendedMeeting[]);
      setLeads(leadsData.filter(l => l.source === "BDE Field"));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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

  const handleAddWarmLead = async (e: React.FormEvent<HTMLFormElement>) => {
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
        clientPhone: formData.get("clientPhone") as string,
        businessName: formData.get("businessName") as string,
        source: "BDE Field",
        service: formData.get("service") as string,
        comment: formData.get("comment") as string,
        imageUrl: uploadedImageUrl,
      });

      setIsLeadModalOpen(false);
      setPreviewImage(null);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to upload lead.");
    }
    setIsSubmitting(false);
  };

  const handleDeleteMeeting = async (id: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      try {
        await deleteMeeting(id);
        fetchData();
      } catch (err) {
        console.error(err);
        alert("Failed to delete meeting");
      }
    }
  };

  const getDefaultDateTime = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(11, 0, 0, 0);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSaveCompleteOutcome = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const outcomeNotes = formData.get("outcomeNotes") as string;
    try {
      await updateMeetingDetails(selectedMeetingId, {
        status: "COMPLETED",
        notes: outcomeNotes,
      });
      setIsCompleteModalOpen(false);
      setSelectedMeetingId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to complete meeting: " + (err?.message || "Unknown error"));
    }
    setIsSubmitting(false);
  };

  const handleSaveReschedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMeetingId) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const dateVal = formData.get("newMeetingDate") as string;
    const rescheduleNotes = formData.get("rescheduleNotes") as string;
    try {
      const parsedDate = dateVal ? new Date(dateVal) : new Date();
      await updateMeetingDetails(selectedMeetingId, {
        status: "RESCHEDULED",
        meetingDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        notes: rescheduleNotes,
      });
      setIsRescheduleModalOpen(false);
      setSelectedMeetingId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Failed to reschedule meeting: " + (err?.message || "Unknown error"));
    }
    setIsSubmitting(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "COMPLETED") {
      setSelectedMeetingId(id);
      setIsCompleteModalOpen(true);
      return;
    }
    if (newStatus === "RESCHEDULED") {
      setSelectedMeetingId(id);
      setIsRescheduleModalOpen(true);
      return;
    }

    setAppointments(appointments.map(appt => appt.id === id ? { ...appt, status: newStatus as MeetingStatus } : appt));
    try {
      await updateMeetingStatus(id, newStatus as MeetingStatus);
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };
  
  const statusStyles: Record<string, React.CSSProperties> = {
    "SCHEDULED": { backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" },
    "COMPLETED": { backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" },
    "CANCELED": { backgroundColor: "rgba(239, 68, 68, 0.12)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" },
    "RESCHEDULED": { backgroundColor: "rgba(249, 115, 22, 0.12)", color: "#fb923c", border: "1px solid rgba(249, 115, 22, 0.3)" },
  };

  // Filter Data
  const filteredAppointments = appointments.filter(a => {
    if (selectedEmployee !== "ALL") {
      const hostName = (a as any).host?.name || "Kiyam";
      if (!hostName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.lead?.businessName && a.lead.businessName.toLowerCase().includes(q)) ||
      (a.lead?.clientName && a.lead.clientName.toLowerCase().includes(q))
    );
  });

  const filteredLeads = leads.filter(l => {
    if (selectedEmployee !== "ALL") {
      const assignedName = (l as any).assignedBde?.name || "Kiyam";
      if (!assignedName.toLowerCase().includes(selectedEmployee.toLowerCase())) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.clientName.toLowerCase().includes(q) ||
      (l.businessName && l.businessName.toLowerCase().includes(q)) ||
      (l.clientPhone && l.clientPhone.includes(q))
    );
  });

  // KPI Metrics Calculations
  const scheduledCount = filteredAppointments.filter(a => a.status === "SCHEDULED").length;
  const completedCount = filteredAppointments.filter(a => a.status === "COMPLETED").length;
  const warmLeadsCount = filteredLeads.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title={bdeSection === "VISITS" ? "Field Sales (BDE)" : "BDE Sales Pipeline Board"} subtitle={bdeSection === "VISITS" ? "Manage scheduled appointments, field visits & warm lead uploads" : "Stage-by-Stage Field Deal Conversion Funnel"} />

      {/* Merged BDE Sub-Module Navigation Switcher */}
      <div style={{ padding: "20px 28px 0 28px" }}>
        <div style={{ display: "flex", gap: "8px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "4px", width: "fit-content" }}>
          <button
            onClick={() => setBdeSection("VISITS")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              background: bdeSection === "VISITS" ? "linear-gradient(135deg, #e67e22 0%, #d35400 100%)" : "transparent",
              color: bdeSection === "VISITS" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: bdeSection === "VISITS" ? "0 4px 14px rgba(230,126,34,0.3)" : "none"
            }}
          >
            <MapPin size={15} /> Field Visits & Leads
          </button>
          <button
            onClick={() => setBdeSection("PIPELINE")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "10px",
              border: "none",
              background: bdeSection === "PIPELINE" ? "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)" : "transparent",
              color: bdeSection === "PIPELINE" ? "#ffffff" : "var(--text-secondary)",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: bdeSection === "PIPELINE" ? "0 4px 14px rgba(108,92,231,0.3)" : "none"
            }}
          >
            <KanbanIcon size={15} /> BDE Sales Pipeline
          </button>
        </div>
      </div>

      {bdeSection === "PIPELINE" ? (
        <BDEPipelineContent />
      ) : (
        <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }} className="animate-in">
        
        {/* Universal BDE Team Member Filter */}
        <EmployeeFilterBar
          roleLabel="BDE"
          options={["ALL", "Kiyam"]}
          selected={selectedEmployee}
          onSelect={setSelectedEmployee}
        />
        
        {/* TOP KPI STATS 2x2 GRID */}
        <div className="bde-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "10px", background: "rgba(59, 130, 246, 0.15)", borderRadius: "10px", color: "#60a5fa" }}>
              <Calendar size={20} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Scheduled Meetings</p>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 0" }}>{scheduledCount}</h3>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "10px", background: "rgba(230, 126, 34, 0.15)", borderRadius: "10px", color: "#e67e22" }}>
              <MapPin size={20} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Warm Field Leads</p>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#e67e22", margin: "2px 0 0" }}>{warmLeadsCount}</h3>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "10px", color: "#34d399" }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Visits Completed</p>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#34d399", margin: "2px 0 0" }}>{completedCount}</h3>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ padding: "10px", background: "rgba(168, 85, 247, 0.15)", borderRadius: "10px", color: "#c084fc" }}>
              <Flame size={20} />
            </div>
            <div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, margin: 0 }}>Total Activity</p>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#c084fc", margin: "2px 0 0" }}>{appointments.length + leads.length}</h3>
            </div>
          </div>
        </div>

        {/* Clean Controls & Action Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px" }}>
          
          {/* Row 1: 100% Full Width Search Input */}
          <div style={{ position: "relative", width: "100%" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
            <input 
              type="text" 
              placeholder={activeTab === "APPOINTMENTS" ? "Search appointments, client, location..." : "Search warm field leads..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", backgroundColor: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 16px 10px 36px", fontSize: "13px", color: "var(--text-primary)", outline: "none" }}
            />
          </div>

          {/* Row 2: Full Width Gradient Button: + Upload Warm Lead */}
          <button 
            onClick={() => setIsLeadModalOpen(true)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 18px", background: "linear-gradient(135deg, #e67e22 0%, #d35400 100%)", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(230,126,34,0.35)" }}
          >
            <Plus size={16} /> + Upload Warm Lead
          </button>

          {/* Row 3: 2-Segment Tab Bar & View Switcher */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", background: "var(--bg-card)", padding: "4px", borderRadius: "10px", border: "1px solid var(--bg-border)", flex: "1 1 200px" }}>
              <button 
                onClick={() => setActiveTab("APPOINTMENTS")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: activeTab === "APPOINTMENTS" ? "linear-gradient(135deg, #e67e22, #d35400)" : "transparent",
                  color: activeTab === "APPOINTMENTS" ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                <Calendar size={14} /> Field Visits ({appointments.length})
              </button>
              <button 
                onClick={() => setActiveTab("LEADS")}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: activeTab === "LEADS" ? "linear-gradient(135deg, #e67e22, #d35400)" : "transparent",
                  color: activeTab === "LEADS" ? "#fff" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                <MapPin size={14} /> Warm Leads ({leads.length})
              </button>
            </div>

            {/* View Switcher: GRID vs TABLE */}
            <div style={{ display: "flex", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", padding: "3px", gap: "4px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setBdeViewMode("GRID")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: bdeViewMode === "GRID" ? "linear-gradient(135deg, #e67e22, #d35400)" : "transparent",
                  color: bdeViewMode === "GRID" ? "white" : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🎴 Cards View
              </button>
              <button
                type="button"
                onClick={() => setBdeViewMode("TABLE")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: bdeViewMode === "TABLE" ? "linear-gradient(135deg, #e67e22, #d35400)" : "transparent",
                  color: bdeViewMode === "TABLE" ? "white" : "var(--text-muted)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                📋 Table
              </button>
            </div>
          </div>
        </div>

        {/* BDE CARDS GRID VIEW OR TABLE VIEW */}
        {bdeViewMode === "GRID" ? (
          /* GRID CARDS VIEW (DEFAULT ON MOBILE) */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {activeTab === "APPOINTMENTS" ? (
              filteredAppointments.length === 0 ? (
                <div className="card-youistic" style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No scheduled field appointments found matching your search.
                </div>
              ) : (
                filteredAppointments.map((appt) => {
                  const style = statusStyles[appt.status] || statusStyles["SCHEDULED"];
                  const phone = appt.lead?.clientPhone?.trim();

                  return (
                    <div 
                      key={appt.id}
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
                      {/* Top Date Badge & Status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#0284c7", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", padding: "3px 8px", borderRadius: "6px" }}>
                          📅 {format(new Date(appt.meetingDate), "MMM dd, yyyy @ hh:mm a")}
                        </div>

                        <select
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                          style={{
                            backgroundColor: style.backgroundColor,
                            color: style.color,
                            border: style.border,
                            padding: "3px 8px",
                            borderRadius: "20px",
                            fontSize: "10px",
                            fontWeight: 700,
                            outline: "none",
                            cursor: "pointer"
                          }}
                        >
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="COMPLETED">COMPLETED 🎉</option>
                          <option value="RESCHEDULED">RESCHEDULED 📅</option>
                          <option value="CANCELED">CANCELED ❌</option>
                        </select>
                      </div>

                      {/* Business & Client Title */}
                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {appt.lead?.businessName || appt.title}
                        </h4>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          👤 {appt.lead?.clientName || "Field Prospect"} &bull; <span style={{ color: "#e67e22", fontWeight: 600 }}>{appt.lead?.service || "Field Visit"}</span>
                        </div>
                      </div>

                      {/* Location & Notes */}
                      <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px" }}>
                        <div style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <MapPin size={13} className="text-amber-500 shrink-0" />
                          <span>Field Visit / On-site Visit</span>
                        </div>
                        {appt.notes && (
                          <div style={{ color: "var(--text-secondary)" }}>
                            📝 <em>{appt.notes}</em>
                          </div>
                        )}
                      </div>

                      {/* 1-Tap Field Agent Action Dock: Google Maps & Call */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "auto", paddingTop: "4px" }}>
                        <a 
                          href={`https://maps.google.com/?q=${encodeURIComponent(appt.lead?.businessName || appt.title)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(230,126,34,0.12)", border: "1px solid #e67e22", borderRadius: "8px", color: "#d35400", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}
                        >
                          <MapPin size={13} /> 📍 Open Maps
                        </a>

                        {phone && phone.toUpperCase() !== "N/A" ? (
                          <a 
                            href={`tel:${phone}`}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "8px", color: "white", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}
                          >
                            <Phone size={13} /> Call {phone}
                          </a>
                        ) : (
                          <button disabled style={{ padding: "8px", background: "var(--bg-input)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "11px", border: "none" }}>No Phone</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              filteredLeads.length === 0 ? (
                <div className="card-youistic" style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "#64748b" }}>
                  No uploaded warm leads found.
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const phone = lead.clientPhone?.trim();

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
                      {/* Date Badge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#d35400", background: "rgba(230,126,34,0.12)", border: "1px solid rgba(230,126,34,0.3)", padding: "3px 8px", borderRadius: "6px" }}>
                          📅 {format(new Date(lead.createdAt), "MMM dd, yyyy @ hh:mm a")}
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 700, background: "rgba(16,185,129,0.15)", color: "#059669", padding: "2px 8px", borderRadius: "20px" }}>
                          Warm Field Lead
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {lead.businessName || lead.clientName}
                        </h4>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          👤 {lead.clientName} &bull; <span style={{ color: "#e67e22", fontWeight: 600 }}>{lead.service || "BDE Visit"}</span>
                        </div>
                      </div>

                      {/* Photo Button & Action Dock */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "auto", paddingTop: "4px" }}>
                        {lead.imageUrl ? (
                          <button
                            onClick={() => setSelectedPhoto(lead.imageUrl!)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "rgba(59,130,246,0.15)", border: "1px solid #3b82f6", borderRadius: "8px", color: "#0284c7", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            <ImageIcon size={13} /> View Card Photo
                          </button>
                        ) : (
                          <button disabled style={{ padding: "8px", background: "var(--bg-input)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "11px", border: "none" }}>No Photo</button>
                        )}

                        {phone && phone.toUpperCase() !== "N/A" ? (
                          <a 
                            href={`tel:${phone}`}
                            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "8px", color: "white", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}
                          >
                            <Phone size={13} /> Call {phone}
                          </a>
                        ) : (
                          <button disabled style={{ padding: "8px", background: "var(--bg-input)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "11px", border: "none" }}>No Phone</button>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        ) : (
          /* DATA TABLE CONTAINER */
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", overflow: "hidden", minHeight: "420px", boxShadow: "var(--shadow-card)" }}>
            <div style={{ overflowX: "auto" }}>
            {activeTab === "APPOINTMENTS" ? (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--bg-border)" }}>
                    {["Meeting Date", "Client Details", "Location", "Meeting Notes", "Status", "Action"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "14px 20px", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", fontSize: "13px", color: "var(--text-muted)" }}>Loading field appointments...</td>
                    </tr>
                  ) : filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "50px", fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No scheduled field appointments found.</td>
                    </tr>
                  ) : filteredAppointments.map((appt) => (
                    <tr key={appt.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background 0.2s" }}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{format(new Date(appt.meetingDate), "MMM dd, yyyy")}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{format(new Date(appt.meetingDate), "hh:mm a")}</div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{appt.lead?.businessName || appt.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{appt.lead?.clientName || "N/A"} &bull; {appt.lead?.service || "General"}</div>
                        {appt.lead?.clientPhone && appt.lead.clientPhone.toUpperCase() !== "N/A" && (
                          <a href={`tel:${appt.lead.clientPhone}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#0284c7", fontWeight: 600, fontFamily: "monospace", textDecoration: "none", marginTop: "4px" }}>
                            <Phone size={10} /> {appt.lead.clientPhone}
                          </a>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px", maxWidth: "200px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-primary)" }}>
                          <MapPin size={13} className="text-amber-500 shrink-0" />
                          <span className="truncate">Field Visit / On-site</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px 20px", maxWidth: "250px" }}>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }} className="truncate" title={appt.notes || ""}>
                          {appt.notes || "No notes"}
                        </p>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <select 
                          value={appt.status}
                          onChange={(e) => handleStatusChange(appt.id, e.target.value)}
                          style={{ 
                            ...statusStyles[appt.status],
                            padding: "6px 14px", 
                            borderRadius: "9999px", 
                            fontSize: "11px", 
                            fontWeight: 700, 
                            outline: "none", 
                            cursor: "pointer", 
                          }}
                        >
                          <option value="SCHEDULED">SCHEDULED</option>
                          <option value="COMPLETED">COMPLETED 🎉</option>
                          <option value="CANCELED">CANCELED ❌</option>
                          <option value="RESCHEDULED">RESCHEDULED 📅</option>
                        </select>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                          <button 
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              setOpenDropdownId(openDropdownId === appt.id ? null : appt.id); 
                            }}
                            style={{ padding: '8px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          {openDropdownId === appt.id && (
                            <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', width: '160px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--bg-border)', borderRadius: '12px', padding: '8px', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)' }}>
                              <button 
                                onClick={() => handleDeleteMeeting(appt.id)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: 'transparent', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#f87171', cursor: 'pointer', textAlign: 'left' }}
                              >
                                <Trash2 size={14} /> Delete Meeting
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-input)", borderBottom: "1px solid var(--bg-border)" }}>
                    {["Date", "Client & Business", "Service", "Contact Info", "Photo / Card", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "14px 20px", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", fontSize: "13px", color: "var(--text-muted)" }}>Loading uploaded leads...</td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "50px", fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>No uploaded warm leads found.</td>
                    </tr>
                  ) : filteredLeads.map((lead) => (
                    <tr key={lead.id} style={{ borderBottom: "1px solid var(--bg-border)", transition: "background 0.2s" }}>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{format(new Date(lead.createdAt), "MMM dd, yyyy")}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>{format(new Date(lead.createdAt), "hh:mm a")}</div>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{lead.businessName || lead.clientName}</div>
                        {lead.clientName && lead.clientName !== lead.businessName && (
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{lead.clientName}</div>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#d35400", background: "rgba(230,126,34,0.12)", border: "1px solid rgba(230,126,34,0.3)", padding: "3px 10px", borderRadius: "6px" }}>
                          {lead.service || "BDE Visit"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {lead.clientPhone && lead.clientPhone.toUpperCase() !== "N/A" ? (
                          <a href={`tel:${lead.clientPhone}`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#0284c7", fontWeight: 700, fontFamily: "monospace", textDecoration: "none" }}>
                            <Phone size={12} /> {lead.clientPhone}
                          </a>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        {lead.imageUrl ? (
                          <button
                            onClick={() => setSelectedPhoto(lead.imageUrl!)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", background: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.3)", color: "#0284c7", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                          >
                            <ImageIcon size={12} /> View Photo
                          </button>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>No photo</span>
                        )}
                      </td>
                      <td style={{ padding: "16px 20px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#facc15", background: "rgba(234, 179, 8, 0.12)", border: "1px solid rgba(234, 179, 8, 0.3)", padding: "4px 12px", borderRadius: "9999px" }}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      </main>
      )}

      {/* Complete Meeting Outcome Modal */}
      {isCompleteModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #10b981", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(16, 185, 129, 0.2)" }}>
            <button onClick={() => { setIsCompleteModalOpen(false); setSelectedMeetingId(null); }} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ padding: "10px", background: "rgba(16, 185, 129, 0.15)", borderRadius: "12px", color: "#34d399" }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>🎉 Mark Meeting Completed</h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Log meeting outcome and remarks from the visit.</p>
              </div>
            </div>

            <form onSubmit={handleSaveCompleteOutcome} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Meeting Outcome / Remarks *</label>
                <textarea
                  required
                  name="outcomeNotes"
                  rows={4}
                  placeholder="e.g. Met client owner in afternoon. Pitched FBP plan, client agreed to review proposal by Friday..."
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "10px 12px", color: "white", outline: "none", resize: "none", fontSize: "13px" }}
                ></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => { setIsCompleteModalOpen(false); setSelectedMeetingId(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1f2235", borderRadius: "8px", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "9px 22px", background: "#10b981", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Save Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Meeting Modal */}
      {isRescheduleModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #fb923c", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "460px", position: "relative", boxShadow: "0 20px 40px rgba(249, 115, 22, 0.2)" }}>
            <button onClick={() => { setIsRescheduleModalOpen(false); setSelectedMeetingId(null); }} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ padding: "10px", background: "rgba(249, 115, 22, 0.15)", borderRadius: "12px", color: "#fb923c" }}>
                <Clock size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>📅 Reschedule Meeting</h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Set new meeting date, time and reason.</p>
              </div>
            </div>

            <form onSubmit={handleSaveReschedule} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>New Meeting Date & Time *</label>
                <input
                  required
                  type="datetime-local"
                  name="newMeetingDate"
                  defaultValue={getDefaultDateTime()}
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "10px 12px", color: "white", outline: "none", fontSize: "14px", fontWeight: 500, colorScheme: "dark" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Reschedule Remarks / Reason</label>
                <textarea
                  name="rescheduleNotes"
                  rows={3}
                  placeholder="e.g. Client requested to move meeting to Thursday afternoon..."
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "10px 12px", color: "white", outline: "none", resize: "none", fontSize: "13px" }}
                ></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => { setIsRescheduleModalOpen(false); setSelectedMeetingId(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1f2235", borderRadius: "8px", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "9px 22px", background: "#f97316", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Saving..." : "Set New Date"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Lead Modal */}
      {isLeadModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div style={{ backgroundColor: "#0f111a", border: "1px solid #e67e22", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "480px", position: "relative", boxShadow: "0 20px 40px rgba(230, 126, 34, 0.2)" }}>
            <button onClick={() => { setIsLeadModalOpen(false); setPreviewImage(null); }} style={{ position: "absolute", top: "20px", right: "20px", background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ padding: "10px", background: "rgba(230, 126, 34, 0.15)", borderRadius: "12px", color: "#e67e22" }}>
                <Plus size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>📸 Upload Ground Field Lead</h2>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>Fast field visit upload with visiting card / photo.</p>
              </div>
            </div>

            <form onSubmit={handleAddWarmLead} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Business / Shop Name *</label>
                <input required type="text" name="businessName" placeholder="e.g. Jodhpur Hardware House" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", color: "white", outline: "none", fontSize: "14px" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Contact Person *</label>
                  <input required type="text" name="clientName" placeholder="Owner Name" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", color: "white", outline: "none", fontSize: "13px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Phone Number *</label>
                  <input required type="tel" name="clientPhone" placeholder="9876543210" style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", color: "white", outline: "none", fontSize: "13px", fontFamily: "monospace" }} />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Category / Service Interested</label>
                <input 
                  type="text" 
                  name="service" 
                  placeholder="e.g. Hardware Shop, Gym, Clinic, Restaurant, FBP..." 
                  style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "9px 12px", color: "white", outline: "none", fontSize: "13px" }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Visiting Card / Shop Photo</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "8px", color: "#94a3b8", fontSize: "12px" }} />
                {previewImage && (
                  <div style={{ marginTop: "8px", borderRadius: "8px", overflow: "hidden", maxHeight: "100px", border: "1px solid #10b981" }}>
                    <img src={previewImage} alt="Preview" style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "#94a3b8", marginBottom: "6px" }}>Visit Remarks / Notes</label>
                <textarea name="comment" rows={2} placeholder="e.g. Met owner in afternoon. Interested in FBP plan..." style={{ width: "100%", backgroundColor: "#14161f", border: "1px solid #1f2235", borderRadius: "8px", padding: "8px 12px", color: "white", outline: "none", resize: "none", fontSize: "13px" }}></textarea>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
                <button type="button" onClick={() => { setIsLeadModalOpen(false); setPreviewImage(null); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #1f2235", borderRadius: "8px", color: "#cbd5e1", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "9px 22px", background: "linear-gradient(135deg, #e67e22, #d35400)", border: "none", borderRadius: "8px", color: "white", fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Uploading..." : "Save Field Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
            <button onClick={() => setSelectedPhoto(null)} style={{ position: "absolute", top: "-40px", right: "0", background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <img src={selectedPhoto} alt="Visit Photo" style={{ borderRadius: "12px", border: "1px solid #1f2235", maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }} />
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
          fetchData();
        }}
      />
    </div>
  );
}
