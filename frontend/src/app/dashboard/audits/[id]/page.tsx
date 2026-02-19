"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReportCard from "../../../components/report/ReportCard";
import AIAnalysisPanel from "../../../components/report/AIAnalysisPanel";
import RecommendationPanel from "../../../components/report/RecommendationPanel";
import { downloadAuditPDF } from "../../../components/utils";
import type { ComplianceReport } from "../../../components/types";

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

export default function AuditDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const headers: Record<string, string> = {};
        if (session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

        const res = await fetch(`${API_URL}/audits/detail/${auditId}`, { headers });
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setAudit(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [session, auditId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-8 w-64 rounded mb-2" />
        <div className="skeleton h-4 w-48 rounded mb-6" />
        <div className="skeleton h-64 rounded-xl mb-4" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  if (notFound || !audit) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-gray-500">Audit not found.</p>
        <Link href="/dashboard/history" className="text-blue-400 text-sm mt-2 inline-block">
          Back to history
        </Link>
      </div>
    );
  }

  async function handleDownloadPDF() {
    if (!audit) return;
    setPdfLoading(true);
    try {
      await downloadAuditPDF(audit.report_json, audit.chain as "ethereum" | "solana");
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
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
    <div className="max-w-4xl mx-auto">
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

        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">
            Audit #{audit.id}
          </h1>
          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium
            ${audit.chain === "ethereum" ? "bg-blue-400/10 text-blue-400" : "bg-purple-400/10 text-purple-400"}`}>
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

      {/* Report */}
      <ReportCard report={report} onDownloadPDF={handleDownloadPDF} pdfLoading={pdfLoading} />

      {/* AI Analysis */}
      {report.ai_analysis && (
        <AIAnalysisPanel analysis={report.ai_analysis} />
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <RecommendationPanel recommendations={report.recommendations} />
      )}
    </div>
  );
}
