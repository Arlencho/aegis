"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AuditHistorySummary } from "../types";

export default function AuditHistoryPanel({ history }: { history: AuditHistorySummary[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prepare chart data (oldest first for the line chart)
  const chartData = [...history]
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: Math.round((a.passed / a.total_rules) * 100),
      passed: a.passed,
      total: a.total_rules,
    }));

  return (
    <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        Audit History
        <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/50 text-blue-300 rounded">
          {history.length} audits
        </span>
      </h3>

      {/* Compliance Trend Chart */}
      {mounted && chartData.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Compliance Score Over Time</p>
          <div className="overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    stroke="#374151"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    stroke="#374151"
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(value) => [`${value}%`, "Compliance"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                    activeDot={{ r: 5, fill: "#60a5fa" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="space-y-1.5 overflow-x-auto">
        {history.slice(0, 10).map((audit) => (
          <div
            key={audit.id}
            className="flex items-center justify-between py-2 px-3 bg-gray-800/30 rounded-lg text-xs min-w-[300px]"
          >
            <div className="flex items-center gap-3">
              <span
                className={`text-[10px] font-bold ${
                  audit.overall_status === "COMPLIANT"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {audit.overall_status === "COMPLIANT" ? "PASS" : "FAIL"}
              </span>
              <span className="text-gray-400">
                {new Date(audit.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                {audit.passed}/{audit.total_rules} rules
              </span>
              <span className="text-gray-500 font-mono">
                ${Number(audit.total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              {audit.risk_level && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    audit.risk_level === "low"
                      ? "bg-green-900/50 text-green-300"
                      : audit.risk_level === "medium"
                      ? "bg-yellow-900/50 text-yellow-300"
                      : audit.risk_level === "high"
                      ? "bg-red-900/50 text-red-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {audit.risk_level}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
