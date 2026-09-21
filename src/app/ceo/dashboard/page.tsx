"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Sidebar from "@/components/layout/Sidebar";
import ClientOnly from "@/components/ClientOnly";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Briefcase,
  Crown,
  Lock,
  ChevronRight,
  Calendar
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { verifyAndLogin } from "@/app/actions/auth";

import { getClients } from "@/app/actions/clients";
import { getFinanceSummary } from "@/app/actions/finance";
import { getTeamMembers } from "@/app/actions/team";
import { getLeads } from "@/app/actions/leads";
import { getMeetings } from "@/app/actions/meetings";

export default function CEODashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeClientsCount, setActiveClientsCount] = useState(0);
  const [monthlyRevenueVal, setMonthlyRevenueVal] = useState(0);
  const [avgClosingRatio, setAvgClosingRatio] = useState(0);
  const [pipelineDealsCount, setPipelineDealsCount] = useState(0);

  const [liveActivities, setLiveActivities] = useState<any[]>([]);
  const DEFAULT_BDE_CHART = [
    { name: "Suhani", closed: 0, leads: 0 },
    { name: "Kajal", closed: 0, leads: 0 },
    { name: "Kiyam", closed: 0, leads: 0 },
    { name: "CEO", closed: 0, leads: 0 },
  ];

  const DEFAULT_REVENUE_CHART = [
    { month: "Jan", FBP: 0, Tech: 0 },
    { month: "Feb", FBP: 0, Tech: 0 },
    { month: "Mar", FBP: 0, Tech: 0 },
    { month: "Apr", FBP: 0, Tech: 0 },
    { month: "May", FBP: 0, Tech: 0 },
    { month: "Jun", FBP: 0, Tech: 0 },
  ];

  const DEFAULT_GROWTH_CHART = [
    { month: "Jan", clients: 0 },
    { month: "Feb", clients: 0 },
    { month: "Mar", clients: 0 },
    { month: "Apr", clients: 0 },
    { month: "May", clients: 0 },
    { month: "Jun", clients: 0 },
  ];

  const [bdeChartData, setBdeChartData] = useState<any[]>(DEFAULT_BDE_CHART);
  const [serviceChartData, setServiceChartData] = useState<any[]>([
    { name: "FBP", value: 0, color: "#6c5ce7" },
    { name: "Tech", value: 0, color: "#00cec9" },
    { name: "Hybrid", value: 0, color: "#fdcb6e" },
  ]);
  const [clientStatusChartData, setClientStatusChartData] = useState<any[]>([
    { name: "Active", value: 0, color: "#00b894" },
    { name: "Onboarding", value: 0, color: "#0984e3" },
    { name: "Renewal Due", value: 0, color: "#fdcb6e" },
    { name: "Churned", value: 0, color: "#d63031" },
  ]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>(DEFAULT_REVENUE_CHART);
  const [growthChartData, setGrowthChartData] = useState<any[]>(DEFAULT_GROWTH_CHART);
  const [ceoMeetings, setCeoMeetings] = useState<any[]>([]);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )user_role=([^;]*)/);
    if (match && match[1].toUpperCase() === "CEO") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    async function loadCEOMetrics() {
      // Fetch all data sources in PARALLEL instead of sequential
      const [dbClients, finance, team, leads, dbMeetings] = await Promise.all([
        getClients(),
        getFinanceSummary(),
        getTeamMembers(),
        getLeads(),
        getMeetings(),
      ]);

      if (dbMeetings) {
        setCeoMeetings(dbMeetings);
      }

      if (leads) {
        setPipelineDealsCount(leads.length);
      }

      if (team && team.length > 0) {
        setBdeChartData(
          team.map((m: any) => ({
            name: m.name.split(" ")[0],
            closed: m.dealsClosedCount || 0,
            leads: m.leadsGenerated || 0,
            ratio: m.closingRatio || 0,
            revenue: m.revenueGenerated || 0,
          }))
        );

        const totalRatio = team.reduce((sum: number, m: any) => sum + (m.closingRatio || 0), 0);
        setAvgClosingRatio(Math.round((totalRatio / team.length) * 10) / 10);
      }

      if (dbClients) {
        setActiveClientsCount(dbClients.filter((c: any) => c.status === "ACTIVE").length);

        const newDealsActivity = dbClients.map((c: any) => ({
          title: `Client Onboarded: ${c.companyName}`,
          desc: `${c.contactPerson} • ${c.serviceType} Plan`,
          badge: c.status,
          badgeColor: c.status === "ACTIVE" ? "#00b894" : c.status === "ONBOARDING" ? "#0984e3" : "#fdcb6e",
          time: new Date(c.createdAt || Date.now()).toLocaleDateString("en-IN"),
        }));

        setLiveActivities(newDealsActivity);

        const total = dbClients.length;
        if (total > 0) {
          const fbpCount = dbClients.filter((c: any) => c.serviceType === "FBP").length;
          const techCount = dbClients.filter((c: any) => c.serviceType === "TECH").length;
          const hybridCount = dbClients.filter((c: any) => c.serviceType === "HYBRID").length;

          setServiceChartData([
            { name: "FBP", value: Math.round((fbpCount / total) * 100), color: "#6c5ce7" },
            { name: "Tech", value: Math.round((techCount / total) * 100), color: "#00cec9" },
            { name: "Hybrid", value: Math.round((hybridCount / total) * 100), color: "#fdcb6e" },
          ]);
        }

        const activeC = dbClients.filter((c: any) => c.status === "ACTIVE").length;
        const onboardingC = dbClients.filter((c: any) => c.status === "ONBOARDING").length;
        const renewalC = dbClients.filter((c: any) => c.status === "RENEWAL_DUE").length;
        const churnedC = dbClients.filter((c: any) => c.status === "CHURNED").length;

        setClientStatusChartData([
          { name: "Active", value: activeC, color: "#00b894" },
          { name: "Onboarding", value: onboardingC, color: "#0984e3" },
          { name: "Renewal Due", value: renewalC, color: "#fdcb6e" },
          { name: "Churned", value: churnedC, color: "#d63031" },
        ]);
      }

      if (finance && finance.revenueEntries) {
        const now = new Date();
        const curMonth = now.getMonth();
        const curYear = now.getFullYear();
        const currentMonthRev = finance.revenueEntries
          .filter((r: any) => {
            if (r.paymentStatus && r.paymentStatus !== "PAID") return false;
            const pDate = new Date(r.paymentDate);
            return pDate.getMonth() === curMonth && pDate.getFullYear() === curYear;
          })
          .reduce((sum: number, r: any) => sum + r.amount, 0);
        setMonthlyRevenueVal(currentMonthRev);
      }
    }
    loadCEOMetrics();
  }, []);

  const handleCEOLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoggingIn(true);

    try {
      const res = await verifyAndLogin("CEO", password);
      if (res.success) {
        setIsAuthenticated(true);
      } else {
        setErrorMsg(res.error || "Invalid CEO Master Password.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Invalid CEO Master Password.");
    }
    setIsLoggingIn(false);
  };

  // If NOT authenticated, render the Password Login Portal
  if (!isAuthenticated) {
    return (
      <div data-ceo-login="true" style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #0f0c29 0%, #1a1440 30%, #120e28 60%, #0a0b10 100%)",
        color: "white",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient background glow effects */}
        <div style={{
          position: "absolute",
          top: "-120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-80px",
          right: "-60px",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Main login card */}
        <div data-ceo-login="true" style={{
          width: "100%",
          maxWidth: "460px",
          padding: "48px 36px 40px",
          background: "rgba(22,18,52,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.08)",
        }}>
          
          {/* Icon + Title */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "36px" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 28px rgba(168,85,247,0.5), 0 0 0 4px rgba(139,92,246,0.15)",
                marginBottom: "20px",
              }}
            >
              <Crown size={30} color="white" />
            </div>
            <h1 style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              marginBottom: "8px",
              textAlign: "center",
              lineHeight: 1.2,
              textShadow: "0 1px 8px rgba(168,85,247,0.25)",
            }}>
              CEO Executive Portal
            </h1>
            <p style={{
              color: "#d1d5db",
              fontSize: "14px",
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "320px",
            }}>
              Enter CEO Master Password to unlock the Sales &amp; MIS Dashboard
            </p>
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "12px 16px",
              color: "#fca5a5",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleCEOLogin} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div>
              <label style={{
                display: "block",
                fontSize: "11px",
                color: "#c4b5fd",
                marginBottom: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                CEO Master Password *
              </label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#a78bfa" }} size={18} />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter CEO Password"
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(15,12,42,0.7)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: "12px",
                    padding: "14px 18px 14px 46px",
                    fontSize: "15px",
                    color: "#f1f5f9",
                    outline: "none",
                    fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(168,85,247,0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(139,92,246,0.25)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              style={{ 
                width: "100%", 
                padding: "15px", 
                background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6366f1 100%)", 
                color: "white", 
                border: "none", 
                borderRadius: "12px", 
                fontWeight: 700, 
                fontSize: "15px",
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 6px 20px rgba(168,85,247,0.4), 0 2px 8px rgba(99,102,241,0.3)",
                opacity: isLoggingIn ? 0.7 : 1,
                transition: "opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease",
                letterSpacing: "0.02em",
                fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
              }}
              onMouseEnter={(e) => {
                if (!isLoggingIn) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(168,85,247,0.5), 0 4px 12px rgba(99,102,241,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(168,85,247,0.4), 0 2px 8px rgba(99,102,241,0.3)";
              }}
            >
              {isLoggingIn ? "Authenticating CEO Access..." : "Access Executive Suite"}
              {!isLoggingIn && <ChevronRight size={18} />}
            </button>
          </form>

          {/* Footer branding */}
          <div style={{
            marginTop: "32px",
            paddingTop: "20px",
            borderTop: "1px solid rgba(139,92,246,0.1)",
            textAlign: "center",
          }}>
            <p style={{
              color: "#9ca3af",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}>
              Youistic Private Ltd · Executive Access Only
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RENDER FULL CEO SALES & MIS DASHBOARD WITH LEFT SIDEBAR
  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%" }}>
      {/* Left Sidebar for CEO */}
      <Sidebar role="CEO" />

      {/* Main Content Area */}
      <div
        className="dashboard-main-container"
        style={{
          marginLeft: "240px",
          width: "calc(100% - 240px)",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          background: "var(--bg-primary)",
          position: "relative",
          transition: "background 0.3s ease",
        }}
      >
        <Topbar
          title="Sales & MIS Dashboard"
          subtitle="Last updated: Thursday, 23 July 2026"
        />
        
        <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "28px" }} className="animate-in">
          
          {/* KPI CARDS GRID */}
          <div className="ceo-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            
            {/* Card 1: Total Clients */}
            <div className="card-youistic" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(108,92,231,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={18} color="#6c5ce7" />
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: 600, color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "2px 6px", borderRadius: "20px" }}>
                  <ArrowUpRight size={13} /> Live
                </span>
              </div>
              <div style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{activeClientsCount}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Total Active Clients</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>active client accounts</div>
            </div>

            {/* Card 2: Monthly Revenue */}
            <div className="card-youistic" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,206,201,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign size={18} color="#00cec9" />
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: 600, color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "2px 6px", borderRadius: "20px" }}>
                  <ArrowUpRight size={13} /> Live
                </span>
              </div>
              <div style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>₹{monthlyRevenueVal.toLocaleString("en-IN")}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Current Month Revenue</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>realized cash collected</div>
            </div>

            {/* Card 3: Avg Closing Ratio */}
            <div className="card-youistic" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(253,203,110,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={18} color="#fdcb6e" />
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: 600, color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "2px 6px", borderRadius: "20px" }}>
                  <ArrowUpRight size={13} /> Live
                </span>
              </div>
              <div style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{avgClosingRatio}%</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Avg Closing Ratio</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>across active team</div>
            </div>

            {/* Card 4: Deals in Pipeline */}
            <div className="card-youistic" style={{ padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(9,132,227,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Briefcase size={18} color="#0984e3" />
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "11px", fontWeight: 600, color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "2px 6px", borderRadius: "20px" }}>
                  <ArrowUpRight size={13} /> Live
                </span>
              </div>
              <div style={{ fontSize: "clamp(20px, 4vw, 26px)", fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>{pipelineDealsCount}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>Deals in Pipeline</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>active opportunities</div>
            </div>
          </div>

          {/* CHARTS ROW 1 */}
          <div className="ceo-charts-row-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
            
            {/* Area Chart: Revenue Trend */}
            <div className="card-youistic" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Revenue Overview</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>FBP vs Tech — Monthly breakdown</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#00b894", background: "rgba(0,184,148,0.1)", padding: "4px 10px", borderRadius: "20px", fontWeight: 600 }}>
                  <Activity size={14} /> Live
                </div>
              </div>

              <ClientOnly fallback={<div style={{ height: 260 }} />}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fbpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="techGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00cec9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00cec9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip
                      formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, '']}
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }}
                    />
                    <Area type="monotone" dataKey="FBP" stroke="#6c5ce7" strokeWidth={2} fill="url(#fbpGrad)" isAnimationActive={false} />
                    <Area type="monotone" dataKey="Tech" stroke="#00cec9" strokeWidth={2} fill="url(#techGrad)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            {/* Pie Chart: Service Split */}
            <div className="card-youistic" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>Revenue Split</h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 16px" }}>By service type</p>

              <ClientOnly fallback={<div style={{ height: 180 }} />}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    {serviceChartData.reduce((sum: number, item: any) => sum + item.value, 0) > 0 ? (
                      <Pie data={serviceChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={4} isAnimationActive={false}>
                        {serviceChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    ) : (
                      <Pie data={[{ name: "No Active Revenue", value: 1, color: "rgba(148, 163, 184, 0.2)" }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" isAnimationActive={false}>
                        <Cell fill="rgba(148, 163, 184, 0.2)" />
                      </Pie>
                    )}
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </ClientOnly>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                {serviceChartData.map((s: any) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                      <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CHARTS ROW 2 */}
          <div className="ceo-charts-row-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
            
            {/* BDE Performance Bar Chart */}
            <div className="card-youistic" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>BDE Performance</h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 20px" }}>Deals closed vs assigned leads</p>
              <ClientOnly fallback={<div style={{ height: 220 }} />}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bdeChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }} />
                    <Bar dataKey="closed" fill="#6c5ce7" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="leads" fill="#00cec9" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            {/* Client Growth Area Chart */}
            <div className="card-youistic" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>Client Growth</h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 20px" }}>Total active clients over time</p>
              <ClientOnly fallback={<div style={{ height: 220 }} />}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growthChartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }} />
                    <Area type="monotone" dataKey="clients" stroke="#00b894" strokeWidth={2} fill="rgba(0,184,148,0.15)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>

            {/* Client Status Pie Chart */}
            <div className="card-youistic" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 4px" }}>Client Status</h3>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "0 0 16px" }}>Current account health</p>
              <ClientOnly fallback={<div style={{ height: 160 }} />}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    {clientStatusChartData.reduce((sum: number, item: any) => sum + item.value, 0) > 0 ? (
                      <Pie data={clientStatusChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3} isAnimationActive={false}>
                        {clientStatusChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    ) : (
                      <Pie data={[{ name: "No Active Clients", value: 1, color: "rgba(148, 163, 184, 0.2)" }]} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" isAnimationActive={false}>
                        <Cell fill="rgba(148, 163, 184, 0.2)" />
                      </Pie>
                    )}
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", boxShadow: "var(--shadow-card)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </ClientOnly>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginTop: "8px" }}>
                {clientStatusChartData.map((s: any) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SCHEDULED MEETINGS & APPOINTMENTS CARD */}
          <div className="card-youistic" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  📅 Scheduled CEO & BDE Appointments ({ceoMeetings.length})
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>Live meeting calendar & appointments booked by SDRs</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {ceoMeetings.length > 0 ? (
                ceoMeetings.map((m: any) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg-input)", borderRadius: "12px", border: "1px solid var(--bg-border)", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #4338ca)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "14px" }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>{m.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                          Host: <strong style={{ color: "#818cf8" }}>{m.host?.name || "CEO"}</strong> ({m.host?.role || "ADMIN"}) {m.notes ? `• ${m.notes}` : ""}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#34d399", background: "rgba(16,185,129,0.15)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.3)" }}>
                        {new Date(m.meetingDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "rgba(99,102,241,0.15)", color: "#818cf8", padding: "4px 8px", borderRadius: "6px" }}>
                        {m.status || "SCHEDULED"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "24px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No upcoming appointments scheduled yet.
                </div>
              )}
            </div>
          </div>

          {/* RECENT SYSTEM ACTIVITY FEED */}
          <div className="card-youistic" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 16px" }}>Recent Activity Feed</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {liveActivities.length > 0 ? (
                liveActivities.map((item: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-input)", borderRadius: "10px", border: "1px solid var(--bg-border)" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>{item.desc}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: item.badgeColor, background: `${item.badgeColor}18`, padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                        {item.badge}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{item.time}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
