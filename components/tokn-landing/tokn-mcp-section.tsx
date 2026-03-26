import type { FC } from "react";

const nbsp = (n: number) => "\u00A0".repeat(n);

export const ToknMcpSection: FC = () => {
  return (
    <section className="mcp-section">
      <div className="mcp-inner">
        <div className="mcp-text reveal">
          <div className="section-label">Cursor + Claude Code</div>
          <h2 className="section-title" style={{ color: "var(--white)" }}>
            AI generates
            <br />
            <em style={{ color: "var(--purple-m)" }}>on-brand motion</em>
            <br />
            automatically
          </h2>
          <p
            className="section-sub"
            style={{ color: "rgba(255,255,255,0.65)", marginTop: 16 }}
          >
            Connect Tokn as an MCP server. Every AI coding tool on your team reads your tokens
            and uses them - without you specifying a single value.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="/settings"
              className="btn-primary-lg"
              style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }}
            >
              Connect Cursor →
            </a>
            <a
              href="/settings"
              className="btn-primary-lg"
              style={{ background: "rgba(255,255,255,0.12)", color: "var(--white)" }}
            >
              Connect Claude Code →
            </a>
          </div>
        </div>

        <div className="mcp-card reveal">
          <div className="mcp-card-title">
            <div className="mcp-dot"></div>
            .cursor/mcp.json - connected
          </div>
          <div className="mcp-code">
            {"{"}
            <br />
            {nbsp(2)}
            <span className="key">"mcpServers"</span>: {`{`}
            <br />
            {nbsp(4)}
            <span className="key">"tokn"</span>: {`{`}
            <br />
            {nbsp(6)}
            <span className="key">"url"</span>:{" "}
            <span className="val">"https://tokn.so/mcp/acme"</span>,<br />
            {nbsp(6)}
            <span className="key">"apiKey"</span>:{" "}
            <span className="val">"tk_live_................................"</span>
            <br />
            {nbsp(4)}
            {`}`}
            <br />
            {nbsp(2)}
            {`}`}
            <br />
            {"}"}
          </div>
          <div className="mcp-badge">
            <div className="mcp-dot"></div>
            Cursor now uses your tokens automatically
          </div>
        </div>
      </div>
    </section>
  );
};

