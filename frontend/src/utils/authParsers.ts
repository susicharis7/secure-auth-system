import type { ApiResult, AppUserRole, DemoUser, MfaMethod } from "../types/auth";

export function nowLabel(): string {
  return new Date().toLocaleString();
}

export function parseResponseBody(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function toErrorResult(error: unknown): ApiResult {
  const message = error instanceof Error ? error.message : "Unknown error";
  return {
    status: 0,
    body: { error: message },
    receivedAt: nowLabel(),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function readStringField(body: unknown, field: string): string | undefined {
  if (!isRecord(body)) return undefined;
  const value = body[field];
  return typeof value === "string" ? value : undefined;
}

export function readNumberField(body: unknown, field: string): number | undefined {
  if (!isRecord(body)) return undefined;
  const value = body[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readBooleanField(body: unknown, field: string): boolean {
  if (!isRecord(body)) return false;
  return body[field] === true;
}

export function readMfaMethods(body: unknown, field: string): MfaMethod[] {
  if (!isRecord(body)) return [];
  const value = body[field];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MfaMethod => item === "sms" || item === "email" || item === "totp");
}

export function readUserRole(body: unknown, field: string): AppUserRole | null {
  if (!isRecord(body)) return null;
  const value = body[field];
  if (value === "admin") return "admin";
  if (value === "user") return "user";
  return null;
}

export function readUserFromResponse(body: unknown, fallbackIdentifier: string): DemoUser | null {
  const userFromBody = isRecord(body) && isRecord(body.user) ? body.user : null;
  const rootRecord = isRecord(body) ? body : null;
  const directUserId = readNumberField(body, "userId");
  const id = readNumberField(userFromBody, "id") ?? directUserId;
  const role = readUserRole(userFromBody, "role") ?? readUserRole(rootRecord, "role");

  if (!id || !role) return null;

  const fallbackEmail = fallbackIdentifier.includes("@") ? fallbackIdentifier : "";
  const fallbackUsername = fallbackIdentifier.includes("@") ? "" : fallbackIdentifier;

  return {
    id,
    role,
    fullName:
      readStringField(userFromBody, "fullName") ??
      readStringField(userFromBody, "full_name") ??
      readStringField(rootRecord, "fullName") ??
      readStringField(rootRecord, "full_name") ??
      "Logged user",
    email:
      readStringField(userFromBody, "email") ??
      readStringField(rootRecord, "email") ??
      fallbackEmail,
    username:
      readStringField(userFromBody, "username") ??
      readStringField(rootRecord, "username") ??
      fallbackUsername,
    phone:
      readStringField(userFromBody, "phone") ??
      readStringField(rootRecord, "phone") ??
      "",
  };
}

export function readUserObject(body: unknown): DemoUser | null {
  if (!isRecord(body) || !isRecord(body.user)) return null;

  const id = readNumberField(body.user, "id");
  const role = readUserRole(body.user, "role");
  if (!id || !role) return null;

  return {
    id,
    role,
    fullName:
      readStringField(body.user, "fullName") ??
      readStringField(body.user, "full_name") ??
      "Logged user",
    email: readStringField(body.user, "email") ?? "",
    username: readStringField(body.user, "username") ?? "",
    phone: readStringField(body.user, "phone") ?? "",
  };
}

export function extractToken(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token");
    if (token && token.trim()) return token.trim();
  } catch {
    // Fallback below also accepts pasted query strings.
  }

  const match = trimmed.match(/[?&]token=([^&]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }

  return trimmed;
}

export function nextStepToMethod(nextStep: string | undefined): MfaMethod | null {
  if (!nextStep) return null;
  if (nextStep.includes("/sms/")) return "sms";
  if (nextStep.includes("/email/")) return "email";
  if (nextStep.includes("/totp/")) return "totp";
  return null;
}
