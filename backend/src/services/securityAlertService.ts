import { QueryTypes } from "sequelize";
import { sequelize } from "../config/database";
import { getSecurityAlertConfig } from "../config/env";
import { sendEmail } from "./mailService";
import { auditLog } from "./auditLogService";
import { listActiveVerifiedAdminEmails } from "../modules/users/userRepository";

type AlertSeverity = "HIGH" | "CRITICAL";
type AlertType =
  | "CREDENTIAL_STUFFING"
  | "BRUTE_FORCE"
  | "COORDINATED_ABUSE"
  | "PRIVILEGE_ESCALATION"
  | "REFRESH_TOKEN_REUSE";

type TriggerResult = {
  triggered: boolean;
  count: number;
};

const ALERT_OBJECT_NAME = "security_alert";

function nowMinusMinutes(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

async function countAuditRows(input: {
  action: string;
  objectId?: string;
  ipAddress?: string;
  actorId?: number;
  since: Date;
}): Promise<number> {
  const rows = await sequelize.query<{ cnt: number }>(
    `
    SELECT COUNT(*) AS cnt
    FROM audit_logs
    WHERE action = :action
      AND created_at >= :since
      AND (:objectId IS NULL OR LOWER(object_id) = LOWER(:objectId))
      AND (:ipAddress IS NULL OR ip_address = :ipAddress)
      AND (:actorId IS NULL OR actor_id = :actorId)
    `,
    {
      replacements: {
        action: input.action,
        since: input.since,
        objectId: input.objectId ?? null,
        ipAddress: input.ipAddress ?? null,
        actorId: input.actorId ?? null,
      },
      type: QueryTypes.SELECT,
    }
  );

  return Number(rows[0]?.cnt ?? 0);
}

async function isOnCooldown(alertType: AlertType, key: string, since: Date): Promise<boolean> {
  const rows = await sequelize.query<{ cnt: number }>(
    `
    SELECT COUNT(*) AS cnt
    FROM audit_logs
    WHERE action = 'SECURITY_ALERT_SENT'
      AND created_at >= :since
      AND object_name = :objectName
      AND object_id = :objectId
      AND JSON_UNQUOTE(JSON_EXTRACT(request_data, '$.alertType')) = :alertType
    `,
    {
      replacements: {
        since,
        objectName: ALERT_OBJECT_NAME,
        objectId: key,
        alertType,
      },
      type: QueryTypes.SELECT,
    }
  );

  return Number(rows[0]?.cnt ?? 0) > 0;
}

function buildAlertSubject(type: AlertType, severity: AlertSeverity): string {
  return `[${severity}] Security alert: ${type}`;
}

function buildAlertBody(input: {
  type: AlertType;
  severity: AlertSeverity;
  key: string;
  count: number;
  windowMinutes: number;
  details?: Record<string, unknown>;
}): string {
  const lines = [
    `Alert type: ${input.type}`,
    `Severity: ${input.severity}`,
    `Key: ${input.key}`,
    `Count: ${input.count}`,
    `Window (minutes): ${input.windowMinutes}`,
    `Timestamp: ${new Date().toISOString()}`,
  ];

  if (input.details && Object.keys(input.details).length > 0) {
    lines.push(`Details: ${JSON.stringify(input.details)}`);
  }

  return lines.join("\n");
}

async function sendAlertToAdmins(input: {
  alertType: AlertType;
  severity: AlertSeverity;
  key: string;
  count: number;
  windowMinutes: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return;

  const cooldownSince = nowMinusMinutes(cfg.cooldownMinutes);
  const cooldownKey = `${input.alertType}:${input.key}`;

  const cooldown = await isOnCooldown(input.alertType, cooldownKey, cooldownSince);
  if (cooldown) return;

  const recipients = await listActiveVerifiedAdminEmails();
  if (recipients.length === 0) return;

  const subject = buildAlertSubject(input.alertType, input.severity);
  const text = buildAlertBody({
    type: input.alertType,
    severity: input.severity,
    key: input.key,
    count: input.count,
    windowMinutes: input.windowMinutes,
    details: input.details,
  });

  let sentTo: string[] = [];
  try {
    for (const email of recipients) {
      await sendEmail(email, subject, text);
      sentTo.push(email);
    }

    await auditLog({
      action: "SECURITY_ALERT_SENT",
      result: "success",
      objectName: ALERT_OBJECT_NAME,
      objectId: cooldownKey,
      requestData: {
        alertType: input.alertType,
        severity: input.severity,
        key: input.key,
        count: input.count,
        windowMinutes: input.windowMinutes,
        sentTo,
      },
    });
  } catch (error) {
    await auditLog({
      action: "SECURITY_ALERT_SEND_FAILED",
      result: "error",
      objectName: ALERT_OBJECT_NAME,
      objectId: cooldownKey,
      originalObject: {
        error: error instanceof Error ? error.message : "unknown_error",
      },
      requestData: {
        alertType: input.alertType,
        severity: input.severity,
        key: input.key,
        count: input.count,
        windowMinutes: input.windowMinutes,
        attemptedRecipients: recipients,
        sentTo,
      },
    });
  }
}

export async function maybeAlertCredentialStuffing(identifier: string): Promise<TriggerResult> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return { triggered: false, count: 0 };

  const since = nowMinusMinutes(cfg.credentialStuffingWindowMinutes);
  const key = identifier.trim().toLowerCase();

  const count = await countAuditRows({
    action: "AUTH_LOGIN_FAILED",
    objectId: key,
    since,
  });

  if (count >= cfg.credentialStuffingThreshold) {
    await sendAlertToAdmins({
      alertType: "CREDENTIAL_STUFFING",
      severity: "HIGH",
      key,
      count,
      windowMinutes: cfg.credentialStuffingWindowMinutes,
    });
    return { triggered: true, count };
  }

  return { triggered: false, count };
}

export async function maybeAlertBruteForce(ipAddress: string): Promise<TriggerResult> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return { triggered: false, count: 0 };

  const since = nowMinusMinutes(cfg.bruteForceWindowMinutes);
  const key = ipAddress.trim();

  const count = await countAuditRows({
    action: "AUTH_LOGIN_FAILED",
    ipAddress: key,
    since,
  });

  if (count >= cfg.bruteForceThreshold) {
    await sendAlertToAdmins({
      alertType: "BRUTE_FORCE",
      severity: "HIGH",
      key,
      count,
      windowMinutes: cfg.bruteForceWindowMinutes,
    });
    return { triggered: true, count };
  }

  return { triggered: false, count };
}

export async function maybeAlertCoordinatedAbuse(ipAddress: string): Promise<TriggerResult> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return { triggered: false, count: 0 };

  const since = nowMinusMinutes(cfg.coordinatedAbuseWindowMinutes);
  const key = ipAddress.trim();

  const count = await countAuditRows({
    action: "RATE_LIMIT_HIT",
    ipAddress: key,
    since,
  });

  if (count >= cfg.coordinatedAbuseThreshold) {
    await sendAlertToAdmins({
      alertType: "COORDINATED_ABUSE",
      severity: "HIGH",
      key,
      count,
      windowMinutes: cfg.coordinatedAbuseWindowMinutes,
    });
    return { triggered: true, count };
  }

  return { triggered: false, count };
}

export async function maybeAlertPrivilegeEscalation(actorId: number): Promise<TriggerResult> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return { triggered: false, count: 0 };

  const since = nowMinusMinutes(cfg.privilegeEscalationWindowMinutes);
  const key = String(actorId);

  const count = await countAuditRows({
    action: "AUTHZ_FORBIDDEN_ROLE",
    actorId,
    since,
  });

  if (count >= cfg.privilegeEscalationThreshold) {
    await sendAlertToAdmins({
      alertType: "PRIVILEGE_ESCALATION",
      severity: "CRITICAL",
      key,
      count,
      windowMinutes: cfg.privilegeEscalationWindowMinutes,
      details: { actorId },
    });
    return { triggered: true, count };
  }

  return { triggered: false, count };
}

export async function alertRefreshTokenReuse(input: {
  userId: number | null;
  jti: string;
  ipAddress?: string | null;
}): Promise<void> {
  const cfg = getSecurityAlertConfig();
  if (!cfg.enabled) return;

  const key = input.jti;

  await sendAlertToAdmins({
    alertType: "REFRESH_TOKEN_REUSE",
    severity: "CRITICAL",
    key,
    count: 1,
    windowMinutes: 0,
    details: {
      userId: input.userId,
      jti: input.jti,
      ipAddress: input.ipAddress ?? null,
    },
  });
}