export default function HowItWorksSection() {
  const steps = [
    {
      number: "1",
      title: "Paste your wallet address",
      detail:
        "Works with Ethereum wallets (Safe multisig or regular) and Solana wallets. No API keys, no setup, no signup.",
    },
    {
      number: "2",
      title: "Set your risk rules",
      detail:
        "10 built-in compliance rules aligned with EU, US, and Asian regulatory frameworks. Adjust thresholds or use our defaults.",
    },
    {
      number: "3",
      title: "Get AI-powered analysis",
      detail:
        "Instant compliance report + AI analyzes your risk posture, runs stress tests, and recommends actions.",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          How It Works
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          From address to actionable insights in three steps
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="step-connector text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed md:pl-[52px]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
