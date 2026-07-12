import type { ApiResult } from "../types/auth";

export type ToastVariant = "success" | "error";

export type ToastItem = {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
};

type ToastListener = (toast: ToastItem) => void;

const listeners = new Set<ToastListener>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function readApiMessage(result: ApiResult): string {
  if (typeof result.body === "string" && result.body.trim()) return result.body;

  if (isRecord(result.body)) {
    const error = result.body.error;
    const message = result.body.message;
    const detail = result.body.detail;

    if (typeof error === "string" && error.trim()) {
      if (error.toLowerCase().includes("blocked")) {
        return "This account is blocked. Contact an administrator for access.";
      }
      return error;
    }
    if (typeof message === "string" && message.trim()) return message;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (result.body.captchaRequired === true) return "Captcha verification is required before continuing.";
  }

  if (result.status >= 200 && result.status < 300) return "Action completed successfully.";
  if (result.status === 0) return "Unable to reach the server. Check the connection and try again.";
  return "Request failed. Review the form and try again.";
}

export function pushToast(input: Omit<ToastItem, "id">) {
  const toast: ToastItem = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };

  listeners.forEach((listener) => listener(toast));
}

export function subscribeToToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pushApiToast(title: string, result: ApiResult, options?: { success?: boolean }) {
  const ok = result.status >= 200 && result.status < 300;
  if (ok && options?.success === false) return;

  pushToast({
    title,
    message: readApiMessage(result),
    variant: ok ? "success" : "error",
  });
}
