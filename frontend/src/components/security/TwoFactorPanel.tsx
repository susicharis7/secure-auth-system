import { useState, type FormEvent } from "react";
import type { ApiResult, MfaMethod } from "../../types/auth";
import { ResultBlock } from "../ui/ResultBlock";

type TwoFactorPanelProps = {
  title: string;
  subtitle: string;
  selectedMethod: MfaMethod | null;
  enabledMethods: MfaMethod[];
  availableMethods: MfaMethod[];
  totpQrDataUrl: string;
  trustDeviceEligible?: boolean;
  trustDeviceSelected?: boolean;
  onSelectMethod: (method: MfaMethod) => void;
  onTrustDeviceChange?: (value: boolean) => void;
  onSendSms: () => Promise<void>;
  onVerifySms: (code: string) => Promise<void>;
  onSendEmail: () => Promise<void>;
  onVerifyEmail: (code: string) => Promise<void>;
  onSetupTotp: () => Promise<void>;
  onVerifyTotp: (token: string) => Promise<void>;
  smsSendResult?: ApiResult;
  smsVerifyResult?: ApiResult;
  emailSendResult?: ApiResult;
  emailVerifyResult?: ApiResult;
  totpSetupResult?: ApiResult;
  totpVerifyResult?: ApiResult;
  disableResult?: ApiResult;
  smsSendLoading?: boolean;
  smsVerifyLoading?: boolean;
  emailSendLoading?: boolean;
  emailVerifyLoading?: boolean;
  totpSetupLoading?: boolean;
  totpVerifyLoading?: boolean;
  disableLoading?: boolean;
  onDisable?: (method: MfaMethod) => Promise<void>;
};

const inputClass =
  "app-input";
const buttonClass =
  "btn-primary";
const secondaryButtonClass =
  "btn-secondary";

export function TwoFactorPanel({
  title,
  subtitle,
  selectedMethod,
  enabledMethods,
  availableMethods,
  totpQrDataUrl,
  trustDeviceEligible,
  trustDeviceSelected,
  onSelectMethod,
  onTrustDeviceChange,
  onSendSms,
  onVerifySms,
  onSendEmail,
  onVerifyEmail,
  onSetupTotp,
  onVerifyTotp,
  smsSendResult,
  smsVerifyResult,
  emailSendResult,
  emailVerifyResult,
  totpSetupResult,
  totpVerifyResult,
  disableResult,
  smsSendLoading,
  smsVerifyLoading,
  emailSendLoading,
  emailVerifyLoading,
  totpSetupLoading,
  totpVerifyLoading,
  disableLoading,
  onDisable,
}: TwoFactorPanelProps) {
  const [smsCode, setSmsCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [totpToken, setTotpToken] = useState("");

  function supports(method: MfaMethod): boolean {
    return availableMethods.includes(method);
  }

  async function submitSmsVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifySms(smsCode);
  }

  async function submitEmailVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifyEmail(emailCode);
  }

  async function submitTotpVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onVerifyTotp(totpToken);
  }

  return (
    <section className="app-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="app-kicker">{title}</p>
          <h2 className="app-heading">{subtitle}</h2>
          <div className="two-factor-status-row">
            <div className="two-factor-status-card">
              <span>Selected Method</span>
              <strong>{selectedMethod?.toUpperCase() ?? "NONE"}</strong>
            </div>
            <div className="two-factor-status-card">
              <span>Enabled Methods</span>
              <strong>{enabledMethods.length > 0 ? enabledMethods.join(", ").toUpperCase() : "NONE"}</strong>
            </div>
          </div>
          {trustDeviceEligible && onTrustDeviceChange && (
            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <input
                type="checkbox"
                checked={trustDeviceSelected === true}
                onChange={(event) => onTrustDeviceChange(event.target.checked)}
              />
              Trust this device for 10 days (credentials login only)
            </label>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className={selectedMethod === "sms" ? buttonClass : secondaryButtonClass}
            type="button"
            onClick={() => {
              onSelectMethod("sms");
              void onSendSms();
            }}
            disabled={smsSendLoading || !supports("sms")}
          >
            {smsSendLoading ? "Sending..." : "Setup SMS"}
          </button>
          <button
            className={selectedMethod === "email" ? buttonClass : secondaryButtonClass}
            type="button"
            onClick={() => {
              onSelectMethod("email");
              void onSendEmail();
            }}
            disabled={emailSendLoading || !supports("email")}
          >
            {emailSendLoading ? "Sending..." : "Setup Email"}
          </button>
          <button
            className={selectedMethod === "totp" ? buttonClass : secondaryButtonClass}
            type="button"
            onClick={() => {
              onSelectMethod("totp");
              void onSetupTotp();
            }}
            disabled={totpSetupLoading || !supports("totp")}
          >
            {totpSetupLoading ? "Generating..." : "Setup TOTP"}
          </button>
        </div>
      </div>

      {onDisable && (
        <div className="security-method-card mt-4">
          <h3 className="mb-2 font-bold text-[var(--text-primary)]">Disable 2FA method</h3>
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Backend blocks disabling the last active method.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={() => void onDisable("sms")}
              disabled={disableLoading}
            >
              Disable SMS
            </button>
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={() => void onDisable("email")}
              disabled={disableLoading}
            >
              Disable Email
            </button>
            <button
              className={secondaryButtonClass}
              type="button"
              onClick={() => void onDisable("totp")}
              disabled={disableLoading}
            >
              Disable TOTP
            </button>
          </div>
          {disableResult && <ResultBlock title="Disable 2FA" result={disableResult} />}
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <form className="security-method-card" onSubmit={submitSmsVerify}>
          <h3 className="mb-3 font-bold text-[var(--text-primary)]">SMS code</h3>
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
          <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={smsVerifyLoading}>
            {smsVerifyLoading ? "Verifying..." : "Verify SMS"}
          </button>
          {smsSendResult && <ResultBlock title="SMS code sent" result={smsSendResult} />}
          {smsVerifyResult && <ResultBlock title="SMS verification" result={smsVerifyResult} />}
        </form>

        <form className="security-method-card" onSubmit={submitEmailVerify}>
          <h3 className="mb-3 font-bold text-[var(--text-primary)]">Email code</h3>
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
          <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={emailVerifyLoading}>
            {emailVerifyLoading ? "Verifying..." : "Verify Email 2FA"}
          </button>
          {emailSendResult && <ResultBlock title="Email code sent" result={emailSendResult} />}
          {emailVerifyResult && <ResultBlock title="Email verification" result={emailVerifyResult} />}
        </form>

        <form className="security-method-card" onSubmit={submitTotpVerify}>
          <h3 className="mb-3 font-bold text-[var(--text-primary)]">TOTP token</h3>
          {totpQrDataUrl && (
            <img
              className="mb-3 h-36 w-36 rounded-lg border border-[var(--line)] bg-white p-1"
              src={totpQrDataUrl}
              alt="TOTP QR code"
            />
          )}
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
          <button className={`${buttonClass} mt-3 w-full`} type="submit" disabled={totpVerifyLoading}>
            {totpVerifyLoading ? "Verifying..." : "Verify TOTP"}
          </button>
          {totpSetupResult && <ResultBlock title="TOTP setup" result={totpSetupResult} />}
          {totpVerifyResult && <ResultBlock title="TOTP verification" result={totpVerifyResult} />}
        </form>
      </div>
    </section>
  );
}
