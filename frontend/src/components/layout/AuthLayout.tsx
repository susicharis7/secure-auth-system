import type { PropsWithChildren, ReactNode } from "react";

type AuthLayoutProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  sideTitle: string;
  sideCopy: string;
  highlights?: string[];
  footer?: ReactNode;
}>;

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  sideTitle,
  sideCopy,
  highlights = [],
  footer,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <section className="auth-split">
        <aside className="auth-story-panel">
          <div className="auth-brand-row">
            <span className="auth-brand-mark">S</span>
            <span>Secure Auth System (SSD)</span>
          </div>
          <div>
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1 className="auth-story-title">{sideTitle}</h1>
            <p className="auth-story-copy">{sideCopy}</p>
          </div>
          {highlights.length > 0 && (
            <div className="auth-highlight-grid">
              {highlights.map((item) => (
                <div className="auth-highlight" key={item}>
                  <span className="auth-highlight-dot" />
                  {item}
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="auth-form-panel">
          <div className="auth-form-inner">
            <div className="auth-mobile-brand">
              <span className="auth-brand-mark">S</span>
              <span>Secure Auth System (SSD)</span>
            </div>
            <p className="auth-eyebrow">{eyebrow}</p>
            <h2 className="auth-form-title">{title}</h2>
            <p className="auth-form-copy">{subtitle}</p>
            {children}
            {footer}
          </div>
        </main>
      </section>
    </div>
  );
}
