"use client";

import { Suspense } from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CHAIN_BADGE_COLORS } from "../../../components/constants";
import type { ComplianceReport, RuleResult } from "../../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuditDetail {
  id: number;
  wallet_address: string;
  chain: string;
  total_usd: number;
  overall_status: string;
  passed: number;
  failed: number;
  total_rules: number;
  risk_level: string | null;
  report_json: ComplianceReport;
  created_at: string;
}

interface RuleDiff {
  rule: string;
  name: string;
  statusA: boolean | null;
  statusB: boolean | null;
  change: "improved" | "regressed" | "unchanged" | "added" | "removed";
}

function CompareContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const idA = searchParams.get("a");
  const idB = searchParams.get("b");

  const [auditA, setAuditA] = useState<AuditDetail | null>(null);
  const [auditB, setAuditB] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idA || !idB) {
      setError("Two audit IDs required");
      setLoading(false);
      return;
    }

    async function fetchBoth() {
      try {
        const headers: Record<string, string> = {};
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

        const [resA, resB] = await Promise.all([
          fetch(`${API_URL}/audits/detail/${idA}`, { headers }),
          fetch(`${API_URL}/audits/detail/${idB}`, { headers }),
        ]);

        if (!resA.ok || !resB.ok) {
          setError("Could not load one or both audits");
          return;
        }

        const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
        setAuditA(dataA);
        setAuditB(dataB);
      } catch {
        setError("Failed to load audits");
      } finally {
        setLoading(false);
      }
    }

    fetchBoth();
  }, [session, idA, idB]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="skeleton h-8 w-48 rounded mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="skeleton h-40 rounded-lg" />
          <div className="skeleton h-40 rounded-lg" />
        </div>
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !auditA || !auditB) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-gray-500">{error || "Audits not found"}</p>
        <Link href="/dashboard/history" className="text-blue-400 text-sm mt-2 inline-block">
          Back to history
        </Link>
      </div>
    );
  }

  // Compute rule diffs
  const rulesA = new Map<string, RuleResult>();
  const rulesB = new Map<string, RuleResult>();
  for (const r of auditA.report_json.results || []) rulesA.set(r.rule, r);
  for (const r of auditB.report_json.results || []) rulesB.set(r.rule, r);

  const allRuleKeys = new Set([...rulesA.keys(), ...rulesB.keys()]);
  const diffs: RuleDiff[] = [...allRuleKeys].map((rule) => {
    const a = rulesA.get(rule);
    const b = rulesB.get(rule);
    let change: RuleDiff["change"] = "unchanged";
    if (a && b) {
      if (!a.passed && b.passed) change = "improved";
      else if (a.passed && !b.passed) change = "regressed";
    } else if (!a && b) {
      change = "added";
    } else if (a && !b) {
      change = "removed";
    }
    return {
      rule,
      name: (b || a)?.name || rule,
      statusA: a ? a.passed : null,
      statusB: b ? b.passed : null,
      change,
    };
  });

  const improved = diffs.filter((d) => d.change === "improved").length;
  const regressed = diffs.filter((d) => d.change === "regressed").length;

  const valueChange = Number(auditB.total_usd) - Number(auditA.total_usd);
  const passedChange = auditB.passed - auditA.passed;

  const riskOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const riskA = riskOrder[auditA.risk_level || ""] || 0;
  const riskB = riskOrder[auditB.risk_level || ""] || 0;
  const riskChange = riskA - riskB; // positive = improved (risk went down)

  const riskBadge = (risk: string | null) => {
    if (!risk) return <span className="text-gray-500 text-xs">N/A</span>;
    const colors: Record<string, string> = {
      low: "bg-green-400/10 text-green-400",
      medium: "bg-yellow-400/10 text-yellow-400",
      high: "bg-red-400/10 text-red-400",
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${colors[risk] || ""}`}>
        {risk}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/history"
          className="text-xs text-gray-500 hover:text-gray-400 transition inline-flex items-center gap-1 mb-2"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Audit History
        </Link>
        <h1 className="text-2xl font-bold">Audit Comparison</h1>
        <p className="text-gray-400 text-sm mt-1">
          Audit #{auditA.id} vs Audit #{auditB.id}
        </p>
      </div>

      {/* 1. Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[auditA, auditB].map((audit, i) => (
          <div key={audit.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">
                {i === 0 ? "Audit A" : "Audit B"} — #{audit.id}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
                ${CHAIN_BADGE_COLORS[audit.chain] || "bg-gray-400/10 text-gray-400"}`}>
                {audit.chain}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-gray-300">{new Date(audit.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={audit.overall_status === "COMPLIANT" ? "text-green-400" : "text-red-400"}>
                  {audit.overall_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Value</span>
                <span className="text-gray-300 font-mono">
                  ${Number(audit.total_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rules</span>
                <span className="text-gray-300">{audit.passed}/{audit.total_rules} passed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Risk</span>
                {riskBadge(audit.risk_level)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Delta highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Value Change</p>
          <p className={`text-lg font-bold font-mono ${valueChange > 0 ? "text-green-400" : valueChange < 0 ? "text-red-400" : "text-gray-400"}`}>
            {valueChange > 0 ? "+" : ""}{valueChange !== 0 ? `$${Math.abs(valueChange).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Risk Change</p>
          <p className={`text-lg font-bold ${riskChange > 0 ? "text-green-400" : riskChange < 0 ? "text-red-400" : "text-gray-400"}`}>
            {riskChange > 0 ? "Improved" : riskChange < 0 ? "Worsened" : "Same"}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Rules Passed</p>
          <p className={`text-lg font-bold ${passedChange > 0 ? "text-green-400" : passedChange < 0 ? "text-red-400" : "text-gray-400"}`}>
            {passedChange > 0 ? `+${passedChange}` : passedChange < 0 ? `${passedChange}` : "—"}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500 uppercase mb-1">Status Change</p>
          <p className={`text-lg font-bold ${
            auditA.overall_status !== "COMPLIANT" && auditB.overall_status === "COMPLIANT"
              ? "text-green-400"
              : auditA.overall_status === "COMPLIANT" && auditB.overall_status !== "COMPLIANT"
              ? "text-red-400"
              : "text-gray-400"
          }`}>
            {auditA.overall_status === auditB.overall_status
              ? "Same"
              : auditB.overall_status === "COMPLIANT"
              ? "Fixed"
              : "Regressed"}
          </p>
        </div>
      </div>

      {/* 3. Per-rule table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold">Rule-by-Rule Comparison</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {improved} improved, {regressed} regressed, {diffs.length - improved - regressed} unchanged
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left py-2 px-4">Rule</th>
                <th className="text-center py-2 px-3">Audit A</th>
                <th className="text-center py-2 px-3">Audit B</th>
                <th className="text-center py-2 px-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr
                  key={d.rule}
                  className={`border-b border-gray-800/50 ${
                    d.change === "improved"
                      ? "border-l-2 border-l-green-500"
                      : d.change === "regressed"
                      ? "border-l-2 border-l-red-500"
                      : ""
                  }`}
                >
                  <td className="py-2 px-4 text-gray-300">{d.name}</td>
                  <td className="py-2 px-3 text-center">
                    {d.statusA === null ? (
                      <span className="text-gray-600">—</span>
                    ) : d.statusA ? (
                      <span className="text-green-400">PASS</span>
                    ) : (
                      <span className="text-red-400">FAIL</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {d.statusB === null ? (
                      <span className="text-gray-600">—</span>
                    ) : d.statusB ? (
                      <span className="text-green-400">PASS</span>
                    ) : (
                      <span className="text-red-400">FAIL</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {d.change === "improved" && (
                      <span className="text-green-400 text-xs font-medium">Improved</span>
                    )}
                    {d.change === "regressed" && (
                      <span className="text-red-400 text-xs font-medium">Regressed</span>
                    )}
                    {d.change === "unchanged" && (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                    {d.change === "added" && (
                      <span className="text-blue-400 text-xs font-medium">New</span>
                    )}
                    {d.change === "removed" && (
                      <span className="text-gray-500 text-xs font-medium">Removed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. AI Recommendations diff */}
      {(auditA.report_json.ai_analysis || auditB.report_json.ai_analysis) && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold">AI Recommendations</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-800">
            <div className="p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-2">Audit A — #{auditA.id}</p>
              {auditA.report_json.ai_analysis?.recommendations?.length ? (
                <ul className="space-y-1.5">
                  {auditA.report_json.ai_analysis.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-gray-600 shrink-0">{i + 1}.</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600">No AI analysis</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-[10px] text-gray-500 uppercase mb-2">Audit B — #{auditB.id}</p>
              {auditB.report_json.ai_analysis?.recommendations?.length ? (
                <ul className="space-y-1.5">
                  {auditB.report_json.ai_analysis.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-gray-400 flex gap-2">
                      <span className="text-gray-600 shrink-0">{i + 1}.</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-600">No AI analysis</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto">
        <div className="skeleton h-8 w-48 rounded mb-6" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="skeleton h-40 rounded-lg" />
          <div className="skeleton h-40 rounded-lg" />
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
