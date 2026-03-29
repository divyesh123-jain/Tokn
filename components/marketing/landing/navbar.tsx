import type { FC } from "react";

type ToknNavbarProps = {
  signedIn?: boolean;
};

export const ToknNavbar: FC<ToknNavbarProps> = ({ signedIn = false }) => {
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
        {signedIn ? (
          <>
            <a href="/projects" className="btn-primary-sm">
              Open projects →
            </a>
            <a href="/settings" className="btn-ghost-sm">
              Account
            </a>
          </>
        ) : (
          <>
            <a href="/signin" className="btn-ghost-sm">
              Sign in
            </a>
            <a href="/signup" className="btn-primary-sm">
              Start free →
            </a>
          </>
        )}
      </div>
    </nav>
  );
};

