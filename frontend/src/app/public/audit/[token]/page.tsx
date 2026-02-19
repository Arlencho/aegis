"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReportCard from "../../../components/report/ReportCard";
import AIAnalysisPanel from "../../../components/report/AIAnalysisPanel";
import RecommendationPanel from "../../../components/report/RecommendationPanel";
import { CHAIN_BADGE_COLORS } from "../../../components/constants";
import type { ComplianceReport } from "../../../components/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PublicAudit {
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

export default function PublicAuditPage() {
  const params = useParams();
  const token = params.token as string;

  const [audit, setAudit] = useState<PublicAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPublicAudit() {
      try {
        const res = await fetch(`${API_URL}/public/audit/${token}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          setAudit(await res.json());
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicAudit();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="skeleton h-6 w-32 rounded mb-6" />
          <div className="skeleton h-8 w-64 rounded mb-2" />
          <div className="skeleton h-4 w-48 rounded mb-6" />
          <div className="skeleton h-64 rounded-xl mb-4" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Audit Not Found</h1>
          <p className="text-gray-500 text-sm mb-4">
            This shared audit link may have been revoked or is invalid.
          </p>
          <Link href="/" className="text-blue-400 text-sm hover:text-blue-300 transition">
            Go to AEGIS
          </Link>
        </div>
      </div>
    );
  }

  const report = audit.report_json;
  const riskColor =
    audit.risk_level === "low"
      ? "bg-green-400/10 text-green-400"
      : audit.risk_level === "medium"
      ? "bg-yellow-400/10 text-yellow-400"
      : audit.risk_level === "high"
      ? "bg-red-400/10 text-red-400"
      : "";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="font-bold text-lg">AEGIS</span>
          </Link>
          <span className="text-[10px] px-2 py-1 rounded bg-blue-400/10 text-blue-400 font-medium uppercase">
            Shared Report
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">Audit #{audit.id}</h1>
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
              ${CHAIN_BADGE_COLORS[audit.chain] || "bg-gray-400/10 text-gray-400"}`}>
              {audit.chain}
            </span>
            {audit.risk_level && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${riskColor}`}>
                {audit.risk_level}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
            <span className="font-mono text-xs truncate max-w-[240px] sm:max-w-none">
              {audit.wallet_address}
            </span>
            <span className="text-gray-600">|</span>
            <span>
              {new Date(audit.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        <ReportCard report={report} />

        {report.ai_analysis && (
          <AIAnalysisPanel analysis={report.ai_analysis} />
        )}

        {report.recommendations && report.recommendations.length > 0 && (
          <RecommendationPanel recommendations={report.recommendations} />
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-600">
            Audit generated by{" "}
            <Link href="/" className="text-gray-500 hover:text-gray-400 transition">
              AEGIS treasury risk platform
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
