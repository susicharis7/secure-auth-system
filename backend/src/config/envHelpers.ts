import { AuthCookieSameSite } from "./envTypes";

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

export function parseSameSite(value: string | undefined): AuthCookieSameSite {
  const normalized = (value ?? "lax").trim().toLowerCase();
  if (normalized === "strict") return "strict";
  if (normalized === "none") return "none";
  return "lax";
};

export function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw == null || raw.trim() === "" ? fallback : Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}