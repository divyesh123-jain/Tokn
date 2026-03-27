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
              <span className="ba-chip ba-chip-before">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="#993C1D" strokeWidth="1" />
                  <path
                    d="M5 5l4 4M9 5l-4 4"
                    stroke="#993C1D"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                Without tokn
              </span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>Dev A writes duration: 300ms on the modal</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>Dev B writes transition: all 0.25s on the sidebar</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>Cursor writes duration: 0.35s ease-out on the button</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>Nobody decided any of this. It just accumulated.</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>Rebrand takes 2 days hunting through code</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-before">-</span>
              <span>New developer joins and has no idea what to use</span>
            </div>
          </div>

          <div className="ba-card after">
            <div className="ba-title">
              <span className="ba-chip ba-chip-after">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="6" stroke="#0F6E56" strokeWidth="1" />
                  <path
                    d="M4.5 7l2 2 3-3"
                    stroke="#0F6E56"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                With tokn
              </span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>One token: enter.default used everywhere</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>Cursor reads your tokens via MCP automatically</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>Every AI-generated animation is on-brand</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>Change one token, every component updates</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>Rebrand takes 2 minutes, not 2 days</span>
            </div>
            <div className="ba-item">
              <span className="ba-icon ba-icon-after">+</span>
              <span>New dev imports and uses correctly on day one</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

