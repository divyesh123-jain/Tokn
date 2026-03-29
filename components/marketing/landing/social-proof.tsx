import type { FC } from "react";

export const ToknSocialProof: FC = () => {
  return (
    <section className="proof-section">
      <div className="proof-inner">
        <h2 className="proof-title reveal">
          Teams that <em style={{ fontStyle: "italic" }}>ship consistent motion</em>
        </h2>

        <div className="proof-grid reveal">
          <div className="proof-card">
            <div className="proof-quote">
              "We had 6 developers using 6 different easing values. Tokn made our whole app
              feel like it was built by one person."
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "#EEEDFE", color: "#534AB7" }}>
                AK
              </div>
              <div>
                <div className="proof-name">Arjun Kumar</div>
                <div className="proof-role">Frontend Lead - Acme Corp</div>
              </div>
            </div>
          </div>

          <div className="proof-card">
            <div className="proof-quote">
              "I used to spend 30 minutes explaining motion intent to developers. Now I share
              a Tokn URL and they get it in 10 seconds."
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "#E1F5EE", color: "#085041" }}>
                PS
              </div>
              <div>
                <div className="proof-name">Priya Sharma</div>
                <div className="proof-role">Product Designer - Razorpay</div>
              </div>
            </div>
          </div>

          <div className="proof-card">
            <div className="proof-quote">
              "The MCP server is what sold me. Cursor now generates correct animations without
              me writing a single prompt about timing."
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: "#FAEEDA", color: "#633806" }}>
                RV
              </div>
              <div>
                <div className="proof-name">Rahul Verma</div>
                <div className="proof-role">Staff Engineer - Startup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

