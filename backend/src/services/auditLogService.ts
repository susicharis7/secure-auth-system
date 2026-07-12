import type { Request } from "express";
import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database";
import { AuditResultType, AuditActorRoleType } from "../modules/admin/adminTypes";


export interface AuditLogInput {
  action: string;
  result?: AuditResultType;
  actorId?: number | null;
  actorRole?: AuditActorRoleType | null;
  objectName?: string | null;
  objectId?: string | number | null;
  originalObject?: unknown;
  requestData?: unknown;
  req?: Request;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "token",
  "refreshToken",
  "accessToken",
  "code",
  "totp_token",
  "recoveryCode",
  "captchaToken",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 6) return "[max-depth]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = sanitize(raw, depth + 1);
      }
    }
    return out;
  }

  return value;
}

function safeJson(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(sanitize(value));
  } catch {
    return JSON.stringify({ error: "failed_to_serialize" });
  }
}

function extractIp(req?: Request): string | null {
  if (!req) return null;
  const xfwd = req.headers["x-forwarded-for"];
  if (typeof xfwd === "string" && xfwd.trim()) {
    return xfwd.split(",")[0].trim();
  }
  return req.ip ?? null;
}

function extractUserAgent(req?: Request): string | null {
  if (!req) return null;
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  const ipAddress = input.ipAddress ?? extractIp(input.req);
  const userAgent = input.userAgent ?? extractUserAgent(input.req);

  try {
    await sequelize.query(
      `
      INSERT INTO audit_logs (
        actor_id,
        actor_role,
        action,
        result,
        object_name,
        object_id,
        original_object,
        request_data,
        ip_address,
        user_agent
      ) VALUES (
        :actorId,
        :actorRole,
        :action,
        :result,
        :objectName,
        :objectId,
        :originalObject,
        :requestData,
        :ipAddress,
        :userAgent
      )
      `,
      {
        replacements: {
          actorId: input.actorId ?? null,
          actorRole: input.actorRole ?? null,
          action: input.action,
          result: input.result ?? "success",
          objectName: input.objectName ?? null,
          objectId: input.objectId == null ? null : String(input.objectId),
          originalObject: safeJson(input.originalObject),
          requestData: safeJson(input.requestData),
          ipAddress,
          userAgent,
        },
        type: QueryTypes.INSERT,
      }
    );
  } catch (error) {
    console.error("auditLog: failed", {
      action: input.action,
      result: input.result ?? "success",
      error,
    });
  }
}