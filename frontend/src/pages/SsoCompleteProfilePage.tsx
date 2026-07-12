import { useState, type FormEvent } from "react";
import { PageLayout } from "../components/layout/PageLayout";
import { ResultBlock } from "../components/ui/ResultBlock";
import type { ApiResult, SsoCompleteContext } from "../types/auth";

type SsoCompleteProfilePageProps = {
  context: SsoCompleteContext | null;
  result?: ApiResult;
  loading: boolean;
  onSubmit: (input: { fullName?: string; username: string; phone: string }) => Promise<void>;
  onGoLogin: () => void;
};

const inputClass =
  "app-input";
const buttonClass =
  "btn-primary";
const secondaryButtonClass =
  "btn-secondary";

type CompleteFormState = {
  fullName: string;
  username: string;
  phone: string;
};

const initialState: CompleteFormState = {
  fullName: "",
  username: "",
  phone: "",
};

function providerLabel(provider: "google" | "github"): string {
  return provider === "google" ? "Google" : "GitHub";
}

export function SsoCompleteProfilePage({
  context,
  result,
  loading,
  onSubmit,
  onGoLogin,
}: SsoCompleteProfilePageProps) {
  const [form, setForm] = useState<CompleteFormState>(() => ({
    ...initialState,
    fullName: context?.fullName || "",
  }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!context) return;

    await onSubmit({
      fullName: form.fullName,
      username: form.username,
      phone: form.phone,
    });
  }

  if (!context) {
    return (
      <PageLayout
        eyebrow="Auth Flow"
        title="Complete SSO Profile"
        subtitle="SSO context is missing or expired."
      >
        <section className="app-card">
          <p className="text-sm text-[var(--text-muted)]">
            Start SSO login again to continue.
          </p>
          <div className="mt-3">
            <button className={secondaryButtonClass} type="button" onClick={onGoLogin}>
              Back to login
            </button>
          </div>
          {result && <ResultBlock title="SSO profile completion" result={result} />}
        </section>
      </PageLayout>
    );
  }

  const provider = providerLabel(context.provider);

  return (
      <PageLayout
        eyebrow="Auth Flow"
        title={`Complete ${provider} Profile`}
        subtitle="One-time completion step before continuing to 2FA."
      >
      <section className="app-card">
        <form className="grid gap-3" onSubmit={submit}>
          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Email
            <input className={inputClass} value={context.email} disabled />
          </label>

          {context.needsFullName && (
            <label className="grid gap-1 text-sm text-[var(--text-muted)]">
              Full name
              <input
                className={inputClass}
                value={form.fullName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                required
              />
            </label>
          )}

          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Username
            <input
              className={inputClass}
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              required
            />
          </label>

          <label className="grid gap-1 text-sm text-[var(--text-muted)]">
            Phone
            <input
              className={inputClass}
              placeholder="+38761111222"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />
          </label>

          <div className="mt-1 flex flex-wrap gap-2">
            <button className={buttonClass} type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Complete profile"}
            </button>
            <button className={secondaryButtonClass} type="button" onClick={onGoLogin}>
              Cancel
            </button>
          </div>
        </form>

        {result && <ResultBlock title={`${provider} profile completion`} result={result} />}
      </section>
    </PageLayout>
  );
}
