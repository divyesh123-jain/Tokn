import type { FC } from "react";

export const ToknFinalCta: FC = () => {
  return (
    <section className="cta-footer">
      <div className="section-label reveal">Get started today</div>
      <h2 className="section-title reveal">
        Your UI is ready to
        <br />
        <em>move like it means it</em>
      </h2>
      <p className="section-sub reveal">
        Join teams who stopped guessing and started shipping consistent, intentional motion
        - in under 10 minutes.
      </p>

      <div className="hero-cta reveal">
        <a href="/signup" className="btn-primary-lg">
          Create your workspace free →
        </a>
        <a href="/preview" className="btn-outline-lg">
          View live demo
        </a>
      </div>

      <p className="cta-note">Free forever for solo - No credit card - tokn.so</p>
    </section>
  );
};

