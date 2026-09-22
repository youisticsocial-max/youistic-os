"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency } from "@/lib/utils";
import {
  getServiceOfferings,
  createServiceOffering,
  updateServiceOffering,
} from "@/app/actions/services";
import {
  Package,
  Plus,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Layers,
  ShieldAlert,
} from "lucide-react";

const FAMILY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MEGA_SOFT: { label: "Mega Soft", color: "#6c5ce7", bg: "rgba(108,92,231,0.15)" },
  MEGA_WEB: { label: "Mega Web", color: "#00cec9", bg: "rgba(0,206,201,0.15)" },
  MEGA_APPS: { label: "Mega Apps", color: "#fdcb6e", bg: "rgba(253,203,110,0.15)" },
  FBP: { label: "FBP Managed", color: "#e84393", bg: "rgba(232,67,147,0.15)" },
};

export default function ServiceCataloguePage() {
  const [offerings, setOfferings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("ALL");
  const [showInactive, setShowInactive] = useState(true);
  const [userRole, setUserRole] = useState<string>("ADMIN");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOffering, setEditingOffering] = useState<any | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    name: "",
    family: "MEGA_WEB",
    code: "",
    description: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    family: "MEGA_WEB",
    code: "",
    description: "",
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const match = document.cookie.match(/(?:^|; )user_role=([^;]*)/);
      if (match) setUserRole(decodeURIComponent(match[1]).toUpperCase());

      const data = await getServiceOfferings(true);
      setOfferings(data || []);
    } catch (err: any) {
      console.error("Failed to load service offerings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!createForm.name.trim()) {
      setErrorMsg("Service offering name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await createServiceOffering({
        name: createForm.name.trim(),
        family: createForm.family,
        code: createForm.code.trim() || undefined,
        description: createForm.description.trim() || undefined,
      });
      await loadData();
      setIsCreateModalOpen(false);
      setCreateForm({ name: "", family: "MEGA_WEB", code: "", description: "" });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create service offering.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffering) return;
    setErrorMsg("");
    if (!editForm.name.trim()) {
      setErrorMsg("Service offering name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await updateServiceOffering(editingOffering.id, {
        name: editForm.name.trim(),
        family: editForm.family,
        code: editForm.code.trim() || undefined,
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
      });
      await loadData();
      setIsEditModalOpen(false);
      setEditingOffering(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update service offering.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (offering: any) => {
    try {
      await updateServiceOffering(offering.id, {
        isActive: !offering.isActive,
      });
      await loadData();
    } catch (err: any) {
      alert("Failed to update status: " + (err?.message || "Unknown error"));
    }
  };

  const openEditModal = (offering: any) => {
    setEditingOffering(offering);
    setEditForm({
      name: offering.name || "",
      family: offering.family || "MEGA_WEB",
      code: offering.code || "",
      description: offering.description || "",
      isActive: offering.isActive ?? true,
    });
    setErrorMsg("");
    setIsEditModalOpen(true);
  };

  // Filtered Offerings
  const filteredOfferings = offerings.filter((item) => {
    if (!showInactive && !item.isActive) return false;
    if (selectedFamily !== "ALL" && item.family !== selectedFamily) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchCode = (item.code || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      return matchName || matchCode || matchDesc;
    }
    return true;
  });

  const isAdmin = userRole === "ADMIN" || userRole === "CEO";

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100">
      <Topbar title="Service Catalogue Management" subtitle="Master Service Offerings & Product Definitions" />

      <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Package className="text-indigo-400" size={24} />
              Service Catalogue
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage master service definitions for client subscriptions and renewals
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setErrorMsg("");
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
            >
              <Plus size={16} />
              Add New Offering
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-[#111420] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search offerings by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <select
                value={selectedFamily}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Service Families</option>
                <option value="MEGA_SOFT">Mega Soft</option>
                <option value="MEGA_WEB">Mega Web</option>
                <option value="MEGA_APPS">Mega Apps</option>
                <option value="FBP">FBP Managed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-0"
              />
              Show Inactive Offerings
            </label>

            <button
              onClick={loadData}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Offerings Table */}
        <div className="bg-[#111420] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-indigo-400" size={18} />
              Loading service catalogue...
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto text-slate-600 mb-3" size={32} />
              <h3 className="text-sm font-bold text-slate-300">No Service Offerings Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedFamily !== "ALL"
                  ? "No offering matches your current filter criteria."
                  : "No service offerings defined in the catalogue yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Offering Name</th>
                    <th className="p-4">Family</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOfferings.map((item) => {
                    const fam = FAMILY_CONFIG[item.family] || {
                      label: item.family,
                      color: "#94a3b8",
                      bg: "rgba(148,163,184,0.15)",
                    };
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-4 font-bold text-slate-100">{item.name}</td>
                        <td className="p-4">
                          <span
                            className="px-2.5 py-0.5 rounded-full font-bold text-[11px] border"
                            style={{
                              color: fam.color,
                              backgroundColor: fam.bg,
                              borderColor: `${fam.color}40`,
                            }}
                          >
                            {fam.label}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-400">{item.code || "—"}</td>
                        <td className="p-4 max-w-xs truncate text-slate-400" title={item.description || ""}>
                          {item.description || "—"}
                        </td>
                        <td className="p-4">
                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-semibold">
                              <CheckCircle size={12} /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-800/60 text-rose-400 text-[11px] font-semibold">
                              <XCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/50 rounded-lg transition"
                                title="Edit Offering"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleToggleActive(item)}
                                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] border transition ${
                                  item.isActive
                                    ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-800/40"
                                    : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border-emerald-800/40"
                                }`}
                              >
                                {item.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Read Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* CREATE OFFERING MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Package className="text-indigo-400" size={20} />
              Add Service Offering
            </h2>

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Offering Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Custom Web Development, Holaa SaaS Plan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Service Family *</label>
                <select
                  value={createForm.family}
                  onChange={(e) => setCreateForm({ ...createForm, family: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEGA_SOFT">Mega Soft</option>
                  <option value="MEGA_WEB">Mega Web</option>
                  <option value="MEGA_APPS">Mega Apps</option>
                  <option value="FBP">FBP Managed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Code / Identifier (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. HOLAA_SAAS, MEGA_WEB_AMC"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Factual summary of deliverables and scope..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Offering"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OFFERING MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111420] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Edit2 className="text-indigo-400" size={20} />
              Edit Service Offering
            </h2>

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Offering Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Service Family *</label>
                <select
                  value={editForm.family}
                  onChange={(e) => setEditForm({ ...editForm, family: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="MEGA_SOFT">Mega Soft</option>
                  <option value="MEGA_WEB">Mega Web</option>
                  <option value="MEGA_APPS">Mega Apps</option>
                  <option value="FBP">FBP Managed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Code / Identifier (Optional)</label>
                <input
                  type="text"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="isActiveToggle" className="text-slate-300 font-semibold cursor-pointer">
                  Is Active Offering
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
