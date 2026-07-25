"use client";

import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  CheckCircle2,
  DollarSign,
  Sparkles,
  MessageCircle,
  ShieldCheck
} from "lucide-react";
import { convertLeadToClient } from "@/app/actions/leads";

interface LeadData {
  id: string;
  clientName: string;
  businessName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  service?: string | null;
}

interface ClosedWonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
  onSuccess?: () => void;
}

export default function ClosedWonModal({
  isOpen,
  onClose,
  lead,
  onSuccess,
}: ClosedWonModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractValue, setContractValue] = useState("45000");
  const [advanceAmount, setAdvanceAmount] = useState("20000");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const [billingModel, setBillingModel] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
  const [renewalAmount, setRenewalAmount] = useState("3000");

  useEffect(() => {
    if (lead) {
      setContractValue("45000");
      setAdvanceAmount("20000");
      setRenewalAmount("3000");
      setBillingModel("ONE_TIME");
      setSendWhatsApp(true);
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const numericContract = parseFloat(contractValue) || 0;
  const numericAdvance = parseFloat(advanceAmount) || 0;
  const numericRenewal = parseFloat(renewalAmount) || 0;

  const formatWhatsAppPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned;
    }
    return cleaned;
  };

  const handleConfirmClose = async () => {
    setIsSubmitting(true);
    try {
      // Execute 4-in-1 dynamic update (Lead -> CRM Client -> Project -> Finance)
      await convertLeadToClient(
        lead.id,
        numericContract,
        `Deal Closed via Pipeline. Model: ${billingModel}, Initial: ₹${numericContract.toLocaleString("en-IN")}, Renewal: ₹${numericRenewal.toLocaleString("en-IN")}/yr, Advance: ₹${numericAdvance.toLocaleString("en-IN")}`,
        numericAdvance,
        `${lead.businessName || lead.clientName} - Project Execution`,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        billingModel,
        numericRenewal
      );

      if (sendWhatsApp && lead.clientPhone) {
        const cleanedPhone = formatWhatsAppPhone(lead.clientPhone);
        const message = `🎉 *WELCOME TO YOUISTIC - DEAL CONFIRMED!*

Dear *${lead.clientName}*,

Congratulations! Your deal for *${lead.businessName || lead.clientName}* is confirmed and active in our system! 🚀

💰 *Deal Valuation:* ₹${numericContract.toLocaleString("en-IN")}
✅ *Advance Received:* ₹${numericAdvance.toLocaleString("en-IN")}

Our team has initiated your project work.

Thank you for choosing *Youistic!*`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${cleanedPhone}?text=${encodedMessage}`, "_blank");
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to convert lead:", error);
      alert("Error closing deal: " + (error?.message || "Unknown error"));
    }
    setIsSubmitting(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(5, 7, 13, 0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "#0f111a", border: "1px solid #10b981", borderRadius: "20px", boxShadow: "0 24px 64px rgba(16,185,129,0.25)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2338", backgroundColor: "#141726", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(16,185,129,0.4)" }}>
              <Trophy size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                Confirm & Close Deal 🎉
              </h3>
              <p style={{ fontSize: "12px", color: "#34d399", margin: "2px 0 0", fontWeight: 600 }}>
                {lead.businessName || lead.clientName}
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ backgroundColor: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Minimal Form Content */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#e2e8f0" }}>
            <ShieldCheck size={18} color="#34d399" />
            <span>Updates <strong>CRM Client</strong>, <strong>Projects</strong>, <strong>Finance Revenue</strong> & <strong>CEO Sales MIS</strong> instantly!</span>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Billing Structure & Contract Type *
            </label>
            <select
              value={billingModel}
              onChange={(e) => setBillingModel(e.target.value as any)}
              style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#f8fafc", outline: "none" }}
            >
              <option value="ONE_TIME">⚡ One-Time Project + Yearly Renewal Fee</option>
              <option value="RECURRING">🔄 Recurring Retainer (Annual / Monthly)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                {billingModel === "RECURRING" ? "Annual Retainer (₹/yr) *" : "Initial Project Fee (One-Time ₹) *"}
              </label>
              <div style={{ position: "relative" }}>
                <DollarSign size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#34d399" }} />
                <input
                  type="number"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #10b981", borderRadius: "10px", padding: "10px 14px 10px 36px", fontSize: "14px", fontWeight: 700, color: "#34d399", outline: "none" }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
                Yearly Renewal Fee (₹/yr)
              </label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={renewalAmount}
                onChange={(e) => setRenewalAmount(e.target.value)}
                style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", fontWeight: 600, color: "#f8fafc", outline: "none" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#cbd5e1", marginBottom: "6px" }}>
              Advance Payment Collected (₹)
            </label>
            <div style={{ position: "relative" }}>
              <DollarSign size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#38bdf8" }} />
              <input
                type="number"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                style={{ width: "100%", backgroundColor: "#141726", border: "1px solid #232840", borderRadius: "10px", padding: "10px 14px 10px 36px", fontSize: "15px", fontWeight: 700, color: "#38bdf8", outline: "none" }}
              />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer", marginTop: "4px" }}>
            <input
              type="checkbox"
              checked={sendWhatsApp}
              onChange={(e) => setSendWhatsApp(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#25D366", cursor: "pointer" }}
            />
            <MessageCircle size={14} color="#25D366" />
            Send Welcome Message on WhatsApp
          </label>

        </div>

        {/* Footer Button */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #1f2338", backgroundColor: "#141726", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "10px 16px", backgroundColor: "transparent", border: "1px solid #282d45", borderRadius: "10px", color: "#94a3b8", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleConfirmClose}
            disabled={isSubmitting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 22px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontSize: "14px",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(16,185,129,0.4)"
            }}
          >
            {isSubmitting ? "Updating OS..." : "Confirm & Close Deal 🎉"}
          </button>
        </div>

      </div>
    </div>
  );
}
