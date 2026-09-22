"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAnalyticsData } from "@/app/actions/analytics";
import {
  TrendingUp,
  DollarSign,
  Building2,
  PieChart,
  Receipt,
  Layers,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

export default function AnalyticsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get("clientId") || "";

  const [selectedClientId, setSelectedClientId] = useState<string>(clientIdParam);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async (clientId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsData(clientId ? { clientId } : undefined);
      setData(res);
    } catch (err: any) {
      console.error("Failed to load Analytics data:", err);
      setError(err?.message || "Failed to load Analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(selectedClientId || undefined);
  }, [selectedClientId]);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    if (id) {
      router.push(`/dashboard/analytics?clientId=${id}`);
    } else {
      router.push(`/dashboard/analytics`);
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100">
      <Topbar
        title="Analytics & Ecosystem MIS"
        subtitle="Factual Financial & Portfolio Performance Metrics"
      />

      <main className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header & Client Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111420] border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <PieChart className="text-indigo-400" size={22} />
              {data?.isClientView
                ? `Client Analytics — ${data.client.companyName}`
                : "Ecosystem MIS & Financial Analytics"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {data?.isClientView
                ? "Factual breakdown of active service subscriptions, signed deals, receipts, and receivables."
                : "Aggregated performance across all client services, revenue receipts, and service families."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Filter size={16} className="text-slate-400" />
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Clients (Ecosystem View)</option>
              {data?.availableClients?.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.contactPerson})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] text-indigo-400 text-xs font-medium gap-2">
            <RefreshCw className="animate-spin" size={18} />
            Loading factual analytics engine...
          </div>
        ) : (
          <>
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Active Service Value */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Active Service Value</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {formatCurrency(
                    data?.isClientView
                      ? data.metrics.activeServiceValue
                      : data.metrics.totalActiveServiceValue
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data?.isClientView
                    ? `${data.metrics.knownActiveServices} active services (${data.metrics.unknownActiveServices} unknown value)`
                    : "Sum of active client subscriptions"}
                </p>
              </div>

              {/* Lifetime Client Value */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Lifetime Deal Value</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Building2 size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {formatCurrency(
                    data?.isClientView
                      ? data.metrics.lifetimeBusinessValue
                      : data.metrics.totalLifetimeBusinessValue
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data?.isClientView
                    ? `${data.metrics.knownLifetimeServices} historical services tracked`
                    : "Total contracted business value"}
                </p>
              </div>

              {/* Actual Receipts Received */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Actual Money Received</span>
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {formatCurrency(
                    data?.isClientView
                      ? data.metrics.totalPaymentsReceived
                      : data.metrics.totalRevenueReceived
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Verified revenue entries only</p>
              </div>

              {/* Outstanding Receivables */}
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400">Outstanding Receivables</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Receipt size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {formatCurrency(data?.metrics.totalOutstandingReceivables || 0)}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Issued & Overdue invoices sum</p>
              </div>
            </div>

            {/* View Specific Sections */}
            {data?.isClientView ? (
              /* Client-Specific Detailed Breakdown */
              <div className="space-y-6">
                <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-400" />
                    Service Subscriptions & Original Signed Values
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase border-b border-slate-800">
                        <tr>
                          <th className="p-3">Service Name</th>
                          <th className="p-3">Family</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Original Signed Value</th>
                          <th className="p-3">Renewal Amount</th>
                          <th className="p-3">Frequency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {data.clientServices?.map((s: any) => (
                          <tr key={s.id} className="hover:bg-slate-900/30">
                            <td className="p-3 font-semibold text-slate-100">{s.offering.name}</td>
                            <td className="p-3 text-indigo-400 font-mono">{s.offering.family}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  s.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td className="p-3 font-semibold">
                              {s.commercialValue !== null ? formatCurrency(s.commercialValue) : "Unknown (NULL)"}
                            </td>
                            <td className="p-3 text-slate-400">
                              {s.renewalAmount !== null ? formatCurrency(s.renewalAmount) : "N/A"}
                            </td>
                            <td className="p-3 text-slate-400">{s.renewalFrequency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Global Ecosystem Service Family Breakdown */
              <div className="bg-[#111420] border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <PieChart size={16} className="text-indigo-400" />
                  Service Family Revenue & Valuation Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  {Object.entries(data?.familyBreakdown || {}).map(([family, metrics]: [string, any]) => (
                    <div
                      key={family}
                      className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 font-mono">{family}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-semibold">
                          {metrics.servicesCount} services
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Active Service Value</div>
                        <div className="text-lg font-bold text-slate-100">
                          {formatCurrency(metrics.activeValue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Actual Revenue Attributed</div>
                        <div className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(metrics.revenueReceived)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
