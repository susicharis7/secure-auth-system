import type { PropsWithChildren } from "react";

type PageLayoutProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle?: string;
}>;

export function PageLayout({ eyebrow, title, subtitle, children }: PageLayoutProps) {
  return (
    <div className="page-shell">
      <div className="layout-container">
        <div className="app-topbar">
          <div className="auth-brand-row">
            <span className="auth-brand-mark">S</span>
            <span>Secure Auth System (SSD)</span>
          </div>
          <span className="topbar-pill">{eyebrow}</span>
        </div>

        <header className="hero-card">
          <p className="hero-kicker">{eyebrow}</p>
          <h1 className="hero-title">{title}</h1>
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
        </header>

        <main className="mt-5">{children}</main>
      </div>
    </div>
  );
}
