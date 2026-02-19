export default function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          Manual Review vs AEGIS
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Same treasury, two approaches — see what gets missed
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Review */}
          <div className="p-6 bg-gray-900 border border-gray-800 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-600" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-yellow-900/30 border border-yellow-800/40 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-yellow-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  <line x1="15" y1="3" x2="15" y2="21" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">Manual Review</h3>
                <p className="text-xs text-gray-500">Spreadsheet-based</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Takes 2-4 hours per audit",
                "Checks 1-2 rules at best",
                "No stress testing",
                "Results in a shared Google Doc",
                "Reviewed quarterly (if someone remembers)",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-yellow-500/60 shrink-0">&#9679;</span>
                  <span className="text-gray-400">{text}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-yellow-900/15 border border-yellow-800/30 rounded-lg text-center">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                &ldquo;Looks Fine&rdquo;
              </span>
              <p className="text-[10px] text-gray-500 mt-1">Missed 2 critical violations</p>
            </div>
          </div>

          {/* AEGIS Audit */}
          <div className="p-6 bg-gray-900 border border-blue-800/40 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 border border-blue-800/40 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-100">AEGIS Audit</h3>
                <p className="text-xs text-gray-500">AI-powered compliance</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Takes 30 seconds, end to end",
                "10 compliance rules + AI analysis",
                "Stress tests included (\"what if ETH drops 30%?\")",
                "Professional PDF report for stakeholders",
                "On-demand — run anytime, any wallet",
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-blue-400 shrink-0">&#10003;</span>
                  <span className="text-gray-300">{text}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-red-900/15 border border-red-800/30 rounded-lg text-center">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                2 Violations Found
              </span>
              <p className="text-[10px] text-gray-400 mt-1">42% concentration + stablecoin floor breach</p>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="mt-8 text-center max-w-2xl mx-auto">
          <p className="text-sm text-gray-400 leading-relaxed">
            In this real scenario, a manual spreadsheet review concluded the treasury was
            &ldquo;healthy.&rdquo; AEGIS found a <span className="text-red-400 font-medium">42% single-token concentration</span> and
            a <span className="text-red-400 font-medium">stablecoin floor violation</span> — both
            caught in under 30 seconds with deterministic policy checks.
          </p>
        </div>
      </div>
    </section>
  );
}
