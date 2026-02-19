export default function FeaturesSection() {
  const rules = [
    { name: "Single-token concentration cap", desc: "No asset exceeds your set percentage of total value" },
    { name: "Stablecoin minimum floor", desc: "Ensure operating runway with minimum stablecoin reserves" },
    { name: "Absolute asset value cap", desc: "Hard USD ceiling on any single token position" },
    { name: "Transaction size limit", desc: "Spending guardrails on individual transfers" },
    { name: "Activity monitoring", desc: "Detect dormant wallets with configurable inactivity alerts" },
    { name: "Minimum diversification", desc: "Require a minimum number of distinct tokens in the portfolio" },
    { name: "Volatile asset exposure cap", desc: "Limit non-stablecoin exposure to reduce market risk" },
    { name: "Minimum treasury value", desc: "Ensure portfolio stays above a solvency floor" },
    { name: "Relative transaction cap", desc: "Flag transactions disproportionate to portfolio size" },
    { name: "Concentration index (HHI)", desc: "Industry-standard metric for portfolio concentration risk" },
  ];

  const aiFeatures = [
    { name: "Risk posture summary", desc: "Plain-English assessment of your treasury health" },
    { name: "Stress testing", desc: "\"What if ETH drops 30%?\" — see which rules would break" },
    { name: "Industry benchmarks", desc: "Compare your allocation to similar-sized treasuries" },
    { name: "Actionable recommendations", desc: "Specific steps to improve compliance and reduce risk" },
    { name: "Suggested additional rules", desc: "AI identifies gaps in your current policy" },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-gray-950/50">
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
