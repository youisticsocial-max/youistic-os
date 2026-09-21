"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Building2,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  Briefcase,
  LifeBuoy,
  FileText,
  ChevronLeft,
  RefreshCw,
  Clock,
  AlertCircle,
  FolderCheck,
  Sparkles,
  Lock
} from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getClientById, updateClient } from "@/app/actions/clients";

interface Client360PageProps {
  params: Promise<{ clientId: string }>;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: "Active", color: "#00b894", bg: "rgba(0,184,148,0.12)" },
  CHURNED: { label: "Churned", color: "#d63031", bg: "rgba(214,48,49,0.12)" },
  RENEWAL_DUE: { label: "Renewal Due", color: "#fdcb6e", bg: "rgba(253,203,110,0.15)" },
  ONBOARDING: { label: "Onboarding", color: "#0984e3", bg: "rgba(9,132,227,0.12)" },
};

const svcConfig: Record<string, { color: string; bg: string }> = {
  FBP: { color: "#6c5ce7", bg: "rgba(108,92,231,0.12)" },
  TECH: { color: "#00cec9", bg: "rgba(0,206,201,0.12)" },
  HYBRID: { color: "#fdcb6e", bg: "rgba(253,203,110,0.12)" },
};

export default function Client360Page({ params }: Client360PageProps) {
  const resolvedParams = use(params);
  const clientId = resolvedParams.clientId;

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "PROJECTS" | "FINANCE" | "SUPPORT" | "ASSETS">("OVERVIEW");

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchClientData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClientById(clientId);
      if (!data) {
        setError("Client not found or you do not have permission to view this client.");
      } else {
        setClient(data);
        setEditForm({
          contactPerson: data.contactPerson || "",
          phone: data.phone || "",
          email: data.email || "",
          status: data.status || "ACTIVE",
          notes: data.notes || "",
          industry: data.industry || "",
          website: data.website || "",
          renewalAmount: data.renewalAmount || 0,
        });
      }
    } catch (err: any) {
      console.error("Failed to load Client 360 data:", err);
      setError(err?.message || "Failed to load Client 360 data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateClient(clientId, editForm);
      await fetchClientData();
      setIsEditing(false);
    } catch (err: any) {
      alert("Error updating client: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090b10] text-slate-100">
        <Topbar title="Client 360 View" subtitle="Loading client portfolio..." />
        <main className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-emerald-400 font-medium">
            <RefreshCw className="animate-spin" size={20} />
            Loading Client 360 portfolio...
          </div>
        </main>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#090b10] text-slate-100">
        <Topbar title="Client 360 View" subtitle="Client not found" />
        <main className="p-8 max-w-4xl mx-auto">
          <div className="bg-rose-950/30 border border-rose-800/40 rounded-2xl p-6 text-center">
            <AlertCircle className="mx-auto text-rose-400 mb-3" size={32} />
            <h3 className="text-lg font-bold text-rose-200 mb-2">Access Error</h3>
            <p className="text-sm text-rose-300/80 mb-6">{error || "Client record not found."}</p>
            <Link
              href="/dashboard/crm"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition"
            >
              <ChevronLeft size={16} />
              Return to CRM Directory
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusStyle = statusConfig[client.status] || { label: client.status, color: "#94a3b8", bg: "rgba(148,163,184,0.12)" };
  const svcStyle = svcConfig[client.serviceType] || { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100">
      <Topbar title={`Client 360 — ${client.companyName}`} subtitle="Unified Post-Sale Account Portfolio" />

      <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Navigation & Header Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/crm"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 rounded-lg transition"
          >
            <ChevronLeft size={14} />
            Back to CRM Directory
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 transition"
            >
              {isEditing ? "Cancel Edit" : "Edit Client Info"}
            </button>
          </div>
        </div>

        {/* Client Header Card */}
        <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-lg">
                <Building2 size={28} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-100">{client.companyName}</h1>
                  <span
                    className="px-2.5 py-0.5 text-xs font-bold rounded-full border"
                    style={{ color: statusStyle.color, backgroundColor: statusStyle.bg, borderColor: `${statusStyle.color}40` }}
                  >
                    {statusStyle.label}
                  </span>
                  <span
                    className="px-2.5 py-0.5 text-xs font-bold rounded-full border"
                    style={{ color: svcStyle.color, backgroundColor: svcStyle.bg, borderColor: `${svcStyle.color}40` }}
                  >
                    {client.serviceType}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-500" />
                    {client.contactPerson || "Not set"}
                  </span>
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-500" />
                      {client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-slate-500" />
                      {client.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    BDE: <strong className="text-slate-200">{client.assignedBde?.name || "Unassigned"}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Contract Value
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(client.contractValue || 0)}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Renewal Amount
                </span>
                <span className="text-lg font-bold text-teal-400">
                  {client.renewalAmount ? formatCurrency(client.renewalAmount) : "Not set"}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                  Renewal Date
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  {client.renewalDate ? formatDate(client.renewalDate) : "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Inline Form Panel */}
          {isEditing && (
            <div className="mt-6 pt-6 border-t border-slate-800/80 bg-slate-950/60 p-4 rounded-xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Sparkles size={14} />
                Edit Client Info
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Client Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ONBOARDING">ONBOARDING</option>
                    <option value="RENEWAL_DUE">RENEWAL_DUE</option>
                    <option value="CHURNED">CHURNED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Industry</label>
                  <input
                    type="text"
                    value={editForm.industry}
                    onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Renewal Amount (₹)</label>
                  <input
                    type="number"
                    value={editForm.renewalAmount}
                    onChange={(e) => setEditForm({ ...editForm, renewalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Client 360 Tabs Navigation */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "OVERVIEW"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Overview & Details
          </button>
          <button
            onClick={() => setActiveTab("PROJECTS")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "PROJECTS"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase size={14} />
            Projects ({client.projects?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("FINANCE")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "FINANCE"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <DollarSign size={14} />
            Finance ({client.revenueEntries?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("SUPPORT")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "SUPPORT"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <LifeBuoy size={14} />
            Support ({client.supportTickets?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("ASSETS")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "ASSETS"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Lock size={14} />
            Asset Credentials (Safe Metadata)
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* OVERVIEW TAB */}
        {activeTab === "OVERVIEW" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Account Notes */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-400" />
                  Account Notes & Instructions
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {client.notes || "No notes entered for this client account."}
                </p>
              </div>

              {/* Sales Origin & Attribution Card */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal-400" />
                  Sales Origin & Attribution
                </h3>

                {client.originLead ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Lead Source:</span>
                      <strong className="text-slate-100">{client.originLead.source || "Direct / Unknown"}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Original Lead SDR:</span>
                      <strong className="text-slate-100">{client.originLead.assignedSdr?.name || "Unassigned"}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Original Lead BDE:</span>
                      <strong className="text-slate-100">{client.originLead.assignedBde?.name || "Unassigned"}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 block mb-1">Lead Creation Date:</span>
                      <strong className="text-slate-100">{client.originLead.createdAt ? formatDate(client.originLead.createdAt) : "Not set"}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs text-slate-400 font-medium">Original lead not linked</span>
                    <p className="text-[11px] text-slate-500 mt-1">Historical client converted before lead-origin traceability was introduced.</p>
                  </div>
                )}

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900/80 text-xs">
                  <span className="text-slate-400 block mb-1">Current Account BDE (Ownership):</span>
                  <strong className="text-emerald-400">{client.assignedBde?.name || "Unassigned BDE"}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Client Properties */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
                <h3 className="text-sm font-bold text-slate-200 mb-3">Account Details</h3>
                <div>
                  <span className="text-slate-500 block mb-0.5">Billing Model</span>
                  <span className="text-slate-200 font-medium">{client.billingModel || "ONE_TIME"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Industry</span>
                  <span className="text-slate-200 font-medium">{client.industry || "Not set"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Sales Close Date</span>
                  <span className="text-slate-200 font-medium">
                    {client.salesCloseDate ? formatDate(client.salesCloseDate) : "Not set"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Account Creation Date</span>
                  <span className="text-slate-200 font-medium">
                    {client.createdAt ? formatDate(client.createdAt) : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "PROJECTS" && (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Briefcase size={16} className="text-emerald-400" />
              Execution Projects
            </h3>
            {client.projects && client.projects.length > 0 ? (
              <div className="space-y-3">
                {client.projects.map((proj: any) => (
                  <div key={proj.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-100 text-sm">{proj.name}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-emerald-400">
                          {proj.type}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">
                          {proj.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{proj.description}</p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-400">Progress: <strong className="text-emerald-400">{proj.progress || 0}%</strong></div>
                      {proj.deadline && (
                        <div className="text-[11px] text-slate-500">Due: {formatDate(proj.deadline)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No active or historical execution projects found for this client.
              </div>
            )}
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === "FINANCE" && (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              Factual Revenue & Advance Collections
            </h3>
            {client.revenueEntries && client.revenueEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Payment Date</th>
                      <th className="py-2.5 px-3">Revenue Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {client.revenueEntries.map((rev: any) => (
                      <tr key={rev.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 text-slate-300">{formatDate(rev.paymentDate)}</td>
                        <td className="py-3 px-3 font-semibold text-emerald-400">{rev.revenueType}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            {rev.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-100">{formatCurrency(rev.amount)}</td>
                        <td className="py-3 px-3 text-slate-400">{rev.description || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No revenue entries recorded for this client.
              </div>
            )}
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === "SUPPORT" && (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <LifeBuoy size={16} className="text-emerald-400" />
              Support & Service Tickets
            </h3>
            {client.supportTickets && client.supportTickets.length > 0 ? (
              <div className="space-y-3">
                {client.supportTickets.map((t: any) => (
                  <div key={t.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-100 mb-1">{t.subject || t.title || "Support Ticket"}</div>
                      <div className="text-slate-400 font-mono text-[11px]">ID: {t.id}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300">
                        {t.status}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950/50 text-rose-300 border border-rose-800/40">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No support tickets filed for this client account.
              </div>
            )}
          </div>
        )}

        {/* ASSETS TAB */}
        {activeTab === "ASSETS" && (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Lock size={16} className="text-emerald-400" />
                Safe Asset Metadata (Vault Reference & Architecture Scope)
              </h3>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full font-medium">
                Plaintext Passwords & API Secrets Masked
              </span>
            </div>

            {client.assets && client.assets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {client.assets.map((asset: any) => (
                  <div key={asset.id} className="bg-[#0b0d14] border border-slate-800/80 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-200 text-sm">
                        {asset.name || asset.domainName || "Asset Record"}
                      </div>
                      {asset.vaultRef ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 flex items-center gap-1">
                          🔒 Vault Ref Configured
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-400">
                          No Vault Ref
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      {asset.domainName && (
                        <div><strong className="text-slate-300">Domain:</strong> {asset.domainName} ({asset.domainRegistrar || "Registrar N/A"})</div>
                      )}
                      {asset.hostingProvider && (
                        <div><strong className="text-slate-300">Hosting:</strong> {asset.hostingProvider} {asset.hostingIp ? `(${asset.hostingIp})` : ""}</div>
                      )}
                      {asset.hostingUser && (
                        <div><strong className="text-slate-300">Safe Account ID:</strong> {asset.hostingUser}</div>
                      )}
                      {asset.vaultRef && (
                        <div className="font-mono text-[11px] text-indigo-400 truncate">
                          <strong className="text-slate-300">Vault Item ID:</strong> {asset.vaultRef}
                        </div>
                      )}
                    </div>

                    {asset.notes && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                        <span className="font-semibold text-slate-300 block mb-1">Architecture Notes:</span>
                        {asset.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                No linked asset metadata stored for this client.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
