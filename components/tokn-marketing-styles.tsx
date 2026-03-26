import type { ReactNode } from "react";

export function ToknMarketingStyles({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <>
      <style>{`
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --purple:   #534AB7;
  --purple-l: #EEEDFE;
  --purple-m: #AFA9EC;
  --purple-d: #3C3489;
  --teal:     #0F6E56;
  --teal-l:   #E1F5EE;
  --teal-m:   #5DCAA5;
  --amber:    #854F0B;
  --amber-l:  #FAEEDA;
  --coral:    #993C1D;
  --coral-l:  #FAECE7;
  --gray-900: #2C2C2A;
  --gray-600: #5F5E5A;
  --gray-400: #888780;
  --gray-200: #D3D1C7;
  --gray-100: #F1EFE8;
  --gray-50:  #F8F8F6;
  --white:    #FFFFFF;
  --serif: 'Instrument Serif', Georgia, serif;
  --sans:  'Geist', system-ui, sans-serif;
  --mono:  'Geist Mono', monospace;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--sans);
  background: var(--white);
  color: var(--gray-900);
  line-height: 1.6;
  overflow-x: hidden;
}

nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40px; height: 60px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 0.5px solid var(--gray-200);
}
.nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.nav-mark {
  width: 28px; height: 28px; border-radius: 7px;
  background: var(--purple); display: flex; align-items: center;
  justify-content: center; font-family: var(--mono); font-size: 11px;
  font-weight: 500; color: var(--purple-l); letter-spacing: -0.5px;
}
.nav-name { font-size: 16px; font-weight: 500; color: var(--gray-900); }
.nav-links { display: flex; gap: 28px; }
.nav-links a { font-size: 13px; color: var(--gray-600); text-decoration: none; transition: color .2s; }
.nav-links a:hover { color: var(--gray-900); }
.nav-right { display: flex; gap: 10px; align-items: center; }
.btn-ghost-sm {
  font-size: 13px; padding: 6px 14px; border-radius: 7px;
  border: 0.5px solid var(--gray-200); background: transparent;
  color: var(--gray-600); cursor: pointer; text-decoration: none;
  transition: background .15s, border-color .15s;
}
.btn-ghost-sm:hover { background: var(--gray-50); border-color: var(--gray-200); }
.btn-primary-sm {
  font-size: 13px; font-weight: 500; padding: 6px 16px; border-radius: 7px;
  background: var(--purple); color: var(--purple-l); border: none;
  cursor: pointer; text-decoration: none; transition: background .15s;
}
.btn-primary-sm:hover { background: var(--purple-d); }

.hero {
  min-height: 100vh; padding: 120px 40px 80px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  text-align: center;
  position: relative; overflow: hidden;
}
.hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--purple-l); border: 0.5px solid var(--purple-m);
  border-radius: 20px; padding: 5px 14px;
  font-size: 12px; font-weight: 500; color: var(--purple-d);
  margin-bottom: 28px;
  animation: fadeUp .6s ease-out both;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--purple); }
.hero-headline {
  font-family: var(--serif);
  font-size: clamp(48px, 7vw, 88px);
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--gray-900);
  max-width: 820px;
  margin-bottom: 24px;
  animation: fadeUp .6s .1s ease-out both;
}
.hero-headline em {
  font-style: italic;
  color: var(--purple);
}
.hero-sub {
  font-size: clamp(16px, 2vw, 19px);
  color: var(--gray-600);
  max-width: 540px;
  line-height: 1.65;
  margin-bottom: 40px;
  animation: fadeUp .6s .2s ease-out both;
}
.hero-cta {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: center;
  margin-bottom: 64px;
  animation: fadeUp .6s .3s ease-out both;
}
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 500; padding: 13px 28px; border-radius: 10px;
  background: var(--purple); color: var(--purple-l); border: none;
  cursor: pointer; text-decoration: none; transition: background .15s, transform .1s;
}
.btn-primary-lg:hover { background: var(--purple-d); transform: translateY(-1px); }
.btn-outline-lg {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 15px; padding: 13px 28px; border-radius: 10px;
  border: 0.5px solid var(--gray-200); background: transparent;
  color: var(--gray-600); cursor: pointer; text-decoration: none;
  transition: border-color .15s, background .15s;
}
.btn-outline-lg:hover { border-color: var(--purple-m); background: var(--purple-l); color: var(--purple-d); }
.hero-cta-note { font-size: 12px; color: var(--gray-400); }

.hero-visual {
  width: 100%; max-width: 860px;
  background: var(--gray-50);
  border: 0.5px solid var(--gray-200);
  border-radius: 16px;
  padding: 24px;
  animation: fadeUp .6s .4s ease-out both;
  position: relative;
}
.hero-visual-topbar {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 20px;
}
.hv-dot { width: 10px; height: 10px; border-radius: 50%; }
.hv-url {
  flex: 1; text-align: center;
  font-family: var(--mono); font-size: 11px; color: var(--gray-400);
}
.token-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.token-card {
  background: var(--white); border: 0.5px solid var(--gray-200);
  border-radius: 10px; padding: 14px;
  transition: border-color .2s, transform .2s;
  cursor: pointer;
}
.token-card:hover { border-color: var(--purple-m); transform: translateY(-2px); }
.tc-name { font-size: 12px; font-weight: 500; color: var(--gray-900); margin-bottom: 4px; }
.tc-cat {
  font-size: 10px; font-weight: 500; padding: 2px 7px;
  border-radius: 10px; display: inline-block; margin-bottom: 10px;
}
.tc-preview {
  height: 32px; background: var(--gray-100); border-radius: 5px;
  margin-bottom: 8px; display: flex; align-items: center;
  justify-content: center; padding: 0 8px; gap: 4px; overflow: hidden;
}
.tc-bar { height: 4px; border-radius: 2px; }
.tc-meta { font-size: 10px; color: var(--gray-400); font-family: var(--mono); }

@keyframes barEnter { from { width: 0; opacity: 0; } to { opacity: 1; } }
.token-card:hover .tc-bar { animation: barEnter .4s ease-out forwards; }

.section { padding: 100px 40px; max-width: 1100px; margin: 0 auto; }
.section-label {
  font-size: 11px; font-weight: 500; letter-spacing: .1em;
  text-transform: uppercase; color: var(--purple);
  margin-bottom: 16px;
}
.section-title {
  font-family: var(--serif);
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.15; letter-spacing: -0.02em;
  color: var(--gray-900); margin-bottom: 20px;
}
.section-title em { font-style: italic; color: var(--purple); }
.section-sub { font-size: 17px; color: var(--gray-600); max-width: 560px; line-height: 1.65; }

.ba-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 48px; }
.ba-card { border-radius: 14px; padding: 28px; }
.ba-card.before { background: var(--coral-l); border: 0.5px solid #F0997B; }
.ba-card.after  { background: var(--teal-l);  border: 0.5px solid var(--teal-m); }
.ba-title { font-size: 13px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
.ba-card.before .ba-title { color: var(--coral); }
.ba-card.after  .ba-title { color: var(--teal); }
.ba-item { font-size: 13px; line-height: 1.7; padding: 6px 0; border-bottom: 0.5px solid rgba(0,0,0,0.06); display: flex; align-items: flex-start; gap: 8px; }
.ba-item:last-child { border-bottom: none; }
.ba-icon { font-size: 12px; margin-top: 2px; flex-shrink: 0; }
.ba-card.before .ba-item { color: #712B13; }
.ba-card.after  .ba-item { color: var(--teal); }

.hiw-bg { background: var(--gray-50); border-top: 0.5px solid var(--gray-200); border-bottom: 0.5px solid var(--gray-200); }
.steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; margin-top: 48px; }
.step-card {
  background: var(--white); border: 0.5px solid var(--gray-200);
  border-radius: 14px; padding: 28px; position: relative;
  transition: border-color .2s;
}
.step-card:hover { border-color: var(--purple-m); }
.step-num {
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--purple-l); color: var(--purple);
  font-size: 13px; font-weight: 500; font-family: var(--mono);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.step-title { font-size: 16px; font-weight: 500; color: var(--gray-900); margin-bottom: 8px; }
.step-body { font-size: 14px; color: var(--gray-600); line-height: 1.65; }
.step-connector {
  position: absolute; right: -13px; top: 50%;
  transform: translateY(-50%);
  width: 26px; height: 1px; background: var(--gray-200);
  z-index: 1;
}
.step-connector::after {
  content: ''; position: absolute; right: -4px; top: -3px;
  width: 6px; height: 6px; border-top: 1px solid var(--gray-200); border-right: 1px solid var(--gray-200);
  transform: rotate(45deg);
}

.bento { display: grid; grid-template-columns: repeat(3,1fr); grid-template-rows: auto auto; gap: 14px; margin-top: 48px; }
.bento-card {
  background: var(--white); border: 0.5px solid var(--gray-200);
  border-radius: 14px; padding: 28px;
  transition: border-color .2s, transform .15s;
}
.bento-card:hover { border-color: var(--purple-m); transform: translateY(-2px); }
.bento-card.wide { grid-column: span 2; }
.bento-card.tall { grid-row: span 2; }
.bento-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px; font-size: 18px;
}
.bento-title { font-size: 16px; font-weight: 500; color: var(--gray-900); margin-bottom: 8px; }
.bento-body { font-size: 13px; color: var(--gray-600); line-height: 1.65; }
.bento-code {
  margin-top: 16px; background: var(--gray-50); border: 0.5px solid var(--gray-200);
  border-radius: 8px; padding: 12px 14px;
  font-family: var(--mono); font-size: 11px; color: var(--gray-600);
  line-height: 1.8;
}
.bento-code .kw { color: var(--purple); }
.bento-code .str { color: var(--teal); }
.bento-code .num { color: var(--amber); }

.mcp-section { background: var(--purple); padding: 80px 40px; }
.mcp-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.mcp-text .section-label { color: var(--purple-m); }
.mcp-text .section-title { color: var(--white); }
.mcp-text .section-sub { color: rgba(255,255,255,0.7); }
.mcp-card {
  background: rgba(255,255,255,0.08); border: 0.5px solid rgba(255,255,255,0.15);
  border-radius: 14px; padding: 24px;
}
.mcp-card-title { font-size: 13px; font-weight: 500; color: var(--purple-l); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
.mcp-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--teal-m); }
.mcp-code {
  font-family: var(--mono); font-size: 11px; line-height: 1.9;
  color: rgba(255,255,255,0.65);
}
.mcp-code .key { color: var(--purple-m); }
.mcp-code .val { color: var(--teal-m); }
.mcp-badge {
  margin-top: 16px; display: inline-flex; align-items: center; gap: 6px;
  background: rgba(93,202,165,0.15); border: 0.5px solid var(--teal-m);
  border-radius: 20px; padding: 4px 12px;
  font-size: 12px; color: var(--teal-m);
}

.proof-section { background: var(--gray-50); padding: 80px 40px; border-top: 0.5px solid var(--gray-200); }
.proof-inner { max-width: 1100px; margin: 0 auto; }
.proof-title { font-family: var(--serif); font-size: 36px; color: var(--gray-900); text-align: center; margin-bottom: 48px; }
.proof-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.proof-card {
  background: var(--white); border: 0.5px solid var(--gray-200);
  border-radius: 14px; padding: 24px;
}
.proof-quote { font-size: 14px; color: var(--gray-600); line-height: 1.7; margin-bottom: 20px; font-style: italic; }
.proof-author { display: flex; align-items: center; gap: 10px; }
.proof-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 500;
}
.proof-name { font-size: 13px; font-weight: 500; color: var(--gray-900); }
.proof-role { font-size: 11px; color: var(--gray-400); }

.pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 48px; }
.pricing-card {
  border-radius: 14px; padding: 28px;
  border: 0.5px solid var(--gray-200); background: var(--white);
  transition: border-color .2s;
}
.pricing-card:hover { border-color: var(--purple-m); }
.pricing-card.featured {
  border: 1.5px solid var(--purple);
  background: var(--purple-l);
  position: relative;
}
.featured-badge {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: var(--purple); color: var(--purple-l);
  font-size: 11px; font-weight: 500; padding: 3px 12px; border-radius: 20px;
}
.pricing-plan { font-size: 13px; font-weight: 500; color: var(--gray-400); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .06em; }
.pricing-card.featured .pricing-plan { color: var(--purple); }
.pricing-price { font-size: 36px; font-weight: 600; color: var(--gray-900); margin-bottom: 4px; font-family: var(--mono); }
.pricing-card.featured .pricing-price { color: var(--purple-d); }
.pricing-period { font-size: 13px; color: var(--gray-400); margin-bottom: 24px; }
.pricing-features { list-style: none; margin-bottom: 24px; padding: 0; margin-top: 0; }
.pricing-features li {
  font-size: 13px; color: var(--gray-600); padding: 7px 0;
  border-bottom: 0.5px solid var(--gray-100);
  display: flex; align-items: center; gap: 8px;
}
.pricing-features li:last-child { border-bottom: none; }
.pricing-card.featured .pricing-features li { color: var(--purple-d); border-color: var(--purple-m); }
.check { color: var(--teal); font-size: 12px; }
.pricing-card.featured .check { color: var(--purple); }
.pricing-btn {
  width: 100%; padding: 11px; border-radius: 8px; font-size: 14px; font-weight: 500;
  cursor: pointer; border: 0.5px solid var(--gray-200);
  background: transparent; color: var(--gray-600);
  transition: all .15s;
}
.pricing-btn:hover { background: var(--gray-50); }
.pricing-btn.featured-btn {
  background: var(--purple); color: var(--purple-l); border-color: var(--purple);
}
.pricing-btn.featured-btn:hover { background: var(--purple-d); }

.cta-footer { padding: 100px 40px; text-align: center; border-top: 0.5px solid var(--gray-200); }
.cta-footer .section-title { font-size: clamp(36px,5vw,64px); max-width: 700px; margin: 0 auto 20px; }
.cta-footer .section-sub { margin: 0 auto 40px; }
.cta-note { font-size: 12px; color: var(--gray-400); margin-top: 16px; }

footer {
  background: var(--gray-900); padding: 40px;
  display: flex; align-items: center; justify-content: space-between;
}
.footer-logo { display: flex; align-items: center; gap: 8px; }
.footer-mark {
  width: 22px; height: 22px; border-radius: 5px;
  background: var(--purple); display: flex; align-items: center;
  justify-content: center; font-family: var(--mono); font-size: 9px;
  font-weight: 500; color: var(--purple-l);
}
.footer-name { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.6); }
.footer-links { display: flex; gap: 24px; }
.footer-links a { font-size: 12px; color: rgba(255,255,255,0.4); text-decoration: none; }
.footer-links a:hover { color: rgba(255,255,255,0.7); }
.footer-copy { font-size: 12px; color: rgba(255,255,255,0.3); }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
.reveal {
  opacity: 0; transform: translateY(24px);
  transition: opacity .6s ease-out, transform .6s ease-out;
}
.reveal.visible { opacity: 1; transform: translateY(0); }

.hero::before {
  content: '';
  position: absolute; inset: 0;
  background-image: radial-gradient(circle at 1px 1px, var(--gray-200) 1px, transparent 0);
  background-size: 32px 32px;
  opacity: 0.5;
  pointer-events: none;
}
.hero::after {
  content: '';
  position: absolute;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(83,74,183,0.08) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (max-width: 768px) {
  nav { padding: 0 20px; }
  .nav-links { display: none; }
  .hero { padding: 100px 20px 60px; }
  .token-grid { grid-template-columns: repeat(2,1fr); }
  .ba-grid, .steps, .bento, .mcp-inner, .proof-grid, .pricing-grid { grid-template-columns: 1fr; }
  .bento-card.wide { grid-column: span 1; }
  .section { padding: 60px 20px; }
  footer { flex-direction: column; gap: 20px; text-align: center; }
}

/* Auth pages (sign in / sign up) */
.auth-page {
  padding: 110px 40px 80px;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.auth-card {
  width: 100%;
  max-width: 520px;
  background: var(--white);
  border: 0.5px solid var(--gray-200);
  border-radius: 16px;
  padding: 28px;
}
.auth-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}
.auth-title {
  font-family: var(--serif);
  font-size: 40px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 14px 0 6px;
}
.auth-sub {
  color: var(--gray-600);
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 22px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auth-field label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--gray-600);
  margin-bottom: 8px;
}
.auth-input {
  width: 100%;
  border: 0.5px solid var(--gray-200);
  background: var(--white);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  outline: none;
  color: var(--gray-900);
}
.auth-input:focus {
  border-color: var(--purple-m);
  box-shadow: 0 0 0 3px rgba(83,74,183,0.12);
}
.auth-password-wrap {
  position: relative;
}
.auth-eye-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--gray-600);
}
.auth-eye-btn:hover {
  background: var(--gray-50);
}
.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.auth-link {
  font-size: 13px;
  color: var(--purple);
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }
.auth-submit {
  width: 100%;
  margin-top: 4px;
}
.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gray-400);
  font-size: 12px;
  margin-top: 2px;
}
.auth-divider .line { flex: 1; height: 1px; background: rgba(0,0,0,0.08); }
.auth-social-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.auth-social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  border-radius: 10px;
  border: 0.5px solid var(--gray-200);
  background: var(--white);
  color: var(--gray-600);
  cursor: pointer;
  text-decoration: none;
}
.auth-social-btn:hover { background: var(--gray-50); }
.auth-foot {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 768px) {
  .auth-page { padding: 100px 20px 60px; }
  .auth-card { padding: 22px; }
  .auth-title { font-size: 34px; }
  .auth-social-grid { grid-template-columns: 1fr; }
}
      `}</style>
      {children}
    </>
  );
}

