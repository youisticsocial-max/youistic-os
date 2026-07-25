"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Topbar from "@/components/layout/Topbar";
import { 
  Key, Globe, Server, Database, FileText, Cpu, ExternalLink, Plus, Search, 
  Eye, EyeOff, Copy, Trash2, Edit3, ShieldCheck, Sparkles, Check, X, Code2, Lock, Building, Users
} from "lucide-react";
import { getClientAssets, createClientAsset, updateClientAsset, deleteClientAsset } from "@/app/actions/assets";

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Toggle State: "CLIENT" vs "AGENCY"
  const [activeTab, setActiveTab] = useState<"CLIENT" | "AGENCY">("CLIENT");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Masked Passwords state tracking
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchAssets();
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

  const toggleShowPassword = (fieldId: string) => {
    setShowPasswords(prev => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
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
    const payload = {
      assetType: (formData.get("assetType") as string) || activeTab,
      clientName: formData.get("clientName") as string,
      businessName: formData.get("businessName") as string,
      projectDescription: formData.get("projectDescription") as string,
      domainName: formData.get("domainName") as string,
      domainRegistrar: formData.get("domainRegistrar") as string,
      domainPassword: formData.get("domainPassword") as string,
      hostingProvider: formData.get("hostingProvider") as string,
      hostingIp: formData.get("hostingIp") as string,
      hostingUser: formData.get("hostingUser") as string,
      hostingPassword: formData.get("hostingPassword") as string,
      databaseUri: formData.get("databaseUri") as string,
      apiKeys: formData.get("apiKeys") as string,
      prompts: formData.get("prompts") as string,
      figmaLink: formData.get("figmaLink") as string,
      githubRepo: formData.get("githubRepo") as string,
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
      fetchAssets();
    } catch (err) {
      console.error(err);
      alert("Failed to save asset");
    }
    setIsSubmitting(false);
  };

  const filteredAssets = assets.filter(a => {
    // Tab filter: CLIENT vs AGENCY
    const typeMatch = (a.assetType || "CLIENT") === activeTab;
    if (!typeMatch) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.clientName && a.clientName.toLowerCase().includes(q)) ||
      (a.businessName && a.businessName.toLowerCase().includes(q)) ||
      (a.domainName && a.domainName.toLowerCase().includes(q))
    );
  });

  const clientCount = assets.filter(a => (a.assetType || "CLIENT") === "CLIENT").length;
  const agencyCount = assets.filter(a => a.assetType === "AGENCY").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <Topbar title="Assets & Credentials Vault" subtitle="Master repository for Client Projects & Agency Internal Credentials" />

      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }} className="animate-in">
        
        {/* TOP ASSET TYPE TOGGLE SWITCH: CLIENTS vs US (AGENCY) */}
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
                border: activeTab === "CLIENT" ? "1px solid #6366f1" : "1px solid var(--bg-border)",
                background: activeTab === "CLIENT" ? "linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(79, 70, 229, 0.35))" : "var(--bg-input)",
                color: activeTab === "CLIENT" ? "#ffffff" : "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: activeTab === "CLIENT" ? "0 4px 14px rgba(99, 102, 241, 0.3)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              <Users size={16} color={activeTab === "CLIENT" ? "#818cf8" : "#64748b"} />
              👥 Clients Assets ({clientCount})
            </button>

            <button
              onClick={() => setActiveTab("AGENCY")}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                border: activeTab === "AGENCY" ? "1px solid #a855f7" : "1px solid var(--bg-border)",
                background: activeTab === "AGENCY" ? "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(147, 51, 234, 0.35))" : "var(--bg-input)",
                color: activeTab === "AGENCY" ? "#ffffff" : "var(--text-secondary)",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: activeTab === "AGENCY" ? "0 4px 14px rgba(168, 85, 247, 0.3)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              <Building size={16} color={activeTab === "AGENCY" ? "#c084fc" : "#64748b"} />
              🏢 Us / Agency Assets ({agencyCount})
            </button>
          </div>

          <span style={{ fontSize: "12px", color: activeTab === "CLIENT" ? "#818cf8" : "#c084fc", background: "rgba(255,255,255,0.03)", border: "1px solid var(--bg-border)", padding: "6px 14px", borderRadius: "20px", fontWeight: 600 }}>
            {activeTab === "CLIENT" ? "👥 Viewing Client Project Credentials & Vaults" : "🏢 Viewing Agency Internal Logins, AWS & Service Passwords"}
          </span>
        </div>

        {/* SEARCH & ADD ACTION BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "14px", padding: "14px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
            <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} size={16} />
            <input 
              type="text" 
              placeholder={`Search ${activeTab === "CLIENT" ? "client, business or domain" : "agency asset, internal service or tool"}...`} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: "100%", 
                backgroundColor: "var(--bg-input)", 
                border: "1px solid var(--bg-border)", 
                borderRadius: "10px", 
                padding: "10px 16px 10px 36px", 
                fontSize: "13px", 
                color: "var(--text-primary)", 
                outline: "none" 
              }} 
            />
          </div>
            {copiedKey && (
              <span style={{ fontSize: "12px", color: "#34d399", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", padding: "6px 14px", borderRadius: "8px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} /> Copied {copiedKey} to Clipboard!
              </span>
            )}

          <button
            onClick={() => {
              setEditingId(null);
              setSelectedAsset(null);
              setIsModalOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: activeTab === "CLIENT" ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" : "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", border: "none", borderRadius: "12px", fontSize: "14px", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
          >
            <Plus size={18} /> + Add {activeTab === "CLIENT" ? "Client Asset" : "Agency Asset"}
          </button>
        </div>

        {/* Assets Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {filteredAssets.length === 0 ? (
            <div className="card-youistic" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              No assets found for {activeTab === "CLIENT" ? "Clients" : "Agency Internal (Us)"}. Click <strong>+ Add Asset</strong> to save credentials!
            </div>
          ) : (
            filteredAssets.map((asset) => (
              <div 
                key={asset.id} 
                className="card-youistic" 
                style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", border: "1px solid var(--bg-border)", borderRadius: "16px", background: "var(--bg-card)" }}
              >
                {/* Asset Title Bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--bg-border)", paddingBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: 1, minWidth: "200px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: activeTab === "CLIENT" ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" : "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(168,85,247,0.3)", flexShrink: 0 }}>
                      <ShieldCheck size={24} color="white" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
                          {asset.businessName || asset.clientName}
                        </h3>
                        <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "12px", background: asset.assetType === "AGENCY" ? "rgba(168,85,247,0.2)" : "rgba(99,102,241,0.2)", color: asset.assetType === "AGENCY" ? "#c084fc" : "#6366f1", border: `1px solid ${asset.assetType === "AGENCY" ? "rgba(168,85,247,0.3)" : "rgba(99,102,241,0.3)"}` }}>
                          {asset.assetType === "AGENCY" ? "🏢 Agency Internal" : "👥 Client Vault"}
                        </span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "3px 0 0", fontWeight: 600 }}>
                        {asset.assetType === "AGENCY" ? "Internal Account Owner:" : "Client Owner:"} <strong>{asset.clientName}</strong> · Domain/Service: <span style={{ color: "#0284c7" }}>{asset.domainName || "N/A"}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingId(asset.id);
                        setSelectedAsset(asset);
                        setIsModalOpen(true);
                      }}
                      style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", color: "var(--text-primary)", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Edit3 size={14} /> Edit Vault
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Master Description */}
                {asset.projectDescription && (
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "14px 18px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FileText size={14} color="#6366f1" /> {asset.assetType === "AGENCY" ? "Agency Infrastructure & Service Description:" : "Master Project Description & Architecture Scope:"}
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: 0, lineHeight: "1.5" }}>
                      {asset.projectDescription}
                    </p>
                  </div>
                )}

                {/* Credentials Grid: Domain, Hosting, DB */}
                <div className="assets-credentials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                  
                  {/* Domain / Service Login Vault */}
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Globe size={16} /> {asset.assetType === "AGENCY" ? "Account & Registrar Login" : "Domain Credentials"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      <strong>Service/Registrar:</strong> {asset.domainRegistrar || "N/A"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      <strong>Domain/URL:</strong> {asset.domainName || "N/A"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-primary)" }}>
                        {showPasswords[`domain_${asset.id}`] ? asset.domainPassword || "Not Set" : "••••••••••••"}
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => toggleShowPassword(`domain_${asset.id}`)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                          {showPasswords[`domain_${asset.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {asset.domainPassword && (
                          <button onClick={() => copyToClipboard(asset.domainPassword, "Account Password")} style={{ background: "transparent", border: "none", color: "#6366f1", cursor: "pointer" }}>
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hosting & Server Vault */}
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Server size={16} /> Hosting & Server Vault
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      <strong>Provider / IP:</strong> {asset.hostingProvider || "N/A"} {asset.hostingIp ? `(${asset.hostingIp})` : ""}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      <strong>User / SSH:</strong> <code style={{ color: "#6366f1", fontWeight: 600 }}>{asset.hostingUser || "root"}</code>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--bg-border)" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-primary)" }}>
                        {showPasswords[`hosting_${asset.id}`] ? asset.hostingPassword || "Not Set" : "••••••••••••"}
                      </span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => toggleShowPassword(`hosting_${asset.id}`)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                          {showPasswords[`hosting_${asset.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {asset.hostingPassword && (
                          <button onClick={() => copyToClipboard(asset.hostingPassword, "Hosting Password")} style={{ background: "transparent", border: "none", color: "#6366f1", cursor: "pointer" }}>
                            <Copy size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Database & API Vault */}
                  <div style={{ background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#9333ea", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Database size={16} /> Database & API Keys
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>DB Connection:</strong> {asset.databaseUri || "N/A"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <strong>API Credentials:</strong> {asset.apiKeys || "N/A"}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {asset.databaseUri && (
                        <button onClick={() => copyToClipboard(asset.databaseUri, "DB URI")} style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#9333ea", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Copy size={12} /> Copy DB Connection URI
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prompts & AI Specs Box */}
                {asset.prompts && (
                  <div style={{ background: "rgba(99, 102, 241, 0.12)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "12px", padding: "14px 18px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={14} color="#4f46e5" /> {asset.assetType === "AGENCY" ? "Agency AI System Instructions & Master Prompts:" : "Dedicated Client AI Prompts & System Instructions:"}
                    </div>
                    <pre style={{ fontSize: "12px", color: "var(--text-primary)", margin: 0, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                      {asset.prompts}
                    </pre>
                  </div>
                )}

                {/* External Drive & Repo Links Footer */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px" }}>
                  {asset.figmaLink && (
                    <a href={asset.figmaLink} target="_blank" rel="noreferrer" style={{ color: "#0284c7", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <ExternalLink size={13} /> Figma Design File
                    </a>
                  )}
                  {asset.githubRepo && (
                    <a href={asset.githubRepo} target="_blank" rel="noreferrer" style={{ color: "#059669", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <Code2 size={13} /> GitHub Source Code Repo
                    </a>
                  )}
                  {asset.notes && (
                    <span style={{ color: "var(--text-secondary)" }}>
                      <strong>Note:</strong> {asset.notes}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Asset Modal - Portaled to document.body */}
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
                maxWidth: "760px", 
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
              <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--bg-border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "var(--bg-card)" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px", fontFamily: "'Space Grotesk', sans-serif" }}>
                  <ShieldCheck size={22} color="#818cf8" /> {editingId ? "Edit Asset Vault" : "Add New Asset & Credentials Vault"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}>
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Form Content */}
              <form onSubmit={handleFormSubmit} style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
                
                {/* SECTION 1: General Info */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Building size={14} /> General Information & Category
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 600 }}>Asset Category *</label>
                    <select name="assetType" defaultValue={selectedAsset?.assetType || activeTab} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}>
                      <option value="CLIENT">👥 Client Project Asset (Client Credentials & Vault)</option>
                      <option value="AGENCY">🏢 Us / Agency Internal Asset (Internal Logins, AWS, Tools)</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Owner / Client Name *</label>
                      <input required name="clientName" defaultValue={selectedAsset?.clientName || (activeTab === "AGENCY" ? "Youistic Agency (Internal)" : "")} placeholder="e.g. Hamran or Youistic Internal" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Business Name / Service Title</label>
                      <input name="businessName" defaultValue={selectedAsset?.businessName || ""} placeholder="e.g. BHFG Luxury App or AWS Master" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Master Description & Scope</label>
                    <textarea name="projectDescription" rows={3} defaultValue={selectedAsset?.projectDescription || ""} placeholder="Describe full project architecture, features, tech stack..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", resize: "vertical" }} />
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--bg-border)", margin: "4px 0" }} />

                {/* SECTION 2: Domain & Hosting Credentials */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Globe size={14} /> Domain & Registrar Vault
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Domain / URL</label>
                      <input name="domainName" defaultValue={selectedAsset?.domainName || ""} placeholder="e.g. bhfg.com" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Registrar / Service Login</label>
                      <input name="domainRegistrar" defaultValue={selectedAsset?.domainRegistrar || ""} placeholder="GoDaddy / Cloudflare" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Account Password</label>
                      <input name="domainPassword" defaultValue={selectedAsset?.domainPassword || ""} placeholder="Account password" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Server size={14} /> Hosting & Cloud Infrastructure
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Hosting Provider</label>
                      <input name="hostingProvider" defaultValue={selectedAsset?.hostingProvider || ""} placeholder="AWS / Vercel / DigitalOcean" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Server IP / SSH User</label>
                      <input name="hostingIp" defaultValue={selectedAsset?.hostingIp || ""} placeholder="13.232.110.45 (ubuntu)" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Hosting Pass / SSH Key</label>
                      <input name="hostingPassword" defaultValue={selectedAsset?.hostingPassword || ""} placeholder="SSH / Hosting pass" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                    </div>
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--bg-border)", margin: "4px 0" }} />

                {/* SECTION 3: DB & AI System Instructions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Database size={14} /> Database URI & AI Instructions
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Database Connection URI</label>
                    <input name="databaseUri" defaultValue={selectedAsset?.databaseUri || ""} placeholder="postgresql://user:pass@host:5432/dbname" style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", fontFamily: "monospace" }} />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Prompts & AI Agent System Instructions</label>
                    <textarea name="prompts" rows={3} defaultValue={selectedAsset?.prompts || ""} placeholder="System Prompt instructions, AI agent guidelines..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", resize: "vertical", fontFamily: "monospace" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>Figma Link</label>
                      <input name="figmaLink" defaultValue={selectedAsset?.figmaLink || ""} placeholder="https://figma.com/file/..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", fontWeight: 600 }}>GitHub Repo URL</label>
                      <input name="githubRepo" defaultValue={selectedAsset?.githubRepo || ""} placeholder="https://github.com/youistic/..." style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                    </div>
                  </div>
                </div>

                {/* Sticky Pinned Modal Footer */}
                <div style={{ position: "sticky", bottom: 0, background: "var(--bg-card)", marginTop: "12px", borderTop: "1px solid var(--bg-border)", paddingTop: "14px", display: "flex", justifyContent: "flex-end", gap: "12px", zIndex: 10 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "10px 18px", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "10px", color: "var(--text-primary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: "10px 22px", background: activeTab === "CLIENT" ? "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" : "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)", border: "none", borderRadius: "10px", color: "white", fontWeight: 700, cursor: "pointer" }}>
                    {isSubmitting ? "Saving Vault..." : "Save Asset Vault"}
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
