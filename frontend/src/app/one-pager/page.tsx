import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AEGIS — Real-Time Treasury Compliance for Crypto",
  description:
    "AEGIS audits any crypto wallet against 10 institutional-grade risk rules with AI analysis. Ethereum, Solana, Base, Arbitrum, Polygon, BSC. Free instant audit — no signup required.",
  openGraph: {
    title: "AEGIS — Real-Time Treasury Compliance for Crypto",
    description:
      "Six tools in one platform. 10 compliance rules, AI risk analysis, multi-chain coverage. Replaces $17,400+/yr of separate tools.",
    url: "https://aegistreasury.com/one-pager",
    siteName: "AEGIS",
    type: "website",
    images: [
      {
        url: "https://aegistreasury.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "AEGIS — Treasury Compliance Platform for Crypto",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AEGIS — Six Tools. One Platform.",
    description:
      "10 compliance rules. AI analysis. PDF reports. 6 chains. Replaces $17,400+/yr of separate tools.",
    images: ["https://aegistreasury.com/og-image.png"],
    creator: "@aegistreasury",
  },
  alternates: { canonical: "/one-pager" },
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
            .op-value-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; }
            .op-value-item { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 14px; }
            .op-value-item .val-name { font-size: 13px; color: #f8fafc; font-weight: 600; }
            .op-value-item .val-ref { font-size: 10px; color: #64748b; margin-top: 2px; }
            .op-value-item p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .op-value-item .val-price { font-size: 12px; color: #64748b; text-decoration: line-through; margin-top: 6px; font-weight: 600; }
            .op-value-total { text-align: center; margin-top: 16px; padding: 16px; background: #111827; border: 1px solid #1e293b; border-radius: 8px; }
            .op-value-total .struck { font-size: 24px; font-weight: 800; color: #64748b; text-decoration: line-through; }
            .op-value-total .included { font-size: 16px; font-weight: 700; color: #f8fafc; margin-top: 4px; }
            .op-value-total .included span { color: #3b82f6; }
            .op-platform-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
            .op-platform-item { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 12px 14px; }
            .op-platform-item .plat-name { font-size: 13px; color: #f8fafc; font-weight: 600; }
            .op-platform-item p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .op-pricing-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
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
              .op-value-grid { grid-template-columns: 1fr; }
              .op-platform-grid { grid-template-columns: 1fr; }
              .op-pricing-grid { grid-template-columns: 1fr 1fr; }
            }
            @media print {
              body { background: #fff; color: #1a1a2e; }
              .op-header h1 { color: #1a1a2e; }
              .op-header h1 span { color: #2563eb; }
              .op-header p, .op-header .chains { color: #475569; }
              .op-header { border-bottom-color: #e2e8f0; }
              .op-section h2 { color: #2563eb; }
              .op-section p { color: #334155; }
              .op-card, .op-rule, .op-ai-item, .op-stat, .op-tier, .op-demo-box, .op-value-item, .op-value-total, .op-platform-item { background: #f8fafc; border-color: #e2e8f0; }
              .op-card.problem h2 { color: #dc2626; }
              .op-card.solution h2 { color: #16a34a; }
              .op-rule .rule-name, .op-ai-item .ai-name, .op-value-item .val-name, .op-platform-item .plat-name { color: #1a1a2e; }
              .op-rule p, .op-ai-item p, .op-value-item p, .op-platform-item p { color: #475569; }
              .op-value-item .val-price { color: #475569; }
              .op-value-total .struck { color: #475569; }
              .op-value-total .included { color: #1a1a2e; }
              .op-value-total .included span { color: #2563eb; }
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

      {/* Platform capabilities */}
      <div className="op-section">
        <h2>Platform Capabilities</h2>
        <p>
          Beyond rules and AI, AEGIS is a full treasury operations platform.
        </p>
        <div className="op-platform-grid">
          <div className="op-platform-item">
            <div className="plat-name">Audit Sharing</div>
            <p>Generate public links to share reports with stakeholders. Revoke access anytime.</p>
          </div>
          <div className="op-platform-item">
            <div className="plat-name">Audit Comparison</div>
            <p>Diff two audits side-by-side to track risk changes over time.</p>
          </div>
          <div className="op-platform-item">
            <div className="plat-name">Team &amp; Org Management</div>
            <p>Invite team members with role-based access (admin, member, viewer).</p>
          </div>
          <div className="op-platform-item">
            <div className="plat-name">Notification Center</div>
            <p>Real-time alerts on violations, risk changes, and audit completions.</p>
          </div>
          <div className="op-platform-item">
            <div className="plat-name">PDF Reports</div>
            <p>Download professional compliance reports for board presentations and auditors.</p>
          </div>
          <div className="op-platform-item">
            <div className="plat-name">Client Management</div>
            <p>Group wallets by entity. Manage multiple treasuries from one dashboard.</p>
          </div>
        </div>
      </div>

      {/* Value stack */}
      <div className="op-section">
        <h2>Six Tools. One Platform.</h2>
        <p>
          Every treasury cobbles together separate tools. AEGIS replaces the stack.
        </p>
        <div className="op-value-grid">
          <div className="op-value-item">
            <div className="val-name">Compliance Engine</div>
            <div className="val-ref">Custom compliance tool</div>
            <p>10-rule policy enforcement with configurable thresholds</p>
            <div className="val-price">$2,400/yr</div>
          </div>
          <div className="op-value-item">
            <div className="val-name">AI Risk Analyst</div>
            <div className="val-ref">Risk consultant retainer</div>
            <p>Stress tests, benchmarks, risk summaries, recommendations</p>
            <div className="val-price">$6,000/yr</div>
          </div>
          <div className="op-value-item">
            <div className="val-name">Portfolio Analytics</div>
            <div className="val-ref">Analytics SaaS</div>
            <p>HHI index, diversification scoring, value tracking</p>
            <div className="val-price">$1,200/yr</div>
          </div>
          <div className="op-value-item">
            <div className="val-name">Monitoring &amp; Alerts</div>
            <div className="val-ref">Monitoring subscription</div>
            <p>Scheduled audits, notifications on breaches and risk changes</p>
            <div className="val-price">$2,400/yr</div>
          </div>
          <div className="op-value-item">
            <div className="val-name">Reporting Suite</div>
            <div className="val-ref">Reporting tool license</div>
            <p>PDF reports, shareable audit links, audit comparison</p>
            <div className="val-price">$1,800/yr</div>
          </div>
          <div className="op-value-item">
            <div className="val-name">Multi-Chain Coverage</div>
            <div className="val-ref">Multi-chain data aggregator</div>
            <p>Ethereum, Solana, BSC, Base, Arbitrum, Polygon</p>
            <div className="val-price">$3,600/yr</div>
          </div>
        </div>
        <div className="op-value-total">
          <div className="struck">$17,400+/yr</div>
          <div className="included">Included with <span>AEGIS</span></div>
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
        <p>Start free. Upgrade when you need ongoing monitoring.</p>
        <div className="op-pricing-grid">
          <div className="op-tier">
            <h3>Free</h3>
            <div className="price">$0</div>
            <div className="freq">forever</div>
            <ul>
              <li>On-demand audits</li>
              <li>10 compliance rules</li>
              <li>AI risk analysis</li>
              <li>Shareable audit links</li>
            </ul>
          </div>
          <div className="op-tier featured">
            <h3>Pro</h3>
            <div className="price">$149</div>
            <div className="freq">per month</div>
            <ul>
              <li>5 monitored wallets</li>
              <li>Scheduled audits</li>
              <li>Audit history &amp; comparison</li>
              <li>PDF reports &amp; alerts</li>
            </ul>
          </div>
          <div className="op-tier">
            <h3>Team</h3>
            <div className="price">$499</div>
            <div className="freq">per month</div>
            <ul>
              <li>20 monitored wallets</li>
              <li>Client management</li>
              <li>Team roles &amp; orgs</li>
              <li>Multi-wallet dashboard</li>
            </ul>
          </div>
          <div className="op-tier">
            <h3>Enterprise</h3>
            <div className="price">Custom</div>
            <div className="freq">contact us</div>
            <ul>
              <li>Unlimited wallets</li>
              <li>White-label option</li>
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
