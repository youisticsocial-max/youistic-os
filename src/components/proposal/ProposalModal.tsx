"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Printer, 
  Send, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  Building2, 
  User, 
  Phone, 
  Sparkles,
  ShieldCheck,
  Eye,
  Edit3,
  MessageCircle,
  Download,
  Loader2
} from "lucide-react";
import { updateLeadStatus } from "@/app/actions/leads";

interface LeadData {
  id: string;
  clientName: string;
  businessName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  service?: string | null;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
  onSuccess?: () => void;
}

export default function ProposalModal({ isOpen, onClose, lead, onSuccess }: ProposalModalProps) {
  const [activeTab, setActiveTab] = useState<"FORM" | "PREVIEW">("FORM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [proposalSuccess, setProposalSuccess] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Form State
  const [proposalTitle, setProposalTitle] = useState("");
  const [packageType, setPackageType] = useState("Tech Solutions");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [deliverables, setDeliverables] = useState(
    "1. Custom Responsive Next.js Web Application\n2. Search Engine Optimization (SEO) Setup\n3. High-Converting Landing Pages & Lead Forms\n4. 3 Months Priority Support & Maintenance"
  );
  const [totalAmount, setTotalAmount] = useState("45000");
  const [discountAmount, setDiscountAmount] = useState("5000");
  const [paymentTerms, setPaymentTerms] = useState("50% Advance on signing, 50% on project delivery");
  const [validityDays, setValidityDays] = useState("15 Days");
  const [specialTerms, setSpecialTerms] = useState("Domain and hosting charges to be borne by client. Tax extra as applicable.");

  useEffect(() => {
    if (lead) {
      setProposalTitle(
        lead.service 
          ? `Commercial Proposal for ${lead.service}` 
          : `Customized Business Growth Proposal`
      );
      if (lead.service) {
        setPackageType(lead.service);
      }
      setWhatsappNumber(lead.clientPhone || "");
    }
    setProposalSuccess(false);
  }, [lead]);

  if (!isOpen || !lead) return null;

  const numericTotal = parseFloat(totalAmount) || 0;
  const numericDiscount = parseFloat(discountAmount) || 0;
  const netAmount = Math.max(0, numericTotal - numericDiscount);

  const proposalId = `YOS-PROP-${lead.id.substring(0, 5).toUpperCase()}`;
  const currentDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handlePrintDownload = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker is preventing the PDF print window. Please allow popups for this site.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proposal_${(lead.businessName || lead.clientName).replace(/\s+/g, '_')}_${proposalId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');
            * { box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 40px;
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .proposal-header {
              display: flex;
              justify-content: space-between;
              border-bottom: 3px solid #6366f1;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .brand-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 24px;
              font-weight: 700;
              color: #4f46e5;
            }
            .meta-box {
              text-align: right;
              font-size: 12px;
              color: #64748b;
            }
            .client-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 24px;
            }
            .table-custom {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              margin-bottom: 24px;
            }
            .table-custom th {
              background: #4f46e5;
              color: #ffffff;
              padding: 10px 14px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            .table-custom td {
              border-bottom: 1px solid #e2e8f0;
              padding: 12px 14px;
              font-size: 13px;
            }
            .summary-box {
              float: right;
              width: 280px;
              background: #f1f5f9;
              padding: 16px;
              border-radius: 8px;
              margin-top: 10px;
            }
            .footer-sig {
              margin-top: 60px;
              display: flex;
              justify-content: space-between;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 750px; margin: 0 auto;">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleDirectPdfDownload = async () => {
    if (!printRef.current) return;
    setIsDownloadingPdf(true);

    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF generation library"));
          document.body.appendChild(script);
        });
      }

      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) throw new Error("PDF engine not found");

      const element = printRef.current;
      const fileName = `Proposal_${(lead.businessName || lead.clientName).replace(/[^\w-]/g, '_')}_${proposalId}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Direct PDF download error, resorting to browser print:", err);
      handlePrintDownload();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const formatWhatsAppPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  };

  const handleSaveAndSend = async (sendViaWhatsApp: boolean = true) => {
    if (sendViaWhatsApp && !whatsappNumber.trim()) {
      alert("Please enter a valid WhatsApp number for dispatch.");
      return;
    }
    setIsSubmitting(true);
    try {
      // Update lead status to PROPOSAL_SENT
      await updateLeadStatus(lead.id, "PROPOSAL_SENT");
      setProposalSuccess(true);

      if (sendViaWhatsApp) {
        const cleanedPhone = formatWhatsAppPhone(whatsappNumber);
        const message = `Hello *${lead.clientName}*,\n\nHere is the official commercial proposal for *${lead.businessName || lead.clientName}*:\n\n📄 *Proposal Title:* ${proposalTitle}\n🏷️ *Category:* ${packageType}\n💰 *Net Amount:* ₹${netAmount.toLocaleString("en-IN")}\n📅 *Validity:* ${validityDays}\n\n📋 *Scope of Work & Deliverables:*\n${deliverables}\n\n💳 *Payment Terms:* ${paymentTerms}\n\nThank you,\n*Youistic Enterprise Sales*`;
        const encodedMessage = encodeURIComponent(message);
        const waUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
        window.open(waUrl, "_blank");
      }

      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Failed to update proposal status.");
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(5, 7, 13, 0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "1050px", maxHeight: "92dvh", backgroundColor: "#0f111a", border: "1px solid #282d45", borderRadius: "20px", boxShadow: "0 24px 64px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Modal Top Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1f2338", backgroundColor: "#141726", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,0.4)" }}>
              <FileText size={22} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                In-House Commercial Proposal Generator
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#818cf8", backgroundColor: "rgba(99,102,241,0.15)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(99,102,241,0.3)" }}>
                  PDF Engine
                </span>
              </h2>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 0" }}>
                Generate & Dispatch Official Proposal for <strong style={{ color: "#e2e8f0" }}>{lead.businessName || lead.clientName}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* View Switcher Tabs */}
            <div style={{ display: "flex", backgroundColor: "#0a0c14", padding: "3px", borderRadius: "10px", border: "1px solid #1f2338" }}>
              <button
                onClick={() => setActiveTab("FORM")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: activeTab === "FORM" ? "#6366f1" : "transparent",
                  color: activeTab === "FORM" ? "white" : "#94a3b8",
                  transition: "all 0.2s"
                }}
              >
                <Edit3 size={14} /> Proposal Form
              </button>
              <button
                onClick={() => setActiveTab("PREVIEW")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: activeTab === "PREVIEW" ? "#6366f1" : "transparent",
                  color: activeTab === "PREVIEW" ? "white" : "#94a3b8",
                  transition: "all 0.2s"
                }}
              >
                <Eye size={14} /> Live PDF Preview
              </button>
            </div>

            <button
              onClick={onClose}
              style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "none", borderRadius: "10px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", gap: "24px" }}>
          
          {/* TAB 1: EDIT FORM */}
          {activeTab === "FORM" && (
            <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              
              {/* Left Column: Client & Scope Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Client Info Summary Card */}
                <div style={{ backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "14px", padding: "16px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>
                    📌 Target Client Information
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Client / Owner Name</span>
                      <strong style={{ color: "#f8fafc" }}>{lead.clientName}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Business Name</span>
                      <strong style={{ color: "#f8fafc" }}>{lead.businessName || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>WhatsApp Contact</span>
                      <span style={{ color: "#4ade80", fontFamily: "monospace", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                        <MessageCircle size={12} color="#25D366" />
                        {whatsappNumber || lead.clientPhone || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Service Category</span>
                      <span style={{ color: "#38bdf8" }}>{lead.service || "Tech & Growth"}</span>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Phone Number Field */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MessageCircle size={15} color="#25D366" /> Client WhatsApp Number (For Direct Dispatch) *
                    </span>
                    <span style={{ fontSize: "11px", color: "#25D366", fontWeight: 600 }}>WhatsApp Active</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="e.g. 9876543210 or 919876543210"
                      style={{
                        width: "100%",
                        backgroundColor: "#141726",
                        border: "1px solid rgba(37, 211, 102, 0.4)",
                        borderRadius: "10px",
                        padding: "10px 14px 10px 38px",
                        fontSize: "13px",
                        color: "white",
                        outline: "none",
                        boxShadow: "0 0 12px rgba(37, 211, 102, 0.1)"
                      }}
                    />
                    <MessageCircle size={16} color="#25D366" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  </div>
                </div>

                {/* Proposal Title */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Proposal Document Title *
                  </label>
                  <input
                    type="text"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "white", outline: "none" }}
                  />
                </div>

                {/* Package / Service Type */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Package / Category *
                  </label>
                  <input
                    type="text"
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "white", outline: "none" }}
                  />
                </div>

                {/* Deliverables Breakdown */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Included Scope & Deliverables *
                  </label>
                  <textarea
                    rows={5}
                    value={deliverables}
                    onChange={(e) => setDeliverables(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#e2e8f0", outline: "none", fontFamily: "monospace", lineHeight: "1.5" }}
                  />
                </div>
              </div>

              {/* Right Column: Pricing & Commercial Terms */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                {/* Pricing Box */}
                <div style={{ backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                    💰 Commercial Quotation
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                        Quotation Amount (₹) *
                      </label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        style={{ width: "100%", backgroundColor: "#0b0d14", border: "1px solid #1f2338", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontWeight: 700, color: "#34d399", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
                        Discount / Special Offer (₹)
                      </label>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        style={{ width: "100%", backgroundColor: "#0b0d14", border: "1px solid #1f2338", borderRadius: "8px", padding: "8px 12px", fontSize: "14px", fontWeight: 700, color: "#fb923c", outline: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: "1px border #1f2338", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Net Payable Valuation:</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "#38bdf8", fontFamily: "'Space Grotesk', sans-serif" }}>
                      ₹{netAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Payment Milestones */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Payment Terms & Milestones
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "white", outline: "none" }}
                  />
                </div>

                {/* Validity Period */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Proposal Validity Period
                  </label>
                  <input
                    type="text"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "white", outline: "none" }}
                  />
                </div>

                {/* Special Terms */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                    Special Conditions / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialTerms}
                    onChange={(e) => setSpecialTerms(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#e2e8f0", outline: "none" }}
                  />
                </div>

              </div>
            </div>
          )}

          {/* Hidden Off-Screen Container to ensure printRef is ALWAYS mounted for printing on FORM tab */}
          <div style={{ position: "fixed", left: "-9999px", top: "-9999px", width: "750px", opacity: 0, pointerEvents: "none" }} aria-hidden="true">
            <div
              ref={printRef}
              style={{
                width: "100%",
                maxWidth: "750px",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                borderRadius: "12px",
                padding: "40px",
                boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              {/* Header Branding */}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #6366f1", paddingBottom: "16px", marginBottom: "24px" }}>
                <div>
                  <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#4f46e5", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                    YOUISTIC
                  </h1>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                    Your Business. Our System
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{proposalId}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Date: {currentDate}</div>
                  <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600, marginTop: "2px" }}>Valid: {validityDays}</div>
                </div>
              </div>

              {/* Proposal Title Banner */}
              <div style={{ backgroundColor: "#eef2ff", borderLeft: "4px solid #4f46e5", borderRadius: "6px", padding: "12px 16px", marginBottom: "24px" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>{proposalTitle}</div>
                <div style={{ fontSize: "12px", color: "#4338ca", marginTop: "2px", fontWeight: 500 }}>Category: {packageType}</div>
              </div>

              {/* Client Box */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 18px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>PREPARED FOR:</span>
                  <strong style={{ fontSize: "14px", color: "#0f172a" }}>{lead.businessName || lead.clientName}</strong>
                  <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Attn: {lead.clientName}</div>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>CONTACT DETAILS:</span>
                  <div style={{ fontSize: "12px", color: "#334155", fontFamily: "monospace", marginTop: "2px" }}>📞 {whatsappNumber || lead.clientPhone || "N/A"}</div>
                  {lead.clientEmail && <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>✉️ {lead.clientEmail}</div>}
                </div>
              </div>

              {/* Scope & Deliverables Table */}
              <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Scope of Work & Deliverables
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                <thead>
                  <tr style={{ background: "#4f46e5", color: "white" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "11px", textTransform: "uppercase", width: "100px" }}>Qty / Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.split("\n").map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "10px 12px", fontSize: "12px", color: "#334155" }}>{item}</td>
                      <td style={{ padding: "10px 12px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>Included</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary & Pricing Box */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div style={{ maxWidth: "380px" }}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", margin: "0 0 6px" }}>
                    Payment Terms:
                  </h4>
                  <p style={{ fontSize: "12px", color: "#334155", margin: 0 }}>{paymentTerms}</p>
                  
                  <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", margin: "14px 0 6px" }}>
                    Terms & Conditions:
                  </h4>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>{specialTerms}</p>
                </div>

                <div style={{ width: "240px", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                    <span>Quotation Total:</span>
                    <span>₹{numericTotal.toLocaleString("en-IN")}</span>
                  </div>
                  {numericDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#e11d48", marginBottom: "6px" }}>
                      <span>Special Discount:</span>
                      <span>- ₹{numericDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800, color: "#0f172a", borderTop: "2px solid #cbd5e1", paddingTop: "8px", marginTop: "6px" }}>
                    <span>Net Payable:</span>
                    <span style={{ color: "#4f46e5" }}>₹{netAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Footer Signature Block */}
              <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                <div>
                  <div>Authorized Signatory</div>
                  <strong style={{ color: "#0f172a", fontSize: "12px", display: "block", marginTop: "4px" }}>Youistic Enterprise Sales</strong>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Client Acceptance Signature</div>
                  <div style={{ borderBottom: "1px dashed #94a3b8", width: "140px", marginTop: "24px" }} />
                </div>
              </div>

            </div>
          </div>

          {/* TAB 2: LIVE PDF PREVIEW */}
          {activeTab === "PREVIEW" && (
            <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "100%",
                  maxWidth: "750px",
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "12px",
                  padding: "40px",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                  fontFamily: "'Inter', sans-serif"
                }}
              >
                {/* Header Branding */}
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #6366f1", paddingBottom: "16px", marginBottom: "24px" }}>
                  <div>
                    <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#4f46e5", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                      YOUISTIC
                    </h1>
                    <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                      Your Business. Our System
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{proposalId}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Date: {currentDate}</div>
                    <div style={{ fontSize: "11px", color: "#6366f1", fontWeight: 600, marginTop: "2px" }}>Valid: {validityDays}</div>
                  </div>
                </div>

                {/* Proposal Title Banner */}
                <div style={{ backgroundColor: "#eef2ff", borderLeft: "4px solid #4f46e5", borderRadius: "6px", padding: "12px 16px", marginBottom: "24px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e1b4b" }}>{proposalTitle}</div>
                  <div style={{ fontSize: "12px", color: "#4338ca", marginTop: "2px", fontWeight: 500 }}>Category: {packageType}</div>
                </div>

                {/* Client Box */}
                <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 18px", marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>PREPARED FOR:</span>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>{lead.businessName || lead.clientName}</strong>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>Attn: {lead.clientName}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>CONTACT DETAILS:</span>
                    <div style={{ fontSize: "12px", color: "#334155", fontFamily: "monospace", marginTop: "2px" }}>📞 {whatsappNumber || lead.clientPhone || "N/A"}</div>
                    {lead.clientEmail && <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>✉️ {lead.clientEmail}</div>}
                  </div>
                </div>

                {/* Scope & Deliverables Table */}
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                  Scope of Work & Deliverables
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
                  <thead>
                    <tr style={{ background: "#4f46e5", color: "white" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", textTransform: "uppercase" }}>Description</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "11px", textTransform: "uppercase", width: "100px" }}>Qty / Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliverables.split("\n").map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "10px 12px", fontSize: "12px", color: "#334155" }}>{item}</td>
                        <td style={{ padding: "10px 12px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>Included</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary & Pricing Box */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                  <div style={{ maxWidth: "380px" }}>
                    <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", margin: "0 0 6px" }}>
                      Payment Terms:
                    </h4>
                    <p style={{ fontSize: "12px", color: "#334155", margin: 0 }}>{paymentTerms}</p>
                    
                    <h4 style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", margin: "14px 0 6px" }}>
                      Terms & Conditions:
                    </h4>
                    <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>{specialTerms}</p>
                  </div>

                  <div style={{ width: "240px", backgroundColor: "#f1f5f9", borderRadius: "8px", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px" }}>
                      <span>Quotation Total:</span>
                      <span>₹{numericTotal.toLocaleString("en-IN")}</span>
                    </div>
                    {numericDiscount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#e11d48", marginBottom: "6px" }}>
                        <span>Special Discount:</span>
                        <span>- ₹{numericDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800, color: "#0f172a", borderTop: "2px solid #cbd5e1", paddingTop: "8px", marginTop: "6px" }}>
                      <span>Net Payable:</span>
                      <span style={{ color: "#4f46e5" }}>₹{netAmount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Signature Block */}
                <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#64748b" }}>
                  <div>
                    <div>Authorized Signatory</div>
                    <strong style={{ color: "#0f172a", fontSize: "12px", display: "block", marginTop: "4px" }}>Youistic Enterprise Sales</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Client Acceptance Signature</div>
                    <div style={{ borderBottom: "1px dashed #94a3b8", width: "140px", marginTop: "24px" }} />
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1f2338", backgroundColor: "#141726", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={handleDirectPdfDownload}
              disabled={isDownloadingPdf}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                backgroundColor: "rgba(99, 102, 241, 0.18)",
                border: "1px solid rgba(99, 102, 241, 0.45)",
                borderRadius: "10px",
                color: "#a5b4fc",
                fontSize: "13px",
                fontWeight: 700,
                cursor: isDownloadingPdf ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.25)",
              }}
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} color="#a5b4fc" /> Direct Download PDF (.pdf)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintDownload}
              title="Print via Browser"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 14px",
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                color: "#94a3b8",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={15} /> Print
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 16px",
                backgroundColor: "transparent",
                border: "1px solid #282d45",
                borderRadius: "10px",
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndSend(false)}
              disabled={isSubmitting || proposalSuccess}
              style={{
                padding: "10px 16px",
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: "#cbd5e1",
                fontSize: "13px",
                fontWeight: 600,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              Save Only (Mark Sent)
            </button>

            <button
              type="button"
              onClick={() => handleSaveAndSend(true)}
              disabled={isSubmitting || proposalSuccess}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 22px",
                background: proposalSuccess 
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
                  : "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                border: "none",
                borderRadius: "10px",
                color: "white",
                fontSize: "13px",
                fontWeight: 700,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 16px rgba(37, 211, 102, 0.35)",
              }}
            >
              {proposalSuccess ? (
                <>
                  <CheckCircle2 size={16} /> Sent on WhatsApp & Saved!
                </>
              ) : isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <MessageCircle size={16} /> Send Direct on WhatsApp
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
