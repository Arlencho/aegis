import type { Scenario } from "../types";

export default function ScenarioGallery({
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={`p-3 rounded-lg border text-left transition text-xs min-h-[44px] ${
              activeId === s.id
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-800 bg-gray-900/50 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  s.tagColor === "green"
                    ? "bg-green-900 text-green-300"
                    : s.tagColor === "red"
                    ? "bg-red-900 text-red-300"
                    : "bg-yellow-900 text-yellow-300"
                }`}
              >
                {s.tag}
              </span>
              {s.chain === "solana" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-900/50 text-purple-300">
                  SOL
                </span>
              )}
            </div>
            <p className="font-medium text-gray-200 text-sm">{s.title}</p>
            <p className="text-gray-500 mt-0.5">{s.subtitle}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
