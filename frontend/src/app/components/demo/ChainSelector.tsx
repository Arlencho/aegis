import type { Chain } from "../types";
import { CHAIN_CONFIG } from "../constants";

const CHAIN_COLORS: Record<Chain, string> = {
  ethereum: "bg-blue-600/20 border-blue-500 text-blue-300",
  solana: "bg-purple-600/20 border-purple-500 text-purple-300",
  bsc: "bg-yellow-600/20 border-yellow-500 text-yellow-300",
  base: "bg-blue-600/20 border-blue-500 text-blue-300",
  arbitrum: "bg-sky-600/20 border-sky-500 text-sky-300",
  polygon: "bg-violet-600/20 border-violet-500 text-violet-300",
};

const ACTIVE_CHAINS: Chain[] = ["ethereum", "solana", "arbitrum", "polygon"];
const COMING_SOON_CHAINS: Chain[] = ["base", "bsc"];

export default function ChainSelector({
  chain,
  onChange,
}: {
  chain: Chain;
  onChange: (c: Chain) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {ACTIVE_CHAINS.map((c) => (
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
      {COMING_SOON_CHAINS.map((c) => (
        <button
          key={c}
          type="button"
          disabled
          className="px-3 py-2 rounded-lg text-sm font-medium border min-h-[44px]
                     bg-gray-900/30 border-gray-800/50 text-gray-700 cursor-not-allowed"
        >
          {CHAIN_CONFIG[c].name}
          <span className="text-[9px] ml-1 text-gray-600">Soon</span>
        </button>
      ))}
    </div>
  );
}
