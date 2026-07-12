import { createHash } from "crypto";
import { checkPasswordHIBP } from "../../services/hibpService";
import { config, getCaptchaPolicyConfig } from "../../config/env";


export type MySqlDuplicateError = {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  message?: string;
};

export function getDbError(error: unknown): MySqlDuplicateError {
  const wrapped = error as { original?: unknown; parent?: unknown };
  return (wrapped?.original ?? wrapped?.parent ?? error) as MySqlDuplicateError;
}

export function mapUserDuplicateMessage(error: unknown): string {
  const dbError = getDbError(error);
  const text = `${dbError.sqlMessage ?? ""} ${dbError.message ?? ""}`.toLowerCase();

  if (text.includes("uq_users_email")) return "Email already exists.";
  if (text.includes("uq_users_username")) return "Username already exists.";
  if (text.includes("uq_users_phone")) return "Phone number already exists.";

  return "Email, username or phone number already exists.";
}

// Controller
export function readLoginJwtData(body: Record<string, unknown>): { userId: number; email: string } | null {
  const userId = typeof body.userId === "number" ? body.userId : null;

  let email: string | null = null;
  if (typeof body.email === "string") {
    email = body.email;
  } else if (
    body.user &&
    typeof body.user === "object" &&
    typeof (body.user as Record<string, unknown>).email === "string"
  ) {
    email = (body.user as Record<string, unknown>).email as string;
  }

  if (!userId || !email) return null;
  return { userId, email };
}

export function readUserFrom2faSuccess(body: Record<string, unknown>): { userId: number; email: string } | null {
  if (!body.user || typeof body.user !== "object") return null;

  const userObj = body.user as Record<string, unknown>;
  const userId = typeof userObj.id === "number" ? userObj.id : null;
  const email = typeof userObj.email === "string" ? userObj.email : null;

  if (!userId || !email) return null;
  return { userId, email };
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown server error.";
}

export function formatDateTimeForEmail(value: Date): string {
  const pad = (part: number): string => part.toString().padStart(2, "0");

  const day = pad(value.getDate());
  const month = pad(value.getMonth() + 1);
  const year = value.getFullYear();
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  const seconds = pad(value.getSeconds());

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Trusted Device (userService)
export const TRUSTED_DEVICE_TOKEN_BYTES = 32;
export const TRUSTED_DEVICE_TTL_DAYS = 10;
export const TRUSTED_DEVICE_TTL_MS = TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000;

export function buildTrustedDeviceExpiresAt(): Date {
  return new Date(Date.now() + TRUSTED_DEVICE_TTL_MS);
}

export function parseTrustDeviceFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

export function hashTrustedDeviceToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Login + reset password (userService)
export function parseCaptchaToken(body: Record<string, unknown>): string {
  const captchaTokenRaw =
    typeof body.captchaToken === "string"
      ? body.captchaToken
      : typeof body["h-captcha-response"] === "string"
        ? body["h-captcha-response"]
        : "";

  return captchaTokenRaw.trim();
};

/* Reset Password CONST & Helper functions */
export const passwordComplexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const PASSWORD_RESET_LINK_TTL_MS = 5 * 60 * 1000;

const captchaPolicy = getCaptchaPolicyConfig();
export const PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS = captchaPolicy.passwordResetMaxFailedAttempts; // expected 2
export const PASSWORD_RESET_ATTEMPT_WINDOW_MS = captchaPolicy.passwordResetWindowMinutes * 60 * 1000; // expected 10m

export function hashPasswordResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function buildPasswordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_LINK_TTL_MS);
}

export function buildPasswordResetAttemptWindowExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_ATTEMPT_WINDOW_MS);
}

export async function validateNewPasswordPolicy(newPassword: string): Promise<string | null> {
  if (!newPassword || newPassword.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!passwordComplexRegex.test(newPassword)) {
    return "Password must include uppercase, lowercase, number and special character.";
  }

  const hibp = await checkPasswordHIBP(newPassword);
  if (hibp.isPwned) {
    return `Password is compromised (${hibp.count} times). Choose another one.`;
  }

  return null;
}

export function buildPasswordResetLink(token: string): string {
  const backendBaseUrl = getBackendPublicBaseUrl();
  return `${backendBaseUrl}/front/reset-password?token=${encodeURIComponent(token)}`;
}

export function getBackendPublicBaseUrl(): string {
  return (process.env.BACKEND_PUBLIC_BASE_URL || `http://localhost:${config.port}`).replace(/\/+$/, "");
}

