import type { FC } from "react";

export const ToknProblem: FC = () => {
  return (
    <section
      style={{ padding: "100px 40px", borderTop: "0.5px solid var(--gray-200)" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-label reveal">The problem</div>
        <h2 className="section-title reveal">
          Your team ships
          <br />
          <em>inconsistent motion</em> every day
        </h2>
        <p className="section-sub reveal">
          Nobody agrees. Everyone guesses. Cursor invents different values on every prompt.
          The app feels incoherent and nobody can explain why.
        </p>

        <div className="ba-grid reveal">
          <div className="ba-card before">
            <div className="ba-title">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#993C1D"
                  strokeWidth="1"
                />
                <path
                  d="M5 5l4 4M9 5l-4 4"
                  stroke="#993C1D"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              Without tokn
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>Dev A writes duration: 300ms on the modal
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>Dev B writes transition: all 0.25s on the sidebar
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>Cursor writes duration: 0.35s ease-out on the button
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>Nobody decided any of this. It just accumulated.
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>Rebrand takes 2 days hunting through code
            </div>
            <div className="ba-item">
              <span className="ba-icon">-</span>New developer joins and has no idea what to use
            </div>
          </div>

          <div className="ba-card after">
            <div className="ba-title">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="#0F6E56"
                  strokeWidth="1"
                />
                <path
                  d="M4.5 7l2 2 3-3"
                  stroke="#0F6E56"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              With tokn
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>One token: enter.default used everywhere
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>Cursor reads your tokens via MCP automatically
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>Every AI-generated animation is on-brand
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>Change one token, every component updates
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>Rebrand takes 2 minutes, not 2 days
            </div>
            <div className="ba-item">
              <span className="ba-icon">+</span>New dev imports and uses correctly on day one
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

