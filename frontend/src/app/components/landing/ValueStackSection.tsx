export default function ValueStackSection() {
  const tools = [
    {
      name: "Compliance Engine",
      desc: "10-rule policy enforcement with configurable thresholds",
      ref: "Custom compliance tool",
      price: "$2,400/yr",
      iconBg: "bg-blue-900/30",
      iconBorder: "border-blue-800/40",
      iconColor: "text-blue-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
    },
    {
      name: "AI Risk Analyst",
      desc: "Stress tests, benchmarks, risk summaries, recommendations",
      ref: "Risk consultant retainer",
      price: "$6,000/yr",
      iconBg: "bg-purple-900/30",
      iconBorder: "border-purple-800/40",
      iconColor: "text-purple-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5v1h-4v-1A4 4 0 0 1 12 2z" />
          <path d="M10 10.5h4v2a2 2 0 0 1-4 0v-2z" />
          <path d="M9 22v-6h6v6" />
          <path d="M7 22h10" />
          <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      name: "Portfolio Analytics",
      desc: "HHI index, diversification scoring, value tracking",
      ref: "Analytics SaaS",
      price: "$1,200/yr",
      iconBg: "bg-cyan-900/30",
      iconBorder: "border-cyan-800/40",
      iconColor: "text-cyan-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
      ),
    },
    {
      name: "Monitoring & Alerts",
      desc: "Scheduled audits, notifications on breaches and risk changes",
      ref: "Monitoring subscription",
      price: "$2,400/yr",
      iconBg: "bg-amber-900/30",
      iconBorder: "border-amber-800/40",
      iconColor: "text-amber-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      name: "Reporting Suite",
      desc: "PDF reports, shareable audit links, audit comparison",
      ref: "Reporting tool license",
      price: "$1,800/yr",
      iconBg: "bg-green-900/30",
      iconBorder: "border-green-800/40",
      iconColor: "text-green-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      name: "Multi-Chain Coverage",
      desc: "Ethereum, Solana, BSC, Base, Arbitrum, Polygon",
      ref: "Multi-chain data aggregator",
      price: "$3,600/yr",
      iconBg: "bg-indigo-900/30",
      iconBorder: "border-indigo-800/40",
      iconColor: "text-indigo-400",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          Six Tools. One Platform.
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-2xl mx-auto">
          Every treasury cobbles together separate tools for compliance, analytics,
          monitoring, and reporting. AEGIS replaces the stack.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="p-5 bg-gray-900 border border-gray-800 rounded-xl flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${tool.iconBg} border ${tool.iconBorder} flex items-center justify-center ${tool.iconColor} shrink-0`}
                >
                  {tool.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-100">{tool.name}</h3>
                  <p className="text-[10px] text-gray-600">{tool.ref}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{tool.desc}</p>
              <p className="text-sm font-medium text-gray-500 line-through mt-auto">
                {tool.price}
              </p>
            </div>
          ))}
        </div>

        {/* Total reveal */}
        <div className="mt-10 text-center">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">
            Bought separately
          </p>
          <p className="text-3xl md:text-4xl font-bold text-gray-600 line-through mb-3">
            $17,400+/yr
          </p>
          <p className="text-lg md:text-xl font-semibold text-gray-200 mb-2">
            Included with <span className="gradient-text">AEGIS</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            All six tools. One platform. Start free.
          </p>
          <a
            href="#demo"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm transition min-h-[48px] leading-[48px]"
          >
            Try the Free Audit &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
