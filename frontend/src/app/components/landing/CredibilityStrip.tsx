export default function CredibilityStrip() {
  return (
    <section className="py-8 px-4 sm:px-6 md:px-12 border-y border-gray-800/50">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-center mb-4">
          <span className="text-xs text-gray-500">
            Built for treasuries in the <span className="text-gray-300 font-medium">$250K&ndash;$10M</span> range
          </span>
          <span className="hidden md:block text-gray-800">|</span>
          <span className="text-xs text-gray-500">
            <span className="text-gray-300 font-medium">10 compliance rules</span> aligned with global standards
          </span>
          <span className="hidden md:block text-gray-800">|</span>
          <span className="text-xs text-gray-500">
            <span className="text-gray-300 font-medium">Advisory mode</span> — zero autonomous execution
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
          {[
            { region: "EU", frameworks: "MiCA, AIFMD" },
            { region: "Americas", frameworks: "SEC, FinCEN, FATF" },
            { region: "Asia", frameworks: "MAS, Japan FSA" },
            { region: "Nordics", frameworks: "Finansinspektionen" },
            { region: "UK", frameworks: "FCA" },
          ].map((item) => (
            <span key={item.region} className="text-[10px] text-gray-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
              <span className="text-gray-400 font-medium">{item.region}</span>
              <span className="text-gray-600">{item.frameworks}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
