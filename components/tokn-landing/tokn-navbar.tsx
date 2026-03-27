import type { FC } from "react";

export const ToknNavbar: FC = () => {
  return (
    <nav>
      <a className="nav-logo" href="/">
        <div className="nav-mark">tk</div>
        <span className="nav-name">tokn</span>
      </a>
      <div className="nav-links">
        <a href="#how">How it works</a>
        <a href="#features">Features</a>
        {/* <a href="#pricing">Pricing</a> */}
        <a href="/tokens">Docs</a>
      </div>
      <div className="nav-right">
        <a href="/signin" className="btn-ghost-sm">
          Sign in
        </a>
        <a href="/signup" className="btn-primary-sm">
          Start free →
        </a>
      </div>
    </nav>
  );
};

