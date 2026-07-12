import { useState, type FormEvent } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult } from "../types/auth";

type VerifyEmailPageProps = {
  pendingEmail: string;
  loading: boolean;
  result?: ApiResult;
  onSubmit: (tokenOrLink: string) => Promise<void>;
  onGoLogin: () => void;
};

const inputClass =
  "app-input";
const buttonClass =
  "btn-primary";
const secondaryButtonClass =
  "btn-secondary";

export function VerifyEmailPage({
  pendingEmail,
  loading,
  result,
  onSubmit,
  onGoLogin,
}: VerifyEmailPageProps) {
  const [tokenOrLink, setTokenOrLink] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(tokenOrLink);
  }

  return (
    <PageLayout
      eyebrow="Auth Flow"
      title="Verify Email"
      subtitle={`Verification mail was sent${pendingEmail ? ` to ${pendingEmail}` : ""}.`}
    >
      <section className="app-card">
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Verify token or URL
            <input
              className={inputClass}
              value={tokenOrLink}
              onChange={(event) => setTokenOrLink(event.target.value)}
              placeholder="Paste verification link or token here"
              required
            />
          </label>

          <div className="mt-1 flex flex-wrap gap-2">
            <button className={buttonClass} type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify email"}
            </button>
            <button className={secondaryButtonClass} type="button" onClick={onGoLogin}>
              Go to login
            </button>
          </div>
        </form>

        {result && <ResultBlock title="Email verification" result={result} />}
      </section>
    </PageLayout>
  );
}
