import type { FC } from "react";

export const ToknPricing: FC = () => {
  return (
    <section id="pricing" style={{ padding: "100px 40px", borderTop: "0.5px solid var(--gray-200)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-label reveal">Pricing</div>
        <h2 className="section-title reveal">
          Start free.
          <br />
          <em>Pay when your team grows.</em>
        </h2>

        <div className="pricing-grid reveal">
          <div className="pricing-card">
            <div className="pricing-plan">Free</div>
            <div className="pricing-price">Rs 0</div>
            <div className="pricing-period">forever</div>
            <ul className="pricing-features">
              <li>
                <span className="check">✓</span>1 workspace
              </li>
              <li>
                <span className="check">✓</span>Up to 20 tokens
              </li>
              <li>
                <span className="check">✓</span>All export formats
              </li>
              <li>
                <span className="check">✓</span>Shareable preview URL
              </li>
              <li>
                <span className="check">✓</span>Solo use
              </li>
            </ul>
            <button className="pricing-btn" type="button">
              Get started free
            </button>
          </div>

          <div className="pricing-card featured">
            <div className="featured-badge">Most popular</div>
            <div className="pricing-plan">Solo</div>
            <div className="pricing-price">Rs 499</div>
            <div className="pricing-period">per month</div>
            <ul className="pricing-features">
              <li>
                <span className="check">✓</span>Unlimited tokens
              </li>
              <li>
                <span className="check">✓</span>Version history
              </li>
              <li>
                <span className="check">✓</span>npm package download
              </li>
              <li>
                <span className="check">✓</span>Token change history
              </li>
              <li>
                <span className="check">✓</span>MCP server access
              </li>
            </ul>
            <button className="pricing-btn featured-btn" type="button">
              Start Solo plan
            </button>
          </div>

          <div className="pricing-card">
            <div className="pricing-plan">Team</div>
            <div className="pricing-price">Rs 2,999</div>
            <div className="pricing-period">per month</div>
            <ul className="pricing-features">
              <li>
                <span className="check">✓</span>Everything in Solo
              </li>
              <li>
                <span className="check">✓</span>Unlimited team members
              </li>
              <li>
                <span className="check">✓</span>Role-based access
              </li>
              <li>
                <span className="check">✓</span>ESLint plugin
              </li>
              <li>
                <span className="check">✓</span>Slack integration
              </li>
            </ul>
            <button className="pricing-btn" type="button">
              Start Team plan
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

