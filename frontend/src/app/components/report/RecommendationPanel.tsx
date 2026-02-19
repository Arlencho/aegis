import type { Recommendation } from "../types";

export default function RecommendationPanel({
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
