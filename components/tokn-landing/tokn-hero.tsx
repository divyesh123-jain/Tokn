import type { FC } from "react";

export const ToknHero: FC = () => {
  return (
    <section className="hero">
      <div className="hero-badge">
        <div className="badge-dot"></div>
        Motion tokens for product teams
      </div>

      <h1 className="hero-headline">
        Your UI deserves to
        <br />
        <em>move consistently</em>
      </h1>

      <p className="hero-sub">
        Define your animation vocabulary once. Every developer and every AI tool on
        your team uses it automatically - forever.
      </p>

      <div className="hero-cta">
        <a href="/signup" className="btn-primary-lg">
          Start free
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 7h8M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </a>
        <a href="#how" className="btn-outline-lg">
          See how it works
        </a>
      </div>

      <div className="hero-visual">
        <div className="hero-visual-topbar">
          <div className="hv-dot" style={{ background: "#E24B4A" }} />
          <div className="hv-dot" style={{ background: "#EF9F27" }} />
          <div className="hv-dot" style={{ background: "#639922" }} />
          <span className="hv-url">tokn.so/preview/acme - v1.2 - 12 tokens</span>
        </div>

        <div className="token-grid">
          <div className="token-card">
            <div className="tc-name">enter.default</div>
            <div className="tc-cat" style={{ background: "#EEEDFE", color: "#3C3489" }}>
              Enter
            </div>
            <div className="tc-preview">
              <div className="tc-bar" style={{ background: "#534AB7", width: "70%" }} />
            </div>
            <div className="tc-meta">300ms - ease-out</div>
          </div>

          <div className="token-card">
            <div className="tc-name">enter.fast</div>
            <div className="tc-cat" style={{ background: "#EEEDFE", color: "#3C3489" }}>
              Enter
            </div>
            <div className="tc-preview">
              <div className="tc-bar" style={{ background: "#534AB7", width: "45%" }} />
            </div>
            <div className="tc-meta">150ms - ease-out</div>
          </div>

          <div className="token-card">
            <div className="tc-name">spring.bouncy</div>
            <div className="tc-cat" style={{ background: "#E1F5EE", color: "#085041" }}>
              Spring
            </div>
            <div className="tc-preview">
              <div className="tc-bar" style={{ background: "#1D9E75", width: "80%" }} />
              <div className="tc-bar" style={{ background: "#9FE1CB", width: "85%" }} />
            </div>
            <div className="tc-meta">s:300 - d:20</div>
          </div>

          <div className="token-card">
            <div className="tc-name">feedback.success</div>
            <div className="tc-cat" style={{ background: "#FAEEDA", color: "#633806" }}>
              Feedback
            </div>
            <div className="tc-preview">
              <div className="tc-bar" style={{ background: "#EF9F27", width: "60%" }} />
            </div>
            <div className="tc-meta">250ms - spring</div>
          </div>
        </div>
      </div>
    </section>
  );
};

