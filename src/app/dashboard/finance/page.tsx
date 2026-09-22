"use client";

import { useState, useEffect } from "react";
import ClientOnly from "@/components/ClientOnly";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, TrendingDown, TrendingUp, Percent, Plus, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency } from "@/lib/utils";
import { getFinanceSummary, createExpense, createRevenue, updateRevenueStatus } from "@/app/actions/finance";
import { getClients, createClient } from "@/app/actions/clients";

const monthlyData = [
  { month: "Feb", revenue: 0, expenses: 0, profit: 0 },
  { month: "Mar", revenue: 0, expenses: 0, profit: 0 },
  { month: "Apr", revenue: 0, expenses: 0, profit: 0 },
  { month: "May", revenue: 0, expenses: 0, profit: 0 },
  { month: "Jun", revenue: 0, expenses: 0, profit: 0 },
  { month: "Jul", revenue: 0, expenses: 0, profit: 0 },
];

const expenseBreakdown = [
  { category: "Salaries", amount: 0, color: "#6c5ce7", percent: 0 },
  { category: "Ad Spends", amount: 0, color: "#e17055", percent: 0 },
  { category: "Server EMI", amount: 0, color: "#00cec9", percent: 0 },
  { category: "Tools", amount: 0, color: "#fdcb6e", percent: 0 },
  { category: "Office", amount: 0, color: "#00b894", percent: 0 },
];

const catColor: Record<string, string> = {
  AD_SPEND: "#e17055", SERVER_EMI: "#00cec9", SALARY: "#6c5ce7", TOOLS: "#fdcb6e", MISC: "#94a3b8", OFFICE: "#00b894",
};
const catLabel: Record<string, string> = {
  AD_SPEND: "Ad Spend", SERVER_EMI: "Server EMI", SALARY: "Salary", TOOLS: "Tools", MISC: "Misc", OFFICE: "Office",
};

export default function FinancePage() {
  const [expensesList, setExpensesList] = useState<any[]>([]);
  const [revenueList, setRevenueList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [activeFinanceTab, setActiveFinanceTab] = useState<"REVENUE" | "EXPENSE">("REVENUE");
  const [monthly, setMonthly] = useState(monthlyData);
  const [breakdown, setBreakdown] = useState(expenseBreakdown);

  // Financial Metric States
  const [pendingRevenueVal, setPendingRevenueVal] = useState<number>(0);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalEntryType, setModalEntryType] = useState<"REVENUE" | "EXPENSE">("REVENUE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Form States
  const [newExpense, setNewExpense] = useState<any>({
    category: "AD_SPEND",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    vendor: "",
  });

  const [newRevenue, setNewRevenue] = useState<any>({
    clientId: "",
    revenueType: "TECH",
    description: "",
    amount: "",
    paymentStatus: "PAID",
    paymentDate: new Date().toISOString().split("T")[0],
  });

  const loadFinanceData = async () => {
    // Fetch finance + clients in PARALLEL
    const [summary, clients] = await Promise.all([
      getFinanceSummary(),
      getClients(),
    ]);
    if (clients && clients.length > 0) {
      setClientsList(clients);
      setNewRevenue((prev: any) => ({ ...prev, clientId: prev.clientId || clients[0].id }));
    }

    if (summary) {
      let realizedRevenue = 0;
      let totalPending = 0;
      let totalDbExpenses = 0;

      if (summary.revenueEntries) {
        const dbRevenues = summary.revenueEntries.map((r: any) => ({
          id: r.id,
          clientName: r.client?.companyName || "Client Collection",
          service: r.revenueType || "TECH",
          amount: r.amount,
          description: r.description || "Advance Payment collected on Closed Deal",
          date: new Date(r.paymentDate).toISOString().split("T")[0],
          status: r.paymentStatus || "PAID",
        }));
        setRevenueList(dbRevenues);

        // REALIZED REVENUE: Sum ONLY entries where paymentStatus === "PAID"
        realizedRevenue = summary.revenueEntries
          .filter((r: any) => !r.paymentStatus || r.paymentStatus === "PAID")
          .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        // PENDING REVENUE: Sum entries where paymentStatus === "PENDING" or "OVERDUE"
        totalPending = summary.revenueEntries
          .filter((r: any) => r.paymentStatus === "PENDING" || r.paymentStatus === "OVERDUE")
          .reduce((sum: number, r: any) => sum + (r.amount || 0), 0);

        setPendingRevenueVal(totalPending);
      }

      if (summary.expenseEntries) {
        const dbExpenses = summary.expenseEntries.map((e: any) => ({
          id: e.id,
          category: e.category,
          description: e.description || "Company Expense",
          amount: e.amount,
          date: new Date(e.expenseDate).toISOString().split("T")[0],
          vendor: e.vendor || "Vendor",
        }));
        setExpensesList(dbExpenses);
        totalDbExpenses = summary.expenseEntries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        // Update expense breakdown
        const catMapping: Record<string, string> = {
          AD_SPEND: "Ad Spends",
          SERVER_EMI: "Server EMI",
          SALARY: "Salaries",
          TOOLS: "Tools",
          OFFICE: "Office",
          MISC: "Office",
        };
        const catTotals: Record<string, number> = {
          Salaries: 0, "Ad Spends": 0, "Server EMI": 0, Tools: 0, Office: 0
        };
        summary.expenseEntries.forEach((e: any) => {
          const categoryName = catMapping[e.category] || "Office";
          catTotals[categoryName] = (catTotals[categoryName] || 0) + e.amount;
        });

        const newBd = expenseBreakdown.map((b) => {
          const amt = catTotals[b.category] || 0;
          return {
            ...b,
            amount: amt,
            percent: totalDbExpenses > 0 ? Math.round((amt / totalDbExpenses) * 100) : 0,
          };
        });
        setBreakdown(newBd);
      }

      setMonthly((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          revenue: realizedRevenue,
          expenses: totalDbExpenses,
          profit: realizedRevenue - totalDbExpenses,
        };
        return updated;
      });
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const thisMonth = monthly[monthly.length - 1];
  const roi = thisMonth.expenses > 0 
    ? ((thisMonth.profit / thisMonth.expenses) * 100).toFixed(1) 
    : thisMonth.revenue > 0 ? "100" : "0";

  const handleOpenModal = (type: "REVENUE" | "EXPENSE") => {
    setModalEntryType(type);
    setIsAddModalOpen(true);
  };

  const handleMarkAsPaid = async (revenueId: string) => {
    setUpdatingId(revenueId);
    try {
      await updateRevenueStatus(revenueId, "PAID");
      await loadFinanceData();
    } catch (err) {
      console.error("Failed to update status to PAID:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newExpense.amount);
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      await createExpense({
        category: newExpense.category,
        amount,
        expenseDate: newExpense.date || new Date().toISOString().split("T")[0],
        description: newExpense.description,
        vendor: newExpense.vendor,
      });

      await loadFinanceData();
      setIsAddModalOpen(false);
      setNewExpense({
        category: "AD_SPEND",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        vendor: "",
      });
    } catch (err) {
      console.error("Failed to create expense entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newRevenue.amount);
    if (!amount || amount <= 0) return;

    setIsSubmitting(true);
    try {
      let targetClientId = newRevenue.clientId;
      if (!targetClientId) {
        if (clientsList.length > 0) {
          targetClientId = clientsList[0].id;
        } else {
          // Auto create fallback general client if no client exists yet
          const created = await createClient({
            companyName: "General Client Collection",
            contactPerson: "Finance Admin",
            serviceType: newRevenue.revenueType || "TECH",
            contractValue: amount,
            status: "ACTIVE",
          });
          targetClientId = created.id;
        }
      }

      await createRevenue({
        clientId: targetClientId,
        amount,
        revenueType: newRevenue.revenueType || "TECH",
        paymentDate: newRevenue.paymentDate || new Date().toISOString().split("T")[0],
        paymentStatus: newRevenue.paymentStatus || "PAID",
        description: newRevenue.description || "Revenue Payment Collected",
      });

      await loadFinanceData();
      setIsAddModalOpen(false);
      setNewRevenue({
        clientId: clientsList[0]?.id || "",
        revenueType: "TECH",
        description: "",
        amount: "",
        paymentStatus: "PAID",
        paymentDate: new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error("Failed to create revenue entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Finance" subtitle="Revenue vs Expenses — Net P&L" />
      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "20px" }} className="animate-in">
        
        {/* Metric Cards Grid (5 Cards: Collected Revenue, Pending Receivables, Expenses, Profit, ROI) */}
        <div className="finance-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px" }}>
          
          {/* Card 1: Collected Revenue */}
          <div className="card-youistic" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0,184,148,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={18} color="#00b894" />
              </div>
              <span style={{ fontSize: "10px", color: "#00b894", background: "rgba(0,184,148,0.12)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>PAID ONLY</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(thisMonth.revenue)}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Collected Revenue</div>
          </div>

          {/* Card 2: Pending Receivables */}
          <div className="card-youistic" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(245,158,11,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={18} color="#f59e0b" />
              </div>
              <span style={{ fontSize: "10px", color: "#f59e0b", background: "rgba(245,158,11,0.12)", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>DUES</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 800, color: "#f59e0b" }}>{formatCurrency(pendingRevenueVal)}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Pending Dues</div>
          </div>

          {/* Card 3: Total Expenses */}
          <div className="card-youistic" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(225,112,85,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingDown size={18} color="#e17055" />
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-border)", padding: "2px 6px", borderRadius: "4px" }}>July 2026</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(thisMonth.expenses)}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Total Expenses</div>
          </div>

          {/* Card 4: Net Cash After Expenses */}
          <div className="card-youistic" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={18} color="#6c5ce7" />
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-border)", padding: "2px 6px", borderRadius: "4px" }}>Realized</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(thisMonth.profit)}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>Net Cash After Expenses</div>
          </div>

          {/* Card 5: ROI % */}
          <div className="card-youistic" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(253,203,110,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Percent size={18} color="#fdcb6e" />
              </div>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--bg-border)", padding: "2px 6px", borderRadius: "4px" }}>Return %</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(18px, 3.5vw, 24px)", fontWeight: 800, color: "#00b894" }}>{roi}%</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>ROI</div>
          </div>
        </div>

        {/* Profit & Loss Chart Row */}
        <div className="finance-chart-row" style={{ display: "grid", gridTemplateColumns: "3fr 1fr", gap: "16px" }}>
          <div className="card-youistic" style={{ padding: "24px" }}>
            <div className="section-title" style={{ fontSize: "16px", color: "var(--text-primary)" }}>Cash Flow Summary (Realized)</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>Collected Revenue vs Expenses vs Net Cash</div>
            <ClientOnly fallback={<div style={{ height: 240 }} />}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthly} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" />
                  <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", boxShadow: "var(--shadow-card)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#00b894" fill="rgba(0,184,148,0.1)" strokeWidth={2} name="Collected Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#e17055" fill="rgba(225,112,85,0.1)" strokeWidth={2} name="Expenses" />
                  <Area type="monotone" dataKey="profit" stroke="#6c5ce7" fill="rgba(108,92,231,0.1)" strokeWidth={2} name="Net Cash After Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </ClientOnly>
          </div>

          <div className="card-youistic" style={{ padding: "24px" }}>
            <div className="section-title" style={{ fontSize: "16px", color: "var(--text-primary)" }}>Expense Breakdown</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>July 2026 — By category</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {breakdown.map((b) => (
                <div key={b.category}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{b.category}</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(b.amount)} <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>{b.percent}%</span></span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "var(--bg-border)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${b.percent}%`, height: "100%", background: b.color, borderRadius: "3px" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--bg-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>TOTAL EXPENSES</span>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{formatCurrency(thisMonth.expenses)}</div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Container with Tabs for Revenue & Expenses */}
        <div className="card-youistic" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            
          {/* Tabs for Revenue Income vs Operating Expenses */}
            <div style={{ display: "flex", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "10px", border: "1px solid var(--bg-border)", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setActiveFinanceTab("REVENUE")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: activeFinanceTab === "REVENUE" ? "#10b981" : "transparent",
                  color: activeFinanceTab === "REVENUE" ? "white" : "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                💰 Revenue & Income ({revenueList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFinanceTab("EXPENSE")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: activeFinanceTab === "EXPENSE" ? "#e17055" : "transparent",
                  color: activeFinanceTab === "EXPENSE" ? "white" : "var(--text-secondary)",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                💸 Operating Expenses ({expensesList.length})
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => handleOpenModal(activeFinanceTab)} 
                className="btn-primary" 
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", padding: "8px 14px" }}
              >
                <Plus size={14} /> Add {activeFinanceTab === "REVENUE" ? "Income" : "Expense"} Entry
              </button>
            </div>
          </div>

          {/* TAB 1: REVENUE / CLIENT ADVANCE PAYMENTS */}
          {activeFinanceTab === "REVENUE" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {revenueList.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  No income entries recorded yet. Click <strong>Add Income Entry</strong> to add your first revenue entry.
                </div>
              ) : (
                revenueList.map((rev) => {
                  const isPaid = rev.status === "PAID";
                  const isPending = rev.status === "PENDING";
                  const isOverdue = rev.status === "OVERDUE";

                  return (
                    <div key={rev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--bg-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: isPaid ? "rgba(16, 185, 129, 0.15)" : isPending ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {isPaid ? (
                            <ArrowUpRight size={20} color="#10b981" />
                          ) : (
                            <Clock size={20} color={isPending ? "#f59e0b" : "#ef4444"} />
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{rev.clientName}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{rev.description} · {rev.date}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        {(isPending || isOverdue) && (
                          <button
                            type="button"
                            disabled={updatingId === rev.id}
                            onClick={() => handleMarkAsPaid(rev.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(16, 185, 129, 0.4)",
                              background: "rgba(16, 185, 129, 0.1)",
                              color: "#10b981",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                          >
                            <CheckCircle2 size={13} />
                            {updatingId === rev.id ? "Updating..." : "Mark as Paid"}
                          </button>
                        )}

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "16px", fontWeight: 800, color: isPaid ? "#34d399" : isPending ? "#f59e0b" : "#ef4444", fontFamily: "'Space Grotesk', sans-serif" }}>
                            {isPaid ? "+" : ""}{formatCurrency(rev.amount)}
                          </div>
                          <span style={{
                            fontSize: "11px",
                            background: isPaid ? "rgba(16, 185, 129, 0.15)" : isPending ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isPaid ? "#34d399" : isPending ? "#f59e0b" : "#ef4444",
                            padding: "2px 8px",
                            borderRadius: "5px",
                            fontWeight: 700
                          }}>
                            {rev.service || "TECH"} · {rev.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: OPERATING EXPENSES */}
          {activeFinanceTab === "EXPENSE" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {expensesList.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
                  No expense entries recorded yet. Click <strong>Add Expense Entry</strong> to record a business expense.
                </div>
              ) : (
                expensesList.map((exp) => (
                  <div key={exp.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #1a1d28" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: `${catColor[exp.category] || "#e17055"}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ArrowDownRight size={18} color={catColor[exp.category] || "#e17055"} />
                      </div>
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{exp.description}</div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{exp.vendor} · {exp.date}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: catColor[exp.category] || "#e17055" }}>-{formatCurrency(exp.amount)}</div>
                      <span style={{ fontSize: "11px", background: `${catColor[exp.category] || "#e17055"}18`, color: catColor[exp.category] || "#e17055", padding: "2px 8px", borderRadius: "5px", fontWeight: 600 }}>
                        {catLabel[exp.category] || exp.category}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>
      </main>

      {/* Add Finance Entry Modal (Supports Income & Expense) */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card-youistic animate-in" style={{ width: "100%", maxWidth: "480px", padding: "24px" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div className="section-title" style={{ fontSize: "18px", margin: 0, color: "var(--text-primary)" }}>
                Add New Financial Entry
              </div>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "20px" }}>&times;</button>
            </div>

            {/* Type Selector Toggle (Income vs Expense) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "var(--bg-secondary)", padding: "4px", borderRadius: "10px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => setModalEntryType("REVENUE")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: modalEntryType === "REVENUE" ? "#10b981" : "transparent",
                  color: modalEntryType === "REVENUE" ? "white" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                💰 Income / Revenue
              </button>
              <button
                type="button"
                onClick={() => setModalEntryType("EXPENSE")}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: modalEntryType === "EXPENSE" ? "#e17055" : "transparent",
                  color: modalEntryType === "EXPENSE" ? "white" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                💸 Operating Expense
              </button>
            </div>

            {/* FORM 1: INCOME / REVENUE */}
            {modalEntryType === "REVENUE" ? (
              <form onSubmit={handleAddRevenue} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Client *</label>
                  <select
                    required
                    value={newRevenue.clientId}
                    onChange={(e) => setNewRevenue({ ...newRevenue, clientId: e.target.value })}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                  >
                    {clientsList.length > 0 ? (
                      clientsList.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.companyName} ({client.contactPerson || "Client"})
                        </option>
                      ))
                    ) : (
                      <option value="">General Client Collection (Auto-creates client record)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Description *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Advance Collection / Project Payment"
                    value={newRevenue.description}
                    onChange={(e) => setNewRevenue({ ...newRevenue, description: e.target.value })}
                    style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Amount (₹) *</label>
                    <input
                      required
                      type="number"
                      min="1"
                      placeholder="e.g. 50000"
                      value={newRevenue.amount}
                      onChange={(e) => setNewRevenue({ ...newRevenue, amount: e.target.value })}
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Service Type</label>
                    <select
                      value={newRevenue.revenueType}
                      onChange={(e) => setNewRevenue({ ...newRevenue, revenueType: e.target.value })}
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                    >
                      <option value="TECH">Tech / Web Development</option>
                      <option value="FBP">Full Brand Partner (FBP)</option>
                      <option value="HYBRID">Hybrid Model</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Payment Status</label>
                    <select
                      value={newRevenue.paymentStatus}
                      onChange={(e) => setNewRevenue({ ...newRevenue, paymentStatus: e.target.value })}
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}
                    >
                      <option value="PAID">Paid (Collected)</option>
                      <option value="PENDING">Pending (Due)</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Payment Date</label>
                    <input
                      type="date"
                      value={newRevenue.paymentDate}
                      onChange={(e) => setNewRevenue({ ...newRevenue, paymentDate: e.target.value })}
                      style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--bg-border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} style={{ padding: "8px 18px", background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: "6px", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}>
                    {isSubmitting ? "Saving..." : "Save Income"}
                  </button>
                </div>
              </form>
            ) : (
              /* FORM 2: OPERATING EXPENSE */
              <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Description *</label>
                  <input required type="text" placeholder="e.g. Meta Ads Campaign" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Amount (₹) *</label>
                    <input required type="number" min="1" placeholder="e.g. 6000" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Category</label>
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none", cursor: "pointer" }}>
                      <option value="AD_SPEND">Ad Spend</option>
                      <option value="SERVER_EMI">Server EMI</option>
                      <option value="SALARY">Salary</option>
                      <option value="TOOLS">Tools</option>
                      <option value="OFFICE">Office</option>
                      <option value="MISC">Misc</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Vendor</label>
                    <input type="text" placeholder="e.g. Meta, AWS" value={newExpense.vendor} onChange={(e) => setNewExpense({...newExpense, vendor: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px" }}>Date</label>
                    <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--bg-border)", borderRadius: "8px", color: "var(--text-primary)", padding: "10px 12px", fontSize: "13px", outline: "none" }} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--bg-border)", borderRadius: "6px", color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ opacity: isSubmitting ? 0.7 : 1 }}>
                    {isSubmitting ? "Saving..." : "Save Expense"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
