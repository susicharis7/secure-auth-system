import { useState, type FormEvent, type ReactNode } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { AuthLoading, AuthResults, DemoUser, MfaMethod } from "../types/auth";

type TwoFactorVerifyPageProps = {
  user: DemoUser | null;
  methods: MfaMethod[];
  selectedMethod: MfaMethod | null;
  trustDeviceEligible: boolean;
  trustDeviceSelected: boolean;
  loading: AuthLoading;
  results: AuthResults;
  onSelectMethod: (method: MfaMethod) => void;
  onTrustDeviceChange: (value: boolean) => void;
  onSendSms: () => Promise<void>;
  onSendEmail: () => Promise<void>;
  onVerifySms: (code: string) => Promise<void>;
  onVerifyEmail: (code: string) => Promise<void>;
  onVerifyTotp: (token: string) => Promise<void>;
  onVerifyRecoveryCode: (recoveryCode: string) => Promise<void>;
};

const inputClass =
  "app-input";
const buttonClass =
  "btn-primary";
const secondaryButtonClass =
  "btn-secondary";

function hasMethod(methods: MfaMethod[], target: MfaMethod): boolean {
  return methods.includes(target);
}

type IconProps = { className?: string };

function IconPhone({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8 3.8h8a1.8 1.8 0 0 1 1.8 1.8v12.8a1.8 1.8 0 0 1-1.8 1.8H8a1.8 1.8 0 0 1-1.8-1.8V5.6A1.8 1.8 0 0 1 8 3.8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 6.4h4M11.2 17.4h1.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconMail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4.5 7.2A2.2 2.2 0 0 1 6.7 5h10.6a2.2 2.2 0 0 1 2.2 2.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.7a2.2 2.2 0 0 1-2.2-2.2V7.2Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5.2 7 6.8 5.2L18.8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconKey({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="8.3" cy="12.3" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11.6 12.3h8M16 12.3v2.6M18.8 12.3v2.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3.3 5 6.1v6.1c0 4.6 2.9 8.8 7 10.1 4.1-1.3 7-5.5 7-10.1V6.1l-7-2.8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="m9.2 12 1.8 1.8 3.8-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MethodIcon({ children }: { children: ReactNode }) {
  return <span className="security-method-icon">{children}</span>;
}

export function TwoFactorVerifyPage({
  user,
  methods,
  selectedMethod,
  trustDeviceEligible,
  trustDeviceSelected,
  loading,
  results,
  onSelectMethod,
  onTrustDeviceChange,
  onSendSms,
  onSendEmail,
  onVerifySms,
  onVerifyEmail,
  onVerifyTotp,
  onVerifyRecoveryCode,
}: TwoFactorVerifyPageProps) {
  const [smsCode, setSmsCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");

  async function submitSms(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifySms(smsCode.trim());
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifyEmail(emailCode.trim());
  }

  async function submitTotp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifyTotp(totpToken.trim());
  }

  async function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifyRecoveryCode(recoveryCode.trim().toUpperCase());
  }

  return (
    <PageLayout
      eyebrow="Auth Flow"
      title="Verify 2FA"
      subtitle="Enter one valid factor to continue to dashboard."
    >
      <section className="app-card">
        <div className="verify-summary-card">
          <div className="verify-user-block">
            <span className="verify-avatar">{user?.fullName?.slice(0, 1).toUpperCase() || "U"}</span>
            <div>
              <span className="info-label">Signed in as</span>
              <strong className="verify-user-name">{user ? user.fullName : "Unknown user"}</strong>
              <p>{user?.email || user?.username || "Pending account"}</p>
            </div>
          </div>

          <div className="verify-chip-grid">
            <div className="verify-chip">
              <span>Active methods</span>
              <strong>{methods.length > 0 ? methods.join(", ").toUpperCase() : "N/A"}</strong>
            </div>
            <div className="verify-chip verify-chip-selected">
              <span>Selected method</span>
              <strong>{selectedMethod?.toUpperCase() ?? "NONE"}</strong>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {hasMethod(methods, "sms") && (
            <button
              className={selectedMethod === "sms" ? buttonClass : secondaryButtonClass}
              type="button"
              onClick={() => {
                onSelectMethod("sms");
                void onSendSms();
              }}
              disabled={loading.smsSend}
            >
              {loading.smsSend ? "Sending..." : "Resend SMS code"}
            </button>
          )}
          {hasMethod(methods, "email") && (
            <button
              className={selectedMethod === "email" ? buttonClass : secondaryButtonClass}
              type="button"
              onClick={() => {
                onSelectMethod("email");
                void onSendEmail();
              }}
              disabled={loading.emailSend}
            >
              {loading.emailSend ? "Sending..." : "Resend Email code"}
            </button>
          )}
        </div>

        {trustDeviceEligible && (
          <label className="trust-checkbox mt-4">
            <input
              type="checkbox"
              checked={trustDeviceSelected}
              onChange={(event) => onTrustDeviceChange(event.target.checked)}
            />
            <span className="trust-checkbox-box">
              <IconShield className="trust-checkbox-icon" />
            </span>
            <span>
              <strong>Trust this device</strong>
              <small>Skip 2FA on this device for 10 days after credential login.</small>
            </span>
          </label>
        )}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {hasMethod(methods, "sms") && (
          <form className="security-method-card" onSubmit={submitSms}>
            <div className="security-method-head">
              <MethodIcon><IconPhone className="security-method-svg" /></MethodIcon>
              <div>
                <h3 className="m-0 font-bold text-[var(--text-primary)]">Verify SMS</h3>
                <p className="security-method-copy">Use phone code.</p>
              </div>
            </div>
            <label className="grid gap-1 text-sm text-[var(--text-muted)]">
              Code
              <input
                className={inputClass}
                value={smsCode}
                onChange={(event) => setSmsCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={loading.smsVerify}>
              {loading.smsVerify ? "Verifying..." : "Verify SMS"}
            </button>
            {results.smsSend && <ResultBlock title="SMS code sent" result={results.smsSend} />}
            {results.smsVerify && <ResultBlock title="SMS verification" result={results.smsVerify} />}
          </form>
        )}

        {hasMethod(methods, "email") && (
          <form className="security-method-card" onSubmit={submitEmail}>
            <div className="security-method-head">
              <MethodIcon><IconMail className="security-method-svg" /></MethodIcon>
              <div>
                <h3 className="m-0 font-bold text-[var(--text-primary)]">Verify Email</h3>
                <p className="security-method-copy">Use inbox code.</p>
              </div>
            </div>
            <label className="grid gap-1 text-sm text-[var(--text-muted)]">
              Code
              <input
                className={inputClass}
                value={emailCode}
                onChange={(event) => setEmailCode(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={loading.emailVerify}>
              {loading.emailVerify ? "Verifying..." : "Verify Email"}
            </button>
            {results.emailSend && <ResultBlock title="Email code sent" result={results.emailSend} />}
            {results.emailVerify && <ResultBlock title="Email verification" result={results.emailVerify} />}
          </form>
        )}

        {hasMethod(methods, "totp") && (
          <form className="security-method-card" onSubmit={submitTotp}>
            <div className="security-method-head">
              <MethodIcon><IconShield className="security-method-svg" /></MethodIcon>
              <div>
                <h3 className="m-0 font-bold text-[var(--text-primary)]">Verify TOTP</h3>
                <p className="security-method-copy">Use app token.</p>
              </div>
            </div>
            <label className="grid gap-1 text-sm text-[var(--text-muted)]">
              Authenticator token
              <input
                className={inputClass}
                value={totpToken}
                onChange={(event) => setTotpToken(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={loading.totpVerify}>
              {loading.totpVerify ? "Verifying..." : "Verify TOTP"}
            </button>
            {results.totpVerify && <ResultBlock title="TOTP verification" result={results.totpVerify} />}
          </form>
        )}

        <form className="security-method-card" onSubmit={submitRecovery}>
          <div className="security-method-head">
            <MethodIcon><IconKey className="security-method-svg" /></MethodIcon>
            <div>
              <h3 className="m-0 font-bold text-[var(--text-primary)]">Recovery Code</h3>
              <p className="security-method-copy">Use backup code.</p>
            </div>
          </div>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Recovery code
            <input
              className={inputClass}
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
              placeholder="ABC-12345"
              required
            />
          </label>
          <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={loading.recoveryVerify}>
            {loading.recoveryVerify ? "Verifying..." : "Verify Recovery Code"}
          </button>
          {results.recoveryVerify && <ResultBlock title="Recovery code verification" result={results.recoveryVerify} />}
        </form>
      </section>

      {results.login && <ResultBlock title="Login" result={results.login} />}
    </PageLayout>
  );
}
