import type { FC } from "react";

export const ToknFooter: FC = () => {
  return (
    <footer>
      <div className="footer-logo">
        <div className="footer-mark">tk</div>
        <span className="footer-name">tokn</span>
      </div>

      <div className="footer-links">
        <a href="/tokens">Docs</a>
        <a href="#">GitHub</a>
        <a href="#">Twitter</a>
        <a href="/privacy">Privacy</a>
      </div>

      <span className="footer-copy">© 2026 tokn. All rights reserved.</span>
    </footer>
  );
};

