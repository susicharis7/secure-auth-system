import { PageLayout } from "../components/layout/PageLayout";
import { TwoFactorPanel } from "../components/security/TwoFactorPanel";
import type { ApiResult, AuthLoading, AuthResults, DemoUser, MfaMethod } from "../types/auth";

type TwoFactorSetupPageProps = {
  user: DemoUser | null;
  selectedMethod: MfaMethod | null;
  availableMethods: MfaMethod[];
  enabledMethods: MfaMethod[];
  totpQrDataUrl: string;
  trustDeviceEligible: boolean;
  trustDeviceSelected: boolean;
  results: AuthResults;
  loading: AuthLoading;
  onSelectMethod: (method: MfaMethod) => void;
  onTrustDeviceChange: (value: boolean) => void;
  onSendSms: () => Promise<void>;
  onVerifySms: (code: string) => Promise<void>;
  onSendEmail: () => Promise<void>;
  onVerifyEmail: (code: string) => Promise<void>;
  onSetupTotp: () => Promise<void>;
  onVerifyTotp: (token: string) => Promise<void>;
  onGoLogin: () => void;
};

export function TwoFactorSetupPage({
  user,
  selectedMethod,
  availableMethods,
  enabledMethods,
  totpQrDataUrl,
  trustDeviceEligible,
  trustDeviceSelected,
  results,
  loading,
  onSelectMethod,
  onTrustDeviceChange,
  onSendSms,
  onVerifySms,
  onSendEmail,
  onVerifyEmail,
  onSetupTotp,
  onVerifyTotp,
  onGoLogin,
}: TwoFactorSetupPageProps) {
  const sessionProbeResult = results.sessionProbe as ApiResult | undefined;

  return (
    <PageLayout
      eyebrow="Auth Flow"
      title="2FA Setup Required"
      subtitle="Choose one method and verify it to enter your dashboard."
    >
      {user && (
        <section className="app-muted-card mb-4">
          <div className="text-sm text-[var(--text-muted)]">
            Logged user: <strong>{user.fullName}</strong>{" "}
            <span className="text-[#8ca0c9]">({user.email || user.username})</span>
          </div>
        </section>
      )}

      {!user && sessionProbeResult && (
        <section className="app-muted-card mb-4">
          <p className="text-sm text-[var(--text-muted)]">
            Session exists but user details are not loaded yet. Login again to refresh profile in UI.
          </p>
          <button
            className="btn-secondary mt-2"
            type="button"
            onClick={onGoLogin}
          >
            Go to login
          </button>
        </section>
      )}

      <TwoFactorPanel
        title="MFA setup"
        subtitle="Setup SMS, Email, or TOTP. At least one method must be enabled."
        selectedMethod={selectedMethod}
        enabledMethods={enabledMethods}
        availableMethods={availableMethods}
        totpQrDataUrl={totpQrDataUrl}
        trustDeviceEligible={trustDeviceEligible}
        trustDeviceSelected={trustDeviceSelected}
        onSelectMethod={onSelectMethod}
        onTrustDeviceChange={onTrustDeviceChange}
        onSendSms={onSendSms}
        onVerifySms={onVerifySms}
        onSendEmail={onSendEmail}
        onVerifyEmail={onVerifyEmail}
        onSetupTotp={onSetupTotp}
        onVerifyTotp={onVerifyTotp}
        smsSendResult={results.smsSend}
        smsVerifyResult={results.smsVerify}
        emailSendResult={results.emailSend}
        emailVerifyResult={results.emailVerify}
        totpSetupResult={results.totpSetup}
        totpVerifyResult={results.totpVerify}
        smsSendLoading={loading.smsSend}
        smsVerifyLoading={loading.smsVerify}
        emailSendLoading={loading.emailSend}
        emailVerifyLoading={loading.emailVerify}
        totpSetupLoading={loading.totpSetup}
        totpVerifyLoading={loading.totpVerify}
      />
    </PageLayout>
  );
}
