import type { FC } from "react";

export const ToknHowItWorks: FC = () => {
  return (
    <section className="hiw-bg" id="how" style={{ padding: "100px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-label reveal">How it works</div>
        <h2 className="section-title reveal">
          From token to code
          <br />
          in <em>three steps</em>
        </h2>

        <div className="steps reveal">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-title">Define your tokens</div>
            <div className="step-body">
              Name your animations. Set duration, easing, spring values using visual sliders.
              Watch them animate live on real components. Save to your team workspace.
            </div>
            <div className="step-connector"></div>
          </div>

          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-title">Publish and share</div>
            <div className="step-body">
              Publish a versioned snapshot. Share the preview URL with your PM. Download the npm
              package for your team. Every format - Framer Motion, CSS, JSON.
            </div>
            <div className="step-connector"></div>
          </div>

          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-title">Every tool uses it</div>
            <div className="step-body">
              Developers import the package. Cursor reads tokens via MCP. The ESLint plugin
              flags anything hardcoded. Your motion system enforces itself.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

