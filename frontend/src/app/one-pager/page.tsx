import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AEGIS — Real-Time Treasury Compliance for DAOs",
  description:
    "AEGIS monitors Gnosis Safe treasuries against policy rules and flags violations instantly. Continuous compliance reports and alerts — no smart contract changes required.",
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
            .op-section { margin-bottom: 28px; }
            .op-section h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #3b82f6; margin-bottom: 10px; }
            .op-section p { font-size: 14px; color: #cbd5e1; }
            .op-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
            .op-card { background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
            .op-card h2 { margin-bottom: 8px; }
            .op-card.problem h2 { color: #ef4444; }
            .op-card.solution h2 { color: #22c55e; }
            .op-rules-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
            .op-rules-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; max-width: 66.666%; }
            .op-rule { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 14px; }
            .op-rule code { font-size: 12px; color: #3b82f6; background: #1e293b; padding: 2px 6px; border-radius: 3px; font-family: 'SF Mono', 'Fira Code', monospace; }
            .op-rule p { font-size: 12px; color: #94a3b8; margin-top: 6px; }
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
            @media (max-width: 640px) {
              .op-two-col { grid-template-columns: 1fr; }
              .op-rules-grid { grid-template-columns: 1fr; }
              .op-rules-grid-2 { grid-template-columns: 1fr; max-width: 100%; }
              .op-pricing-grid { grid-template-columns: 1fr; }
            }
          `,
        }}
      />

      <div className="op-header">
        <h1>
          <span>&#9671;</span> AEGIS
        </h1>
        <p>Real-Time Treasury Compliance for DAOs</p>
      </div>

      <div className="op-two-col">
        <div className="op-card problem">
          <h2>The Problem</h2>
          <p>
            DAO treasuries hold billions in crypto assets governed by risk
            policies that nobody enforces in real-time. Compliance is checked
            manually — if it&apos;s checked at all. Breaches go unnoticed until
            a governance post-mortem.
          </p>
        </div>
        <div className="op-card solution">
          <h2>The Solution</h2>
          <p>
            AEGIS monitors Gnosis Safe treasuries against a YAML policy file and
            flags violations instantly. Define your rules once, get continuous
            compliance reports and Telegram alerts — no smart contract changes
            required.
          </p>
        </div>
      </div>

      <div className="op-section">
        <h2>5 Policy Rule Types</h2>
        <div className="op-rules-grid">
          <div className="op-rule">
            <code>allocation_cap</code>
            <p>No single token exceeds X% of total portfolio value</p>
          </div>
          <div className="op-rule">
            <code>stablecoin_floor</code>
            <p>Stablecoins must remain above a minimum % of holdings</p>
          </div>
          <div className="op-rule">
            <code>single_asset_cap</code>
            <p>Cap absolute USD exposure to any single asset</p>
          </div>
        </div>
        <div className="op-rules-grid-2">
          <div className="op-rule">
            <code>max_tx_size</code>
            <p>Block or flag transactions above a USD threshold</p>
          </div>
          <div className="op-rule">
            <code>inactivity_alert</code>
            <p>Alert if no Safe activity for N hours/days</p>
          </div>
        </div>
      </div>

      <div className="op-section">
        <h2>Live Demo</h2>
        <div className="op-demo-box">
          <p style={{ marginBottom: 8 }}>
            Paste any Gnosis Safe address and get an instant compliance report.
          </p>
          <a
            href="https://frontend-drab-three-76.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            frontend-drab-three-76.vercel.app
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
              <li>1 Safe monitored</li>
              <li>Compliance reports</li>
              <li>Telegram alerts</li>
              <li>Email support</li>
            </ul>
          </div>
          <div className="op-tier featured">
            <h3>Executor</h3>
            <div className="price">$2,000</div>
            <div className="freq">per month</div>
            <ul>
              <li>Up to 5 Safes</li>
              <li>Custom policy rules</li>
              <li>API access</li>
              <li>Priority support</li>
            </ul>
          </div>
          <div className="op-tier">
            <h3>Institution</h3>
            <div className="price">$5,000</div>
            <div className="freq">per month</div>
            <ul>
              <li>Unlimited Safes</li>
              <li>On-chain enforcement</li>
              <li>Dedicated engineer</li>
              <li>SLA guarantee</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="op-cta">
        <p>
          Paste your Safe address and get a free compliance report in 30
          seconds.
        </p>
        <p className="sub">No contracts. No onboarding. Just your address.</p>
        <a
          className="btn"
          href="https://frontend-drab-three-76.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Try the Live Demo &rarr;
        </a>
      </div>
    </div>
  );
}
