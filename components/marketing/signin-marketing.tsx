"use client";

import Link from "next/link";
import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";

import { ToknMarketingStyles } from "@/components/marketing/marketing-styles";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.06 32.48 28.873 35 24 35c-5.523 0-10-4.477-10-10s4.477-10 10-10c2.557 0 4.879.966 6.626 2.542l5.657-5.657C34.406 6.053 29.845 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.6-.186-3.163-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.55 19.098 14 24 14c2.557 0 4.879.966 6.626 2.542l5.657-5.657C34.406 6.053 29.845 4 24 4c-5.845 0-10.406 2.053-13.694 4.691-1.777 1.5-3.166 3.191-4 5z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.845 0 10.406-2.053 13.694-4.691l-6.571-4.819C29.345 35.45 26.243 36 24 36c-4.873 0-9.06-2.52-11.303-6.917l-6.571 4.819C13.594 41.947 18.155 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.821 2.43-2.8 4.492-5.303 5.917l6.571 4.819C39.996 38.053 44 34.046 44 24c0-1.6-.186-3.163-.389-3.917z"
      />
    </svg>
  );
}

type ToknSignInMarketingProps = {
  email: string;
  password: string;
  showPassword: boolean;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onShowPasswordChange: (v: boolean) => void;
  onSubmit: () => void;
};

export function ToknSignInMarketing(props: ToknSignInMarketingProps) {
  const emailId = useId();
  const passwordId = useId();

  return (
    <>
      <ToknMarketingStyles />
      <nav>
        <Link href="/" className="nav-logo">
          <div className="nav-mark">tk</div>
          <span className="nav-name">tokn</span>
        </Link>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
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

      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="nav-mark">tk</div>
              <span className="nav-name" style={{ fontSize: 16 }}>
                Tokn
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--gray-400)",
                fontFamily: "var(--mono)",
              }}
            >
              Workspace ready
            </div>
          </div>

          <h1 className="auth-title">Sign in</h1>
          <p className="auth-sub">Welcome back. Keep your motion system consistent.</p>

          <form
            className="auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSubmit();
            }}
          >
            <div className="auth-field">
              <label htmlFor={emailId}>Email address</label>
              <input
                id={emailId}
                className="auth-input"
                value={props.email}
                onChange={(e) => props.onEmailChange(e.target.value)}
                type="email"
                placeholder="name@studio.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <div className="auth-row">
                <label htmlFor={passwordId}>Password</label>
                <Link href="/forgot-password" className="auth-link">
                  Forgot password?
                </Link>
              </div>

              <div className="auth-password-wrap">
                <input
                  id={passwordId}
                  className="auth-input"
                  style={{ paddingRight: 44 }}
                  value={props.password}
                  onChange={(e) => props.onPasswordChange(e.target.value)}
                  type={props.showPassword ? "text" : "password"}
                  placeholder="•••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => props.onShowPasswordChange(!props.showPassword)}
                  aria-label={props.showPassword ? "Hide password" : "Show password"}
                >
                  {props.showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button
              className="btn-primary-lg auth-submit"
              style={{ width: "100%", justifyContent: "center" }}
              type="submit"
            >
              Sign In
            </button>
          </form>

          <div className="auth-divider" style={{ marginTop: 22 }}>
            <div className="line" />
            <div style={{ fontWeight: 500, letterSpacing: ".1em" }}>OR CONTINUE WITH</div>
            <div className="line" />
          </div>

          <div style={{ marginTop: 18 }}>
            <a
              href="/api/auth/google?flow=signin"
              className="auth-social-btn"
              style={{ textDecoration: "none" }}
            >
              <GoogleIcon />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--gray-600)" }}>
                Continue with Google
              </span>
            </a>
          </div>

          <div className="auth-foot">
            <div style={{ fontSize: 13, color: "var(--gray-600)" }}>New to Tokn?</div>
            <Link href="/signup" className="auth-link">
              Create an account
            </Link>
          </div>
        </div>
      </main>

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
        <span className="footer-copy">2026 tokn. All rights reserved.</span>
      </footer>
    </>
  );
}

