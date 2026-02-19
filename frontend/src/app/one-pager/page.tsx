import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AEGIS — Real-Time Treasury Compliance for Crypto",
  description:
    "AEGIS audits any crypto wallet against 10 institutional-grade risk rules with AI analysis. Ethereum, Solana, Base, Arbitrum, Polygon, BSC. Free instant audit — no signup required.",
};

export default function OnePagerPage() {
  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        background: "#0a0e17",
        color: "#e2e8f0",
        lineHeight: 1.5,
        padding: "48px 56px",
        maxWidth: 800,
        margin: "0 auto",
        minHeight: "100vh",
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .op-header { text-align: center; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 1px solid #1e293b; }
            .op-header h1 { font-size: 42px; font-weight: 800; letter-spacing: 6px; color: #f8fafc; margin-bottom: 6px; }
            .op-header h1 span { color: #3b82f6; }
            .op-header p { font-size: 16px; color: #94a3b8; font-weight: 400; }
            .op-header .chains { font-size: 12px; color: #64748b; margin-top: 8px; letter-spacing: 1px; }
            .op-section { margin-bottom: 28px; }
            .op-section h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #3b82f6; margin-bottom: 10px; }
            .op-section p { font-size: 14px; color: #cbd5e1; }
            .op-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
            .op-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
            .op-card h2 { margin-bottom: 8px; }
            .op-card.problem h2 { color: #ef4444; }
            .op-card.solution h2 { color: #22c55e; }
            .op-rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
            .op-rule { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 14px; }
            .op-rule .rule-name { font-size: 13px; color: #f8fafc; font-weight: 600; }
            .op-rule p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .op-ai-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
            .op-ai-item { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 14px; }
            .op-ai-item .ai-name { font-size: 13px; color: #f8fafc; font-weight: 600; }
            .op-ai-item p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .op-stats { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
            .op-stat { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; text-align: center; }
            .op-stat .num { font-size: 28px; font-weight: 800; color: #3b82f6; }
            .op-stat .label { font-size: 11px; color: #94a3b8; margin-top: 2px; }
            .op-pricing-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 12px; }
            .op-tier { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; text-align: center; }
            .op-tier.featured { border-color: #3b82f6; background: #0f1a2e; }
            .op-tier h3 { font-size: 14px; color: #f8fafc; margin-bottom: 4px; }
            .op-tier .price { font-size: 24px; font-weight: 800; color: #3b82f6; margin-bottom: 4px; }
            .op-tier .freq { font-size: 11px; color: #64748b; }
            .op-tier ul { list-style: none; margin-top: 10px; font-size: 12px; color: #94a3b8; text-align: left; padding: 0; }
            .op-tier ul li::before { content: "\\2713  "; color: #22c55e; }
            .op-demo-box { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 18px; text-align: center; margin-top: 12px; }
            .op-demo-box a { color: #3b82f6; text-decoration: none; font-weight: 600; }
            .op-demo-box a:hover { text-decoration: underline; }
            .op-cta { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1e293b; }
            .op-cta p { font-size: 18px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; }
            .op-cta .sub { font-size: 13px; color: #94a3b8; font-weight: 400; }
            .op-cta .btn { display: inline-block; margin-top: 14px; background: #3b82f6; color: #fff; padding: 10px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; }
            .op-cta .btn:hover { background: #2563eb; }
            @media (max-width: 640px) {
              .op-two-col { grid-template-columns: 1fr; }
              .op-rules-grid { grid-template-columns: 1fr; }
              .op-ai-grid { grid-template-columns: 1fr; }
              .op-stats { grid-template-columns: 1fr 1fr; }
              .op-pricing-grid { grid-template-columns: 1fr; }
            }
            @media print {
              body { background: #fff; color: #1a1a2e; }
              .op-header h1 { color: #1a1a2e; }
              .op-header h1 span { color: #2563eb; }
              .op-header p, .op-header .chains { color: #475569; }
              .op-header { border-bottom-color: #e2e8f0; }
              .op-section h2 { color: #2563eb; }
              .op-section p { color: #334155; }
              .op-card, .op-rule, .op-ai-item, .op-stat, .op-tier, .op-demo-box { background: #f8fafc; border-color: #e2e8f0; }
              .op-card.problem h2 { color: #dc2626; }
              .op-card.solution h2 { color: #16a34a; }
              .op-rule .rule-name, .op-ai-item .ai-name { color: #1a1a2e; }
              .op-rule p, .op-ai-item p { color: #475569; }
              .op-stat .num { color: #2563eb; }
              .op-stat .label { color: #475569; }
              .op-tier h3 { color: #1a1a2e; }
              .op-tier .price { color: #2563eb; }
              .op-tier ul { color: #475569; }
              .op-tier ul li::before { color: #16a34a; }
              .op-tier.featured { border-color: #2563eb; background: #eff6ff; }
              .op-demo-box a { color: #2563eb; }
              .op-cta { border-top-color: #e2e8f0; }
              .op-cta p { color: #1a1a2e; }
              .op-cta .sub { color: #475569; }
              .op-cta .btn { background: #2563eb; }
            }
          `,
        }}
      />

      <div className="op-header">
        <h1>
          <span>&#9671;</span> AEGIS
        </h1>
        <p>Real-Time Treasury Compliance for Crypto</p>
        <div className="chains">
          ETHEREUM &middot; SOLANA &middot; BASE &middot; ARBITRUM &middot; POLYGON &middot; BSC
        </div>
      </div>

      {/* Stats bar */}
      <div className="op-stats">
        <div className="op-stat">
          <div className="num">10</div>
          <div className="label">Risk Rules</div>
        </div>
        <div className="op-stat">
          <div className="num">6</div>
          <div className="label">Chains</div>
        </div>
        <div className="op-stat">
          <div className="num">30s</div>
          <div className="label">Full Audit</div>
        </div>
        <div className="op-stat">
          <div className="num">$0</div>
          <div className="label">Free to Try</div>
        </div>
      </div>

      <div className="op-two-col">
        <div className="op-card problem">
          <h2>The Problem</h2>
          <p>
            Crypto treasuries hold millions governed by risk policies that nobody
            enforces in real-time. Compliance is checked manually via
            spreadsheets — if it&apos;s checked at all. Breaches surface in
            governance post-mortems, after the damage is done.
          </p>
        </div>
        <div className="op-card solution">
          <h2>The Solution</h2>
          <p>
            AEGIS audits any wallet on 6 chains against 10 institutional-grade
            compliance rules, then runs AI analysis for stress tests and
            actionable recommendations. Set your rules once, schedule recurring
            audits, and get webhook alerts on every violation.
          </p>
        </div>
      </div>

      <div className="op-section">
        <h2>10 Policy Rules</h2>
        <p>
          Aligned with EU MiCA, FinCEN, FATF, and Basel III frameworks.
          Every threshold is adjustable per client.
        </p>
        <div className="op-rules-grid">
          <div className="op-rule">
            <div className="rule-name">Concentration Cap</div>
            <p>No single token exceeds X% of total portfolio</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Stablecoin Floor</div>
            <p>Stablecoins stay above a minimum % of holdings</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Absolute Asset Cap</div>
            <p>Cap USD exposure to any single asset</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Transaction Size Limit</div>
            <p>Flag transactions above a USD threshold</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Activity Monitor</div>
            <p>Alert if no wallet activity for N hours/days</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Min Diversification</div>
            <p>Portfolio must hold at least N distinct tokens</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Volatile Exposure Cap</div>
            <p>Non-stablecoin assets cannot exceed X% of portfolio</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Min Treasury Value</div>
            <p>Total portfolio stays above a USD solvency floor</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Relative Tx Cap</div>
            <p>No single tx exceeds X% of total portfolio value</p>
          </div>
          <div className="op-rule">
            <div className="rule-name">Concentration Index (HHI)</div>
            <p>Herfindahl-Hirschman Index stays below threshold</p>
          </div>
        </div>
      </div>

      <div className="op-section">
        <h2>AI-Powered Analysis</h2>
        <p>
          Every audit includes an AI layer that goes beyond pass/fail rules.
        </p>
        <div className="op-ai-grid">
          <div className="op-ai-item">
            <div className="ai-name">Risk Summary</div>
            <p>Plain-English assessment of overall treasury health</p>
          </div>
          <div className="op-ai-item">
            <div className="ai-name">Stress Testing</div>
            <p>&quot;What if ETH drops 30%?&quot; scenario analysis</p>
          </div>
          <div className="op-ai-item">
            <div className="ai-name">Industry Benchmarks</div>
            <p>Compare against similar-sized treasuries</p>
          </div>
          <div className="op-ai-item">
            <div className="ai-name">Actionable Recommendations</div>
            <p>Specific steps to reach compliance</p>
          </div>
        </div>
      </div>

      <div className="op-section">
        <h2>Live Demo</h2>
        <div className="op-demo-box">
          <p style={{ marginBottom: 8 }}>
            Paste any wallet address and get a full compliance report + AI
            analysis in 30 seconds. No signup required.
          </p>
          <a
            href="https://aegistreasury.com/#demo"
            target="_blank"
            rel="noopener noreferrer"
          >
            Try it now &rarr;
          </a>
        </div>
      </div>

      <div className="op-section">
        <h2>Pricing</h2>
        <div className="op-pricing-grid">
          <div className="op-tier">
            <h3>Advisor</h3>
            <div className="price">$500</div>
            <div className="freq">per month</div>
            <ul>
              <li>3 wallets monitored</li>
              <li>Scheduled audits</li>
              <li>Webhook alerts</li>
              <li>Email support</li>
            </ul>
          </div>
          <div className="op-tier featured">
            <h3>Executor</h3>
            <div className="price">$2,000</div>
            <div className="freq">per month</div>
            <ul>
              <li>Up to 20 wallets</li>
              <li>Custom rule thresholds</li>
              <li>Team &amp; org management</li>
              <li>Priority support</li>
            </ul>
          </div>
          <div className="op-tier">
            <h3>Institution</h3>
            <div className="price">$5,000</div>
            <div className="freq">per month</div>
            <ul>
              <li>Unlimited wallets</li>
              <li>Multi-org white-label</li>
              <li>Dedicated engineer</li>
              <li>SLA guarantee</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="op-cta">
        <p>
          Paste your wallet address. Get a free compliance report in 30 seconds.
        </p>
        <p className="sub">No contracts. No onboarding. Just your address.</p>
        <a
          className="btn"
          href="https://aegistreasury.com/#demo"
          target="_blank"
          rel="noopener noreferrer"
        >
          Try the Live Demo &rarr;
        </a>
      </div>
    </div>
  );
}
