import { useEffect, useState, type FormEvent } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { TwoFactorPanel } from "../components/security/TwoFactorPanel";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ActiveSession, ApiResult, AuthLoading, AuthResults, DemoUser, MfaMethod, TrustedDevice } from "../types/auth";

type DashboardPageProps = {
  user: DemoUser | null;
  selectedMethod: MfaMethod | null;
  availableMethods: MfaMethod[];
  enabledMethods: MfaMethod[];
  totpQrDataUrl: string;
  trustedDevices: TrustedDevice[];
  activeSessions: ActiveSession[];
  recoveryCodes: string[];
  results: AuthResults;
  loading: AuthLoading;
  onSelectMethod: (method: MfaMethod) => void;
  onSendSms: () => Promise<void>;
  onVerifySms: (code: string) => Promise<void>;
  onSendEmail: () => Promise<void>;
  onVerifyEmail: (code: string) => Promise<void>;
  onSetupTotp: () => Promise<void>;
  onVerifyTotp: (token: string) => Promise<void>;
  onDisableMethod: (method: MfaMethod) => Promise<void>;
  onGenerateRecoveryCodes: () => Promise<void>;
  onRefreshRecoveryStatus: () => Promise<void>;
  onLoadTrustedDevices: () => Promise<void>;
  onRevokeTrustedDevice: (id: number) => Promise<void>;
  onLoadActiveSessions: () => Promise<void>;
  onRevokeActiveSession: (jti: string) => Promise<void>;
  changePasswordLoading: boolean;
  changePasswordResult?: ApiResult;
  onChangePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
  onGoForgotPassword: (prefillEmail?: string) => void;
  onLogout: () => Promise<void>;
};

function downloadRecoveryCodes(codes: string[], user: DemoUser | null): void {
  if (codes.length === 0) return;

  const text =
    `Recovery Codes for ${user?.email || user?.username || "Account"}\n` +
    `Generated: ${new Date().toLocaleString()}\n` +
    "Each code can be used only once\n\n" +
    codes.map((code, index) => `${index + 1}. ${code}`).join("\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `recovery-codes-${user?.id ?? "user"}-${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DashboardPage({
  user,
  selectedMethod,
  availableMethods,
  enabledMethods,
  totpQrDataUrl,
  trustedDevices,
  activeSessions,
  recoveryCodes,
  results,
  loading,
  onSelectMethod,
  onSendSms,
  onVerifySms,
  onSendEmail,
  onVerifyEmail,
  onSetupTotp,
  onVerifyTotp,
  onDisableMethod,
  onGenerateRecoveryCodes,
  onRefreshRecoveryStatus,
  onLoadTrustedDevices,
  onRevokeTrustedDevice,
  onLoadActiveSessions,
  onRevokeActiveSession,
  changePasswordLoading,
  changePasswordResult,
  onChangePassword,
  onGoForgotPassword,
  onLogout,
}: DashboardPageProps) {
  const [section, setSection] = useState<"overview" | "settings" | "password" | "recovery">("overview");
  const [passwordLocalError, setPasswordLocalError] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (section !== "settings") return;
    void onLoadTrustedDevices();
    void onLoadActiveSessions();
  }, [section]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordLocalError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordLocalError("New password and confirm password must match.");
      return;
    }

    setPasswordLocalError("");

    await onChangePassword({
      currentPassword,
      newPassword,
    });
  }

  return (
    <PageLayout
      eyebrow="Secure Area"
      title={user ? `Welcome, ${user.fullName}` : "Welcome"}
      subtitle="Dashboard with sidebar navigation and separated security sections."
    >
      <div className="app-grid-2">
        <aside className="app-card">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Navigation</p>
          <div className="grid gap-2">
            <button
              className={`${section === "overview" ? "btn-nav btn-nav-active" : "btn-nav"}`}
              type="button"
              onClick={() => setSection("overview")}
            >
              Overview
            </button>
            <button
              className={`${section === "settings" ? "btn-nav btn-nav-active" : "btn-nav"}`}
              type="button"
              onClick={() => setSection("settings")}
            >
              Settings
            </button>
            <button
              className={`${section === "password" ? "btn-nav btn-nav-active" : "btn-nav"}`}
              type="button"
              onClick={() => setSection("password")}
            >
              Change Password
            </button>
            <button
              className={`${section === "recovery" ? "btn-nav btn-nav-active" : "btn-nav"}`}
              type="button"
              onClick={() => setSection("recovery")}
            >
              Recovery
            </button>
          </div>

          <button
            className="btn-danger mt-3 w-full"
            type="button"
            onClick={() => void onLogout()}
            disabled={loading.logout}
          >
            {loading.logout ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <section className="space-y-4">
          {section === "overview" && (
            <div className="app-card">
              <p className="app-kicker">User Overview</p>
              <h2 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                {user ? user.fullName : "Authenticated user"}
              </h2>

              {user && (
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                  <div className="app-muted-card rounded">
                    <div className="text-xs font-semibold uppercase text-[#93a9cf]">User ID</div>
                    <div className="mt-1 font-bold">{user.id}</div>
                  </div>
                  <div className="app-muted-card rounded">
                    <div className="text-xs font-semibold uppercase text-[#93a9cf]">Email</div>
                    <div className="mt-1 break-all font-bold">{user.email || "-"}</div>
                  </div>
                  <div className="app-muted-card rounded">
                    <div className="text-xs font-semibold uppercase text-[#93a9cf]">Username</div>
                    <div className="mt-1 font-bold">{user.username || "-"}</div>
                  </div>
                  <div className="app-muted-card rounded">
                    <div className="text-xs font-semibold uppercase text-[#93a9cf]">Phone</div>
                    <div className="mt-1 font-bold">{user.phone || "-"}</div>
                  </div>
                </div>
              )}

              <div className="info-grid mt-4 md:grid-cols-2">
                <div className="info-item">
                  <span className="info-label">Active 2FA</span>
                  <strong className="info-value">
                    {enabledMethods.length > 0 ? enabledMethods.join(", ").toUpperCase() : "NONE"}
                  </strong>
                </div>
                <div className="info-item">
                  <span className="info-label">Available Methods</span>
                  <strong className="info-value info-value-muted">{availableMethods.join(", ").toUpperCase()}</strong>
                </div>
              </div>
            </div>
          )}

          {section === "settings" && (
            <div className="space-y-4">
              <TwoFactorPanel
                title="Security settings"
                subtitle="Enable/verify/disable 2FA methods. One method must always remain active."
                selectedMethod={selectedMethod}
                enabledMethods={enabledMethods}
                availableMethods={availableMethods}
                totpQrDataUrl={totpQrDataUrl}
                onSelectMethod={onSelectMethod}
                onSendSms={onSendSms}
                onVerifySms={onVerifySms}
                onSendEmail={onSendEmail}
                onVerifyEmail={onVerifyEmail}
                onSetupTotp={onSetupTotp}
                onVerifyTotp={onVerifyTotp}
                onDisable={onDisableMethod}
                smsSendResult={results.smsSend}
                smsVerifyResult={results.smsVerify}
                emailSendResult={results.emailSend}
                emailVerifyResult={results.emailVerify}
                totpSetupResult={results.totpSetup}
                totpVerifyResult={results.totpVerify}
                disableResult={results.disable2fa}
                smsSendLoading={loading.smsSend}
                smsVerifyLoading={loading.smsVerify}
                emailSendLoading={loading.emailSend}
                emailVerifyLoading={loading.emailVerify}
                totpSetupLoading={loading.totpSetup}
                totpVerifyLoading={loading.totpVerify}
                disableLoading={loading.disable2fa}
              />

              <div className="app-card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">Trusted devices</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Devices that can bypass 2FA for up to 10 days after credential login.
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => void onLoadTrustedDevices()}
                    disabled={loading.trustedDevicesList}
                  >
                    {loading.trustedDevicesList ? "Refreshing..." : "Refresh list"}
                  </button>
                </div>

                {trustedDevices.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No active trusted devices.</p>
                )}

                {trustedDevices.length > 0 && (
                  <div className="grid gap-3">
                    {trustedDevices.map((device) => (
                      <div key={device.id} className="app-muted-card rounded-lg">
                        <div className="info-grid text-sm md:grid-cols-2">
                          <div className="info-item"><span className="info-label">Device ID</span><strong className="info-value">{device.id}</strong></div>
                          <div className="info-item"><span className="info-label">IP Address</span><strong className="info-value">{device.ip ?? "-"}</strong></div>
                          <div className="info-item md:col-span-2"><span className="info-label">User Agent</span><strong className="info-value">{device.userAgent ?? "-"}</strong></div>
                          <div className="info-item"><span className="info-label">Created</span><strong className="info-value">{new Date(device.createdAt).toLocaleString()}</strong></div>
                          <div className="info-item"><span className="info-label">Expires</span><strong className="info-value">{new Date(device.expiresAt).toLocaleString()}</strong></div>
                          <div className="info-item"><span className="info-label">Last Used</span><strong className="info-value">{device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : "-"}</strong></div>
                        </div>

                        <button
                          className="btn-danger mt-3"
                          type="button"
                          onClick={() => void onRevokeTrustedDevice(device.id)}
                          disabled={loading.trustedDeviceRevoke}
                        >
                          {loading.trustedDeviceRevoke ? "Revoking..." : "Revoke device"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {results.trustedDeviceRevoke && (
                  <ResultBlock title="Trusted device revoked" result={results.trustedDeviceRevoke} />
                )}
              </div>

              <div className="app-card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">Active sessions</h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Revoke active sessions issued for this account.
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => void onLoadActiveSessions()}
                    disabled={loading.sessionsList}
                  >
                    {loading.sessionsList ? "Refreshing..." : "Refresh list"}
                  </button>
                </div>

                {activeSessions.length === 0 && (
                  <p className="text-sm text-[var(--text-muted)]">No active sessions.</p>
                )}

                {activeSessions.length > 0 && (
                  <div className="grid gap-3">
                    {activeSessions.map((session) => (
                      <div key={session.jti} className="app-muted-card rounded-lg">
                        <div className="info-grid text-sm md:grid-cols-2">
                          <div className="info-item md:col-span-2"><span className="info-label">Session JTI</span><strong className="info-value">{session.jti}</strong></div>
                          <div className="info-item"><span className="info-label">Current Session</span><strong className="info-value">{session.isCurrent ? "Yes" : "No"}</strong></div>
                          <div className="info-item"><span className="info-label">Trusted Session</span><strong className="info-value">{session.isTrustedSession ? "Yes" : "No"}</strong></div>
                          <div className="info-item"><span className="info-label">Issued</span><strong className="info-value">{new Date(session.issuedAt).toLocaleString()}</strong></div>
                          <div className="info-item"><span className="info-label">Expires</span><strong className="info-value">{new Date(session.expiresAt).toLocaleString()}</strong></div>
                          <div className="info-item"><span className="info-label">IP Address</span><strong className="info-value">{session.ip ?? "-"}</strong></div>
                          <div className="info-item"><span className="info-label">Trusted Until</span><strong className="info-value">{session.trustedUntil ? new Date(session.trustedUntil).toLocaleString() : "-"}</strong></div>
                          <div className="info-item md:col-span-2"><span className="info-label">User Agent</span><strong className="info-value">{session.userAgent ?? "-"}</strong></div>
                        </div>

                        <button
                          className="btn-danger mt-3"
                          type="button"
                          onClick={() => void onRevokeActiveSession(session.jti)}
                          disabled={loading.sessionRevoke}
                        >
                          {loading.sessionRevoke ? "Revoking..." : "Revoke session"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {results.sessionRevoke && (
                  <ResultBlock title="Session revoked" result={results.sessionRevoke} />
                )}
              </div>
            </div>
          )}

          {section === "password" && (
            <div className="app-card">
              <p className="app-kicker">Account Security</p>
              <h3 className="app-heading">Change Password</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Change password using current credentials. On success, current session is closed and login is required.
              </p>

              <form className="mt-5 grid gap-4" onSubmit={handlePasswordSubmit}>
                <div className="grid gap-4 lg:grid-cols-3">
                <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                  Current password
                  <input
                    className="app-input"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                  New password
                  <input
                    className="app-input"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm text-[var(--text-muted)]">
                  Confirm new password
                  <input
                    className="app-input"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    required
                  />
                </label>
                </div>
                <div className="rounded-xl border border-[var(--line-soft)] bg-[rgba(8,16,34,0.7)] p-4 text-sm text-[var(--text-muted)]">
                  <span className="info-label">Password policy</span>
                  <p className="mt-2 mb-0">
                    Backend validates complexity, HIBP exposure and common-password rules before accepting a new password.
                  </p>
                </div>
                {passwordLocalError && <p className="text-sm text-[var(--error)]">{passwordLocalError}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="btn-primary w-full"
                    type="submit"
                    disabled={changePasswordLoading}
                  >
                    {changePasswordLoading ? "Submitting..." : "Save new password"}
                  </button>
                  <button
                    className="btn-secondary w-full"
                    type="button"
                    onClick={() => onGoForgotPassword(user?.email)}
                  >
                    Forgot current password
                  </button>
                </div>
              </form>

              {changePasswordResult && <ResultBlock title="Password change" result={changePasswordResult} />}
            </div>
          )}

          {section === "recovery" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="app-card">
                <h3 className="mb-3 font-bold text-[var(--text-primary)]">Recovery Codes</h3>
                <p className="mb-3 text-sm text-[var(--text-muted)]">
                  Generate one-time backup codes and download them immediately.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => void onGenerateRecoveryCodes()}
                    disabled={loading.recoverySetup}
                  >
                    {loading.recoverySetup ? "Generating..." : "Generate codes"}
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => downloadRecoveryCodes(recoveryCodes, user)}
                    disabled={recoveryCodes.length === 0}
                  >
                    Download TXT
                  </button>
                </div>

                {recoveryCodes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[rgba(8,16,34,0.7)] p-3">
                    <p className="mb-2 text-xs font-bold text-[#9fd8ff]">Codes (shown once):</p>
                    <div className="grid gap-1 text-xs font-mono">
                      {recoveryCodes.map((code, index) => (
                        <div key={code}>
                          {index + 1}. {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.recoverySetup && (
                  <ResultBlock title="Recovery setup" result={results.recoverySetup} />
                )}
              </div>

              <div className="app-card">
                <h3 className="mb-3 font-bold text-[var(--text-primary)]">Recovery Status</h3>
                <p className="mb-3 text-sm text-[var(--text-muted)]">Check remaining unused backup codes.</p>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => void onRefreshRecoveryStatus()}
                  disabled={loading.recoveryStatus}
                >
                  {loading.recoveryStatus ? "Checking..." : "Refresh status"}
                </button>
                {results.recoveryStatus && <ResultBlock title="Recovery status" result={results.recoveryStatus} />}
              </div>
            </div>
          )}

          {results.logout && <ResultBlock title="Logout" result={results.logout} />}
        </section>
      </div>
    </PageLayout>
  );
}
