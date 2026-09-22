"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getUpcomingRenewals } from "@/app/actions/services";
import {
  Calendar,
  Layers,
  RefreshCw,
  Clock,
  Building2,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function RenewalsDashboardPage() {
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30);

  // Client-side Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | UPCOMING | PASSED

  const fetchRenewals = async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUpcomingRenewals(days);
      setRenewals(data || []);
    } catch (err: any) {
      console.error("Failed to fetch renewals:", err);
      setError(err?.message || "Failed to load renewals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals(windowDays);
  }, [windowDays]);

  const now = new Date();

  // Client-side filtering logic
  const filteredRenewals = renewals.filter((item) => {
    const isPassed = item.nextRenewalDate && new Date(item.nextRenewalDate) < now;

    if (statusFilter === "UPCOMING" && isPassed) return false;
    if (statusFilter === "PASSED" && !isPassed) return false;

    if (familyFilter !== "ALL" && item.offering?.family !== familyFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchClient = (item.client?.companyName || "").toLowerCase().includes(q);
      const matchOffering = (item.offering?.name || "").toLowerCase().includes(q);
      const matchBde = (item.client?.assignedBde?.name || "").toLowerCase().includes(q);
      return matchClient || matchOffering || matchBde;
    }

    return true;
  });

  // Calculate Summary Metrics
  const totalRenewalValue = filteredRenewals.reduce(
    (sum, item) => sum + (item.renewalAmount || 0),
    0
  );

  const passedCount = filteredRenewals.filter(
    (item) => item.nextRenewalDate && new Date(item.nextRenewalDate) < now
  ).length;

  return (
    <div className="flex-1 flex flex-col bg-[#0b0c10] min-h-screen text-slate-100">
      <Topbar title="Per-Service Renewals Dashboard" subtitle="Factual Multi-Service Renewal Tracker" />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Control Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111420] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="text-emerald-400" size={20} />
              Per-Service Renewal Operations
            </h2>
            <p className="text-xs text-slate-400">
              Operational view of active per-service subscriptions by next renewal milestone date.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Time Window:</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value={7}>Next 7 Days</option>
              <option value={30}>Next 30 Days</option>
              <option value={90}>Next 90 Days</option>
              <option value={365}>Next 365 Days</option>
            </select>

            <button
              onClick={() => fetchRenewals(windowDays)}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-xl transition"
              title="Refresh Renewals"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Total Active Subscriptions Due</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{filteredRenewals.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers size={20} />
            </div>
          </div>

          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Total Upcoming Renewal Value</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(totalRenewalValue)}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <DollarSign size={20} />
            </div>
          </div>

          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Renewal Date Passed</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{passedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-[#111420] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search client, offering, or BDE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              <select
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Service Families</option>
                <option value="MEGA_SOFT">Mega Soft</option>
                <option value="MEGA_WEB">Mega Web</option>
                <option value="MEGA_APPS">Mega Apps</option>
                <option value="FBP">FBP Managed</option>
              </select>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Status Milestones</option>
              <option value="UPCOMING">Upcoming Renewal</option>
              <option value="PASSED">Renewal Date Passed</option>
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            {error}
          </div>
        )}

        {/* Renewals Table / List */}
        {loading ? (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            Loading service renewals...
          </div>
        ) : filteredRenewals.length > 0 ? (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Client / Company</th>
                    <th className="p-4">Service Offering</th>
                    <th className="p-4">Renewal Amount</th>
                    <th className="p-4">Frequency</th>
                    <th className="p-4">Next Renewal Date</th>
                    <th className="p-4">Milestone Status</th>
                    <th className="p-4">Assigned BDE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRenewals.map((item) => {
                    const isPassed = item.nextRenewalDate && new Date(item.nextRenewalDate) < now;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition">
                        <td className="p-4">
                          <div className="font-bold text-slate-100">{item.client?.companyName || "Unnamed Client"}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={12} />
                            {item.client?.contactPerson || "No Contact Person"}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{item.offering?.name}</div>
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-emerald-400 mt-1">
                            {item.offering?.family}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-teal-300">
                            {item.renewalAmount !== null && item.renewalAmount !== undefined
                              ? formatCurrency(item.renewalAmount)
                              : "—"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-medium">
                          {item.renewalFrequency}
                        </td>
                        <td className="p-4 font-semibold text-slate-200">
                          {item.nextRenewalDate ? formatDate(item.nextRenewalDate) : "Not set"}
                        </td>
                        <td className="p-4">
                          {isPassed ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center gap-1 w-fit">
                              <Clock size={12} />
                              Renewal Date Passed
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-fit">
                              <Calendar size={12} />
                              Upcoming Renewal
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400">
                          {item.client?.assignedBde?.name || "Unassigned"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-12 text-center space-y-3 shadow-xl">
            <Layers className="mx-auto text-slate-600" size={32} />
            <div className="text-sm font-semibold text-slate-300">No active per-service renewals found</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery || familyFilter !== "ALL" || statusFilter !== "ALL"
                ? "No service renewals match your selected filter criteria."
                : `Active subscriptions attached to clients with a next renewal date in the next ${windowDays} days will automatically appear here.`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
