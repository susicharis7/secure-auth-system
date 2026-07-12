import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult } from "../types/auth";

type ResetPasswordPageProps = {
  token: string;
  validateLoading: boolean;
  confirmLoading: boolean;
  validateResult?: ApiResult;
  confirmResult?: ApiResult;
  onValidateToken: (tokenOrLink: string) => Promise<void>;
  onSubmit: (input: { token: string; newPassword: string }) => Promise<void>;
  onGoLogin: () => void;
  onGoForgotPassword: () => void;
};

export function ResetPasswordPage({
  token,
  validateLoading,
  confirmLoading,
  validateResult,
  confirmResult,
  onValidateToken,
  onSubmit,
  onGoLogin,
  onGoForgotPassword,
}: ResetPasswordPageProps) {
  const [tokenInput, setTokenInput] = useState(token);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const didAutoValidate = useRef(false);

  useEffect(() => {
    setTokenInput(token);
  }, [token]);

  useEffect(() => {
    if (!token || didAutoValidate.current) return;
    didAutoValidate.current = true;
    void onValidateToken(token);
  }, [token, onValidateToken]);

  async function validateLink() {
    setLocalError("");
    await onValidateToken(tokenInput);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedToken = tokenInput.trim();

    if (!trimmedToken) {
      setLocalError("Reset token is required.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setLocalError("Both password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("New password and confirm password must match.");
      return;
    }

    setLocalError("");
    await onSubmit({ token: trimmedToken, newPassword });
  }

  return (
    <PageLayout
      eyebrow="Auth Flow"
      title="Reset Password"
      subtitle="Use reset token from email, set a new password, then continue with login."
    >
      <section className="app-card">
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Reset token or full URL
            <input
              className="app-input"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Paste reset token or full reset link"
              required
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => void validateLink()} disabled={validateLoading}>
              {validateLoading ? "Validating..." : "Validate reset link"}
            </button>
          </div>

          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            New password
            <input
              className="app-input"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Confirm new password
            <input
              className="app-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>

          <div className="rounded-lg border border-[var(--line-soft)] bg-[rgba(8,16,34,0.7)] p-3 text-xs text-[var(--text-muted)]">
            Password policy is validated on backend (complexity + HIBP + common-password checks).
          </div>

          {localError && <p className="text-sm text-[var(--error)]">{localError}</p>}

          <div className="mt-1 flex flex-wrap gap-2">
            <button className="btn-primary" type="submit" disabled={confirmLoading}>
              {confirmLoading ? "Resetting..." : "Set new password"}
            </button>
            <button className="btn-secondary" type="button" onClick={onGoForgotPassword}>
              Request new reset link
            </button>
            <button className="btn-secondary" type="button" onClick={onGoLogin}>
              Back to login
            </button>
          </div>
        </form>

        {validateResult && <ResultBlock title="Reset token validation" result={validateResult} />}
        {confirmResult && <ResultBlock title="Reset password" result={confirmResult} />}
      </section>
    </PageLayout>
  );
}
