import type { AIAnalysis } from "../types";

export default function AIAnalysisPanel({ analysis }: { analysis: AIAnalysis }) {
  const riskColor =
    analysis.risk_level === "low"
      ? "text-green-400 bg-green-900/50"
      : analysis.risk_level === "medium"
      ? "text-yellow-400 bg-yellow-900/50"
      : analysis.risk_level === "high"
      ? "text-red-400 bg-red-900/50"
      : "text-gray-400 bg-gray-800";

  return (
    <div className="mb-4 p-4 bg-purple-900/10 border border-purple-900/30 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-purple-400" />
        <h3 className="text-sm font-semibold text-purple-300">AI Risk Analysis</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${riskColor}`}>
          {analysis.risk_level.toUpperCase()}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-gray-300 leading-relaxed mb-4">
        {analysis.summary}
      </p>

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
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg mt-3">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
            Stress Test: What if ETH drops 30%?
          </h4>
          <p className="text-sm text-gray-300">{analysis.stress_test}</p>
        </div>
      )}

      {/* Benchmarks */}
      {analysis.benchmarks && (
        <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg mt-3">
          <h4 className="text-xs font-semibold text-gray-400 mb-1">
            Industry Benchmark
          </h4>
          <p className="text-xs text-gray-400">{analysis.benchmarks}</p>
        </div>
      )}

      {/* Suggested Additional Rules */}
      {analysis.suggested_rules && analysis.suggested_rules.length > 0 && (
        <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg mt-3">
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
