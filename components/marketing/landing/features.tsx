import type { FC } from "react";

export const ToknFeatures: FC = () => {
  return (
    <section id="features" style={{ padding: "100px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="section-label reveal">Features</div>
        <h2 className="section-title reveal">
          Everything your team
          <br />
          needs to <em>move together</em>
        </h2>

        <div className="bento reveal">
          <div className="bento-card wide">
            <div className="bento-icon" style={{ background: "#EEEDFE" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="2" y="5" width="6" height="10" rx="2" fill="#534AB7" opacity=".3" />
                <rect x="11" y="3" width="7" height="14" rx="2" fill="#534AB7" />
              </svg>
            </div>
            <div className="bento-title">Visual token editor with live preview</div>
            <div className="bento-body">
              Adjust sliders and watch your component animate in real time. Button, Card, Modal,
              Toast - preview every token on real UI before you ship it.
            </div>
            <div className="bento-code">
              <span className="kw">initial</span>
              {`={{opacity:`}
              <span className="num">0</span>
              {`, y:`}
              <span className="num">16</span>
              {`}}`}
              <br />
              <span className="kw">animate</span>
              {`={{opacity:`}
              <span className="num">1</span>
              {`, y:`}
              <span className="num">0</span>
              {`}}`}
              <br />
              <span className="kw">transition</span>
              {`={{duration:`}
              <span className="num">0.3</span>
              {`, ease:`}
              <span className="str">"easeOut"</span>
              {`}}`}
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon" style={{ background: "#E1F5EE" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 2v16M2 10h16"
                  stroke="#0F6E56"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="bento-title">Three export formats</div>
            <div className="bento-body">
              Framer Motion props, CSS keyframes + variables, and raw JSON. Every format includes
              a reduced-motion fallback - automatically.
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon" style={{ background: "#FAEEDA" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="14" height="14" rx="3" stroke="#854F0B" strokeWidth="1.5" fill="none" />
                <path
                  d="M7 10l2 2 4-4"
                  stroke="#854F0B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="bento-title">Token versioning</div>
            <div className="bento-body">
              Publish named versions. Developers pin their npm package. Breaking changes are flagged
              - never silent surprises in production.
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon" style={{ background: "#EEEDFE" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="7" stroke="#534AB7" strokeWidth="1.5" fill="none" />
                <path
                  d="M10 7v4l2.5 2.5"
                  stroke="#534AB7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="bento-title">Token change history</div>
            <div className="bento-body">
              Every value change is logged with who changed it and when. Animation behaving
              differently? Find out in one click.
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon" style={{ background: "#E1F5EE" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10h12M10 4l6 6-6 6"
                  stroke="#0F6E56"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="bento-title">npm package generation</div>
            <div className="bento-body">
              Download a complete, typed TypeScript package. npm install @yourteam/motion and
              every component can import tokens by name.
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon" style={{ background: "#FAECE7" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3" y="8" width="14" height="9" rx="2" fill="none" stroke="#993C1D" strokeWidth="1.5" />
                <path
                  d="M7 8V6a3 3 0 016 0v2"
                  stroke="#993C1D"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="bento-title">Team roles and access</div>
            <div className="bento-body">
              Owner, Editor, Viewer. Invite by email. Your motion system is shared but not
              uncontrolled - only the right people can publish.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

