import type { ComplianceReport } from "../types";

export default function ReportCard({
  report,
  onDownloadPDF,
  pdfLoading,
}: {
  report: ComplianceReport;
  onDownloadPDF?: () => void;
  pdfLoading?: boolean;
}) {
  const compliant = report.overall_status === "COMPLIANT";

  return (
    <div className="mb-4 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded ${
              compliant
                ? "bg-green-900/50 text-green-300"
                : "bg-red-900/50 text-red-300"
            }`}
          >
            {report.overall_status}
          </span>
          <span className="text-xs text-gray-500 font-mono truncate max-w-[200px] sm:max-w-none">
            {report.safe_address}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">
            {report.passed}/{report.total_rules} passed
          </span>
          {onDownloadPDF && (
            <button
              onClick={onDownloadPDF}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         bg-blue-600/20 text-blue-300 border border-blue-800/40 rounded-lg
                         hover:bg-blue-600/30 transition disabled:opacity-50 min-h-[36px]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {pdfLoading ? "Generating..." : "PDF Report"}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-gray-800 flex flex-wrap gap-4 md:gap-6 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Total Value</span>
          <p className="font-semibold">
            ${report.total_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Rules Failed</span>
          <p className={`font-semibold ${report.failed > 0 ? "text-red-400" : "text-green-400"}`}>
            {report.failed}
          </p>
        </div>
      </div>

      {/* Rule Results */}
      <div className="divide-y divide-gray-800/50">
        {report.results.map((r, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] font-bold shrink-0 ${
                    r.passed ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {r.passed ? "PASS" : "FAIL"}
                </span>
                <span className="text-sm font-medium text-gray-200 truncate">
                  {r.name || r.rule}
                </span>
                <span
                  className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    r.severity === "breach"
                      ? "bg-red-900/30 text-red-400"
                      : "bg-yellow-900/30 text-yellow-400"
                  }`}
                >
                  {r.severity}
                </span>
              </div>
              <span className="text-xs text-gray-500 font-mono shrink-0">
                {r.current_value} / {r.threshold}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-10">{r.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
