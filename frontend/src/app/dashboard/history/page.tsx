"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AuditHistorySummary } from "../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [audits, setAudits] = useState<AuditHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_URL}/dashboard/history`, {
          headers: session?.accessToken
            ? { Authorization: `Bearer ${session.accessToken}` }
            : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAudits(data.audits || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [session]);

  // Chart data — oldest first
  const chartData = [...audits]
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: a.total_rules > 0 ? Math.round((a.passed / a.total_rules) * 100) : 0,
      value: Number(a.total_usd),
    }));
  const showCharts = mounted && chartData.length > 1;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit History</h1>
        <p className="text-gray-400 text-sm mt-1">All compliance audits across your wallets</p>
      </div>

      {/* Trend Charts */}
      {showCharts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Compliance Score */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Compliance Score Over Time</p>
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#374151" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#374151" tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#9ca3af" }}
                      formatter={(value) => [`${value}%`, "Compliance"]}
                    />
                    <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} activeDot={{ r: 5, fill: "#60a5fa" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Treasury Value */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-2">Treasury Value Over Time</p>
            <div className="overflow-x-auto">
              <div className="min-w-[280px]">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="histValueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#374151" />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#374151" tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#9ca3af" }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4ade80" strokeWidth={2} fill="url(#histValueGradient)" dot={{ fill: "#4ade80", r: 3 }} activeDot={{ r: 5, fill: "#86efac" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-16 rounded-lg" />
          ))}
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-lg p-8 text-center">
          <p className="text-gray-500 text-sm">No audits yet. Add a wallet and run your first audit.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {audits.map((audit) => (
              <div
                key={audit.id}
                onClick={() => router.push(`/dashboard/audits/${audit.id}`)}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer
                           hover:border-gray-700 transition active:bg-gray-800/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                    ${audit.chain === "ethereum" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                    {audit.chain}
                  </span>
                  <span className={`text-xs font-medium
                    ${audit.overall_status === "COMPLIANT" ? "text-green-400" : "text-red-400"}`}>
                    {audit.overall_status}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300 font-mono">
                    ${Number(audit.total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs text-gray-400">
                    {audit.passed}/{audit.total_rules} rules passed
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </span>
                  {audit.risk_level && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                      ${audit.risk_level === "low" ? "bg-green-400/10 text-green-400"
                        : audit.risk_level === "medium" ? "bg-yellow-400/10 text-yellow-400"
                        : "bg-red-400/10 text-red-400"}`}>
                      {audit.risk_level}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3">Date</th>
                  <th className="text-left py-3 px-3">Chain</th>
                  <th className="text-left py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Value</th>
                  <th className="text-right py-3 px-3">Rules</th>
                  <th className="text-left py-3 px-3">Risk</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    onClick={() => router.push(`/dashboard/audits/${audit.id}`)}
                    className="border-b border-gray-800/50 hover:bg-gray-900/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-3 text-gray-400">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                        ${audit.chain === "ethereum" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
                        {audit.chain}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium
                        ${audit.overall_status === "COMPLIANT" ? "text-green-400" : "text-red-400"}`}>
                        {audit.overall_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-300 font-mono">
                      ${Number(audit.total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-3 text-right text-gray-400">
                      {audit.passed}/{audit.total_rules}
                    </td>
                    <td className="py-3 px-3">
                      {audit.risk_level && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                          ${audit.risk_level === "low" ? "bg-green-400/10 text-green-400"
                            : audit.risk_level === "medium" ? "bg-yellow-400/10 text-yellow-400"
                            : "bg-red-400/10 text-red-400"}`}>
                          {audit.risk_level}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
