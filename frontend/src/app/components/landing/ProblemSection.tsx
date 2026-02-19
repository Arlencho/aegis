export default function ProblemSection() {
  const cards = [
    {
      hook: "Policy lives in Notion",
      detail:
        "Risk limits are written in governance docs but never enforced programmatically. Drift happens silently.",
      colorClass: "pain-card-red",
    },
    {
      hook: "Compliance is manual",
      detail:
        "Someone checks a spreadsheet — maybe. One missed rebalance and you're over-concentrated without knowing it.",
      colorClass: "pain-card-orange",
    },
    {
      hook: "No alerts until it's too late",
      detail:
        "By the time a breach surfaces in a governance call, the damage is already done.",
      colorClass: "pain-card-yellow",
    },
  ];

  return (
    <section className="py-16 md:py-24 px-4 sm:px-6 md:px-12 bg-gray-950/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-2xl md:text-3xl font-bold mb-4">
          The Problem
        </h2>
        <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
          Most crypto treasuries manage millions with rules that exist only on
          paper
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`pain-card ${card.colorClass} p-6 bg-gray-900 border border-gray-800 rounded-xl`}
            >
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                {card.hook}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
