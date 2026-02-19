"use client";

import { useState, FormEvent } from "react";

interface RuleResult {
  rule: string;
  passed: boolean;
  current_value: string;
  threshold: string;
  severity: string;
  detail: string;
}

interface ComplianceReport {
  safe_address: string;
  total_usd: number;
  overall_status: "COMPLIANT" | "NON-COMPLIANT";
  passed: number;
  failed: number;
  total_rules: number;
  results: RuleResult[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLE_SAFE = "0xFEB4acf3df3cDEA7399794D0869ef76A6EfAff52";

const DEFAULT_POLICY = `treasury:
  name: "Quick Audit"
  safe_address: "0x0000000000000000000000000000000000000000"
  chain: "ethereum"
rules:
  - type: allocation_cap
    params:
      max_percent: 30
    severity: breach
  - type: stablecoin_floor
    params:
      min_percent: 20
      stablecoins: ["USDC", "USDT", "DAI"]
    severity: breach
  - type: single_asset_cap
    params:
      max_usd: 500000
    severity: warning
  - type: max_tx_size
    params:
      max_usd: 100000
    severity: breach
  - type: inactivity_alert
    params:
      threshold_hours: 168
    severity: warning`;

const RULE_DESCRIPTIONS: Record<string, string> = {
  allocation_cap: "No single token exceeds 30% of the portfolio",
  stablecoin_floor: "At least 20% of holdings are stablecoins (USDC, USDT, DAI)",
  single_asset_cap: "No single asset exceeds $500k in value",
  max_tx_size: "No single transaction exceeds $100k",
  inactivity_alert: "Treasury has had activity within the last 7 days",
};

export default function Home() {
  const [safeAddress, setSafeAddress] = useState("");
  const [customPolicyFile, setCustomPolicyFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!safeAddress) return;

    setLoading(true);
    setError(null);
    setReport(null);

    const formData = new FormData();
    formData.append("safe_address", safeAddress);

    if (showAdvanced && customPolicyFile) {
      formData.append("policy_file", customPolicyFile);
    } else {
      const blob = new Blob([DEFAULT_POLICY], { type: "application/x-yaml" });
      formData.append("policy_file", blob, "policy.yaml");
    }

    try {
      const res = await fetch(`${API_URL}/validate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data: ComplianceReport = await res.json();
      setReport(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1 tracking-tight">AEGIS</h1>
        <p className="text-gray-400 mb-2 text-sm">
          See if your treasury is within risk limits — in 30 seconds.
        </p>
        <p className="text-gray-500 mb-8 text-xs leading-relaxed">
          Paste any Gnosis Safe address and get an instant compliance report.
          We check 5 rules: single-token concentration, stablecoin minimums,
          asset caps, transaction size limits, and activity monitoring.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">
              Safe Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={safeAddress}
              onChange={(e) => setSafeAddress(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg
                         text-white placeholder-gray-500
                         focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                         font-mono text-sm"
              required
            />
            <button
              type="button"
              onClick={() => setSafeAddress(SAMPLE_SAFE)}
              className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
            >
              Try a sample address
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !safeAddress}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700
                       disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                       rounded-lg font-medium transition text-sm"
          >
            {loading ? "Auditing..." : "Run Free Audit"}
          </button>

          {/* Advanced: Custom Policy Upload */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 hover:text-gray-400 transition flex items-center gap-1"
            >
              <span className={`transition-transform inline-block ${showAdvanced ? "rotate-90" : ""}`}>
                &#9654;
              </span>
              Advanced: Upload custom policy
            </button>
            {showAdvanced && (
              <div className="mt-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">
                  Override the default 5-rule policy with your own YAML file.
                </p>
                <input
                  type="file"
                  accept=".yaml,.yml"
                  onChange={(e) => setCustomPolicyFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-400 text-sm
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-lg file:border-0
                             file:bg-gray-800 file:text-gray-200
                             file:cursor-pointer file:text-sm
                             hover:file:bg-gray-700"
                />
              </div>
            )}
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg mb-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {report && <ReportCard report={report} />}
      </div>
    </main>
  );
}

function ReportCard({ report }: { report: ComplianceReport }) {
  const compliant = report.overall_status === "COMPLIANT";

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div
        className={`p-4 rounded-lg border ${
          compliant
            ? "bg-green-900/20 border-green-800"
            : "bg-red-900/20 border-red-800"
        }`}
      >
        <div className="flex justify-between items-center">
          <div>
            <h2
              className={`text-lg font-bold ${
                compliant ? "text-green-400" : "text-red-400"
              }`}
            >
              {report.overall_status}
            </h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {report.safe_address}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">
              $
              {report.total_usd.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-gray-400">
              {report.passed}/{report.total_rules} rules passed
            </p>
          </div>
        </div>
      </div>

      {/* Per-rule results */}
      {report.results.map((result, i) => (
        <div
          key={i}
          className={`p-3 rounded-lg border ${
            result.passed
              ? "bg-gray-900/50 border-gray-800"
              : result.severity === "breach"
              ? "bg-red-900/15 border-red-900"
              : "bg-yellow-900/15 border-yellow-900"
          }`}
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`text-xs font-bold shrink-0 ${
                  result.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.passed ? "PASS" : "FAIL"}
              </span>
              <span className="text-sm font-medium truncate">
                {result.rule}
              </span>
              {!result.passed && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                    result.severity === "breach"
                      ? "bg-red-900 text-red-200"
                      : "bg-yellow-900 text-yellow-200"
                  }`}
                >
                  {result.severity}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 shrink-0">
              {result.current_value} / {result.threshold}
            </span>
          </div>
          {RULE_DESCRIPTIONS[result.rule] && (
            <p className="text-xs text-gray-500 mt-1">
              {RULE_DESCRIPTIONS[result.rule]}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">{result.detail}</p>
        </div>
      ))}
    </div>
  );
}
