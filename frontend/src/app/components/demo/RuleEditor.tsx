"use client";

import { useState } from "react";
import type { RuleConfig } from "../types";

export default function RuleEditor({
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
      : config.unit === "HHI"
      ? `${value}`
      : `${value}%`;

  return (
    <div className="mb-2 p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-300 transition min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
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
          className="flex-1 accent-blue-500 h-2"
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
