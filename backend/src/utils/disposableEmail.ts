import { isDisposableEmail } from "disposable-email-domains-js";

export function validateDisposableEmail(email: string): { isValid: true } | { isValid: false; error: string } {
  const disposable = isDisposableEmail(email.trim().toLowerCase());

  if (disposable) {
    return { isValid: false, error: "Disposable email addresses are not allowed." };
  }

  return { isValid: true };
}
