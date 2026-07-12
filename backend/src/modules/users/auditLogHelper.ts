import type { Request } from "express";
import { auditLog } from "../../services/auditLogService";
import { findUserById } from "./userRepository";
import { AuditActorRoleType, AuditResultType } from "../admin/adminTypes";

export function statusToAuditResult(status: number): AuditResultType {
  if (status >= 200 && status < 400) return "success";
  if (status === 401 || status === 403) return "denied";
  if (status >= 400 && status < 500) return "failure";
  return "error";
}

export function actionWithOutcome(base: string, status: number): string {
  if (status >= 200 && status < 400) return `${base}_SUCCESS`;
  if (status === 401 || status === 403) return `${base}_DENIED`;
  if (status >= 400 && status < 500) return `${base}_FAILURE`;
  return `${base}_ERROR`;
}

export async function resolveActorRole(actorId?: number | null): Promise<AuditActorRoleType | null> {
  if (!actorId) return null;
  const user = await findUserById(actorId);
  if (!user) return null;
  return user.role === "admin" ? "admin" : "user";
}

export async function logControllerEvent(
  req: Request,
  input: {
    actionBase?: string;
    action?: string;
    status: number;
    actorId?: number | null;
    actorRole?: AuditActorRoleType | null;
    objectName?: string | null;
    objectId?: string | number | null;
    originalObject?: unknown;
    requestData?: unknown;
  }
): Promise<void> {
  const resolvedActorId = input.actorId ?? req.auth?.userId ?? null;
  const actorRole =
    input.actorRole !== undefined ? input.actorRole : await resolveActorRole(resolvedActorId);

  await auditLog({
    action: input.action ?? actionWithOutcome(input.actionBase ?? "GENERIC_EVENT", input.status),
    result: statusToAuditResult(input.status),
    actorId: resolvedActorId,
    actorRole,
    objectName: input.objectName ?? null,
    objectId: input.objectId ?? null,
    originalObject: input.originalObject,
    requestData: input.requestData,
    req,
  });
}
