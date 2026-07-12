import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthLayout } from "../components/layout/AuthLayout";
import { ProviderIcon } from "../components/ui/ProviderIcon";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult, LoginInput } from "../types/auth";

type LoginPageProps = {
  loading: boolean;
  result?: ApiResult;
  googleResult?: ApiResult;
  githubResult?: ApiResult;
  passwordResetConfirmResult?: ApiResult;
  changePasswordResult?: ApiResult;
  googleLoading?: boolean;
  githubLoading?: boolean;
  onSubmit: (input: LoginInput) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onGitHubLogin: () => Promise<void>;
  onGoForgotPassword: () => void;
  onGoRegister: () => void;
};

const inputClass = "app-input";

const initialState = {
  identifier: "",
  password: "",
};

const hcaptchaSiteKey = (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined)?.trim() ?? "";
const hcaptchaScriptId = "hcaptcha-api-script";
const hcaptchaOnLoadCallback = "__hcaptchaOnLoadLogin";

type HcaptchaApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => number;
  reset: (widgetId?: number) => void;
  remove?: (widgetId: number) => void;
};

declare global {
  interface Window {
    hcaptcha?: HcaptchaApi;
    __hcaptchaOnLoadLogin?: () => void;
  }
}

function readBody(result?: ApiResult): Record<string, unknown> | null {
  if (!result || typeof result.body !== "object" || result.body === null) return null;
  return result.body as Record<string, unknown>;
}

function isCaptchaRequired(result?: ApiResult): boolean {
  return readBody(result)?.captchaRequired === true;
}

function readCaptchaErrors(result?: ApiResult): string[] {
  const value = readBody(result)?.captchaErrors;
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : [];
}

export function LoginPage({
  loading,
  result,
  googleResult,
  githubResult,
  passwordResetConfirmResult,
  changePasswordResult,
  googleLoading = false,
  githubLoading = false,
  onSubmit,
  onGoogleLogin,
  onGitHubLogin,
  onGoForgotPassword,
  onGoRegister,
}: LoginPageProps) {
  const [form, setForm] = useState(initialState);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaUiError, setCaptchaUiError] = useState<string | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);

  const captchaRequired = isCaptchaRequired(result);
  const captchaErrors = readCaptchaErrors(result);
  const visibleCaptchaUiError =
    captchaRequired && !hcaptchaSiteKey
      ? "Missing VITE_HCAPTCHA_SITE_KEY in frontend environment."
      : captchaUiError;

  useEffect(() => {
    if (!captchaRequired) {
      if (widgetIdRef.current !== null && window.hcaptcha?.remove) {
        window.hcaptcha.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      if (captchaContainerRef.current) {
        captchaContainerRef.current.innerHTML = "";
      }
      return;
    }

    if (!hcaptchaSiteKey) return;

    const renderWidget = () => {
      if (!window.hcaptcha || !captchaContainerRef.current || widgetIdRef.current !== null) return;

      const id = window.hcaptcha.render(captchaContainerRef.current, {
        sitekey: hcaptchaSiteKey,
        callback: (token: string) => {
          setCaptchaToken(token);
          setCaptchaUiError(null);
        },
        "expired-callback": () => {
          setCaptchaToken("");
          setCaptchaUiError("Captcha expired. Solve it again.");
        },
        "error-callback": () => {
          setCaptchaToken("");
          setCaptchaUiError("Captcha failed to load. Refresh page and try again.");
        },
      });

      widgetIdRef.current = id;
    };

    if (window.hcaptcha) {
      renderWidget();
      return;
    }

    let script = document.getElementById(hcaptchaScriptId) as HTMLScriptElement | null;
    window[hcaptchaOnLoadCallback] = () => {
      renderWidget();
    };

    if (!script) {
      script = document.createElement("script");
      script.id = hcaptchaScriptId;
      script.src = `https://js.hcaptcha.com/1/api.js?render=explicit&onload=${hcaptchaOnLoadCallback}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const onError = () => setCaptchaUiError("Failed to load hCaptcha script.");
    script.addEventListener("error", onError);

    return () => {
      script?.removeEventListener("error", onError);
    };
  }, [captchaRequired]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (captchaRequired && !captchaToken) {
      setCaptchaUiError("Solve captcha before login.");
      return;
    }

    const payload: LoginInput = {
      identifier: form.identifier,
      password: form.password,
      captchaToken: captchaRequired ? captchaToken : undefined,
    };

    await onSubmit(payload);

    if (captchaRequired && widgetIdRef.current !== null && window.hcaptcha) {
      window.hcaptcha.reset(widgetIdRef.current);
      setCaptchaToken("");
    }
  }

  return (
    <AuthLayout
      eyebrow="Secure Auth System (SSD)"
      title="Sign in"
      subtitle="Enter your credentials. If the account requires it, the next step is mandatory 2FA verification."
      sideTitle="Authentication built for the SSD security requirements."
      sideCopy="SSO, CAPTCHA abuse protection, JWT sessions, trusted devices and audit trails are handled through one secure flow."
      footer={
        <div className="auth-switch-card">
          <p>New here?</p>
          <button type="button" onClick={onGoRegister}>
            Create an account
          </button>
        </div>
      }
    >
      <form className="auth-form-stack" onSubmit={submit}>
        <label className="form-field">
          <span>Email or username</span>
            <input
              className={inputClass}
              value={form.identifier}
              onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))}
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

        <div className="auth-form-row">
          <button className="link-button" type="button" onClick={onGoForgotPassword}>
            Forgot password?
          </button>
        </div>

        {captchaRequired && (
          <div className="captcha-panel">
            <p>Captcha required after failed attempts</p>
            <div ref={captchaContainerRef} />
            {captchaErrors.length > 0 && (
              <span className="form-error">hCaptcha errors: {captchaErrors.join(", ")}</span>
            )}
            {visibleCaptchaUiError && <span className="form-error">{visibleCaptchaUiError}</span>}
          </div>
        )}

        <button className="btn-primary auth-submit" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
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

      {result && <ResultBlock title="Login" result={result} />}
      {googleResult && <ResultBlock title="Google SSO" result={googleResult} />}
      {githubResult && <ResultBlock title="GitHub SSO" result={githubResult} />}
      {passwordResetConfirmResult && <ResultBlock title="Password reset" result={passwordResetConfirmResult} />}
      {changePasswordResult && <ResultBlock title="Password change" result={changePasswordResult} />}
    </AuthLayout>
  );
}
