"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Topbar from "@/components/layout/Topbar";
import { 
  Globe, Server, Database, FileText, Cpu, ExternalLink, Plus, Search, 
  Trash2, Edit3, ShieldCheck, Sparkles, Check, X, Code2, Lock, Building, Users
} from "lucide-react";
import { getClientAssets, createClientAsset, updateClientAsset, deleteClientAsset } from "@/app/actions/assets";
import { getClients } from "@/app/actions/clients";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Toggle State: "CLIENT" vs "AGENCY"
  const [activeTab, setActiveTab] = useState<"CLIENT" | "AGENCY">("CLIENT");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAssets();
    fetchClients();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const data = await getClientAssets();
      setAssets(data || []);
    } catch (err) {
      console.error(err);
      setAssets([]);
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    try {
      const data = await getClients();
      setClients(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this asset vault entry?")) {
      try {
        await deleteClientAsset(id);
        fetchAssets();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const selectedClientId = formData.get("clientId") as string;
    const matchedClient = clients.find(c => c.id === selectedClientId);

    const payload = {
      assetType: (formData.get("assetType") as string) || activeTab,
      name: formData.get("name") as string,
      clientId: selectedClientId || undefined,
      clientName: (formData.get("clientName") as string) || (matchedClient ? matchedClient.companyName : ""),
      businessName: formData.get("businessName") as string,
      projectDescription: formData.get("projectDescription") as string,
      domainName: formData.get("domainName") as string,
      domainRegistrar: formData.get("domainRegistrar") as string,
      hostingProvider: formData.get("hostingProvider") as string,
      hostingIp: formData.get("hostingIp") as string,
      hostingUser: formData.get("hostingUser") as string,
      figmaLink: formData.get("figmaLink") as string,
      githubRepo: formData.get("githubRepo") as string,
      prompts: formData.get("prompts") as string,
      vaultRef: formData.get("vaultRef") as string,
      notes: formData.get("notes") as string,
    };

    try {
      if (editingId) {
        await updateClientAsset(editingId, payload);
      } else {
        await createClientAsset(payload);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setSelectedAsset(null);
      fetchAssets();
    } catch (err) {
      console.error(err);
      alert("Failed to save asset metadata");
    }
    setIsSubmitting(false);
  };

  const filteredAssets = assets.filter(a => {
    const typeMatch = (a.assetType || "CLIENT") === activeTab;
    if (!typeMatch) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.clientName && a.clientName.toLowerCase().includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.domainName && a.domainName.toLowerCase().includes(q))
    );
  });

  const clientCount = assets.filter(a => (a.assetType || "CLIENT") === "CLIENT").length;
  const agencyCount = assets.filter(a => a.assetType === "AGENCY").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="Assets & Vault Metadata" subtitle="Safe relational metadata and Bitwarden Vault references for Client & Agency Assets" />

      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }} className="animate-in">
        
        {/* TOP TOGGLE */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            background: "var(--bg-card)", 
            border: "1px solid var(--bg-border)", 
            borderRadius: "14px", 
            padding: "12px 18px", 
            gap: "16px",
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setActiveTab("CLIENT")}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: activeTab === "CLIENT" ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" : "transparent",
                color: activeTab === "CLIENT" ? "#ffffff" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Users size={16} /> Client Assets ({clientCount})
            </button>

            <button
              onClick={() => setActiveTab("AGENCY")}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: activeTab === "AGENCY" ? "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)" : "transparent",
                color: activeTab === "AGENCY" ? "#ffffff" : "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
            >
              <Building size={16} /> Agency Internal ({agencyCount})
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder={`Search ${activeTab === "CLIENT" ? "client or domain" : "agency tool"}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "10px",
                  padding: "8px 12px 8px 36px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  outline: "none"
                }}
              />
            </div>

            <button
              onClick={() => {
                setEditingId(null);
                setSelectedAsset(null);
                setIsModalOpen(true);
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Plus size={16} /> Add Asset Record
            </button>
          </div>
        </div>

        {/* ASSET LIST GRID */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)", fontSize: "14px" }}>
              Loading safe asset metadata...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ padding: "50px", textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "16px", color: "var(--text-secondary)", fontSize: "14px" }}>
              No asset records found. Click <strong>+ Add Asset Record</strong> to create asset metadata.
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="card-youistic"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px"
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: asset.assetType === "AGENCY" ? "rgba(168,85,247,0.15)" : "rgba(99,102,241,0.15)", border: `1px solid ${asset.assetType === "AGENCY" ? "rgba(168,85,247,0.3)" : "rgba(99,102,241,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: asset.assetType === "AGENCY" ? "#c084fc" : "#818cf8" }}>
                      {asset.assetType === "AGENCY" ? <Building size={20} /> : <Globe size={20} />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <h4 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                          {asset.name || asset.businessName || asset.clientName}
                        </h4>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: asset.assetType === "AGENCY" ? "rgba(168,85,247,0.2)" : "rgba(99,102,241,0.2)", color: asset.assetType === "AGENCY" ? "#c084fc" : "#6366f1", border: `1px solid ${asset.assetType === "AGENCY" ? "rgba(168,85,247,0.3)" : "rgba(99,102,241,0.3)"}` }}>
                          {asset.assetType === "AGENCY" ? "🏢 Agency Internal" : "👥 Client Asset"}
                        </span>
                        {asset.vaultRef ? (
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Lock size={10} /> Vault Ref Configured
                          </span>
                        ) : (
                          <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "12px", background: "rgba(148,163,184,0.1)", color: "#94a3b8" }}>
                            No Vault Ref
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        {asset.client?.companyName ? (
                          <>Linked Client: <strong style={{ color: "#818cf8" }}>{asset.client.companyName}</strong></>
                        ) : (
                          <>Owner: <strong>{asset.clientName || "N/A"}</strong></>
                        )}
                        {" · Domain: "}
                        <span style={{ color: "#0284c7" }}>{asset.domainName || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => {
                        setEditingId(asset.id);
                        setSelectedAsset(asset);
                        setIsModalOpen(true);
                      }}
                      style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <Edit3 size={14} /> Edit Metadata
                    </button>

                    <button
                      onClick={() => handleDelete(asset.id)}
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Hosting & Infrastructure:</strong>
                    <div style={{ marginTop: "4px" }}>Provider: {asset.hostingProvider || "N/A"}</div>
                    <div>IP/Server: {asset.hostingIp || "N/A"}</div>
                    <div>Safe Account ID: {asset.hostingUser || "N/A"}</div>
                  </div>

                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", padding: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Bitwarden Vault Reference:</strong>
                    <div style={{ marginTop: "4px", fontFamily: "monospace", color: "#818cf8" }}>
                      {asset.vaultRef ? asset.vaultRef : "No Bitwarden Item ID configured"}
                    </div>
                  </div>
                </div>

                {/* Links Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
                  {asset.figmaLink && (
                    <a href={asset.figmaLink} target="_blank" rel="noreferrer" style={{ color: "#0284c7", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <ExternalLink size={13} /> Figma Design File
                    </a>
                  )}
                  {asset.githubRepo && (
                    <a href={asset.githubRepo} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <Code2 size={13} /> GitHub Repository
                    </a>
                  )}
                  {asset.notes && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      <strong>Architecture Notes:</strong> {asset.notes}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {isModalOpen && mounted && createPortal(
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
                maxWidth: "720px", 
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
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--bg-card)" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShieldCheck size={22} color="#818cf8" /> {editingId ? "Edit Safe Asset Metadata" : "Add Asset Record & Vault Reference"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
                
                {/* Security Warning Box */}
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#fca5a5", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Lock size={16} className="flex-shrink-0 text-red-400" />
                  <div>
                    <strong>Bitwarden Vault Policy:</strong> Do not enter plaintext passwords, API secret keys, SSH private keys or DB passwords here. Store credentials securely in Bitwarden and paste the Vault Reference ID below.
                  </div>
                </div>

                {/* Section 1 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Asset Category *</label>
                    <select name="assetType" defaultValue={selectedAsset?.assetType || activeTab} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}>
                      <option value="CLIENT">👥 Client Project Asset</option>
                      <option value="AGENCY">🏢 Us / Agency Internal Asset</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Link Relational Client Account</label>
                    <select name="clientId" defaultValue={selectedAsset?.clientId || ""} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}>
                      <option value="">-- No Linked Client / Agency Internal --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName} ({c.contactPerson})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Asset Name / Title *</label>
                    <input required name="name" defaultValue={selectedAsset?.name || selectedAsset?.businessName || ""} placeholder="e.g. Production Domain & Server" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Owner / Client Display Name</label>
                    <input name="clientName" defaultValue={selectedAsset?.clientName || ""} placeholder="e.g. Sohail or Youistic Internal" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                {/* Vault Reference Input */}
                <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "12px", padding: "14px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#818cf8", marginBottom: "4px", fontWeight: 700 }}>Bitwarden / Vault Reference ID</label>
                  <input name="vaultRef" defaultValue={selectedAsset?.vaultRef || ""} placeholder="e.g. bw-item-98a72b-lawyours-production" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Reference pointer to the secret item stored securely in Bitwarden vault.
                  </div>
                </div>

                {/* Safe Technical Metadata */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Domain Name</label>
                    <input name="domainName" defaultValue={selectedAsset?.domainName || ""} placeholder="e.g. lawyours.in" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Hosting Provider</label>
                    <input name="hostingProvider" defaultValue={selectedAsset?.hostingProvider || ""} placeholder="Vercel / AWS" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Safe Username / Account ID</label>
                    <input name="hostingUser" defaultValue={selectedAsset?.hostingUser || ""} placeholder="admin@lawyours.in" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Figma Design URL</label>
                    <input name="figmaLink" defaultValue={selectedAsset?.figmaLink || ""} placeholder="https://figma.com/..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>GitHub Repository URL</label>
                    <input name="githubRepo" defaultValue={selectedAsset?.githubRepo || ""} placeholder="https://github.com/youistic/..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Architecture Notes (Non-Secret Metadata Only)</label>
                  <textarea name="notes" rows={3} defaultValue={selectedAsset?.notes || ""} placeholder="Safe operational & architecture notes only..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", resize: "vertical" }} />
                </div>

                <div style={{ position: "sticky", bottom: 0, background: "var(--bg-card)", marginTop: "8px", borderTop: "1px solid var(--bg-border)", paddingTop: "14px", display: "flex", justifyContent: "flex-end", gap: "12px", zIndex: 10 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 18px", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: "10px 22px", background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer" }}>
                    {isSubmitting ? "Saving Metadata..." : "Save Asset Metadata"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </main>
    </div>
  );
}
