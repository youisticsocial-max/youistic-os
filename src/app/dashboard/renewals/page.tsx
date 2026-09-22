"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getUpcomingRenewals } from "@/app/actions/services";
import { Calendar, Layers, RefreshCw, Clock, Building2, User } from "lucide-react";

export default function RenewalsDashboardPage() {
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30);

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

  return (
    <div className="flex-1 flex flex-col bg-[#0b0c10] min-h-screen text-slate-100">
      <Topbar title="Per-Service Renewals Dashboard" subtitle="Phase 2I Multi-Service Renewal Foundation" />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Control Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111420] border border-slate-800 rounded-2xl p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="text-emerald-400" size={20} />
              Upcoming & Overdue Service Renewals
            </h2>
            <p className="text-xs text-slate-400">
              Read-only foundation tracking active per-service subscriptions by next renewal date.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400 font-medium">Time Window:</label>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold"
            >
              <option value={7}>Upcoming 7 Days</option>
              <option value={30}>Upcoming 30 Days</option>
              <option value={90}>Upcoming 90 Days</option>
            </select>

            <button
              onClick={() => fetchRenewals(windowDays)}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-700 rounded-lg transition"
              title="Refresh Renewals"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-950/40 border border-red-800/80 rounded-xl p-4 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Renewals Table / List */}
        {loading ? (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
            Loading service renewals...
          </div>
        ) : renewals.length > 0 ? (
          <div className="bg-[#111420] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Client / Company</th>
                    <th className="p-4">Service Offering</th>
                    <th className="p-4">Renewal Amount</th>
                    <th className="p-4">Frequency</th>
                    <th className="p-4">Next Renewal Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Assigned BDE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {renewals.map((item) => {
                    const isOverdue = item.nextRenewalDate && new Date(item.nextRenewalDate) < now;
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
                            {formatCurrency(item.renewalAmount || 0)}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300 font-medium">
                          {item.renewalFrequency}
                        </td>
                        <td className="p-4 font-semibold text-slate-200">
                          {item.nextRenewalDate ? formatDate(item.nextRenewalDate) : "Not set"}
                        </td>
                        <td className="p-4">
                          {isOverdue ? (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-red-950/60 text-red-400 border border-red-800/60 flex items-center gap-1 w-fit">
                              <Clock size={12} />
                              OVERDUE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 flex items-center gap-1 w-fit">
                              <Calendar size={12} />
                              UPCOMING
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
          <div className="bg-[#111420] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Layers className="mx-auto text-slate-600" size={32} />
            <div className="text-sm font-semibold text-slate-300">No active per-service renewals due within {windowDays} days</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Active subscriptions attached to clients with a next renewal date in the next {windowDays} days will automatically appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
