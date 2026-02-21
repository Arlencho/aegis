"use client";

import { useState, useEffect, FormEvent } from "react";

import type { Chain, ComplianceReport, Scenario, AuditHistorySummary } from "./components/types";
import { API_URL, CHAIN_CONFIG, SAMPLE_ADDRESSES, RULE_CONFIGS, SCENARIOS } from "./components/constants";
import { downloadAuditPDF } from "./components/utils";

import HeroSection from "./components/landing/HeroSection";
import ProblemSection from "./components/landing/ProblemSection";
import HowItWorksSection from "./components/landing/HowItWorksSection";
import FeaturesSection from "./components/landing/FeaturesSection";
import ComparisonSection from "./components/landing/ComparisonSection";
import ValueStackSection from "./components/landing/ValueStackSection";
import CredibilityStrip from "./components/landing/CredibilityStrip";
import SocialProofSection from "./components/landing/SocialProofSection";
import CTAFooter from "./components/landing/CTAFooter";

import ChainSelector from "./components/demo/ChainSelector";
import ScenarioGallery from "./components/demo/ScenarioGallery";
import RuleEditor from "./components/demo/RuleEditor";

import ReportCard from "./components/report/ReportCard";
import AIAnalysisPanel from "./components/report/AIAnalysisPanel";
import RecommendationPanel from "./components/report/RecommendationPanel";
import AuditHistoryPanel from "./components/report/AuditHistoryPanel";
import PostAuditCTA from "./components/report/PostAuditCTA";

export default function Home() {
  const [chain, setChain] = useState<Chain>("ethereum");
  const [safeAddress, setSafeAddress] = useState("");
  const [ruleValues, setRuleValues] = useState<Record<string, number>>(
    Object.fromEntries(RULE_CONFIGS.map((r) => [r.type, r.defaultValue]))
  );
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditHistorySummary[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fetch audit history when a live report comes in
  useEffect(() => {
    if (!report || activeScenario) return;
    const addr = report.safe_address;
    if (!addr || addr.includes("(example)")) return;
    fetch(`${API_URL}/audits/${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((d) => setAuditHistory(d.audits || []))
      .catch(() => setAuditHistory([]));
  }, [report, activeScenario]);

  async function handleDownloadPDF() {
    if (!report) return;
    setPdfLoading(true);
    try {
      await downloadAuditPDF(report, chain);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  function updateRuleValue(ruleType: string, value: number) {
    setRuleValues((prev) => ({ ...prev, [ruleType]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!safeAddress) return;

    setLoading(true);
    setError(null);
    setReport(null);
    setActiveScenario(null);

    const rules = RULE_CONFIGS.map((config) => ({
      type: config.type,
      params: { [config.paramKey]: ruleValues[config.type] },
      severity: config.severity,
    }));

    try {
      const res = await fetch(`${API_URL}/validate/json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safe_address: safeAddress,
          rules,
          include_ai: true,
          chain,
        }),
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

  function handleScenarioClick(scenario: Scenario) {
    setActiveScenario(scenario.id);
    setReport(scenario.report);
    setError(null);
    if (scenario.chain) setChain(scenario.chain);
  }

  return (
    <main className="min-h-screen">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ComparisonSection />
      <ValueStackSection />
      <CredibilityStrip />
      <SocialProofSection />

      {/* Interactive Demo */}
      <section id="demo" className="py-16 md:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Try It Now</h2>
            <p className="text-gray-400 text-sm">
              Paste any Ethereum or Solana wallet address, or explore the example scenarios
            </p>
          </div>

          <ChainSelector chain={chain} onChange={(c) => { setChain(c); setSafeAddress(""); }} />

          <ScenarioGallery
            scenarios={SCENARIOS}
            activeId={activeScenario}
            onSelect={handleScenarioClick}
          />

          {/* Rule Editor */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Policy Rules
              <span className="text-gray-600 font-normal ml-2">
                Adjust thresholds to match your risk tolerance
              </span>
            </h2>
            {RULE_CONFIGS.map((config) => (
              <RuleEditor
                key={config.type}
                config={config}
                value={ruleValues[config.type]}
                onChange={(v) => updateRuleValue(config.type, v)}
              />
            ))}
          </div>

          {/* Address Input + Submit */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">
                {CHAIN_CONFIG[chain].label}
              </label>
              <input
                type="text"
                placeholder={CHAIN_CONFIG[chain].placeholder}
                value={safeAddress}
                onChange={(e) => setSafeAddress(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg
                           text-white placeholder-gray-500
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                           font-mono text-sm min-h-[48px]"
                required
              />
              <button
                type="button"
                onClick={() => setSafeAddress(SAMPLE_ADDRESSES[chain])}
                className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 transition min-h-[44px] py-2"
              >
                Try a sample {CHAIN_CONFIG[chain].name} address
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !safeAddress}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700
                         disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed
                         rounded-lg font-medium transition text-sm min-h-[48px]"
            >
              {loading ? "Analyzing with AI..." : "Run Free Audit"}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-900/40 border border-red-800 rounded-lg mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {report && (
            <>
              <ReportCard
                report={report}
                onDownloadPDF={handleDownloadPDF}
                pdfLoading={pdfLoading}
              />
              {report.ai_analysis && (
                <AIAnalysisPanel analysis={report.ai_analysis} />
              )}
              {report.recommendations && report.recommendations.length > 0 && (
                <RecommendationPanel recommendations={report.recommendations} />
              )}
              {auditHistory.length > 1 && (
                <AuditHistoryPanel history={auditHistory} />
              )}
              <PostAuditCTA />
            </>
          )}
        </div>
      </section>

      <CTAFooter />
    </main>
  );
}
