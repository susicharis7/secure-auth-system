import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult } from "../types/auth";

type ForgotPasswordPageProps = {
  prefilledEmail?: string;
  loading: boolean;
  result?: ApiResult;
  onSubmit: (email: string, captchaToken?: string) => Promise<void>;
  onGoLogin: () => void;
  onGoResetPassword: () => void;
};

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
    __hcaptchaOnLoadForgotPassword?: () => void;
  }
}

const hcaptchaSiteKey = (import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined)?.trim() ?? "";
const hcaptchaScriptId = "hcaptcha-api-script";
const hcaptchaOnLoadCallback = "__hcaptchaOnLoadForgotPassword";

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

export function ForgotPasswordPage({
  prefilledEmail,
  loading,
  result,
  onSubmit,
  onGoLogin,
  onGoResetPassword,
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState(() => prefilledEmail ?? "");
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
      setCaptchaUiError("Solve captcha before sending reset email.");
      return;
    }

    await onSubmit(email, captchaRequired ? captchaToken : undefined);

    if (captchaRequired && widgetIdRef.current !== null && window.hcaptcha) {
      window.hcaptcha.reset(widgetIdRef.current);
      setCaptchaToken("");
    }
  }

  return (
    <PageLayout
      eyebrow="Auth Flow"
      title="Forgot Password"
      subtitle="Enter your registered email to receive a one-time reset link valid for 5 minutes."
    >
      <section className="app-card">
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Registered email
            <input
              className="app-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {captchaRequired && (
            <div className="grid gap-2 rounded-lg border border-[rgba(255,209,102,0.45)] bg-[rgba(74,56,20,0.36)] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">
                Captcha required after failed attempts
              </p>
              <div ref={captchaContainerRef} />
              {captchaErrors.length > 0 && (
                <p className="text-xs text-[var(--error)]">hCaptcha errors: {captchaErrors.join(", ")}</p>
              )}
              {visibleCaptchaUiError && <p className="text-xs text-[var(--error)]">{visibleCaptchaUiError}</p>}
            </div>
          )}

          <div className="mt-1 flex flex-wrap gap-2">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <button className="btn-secondary" type="button" onClick={onGoResetPassword}>
              I already have a link
            </button>
            <button className="btn-secondary" type="button" onClick={onGoLogin}>
              Back to login
            </button>
          </div>
        </form>

        {result && <ResultBlock title="Password reset request" result={result} />}
      </section>
    </PageLayout>
  );
}
