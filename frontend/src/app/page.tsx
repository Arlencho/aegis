"use client";

import { useState, FormEvent } from "react";

// --- Type Definitions ---

interface RuleResult {
  rule: string;
  name: string;
  description: string;
  rationale: string;
  passed: boolean;
  current_value: string;
  threshold: string;
  severity: string;
  detail: string;
}

interface Recommendation {
  rule: string;
  action: string;
  severity: string;
}

interface SuggestedRule {
  name: string;
  reason: string;
}

interface AIAnalysis {
  summary: string;
  risk_level: "low" | "medium" | "high" | "unknown";
  recommendations: string[];
  stress_test: string;
  benchmarks: string;
  suggested_rules: SuggestedRule[];
}

interface ComplianceReport {
  safe_address: string;
  total_usd: number;
  overall_status: "COMPLIANT" | "NON-COMPLIANT";
  passed: number;
  failed: number;
  total_rules: number;
  results: RuleResult[];
  recommendations: Recommendation[];
  ai_analysis: AIAnalysis | null;
}

// --- Constants ---

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SAMPLE_SAFE = "0xFEB4acf3df3cDEA7399794D0869ef76A6EfAff52";

interface RuleConfig {
  type: string;
  name: string;
  description: string;
  rationale: string;
  paramKey: string;
  paramLabel: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  severity: "breach" | "warning";
}

const RULE_CONFIGS: RuleConfig[] = [
  {
    type: "allocation_cap",
    name: "Single-Token Concentration",
    description: "No single token should exceed this percentage of total portfolio value.",
    rationale: "Most treasury frameworks cap single-token allocation at 25-35% to prevent catastrophic loss from one asset crashing.",
    paramKey: "max_percent",
    paramLabel: "Max % per token",
    defaultValue: 30,
    min: 10,
    max: 80,
    step: 5,
    unit: "%",
    severity: "breach",
  },
  {
    type: "stablecoin_floor",
    name: "Stablecoin Minimum",
    description: "Stablecoins must represent at least this percentage of the portfolio.",
    rationale: "Maintaining 15-25% in stablecoins ensures 3-6 months of operating runway without forced liquidation during market downturns.",
    paramKey: "min_percent",
    paramLabel: "Min % in stablecoins",
    defaultValue: 20,
    min: 5,
    max: 60,
    step: 5,
    unit: "%",
    severity: "breach",
  },
  {
    type: "single_asset_cap",
    name: "Absolute Asset Cap",
    description: "No single asset should exceed this absolute USD value.",
    rationale: "Absolute caps prevent over-exposure even when percentage rules pass. Limits maximum loss from a single token collapse.",
    paramKey: "max_usd",
    paramLabel: "Max USD per asset",
    defaultValue: 500000,
    min: 50000,
    max: 5000000,
    step: 50000,
    unit: "$",
    severity: "warning",
  },
  {
    type: "max_tx_size",
    name: "Transaction Size Limit",
    description: "No single transaction should exceed this USD value.",
    rationale: "Spending guardrails prevent unauthorized or accidental large transfers. Most treasuries set this at 5-15% of total holdings.",
    paramKey: "max_usd",
    paramLabel: "Max USD per transaction",
    defaultValue: 100000,
    min: 10000,
    max: 1000000,
    step: 10000,
    unit: "$",
    severity: "breach",
  },
  {
    type: "inactivity_alert",
    name: "Activity Monitor",
    description: "The treasury must show transaction activity within this time window.",
    rationale: "Inactive treasuries may indicate lost keys, abandoned governance, or compromised signers. 7 days balances operational cadence with security.",
    paramKey: "threshold_hours",
    paramLabel: "Max hours inactive",
    defaultValue: 168,
    min: 24,
    max: 720,
    step: 24,
    unit: "hours",
    severity: "warning",
  },
];

// --- Scenario Gallery Data ---

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: "green" | "red" | "yellow";
  report: ComplianceReport;
}

const SCENARIOS: Scenario[] = [
  {
    id: "compliant",
    title: "Well-Balanced Treasury",
    subtitle: "$2.1M, 25% stablecoins, diversified",
    tag: "Compliant",
    tagColor: "green",
    report: {
      safe_address: "0x849D...7e41 (example)",
      total_usd: 2100000,
      overall_status: "COMPLIANT",
      passed: 5,
      failed: 0,
      total_rules: 5,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "28.5%", threshold: "30%", severity: "breach", detail: "Largest position is ETH at 28.5% — within the 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: true, current_value: "25.2%", threshold: "20%", severity: "breach", detail: "Stablecoins: $529,200 (25.2% of portfolio)" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "12 txs checked", threshold: "$100,000", severity: "breach", detail: "All 12 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "36h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 36 hours ago — well within 7-day window" },
      ],
      recommendations: [],
      ai_analysis: null,
    },
  },
  {
    id: "concentrated",
    title: "Over-Concentrated in ETH",
    subtitle: "$1.8M, 72% in a single token",
    tag: "High Risk",
    tagColor: "red",
    report: {
      safe_address: "0xA3f1...9c02 (example)",
      total_usd: 1800000,
      overall_status: "NON-COMPLIANT",
      passed: 3,
      failed: 2,
      total_rules: 5,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: false, current_value: "72.1%", threshold: "30%", severity: "breach", detail: "ETH is 72.1% of portfolio ($1,297,800) — exceeds 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: false, current_value: "8.3%", threshold: "20%", severity: "breach", detail: "Stablecoins: $149,400 (8.3% of portfolio) — below 20% floor" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: false, current_value: "1 asset over cap", threshold: "$500,000", severity: "warning", detail: "Over cap: ETH: $1,297,800" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "8 txs checked", threshold: "$100,000", severity: "breach", detail: "All 8 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "12h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 12 hours ago" },
      ],
      recommendations: [
        { rule: "allocation_cap", action: "Rebalance by swapping a portion of ETH into stablecoins or diversified assets.", severity: "breach" },
        { rule: "stablecoin_floor", action: "Increase stablecoin holdings by converting volatile assets. Target USDC or DAI for maximum liquidity.", severity: "breach" },
        { rule: "single_asset_cap", action: "Reduce ETH position size. Consider dollar-cost averaging out over multiple transactions.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
  {
    id: "low-stable",
    title: "Low Stablecoin Reserves",
    subtitle: "$900K, only 5% stablecoins",
    tag: "Medium Risk",
    tagColor: "yellow",
    report: {
      safe_address: "0xD4e2...1b38 (example)",
      total_usd: 900000,
      overall_status: "NON-COMPLIANT",
      passed: 4,
      failed: 1,
      total_rules: 5,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "29.8%", threshold: "30%", severity: "breach", detail: "Largest position is WBTC at 29.8% — just within the 30% cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: false, current_value: "5.1%", threshold: "20%", severity: "breach", detail: "Stablecoins: $45,900 (5.1% of portfolio) — below 20% floor" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "5 txs checked", threshold: "$100,000", severity: "breach", detail: "All 5 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: true, current_value: "72h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 72 hours ago" },
      ],
      recommendations: [
        { rule: "stablecoin_floor", action: "Increase stablecoin holdings by converting volatile assets. Target USDC or DAI for maximum liquidity.", severity: "breach" },
      ],
      ai_analysis: null,
    },
  },
  {
    id: "inactive",
    title: "Dormant Treasury",
    subtitle: "$450K, no activity in 30 days",
    tag: "Warning",
    tagColor: "yellow",
    report: {
      safe_address: "0x71B8...4e59 (example)",
      total_usd: 450000,
      overall_status: "NON-COMPLIANT",
      passed: 4,
      failed: 1,
      total_rules: 5,
      results: [
        { rule: "allocation_cap", name: "Single-Token Concentration Cap", description: "", rationale: "", passed: true, current_value: "24.2%", threshold: "30%", severity: "breach", detail: "No single token exceeds allocation cap" },
        { rule: "stablecoin_floor", name: "Stablecoin Minimum Floor", description: "", rationale: "", passed: true, current_value: "31.5%", threshold: "20%", severity: "breach", detail: "Stablecoins: $141,750 (31.5% of portfolio)" },
        { rule: "single_asset_cap", name: "Absolute Asset Value Cap", description: "", rationale: "", passed: true, current_value: "all within cap", threshold: "$500,000", severity: "warning", detail: "No single asset exceeds the $500,000 absolute cap" },
        { rule: "max_tx_size", name: "Transaction Size Limit", description: "", rationale: "", passed: true, current_value: "3 txs checked", threshold: "$100,000", severity: "breach", detail: "All 3 recent transactions within $100,000 cap" },
        { rule: "inactivity_alert", name: "Activity Monitor", description: "", rationale: "", passed: false, current_value: "720h ago", threshold: "168h", severity: "warning", detail: "Last transaction: 30 days ago — exceeds 168h threshold" },
      ],
      recommendations: [
        { rule: "inactivity_alert", action: "Verify signer access and confirm the treasury is actively governed. Schedule regular rebalancing transactions.", severity: "warning" },
      ],
      ai_analysis: null,
    },
  },
];

// --- Main Component ---

export default function Home() {
  const [safeAddress, setSafeAddress] = useState("");
  const [ruleValues, setRuleValues] = useState<Record<string, number>>(
    Object.fromEntries(RULE_CONFIGS.map((r) => [r.type, r.defaultValue]))
  );
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

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
  }

  return (
    <main className="min-h-screen">
      {/* Section 1: Hero */}
      <HeroSection />

      {/* Section 2: Problem */}
      <ProblemSection />

      {/* Section 3: How It Works */}
      <HowItWorksSection />

      {/* Section 4: What AEGIS Checks */}
      <FeaturesSection />

      {/* Section 5: Credibility Strip */}
      <CredibilityStrip />

      {/* Section 6: Interactive Demo */}
      <section id="demo" className="py-16 md:py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Try It Now</h2>
            <p className="text-gray-400 text-sm">
              Paste any Safe wallet address or explore the example scenarios below
            </p>
          </div>

          {/* Scenario Gallery */}
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
                Safe Wallet Address
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
              <ReportCard report={report} />
              {report.ai_analysis && (
                <AIAnalysisPanel analysis={report.ai_analysis} />
              )}
              {report.recommendations && report.recommendations.length > 0 && (
                <RecommendationPanel recommendations={report.recommendations} />
              )}
            </>
          )}
        </div>
      </section>

      {/* Section 7: CTA Footer */}
      <CTAFooter />
    </main>
  );
}

// --- Landing Page Sections ---

function HeroSection() {
  return (
    <section className="relative py-20 md:py-32 px-6 md:px-12">
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="max-w-5xl mx-auto text-center relative">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight tracking-tight">
          Your treasury has a risk policy.{" "}
          <span className="gradient-text">But nobody&apos;s enforcing it.</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
          AEGIS audits any Safe wallet against your risk rules and gives you
          AI-powered analysis — in 30 seconds. No signup. No config. Just paste
          an address.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#demo"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold
                       transition text-base shadow-lg shadow-blue-600/20"
          >
            Try the Free Audit
          </a>
          <span className="text-xs px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/40">
            Powered by Claude AI
          </span>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const cards = [
    {
      hook: "Policy lives in Notion",
      detail:
        "Risk limits are written in governance docs but never enforced programmatically. Drift happens silently.",
      colorClass: "pain-card-red",
    },
    {
      hook: "Compliance is manual",
      detail:
        "Someone checks a spreadsheet — maybe. One missed rebalance and you're over-concentrated without knowing it.",
      colorClass: "pain-card-orange",
    },
    {
      hook: "No alerts until it's too late",
      detail:
        "By the time a breach surfaces in a governance call, the damage is already done.",
      colorClass: "pain-card-yellow",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          The Problem
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Most crypto treasuries manage millions with rules that exist only on
          paper
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`pain-card ${card.colorClass} p-6 bg-gray-900 border border-gray-800 rounded-xl`}
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                {card.hook}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Paste your Safe address",
      detail:
        "Works with any Safe wallet on Ethereum. No API keys, no setup, no signup.",
    },
    {
      number: "2",
      title: "Set your risk rules",
      detail:
        "5 built-in rules with sensible defaults. Adjust thresholds with sliders or use ours.",
    },
    {
      number: "3",
      title: "Get AI-powered analysis",
      detail:
        "Instant compliance report + Claude analyzes your risk posture, runs stress tests, and recommends actions.",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          How It Works
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          From address to actionable insights in three steps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="step-connector text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed md:pl-[52px]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const rules = [
    { name: "Single-token concentration cap", desc: "No asset exceeds your set percentage of total value" },
    { name: "Stablecoin minimum floor", desc: "Ensure operating runway with minimum stablecoin reserves" },
    { name: "Absolute asset value cap", desc: "Hard USD ceiling on any single token position" },
    { name: "Transaction size limit", desc: "Spending guardrails on individual transfers" },
    { name: "Activity monitoring", desc: "Detect dormant wallets with configurable inactivity alerts" },
  ];

  const aiFeatures = [
    { name: "Risk posture summary", desc: "Plain-English assessment of your treasury health" },
    { name: "Stress testing", desc: "\"What if ETH drops 30%?\" — see which rules would break" },
    { name: "Industry benchmarks", desc: "Compare your allocation to similar-sized treasuries" },
    { name: "Actionable recommendations", desc: "Specific steps to improve compliance and reduce risk" },
    { name: "Suggested additional rules", desc: "AI identifies gaps in your current policy" },
  ];

  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          What AEGIS Checks
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Deterministic rules for instant compliance, AI analysis for deeper insight
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Deterministic Rules Column */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Deterministic Rules
            </h3>
            <div className="space-y-3">
              {rules.map((r, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-green-400 mt-0.5 shrink-0">&#10003;</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Analysis Column */}
          <div>
            <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              AI Analysis
            </h3>
            <div className="space-y-3">
              {aiFeatures.map((f, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-purple-400 mt-0.5 shrink-0">&#9733;</span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{f.name}</p>
                    <p className="text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CredibilityStrip() {
  return (
    <section className="py-8 px-6 md:px-12 border-y border-gray-800/50">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center">
        <span className="text-xs text-gray-500">
          Built for treasuries in the <span className="text-gray-300 font-medium">$250K&ndash;$10M</span> range
        </span>
        <span className="hidden md:block text-gray-800">|</span>
        <span className="text-xs text-gray-500">
          Testing with <span className="text-gray-300 font-medium">live stablecoin portfolios</span>
        </span>
        <span className="hidden md:block text-gray-800">|</span>
        <span className="text-xs text-gray-500">
          <span className="text-gray-300 font-medium">Advisory mode</span> — zero autonomous execution
        </span>
      </div>
    </section>
  );
}

function CTAFooter() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          Want continuous monitoring?
        </h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          We&apos;re building AEGIS Pro — automated policy enforcement for DAO
          treasuries with real-time alerts, scheduled audits, and multi-chain
          support.
        </p>
        <a
          href="https://x.com/AegisAudit"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg
                     font-semibold transition text-sm shadow-lg shadow-blue-600/20"
        >
          Get Early Access
        </a>
        <p className="mt-10 text-xs text-gray-600">
          Built by Arlen Rios
        </p>
      </div>
    </section>
  );
}

// --- Scenario Gallery ---

function ScenarioGallery({
  scenarios,
  activeId,
  onSelect,
}: {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (s: Scenario) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-gray-300 mb-3">
        Example Scenarios
        <span className="text-gray-600 font-normal ml-2">
          See what different risk profiles look like
        </span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`p-3 rounded-lg border text-left transition text-xs ${
              activeId === s.id
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mb-1.5 ${
                s.tagColor === "green"
                  ? "bg-green-900 text-green-300"
                  : s.tagColor === "red"
                  ? "bg-red-900 text-red-300"
                  : "bg-yellow-900 text-yellow-300"
              }`}
            >
              {s.tag}
            </span>
            <p className="font-medium text-gray-200 text-sm">{s.title}</p>
            <p className="text-gray-500 mt-0.5">{s.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Rule Editor ---

function RuleEditor({
  config,
  value,
  onChange,
}: {
  config: RuleConfig;
  value: number;
  onChange: (v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const displayValue =
    config.unit === "$"
      ? `$${value.toLocaleString()}`
      : config.unit === "hours"
      ? `${value}h (${Math.round(value / 24)}d)`
      : `${value}%`;

  return (
    <div className="mb-2 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-300 transition"
          >
            <span
              className={`transition-transform inline-block text-xs ${
                expanded ? "rotate-90" : ""
              }`}
            >
              &#9654;
            </span>
          </button>
          <span className="text-sm font-medium">{config.name}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              config.severity === "breach"
                ? "bg-red-900/50 text-red-300"
                : "bg-yellow-900/50 text-yellow-300"
            }`}
          >
            {config.severity}
          </span>
        </div>
        <span className="text-sm font-mono text-blue-400">{displayValue}</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={config.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-800">
          <p className="text-xs text-gray-400">{config.description}</p>
          <p className="text-xs text-gray-500 mt-1 italic">
            Why this rule: {config.rationale}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Report Card ---

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
                {result.name || result.rule}
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
          <p className="text-xs text-gray-400 mt-1">{result.detail}</p>
        </div>
      ))}
    </div>
  );
}

// --- AI Analysis Panel ---

function AIAnalysisPanel({ analysis }: { analysis: AIAnalysis }) {
  const riskColors: Record<string, string> = {
    low: "text-green-400 bg-green-900/20 border-green-800",
    medium: "text-yellow-400 bg-yellow-900/20 border-yellow-800",
    high: "text-red-400 bg-red-900/20 border-red-800",
    unknown: "text-gray-400 bg-gray-900/20 border-gray-800",
  };

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
        AI Risk Analysis
        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/50 text-purple-300 rounded">
          Powered by Claude
        </span>
      </h3>

      {/* Summary + Risk Level */}
      <div
        className={`p-4 rounded-lg border ${
          riskColors[analysis.risk_level] || riskColors.unknown
        }`}
      >
        <div className="flex justify-between items-start gap-4">
          <p className="text-sm leading-relaxed">{analysis.summary}</p>
          <span className="text-xs font-bold uppercase shrink-0">
            {analysis.risk_level} risk
          </span>
        </div>
      </div>

      {/* AI Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            AI Recommendations
          </h4>
          <ul className="space-y-1.5">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-blue-400 shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stress Test */}
      {analysis.stress_test && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            Stress Test: What if ETH drops 30%?
          </h4>
          <p className="text-sm text-gray-300">{analysis.stress_test}</p>
        </div>
      )}

      {/* Benchmarks */}
      {analysis.benchmarks && (
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-400 mb-1">
            Industry Benchmark
          </h4>
          <p className="text-xs text-gray-400">{analysis.benchmarks}</p>
        </div>
      )}

      {/* Suggested Additional Rules */}
      {analysis.suggested_rules && analysis.suggested_rules.length > 0 && (
        <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg">
          <h4 className="text-xs font-semibold text-purple-300 mb-2">
            Additional Rules to Consider
          </h4>
          {analysis.suggested_rules.map((sr, i) => (
            <div key={i} className="mb-1.5 last:mb-0">
              <p className="text-sm text-gray-300 font-medium">{sr.name}</p>
              <p className="text-xs text-gray-500">{sr.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Recommendation Panel ---

function RecommendationPanel({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  return (
    <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        What to Do Next
      </h3>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span
              className={`shrink-0 text-xs font-bold mt-0.5 ${
                rec.severity === "breach"
                  ? "text-red-400"
                  : "text-yellow-400"
              }`}
            >
              {rec.severity === "breach" ? "FIX" : "REVIEW"}
            </span>
            <div>
              <span className="text-gray-500 text-xs font-mono">
                {rec.rule}
              </span>
              <p className="text-gray-300">{rec.action}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          This is a point-in-time audit. For continuous monitoring with
          real-time alerts, contact us about AEGIS Pro.
        </p>
      </div>
    </div>
  );
}
