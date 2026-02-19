import type { Chain } from "../types";
import { CHAIN_CONFIG } from "../constants";

const CHAIN_COLORS: Record<Chain, string> = {
  ethereum: "bg-blue-600/20 border-blue-500 text-blue-300",
  solana: "bg-purple-600/20 border-purple-500 text-purple-300",
  base: "bg-blue-600/20 border-blue-500 text-blue-300",
  arbitrum: "bg-sky-600/20 border-sky-500 text-sky-300",
  polygon: "bg-violet-600/20 border-violet-500 text-violet-300",
};

const CHAINS: Chain[] = ["ethereum", "base", "arbitrum", "polygon", "solana"];

export default function ChainSelector({
  chain,
  onChange,
}: {
  chain: Chain;
  onChange: (c: Chain) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {CHAINS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition border min-h-[44px] ${
            chain === c
              ? CHAIN_COLORS[c]
              : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700"
          }`}
        >
          {CHAIN_CONFIG[c].name}
        </button>
      ))}
    </div>
  );
}
