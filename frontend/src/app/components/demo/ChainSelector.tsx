import type { Chain } from "../types";
import { CHAIN_CONFIG } from "../constants";

export default function ChainSelector({
  chain,
  onChange,
}: {
  chain: Chain;
  onChange: (c: Chain) => void;
}) {
  return (
    <div className="flex gap-2 mb-6">
      {(["ethereum", "solana"] as Chain[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition border min-h-[44px] ${
            chain === c
              ? "bg-blue-600/20 border-blue-500 text-blue-300"
              : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700"
          }`}
        >
          {CHAIN_CONFIG[c].name}
        </button>
      ))}
    </div>
  );
}
