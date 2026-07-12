import crypto from "crypto";
import { CaptchaAction } from "../../../config/envTypes";
import { getCaptchaPolicyConfig } from "../../../config/env";
import {
  findCaptchaAttemptByKey,
  resetCaptchaFailures,
  upsertCaptchaFailure,
} from "./attemptRepository";
import { CaptchaDecision } from "./attemptTypes";

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function hashIdentifier(identifier: string): string {
  return crypto.createHash("sha256").update(identifier).digest("hex");
}

function resolveIp(ip: string | null | undefined): string {
  const clean = ip?.trim();
  return clean && clean.length > 0 ? clean : "unknown";
}

function getThreshold(action: CaptchaAction): number {
  const policy = getCaptchaPolicyConfig();

  if (action === "LOGIN") return policy.loginMaxFailedAttempts;
  return policy.passwordResetMaxFailedAttempts;
}

function buildKey(action: CaptchaAction, identifier: string, ip: string | null | undefined) {
  const normalized = normalizeIdentifier(identifier);
  return {
    action,
    identifierHash: hashIdentifier(normalized),
    ip: resolveIp(ip),
  };
}

export async function getCaptchaDecision(input: {
  action: CaptchaAction;
  identifier: string;
  ip: string | null | undefined;
}): Promise<CaptchaDecision> {
  const key = buildKey(input.action, input.identifier, input.ip);
  const row = await findCaptchaAttemptByKey(key);
  const threshold = getThreshold(input.action);
  const failedCount = row?.failed_count ?? 0;

  return {
    requiresCaptcha: failedCount >= threshold,
    failedCount,
    threshold,
  };
}

export async function recordCaptchaFailure(input: {
  action: CaptchaAction;
  identifier: string;
  ip: string | null | undefined;
}): Promise<void> {
  const key = buildKey(input.action, input.identifier, input.ip);

  await upsertCaptchaFailure({
    ...key,
    occurredAt: new Date(),
  });
}

export async function clearCaptchaFailures(input: {
  action: CaptchaAction;
  identifier: string;
  ip: string | null | undefined;
}): Promise<void> {
  const key = buildKey(input.action, input.identifier, input.ip);
  await resetCaptchaFailures(key);
}