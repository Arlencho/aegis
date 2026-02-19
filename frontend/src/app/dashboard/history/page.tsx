"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { AuditHistorySummary } from "../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const { data: session } = useSession();
  const [audits, setAudits] = useState<AuditHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit History</h1>
        <p className="text-gray-400 text-sm mt-1">All compliance audits across your wallets</p>
      </div>

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
        <div className="overflow-x-auto">
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
                <tr key={audit.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
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
      )}
    </div>
  );
}
