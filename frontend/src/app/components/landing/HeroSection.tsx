export default function HeroSection() {
  return (
    <section className="relative py-24 md:py-36 lg:py-44 px-4 sm:px-6 md:px-12 overflow-hidden">
      {/* Background layers */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="text-center lg:text-left">
            <div className="animate-fade-in-up">
              <span className="inline-block text-xs px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-full border border-blue-800/40 mb-6 font-medium tracking-wide uppercase">
                Treasury Risk Intelligence
              </span>
            </div>

            <h1 className="animate-fade-in-up-delay-1 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
              Your treasury has a risk policy.{" "}
              <span className="gradient-text">But nobody&apos;s enforcing it.</span>
            </h1>

            <p className="animate-fade-in-up-delay-2 text-gray-400 text-base sm:text-lg md:text-xl max-w-xl mb-8 leading-relaxed mx-auto lg:mx-0">
              Paste any wallet address — Ethereum, Solana, Arbitrum, or
              Polygon. Get an instant compliance audit with AI-powered risk
              analysis — in 30 seconds.
            </p>

            <div className="animate-fade-in-up-delay-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10">
              <a
                href="#demo"
                className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold
                           transition-all text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40
                           hover:scale-[1.02] active:scale-[0.98] min-h-[48px] flex items-center"
              >
                Try the Free Audit
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">&rarr;</span>
              </a>
              <span className="text-xs px-3 py-1.5 bg-purple-900/30 text-purple-300 rounded-full border border-purple-800/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                AI-Powered
              </span>
            </div>

            {/* Stats bar */}
            <div className="animate-fade-in-up-delay-3 flex items-center justify-center lg:justify-start gap-6 md:gap-8">
              <div>
                <p className="text-2xl font-bold text-white">10</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Risk Rules</p>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div>
                <p className="text-2xl font-bold text-white">30s</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Full Audit</p>
              </div>
              <div className="w-px h-8 bg-gray-800" />
              <div>
                <p className="text-2xl font-bold text-white">$0</p>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">No Signup</p>
              </div>
            </div>
          </div>

          {/* Right: Mini audit preview card */}
          <div className="hidden lg:block animate-fade-in-up-delay-2">
            <div className="animate-float relative">
              {/* Glow behind card */}
              <div className="absolute -inset-4 bg-blue-500/5 rounded-3xl blur-2xl" />
              <div className="absolute -inset-[1px] rounded-2xl shimmer-border" />

              <div className="mini-audit-card relative rounded-2xl border border-gray-700/50 p-6 shadow-2xl">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-200">AEGIS Audit</span>
                  </div>
                  <span className="text-[10px] px-2 py-1 bg-green-900/50 text-green-400 rounded-full font-medium border border-green-800/30">
                    COMPLIANT
                  </span>
                </div>

                {/* Wallet info */}
                <div className="mb-4 p-3 bg-gray-800/40 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Wallet</p>
                  <p className="text-xs font-mono text-gray-300">0x849D...7e41</p>
                  <p className="text-lg font-bold text-white mt-1">$2,100,000</p>
                </div>

                {/* Mini rule results */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: "Concentration Cap", value: "28.5% / 30%" },
                    { label: "Stablecoin Floor", value: "25.2% / 20%" },
                    { label: "Asset Value Cap", value: "within cap" },
                    { label: "Tx Size Limit", value: "12 txs ok" },
                    { label: "Activity Monitor", value: "36h ago" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold text-[10px]">PASS</span>
                        <span className="text-gray-300">{item.label}</span>
                      </div>
                      <span className="text-gray-500 font-mono">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* AI analysis teaser */}
                <div className="p-3 bg-purple-900/15 border border-purple-800/30 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span className="text-[10px] font-semibold text-purple-300 uppercase tracking-wider">AI Analysis</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Well-diversified treasury with strong compliance. Stablecoin reserves provide ~6 months runway...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
