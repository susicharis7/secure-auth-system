import { useState, type FormEvent } from "react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { ProviderIcon } from "../components/ui/ProviderIcon";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult, RegisterInput } from "../types/auth";

type RegisterPageProps = {
  loading: boolean;
  result?: ApiResult;
  googleLoading?: boolean;
  githubLoading?: boolean;
  onSubmit: (input: RegisterInput) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onGitHubLogin: () => Promise<void>;
  onGoLogin: () => void;
};

const inputClass = "app-input";

const initialState: RegisterInput = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  phone: "",
};

export function RegisterPage({
  loading,
  result,
  googleLoading = false,
  githubLoading = false,
  onSubmit,
  onGoogleLogin,
  onGitHubLogin,
  onGoLogin,
}: RegisterPageProps) {
  const [form, setForm] = useState<RegisterInput>(initialState);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(form);
  }

  return (
    <AuthLayout
      eyebrow="Secure Auth System (SSD)"
      title="Create account"
      subtitle="Register with verified contact details. Email verification and 2FA setup are required before full access."
      sideTitle="Start with a hardened identity profile."
      sideCopy="The registration flow enforces reserved username checks, password policy, email verification and post-login MFA."
      footer={
        <div className="auth-switch-card">
          <p>Already have an account?</p>
          <button type="button" onClick={onGoLogin}>
            Sign in
          </button>
        </div>
      }
    >
      <form className="auth-form-stack" onSubmit={submit}>
        <label className="form-field">
          <span>Full name</span>
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              required
            />
          </label>
        <label className="form-field">
          <span>Email</span>
            <input
              className={inputClass}
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
        <label className="form-field">
          <span>Username</span>
            <input
              className={inputClass}
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
        <label className="form-field">
          <span>Password</span>
            <input
              className={inputClass}
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
        <label className="form-field">
          <span>Phone</span>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+38761111222"
              required
            />
          </label>

        <button className="btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>

        <div className="auth-divider"><span>or continue with</span></div>

        <div className="auth-social-stack">
          <button className="btn-social" type="button" disabled={googleLoading} onClick={() => void onGoogleLogin()}>
            <ProviderIcon provider="google" className="provider-icon" />
            {googleLoading ? "Redirecting..." : "Continue with Google"}
          </button>
          <button className="btn-social" type="button" disabled={githubLoading} onClick={() => void onGitHubLogin()}>
            <ProviderIcon provider="github" className="provider-icon" />
            {githubLoading ? "Redirecting..." : "Continue with GitHub"}
          </button>
        </div>
      </form>

      {result && <ResultBlock title="Registration" result={result} />}
    </AuthLayout>
  );
}
