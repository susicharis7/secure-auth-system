import type {
  AdminAuditActorRole,
  AdminAuditLogListItem,
  AdminAuditResultType,
  AdminReservedUsernameListItem,
  AdminUserListItem,
  AppUserRole,
  CursorPageMeta,
} from "../types/auth";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRole(value: unknown): AppUserRole | null {
  if (value === "admin") return "admin";
  if (value === "user") return "user";
  return null;
}

function asAuditResult(value: unknown): AdminAuditResultType | null {
  if (value === "success" || value === "failure" || value === "denied" || value === "error") return value;
  return null;
}

function asActorRole(value: unknown): AdminAuditActorRole | null {
  if (value === "admin" || value === "user" || value === "system") return value;
  return null;
}

export function parseCursorPageMeta(body: unknown): CursorPageMeta | null {
  const root = asRecord(body);
  const page = asRecord(root?.page);
  if (!page) return null;

  const nextCursor = typeof page.nextCursor === "string" ? page.nextCursor : null;
  const prevCursor = typeof page.prevCursor === "string" ? page.prevCursor : null;
  const hasNext = page.hasNext === true;
  const hasPrev = page.hasPrev === true;
  const limit = typeof page.limit === "number" && Number.isInteger(page.limit) && page.limit > 0 ? page.limit : 10;
  const totalItems =
    typeof page.totalItems === "number" && Number.isInteger(page.totalItems) && page.totalItems >= 0
      ? page.totalItems
      : 0;
  const rangeStart =
    typeof page.rangeStart === "number" && Number.isInteger(page.rangeStart) && page.rangeStart >= 0
      ? page.rangeStart
      : 0;
  const rangeEnd =
    typeof page.rangeEnd === "number" && Number.isInteger(page.rangeEnd) && page.rangeEnd >= 0
      ? page.rangeEnd
      : 0;

  return {
    nextCursor,
    prevCursor,
    hasNext,
    hasPrev,
    limit,
    totalItems,
    rangeStart,
    rangeEnd,
  };
}

export function parseAdminUsers(body: unknown): AdminUserListItem[] {
  const root = asRecord(body);
  if (!root || !Array.isArray(root.items)) return [];

  return root.items
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = typeof row.id === "number" ? row.id : Number(row.id);
      if (!Number.isInteger(id) || id <= 0) return null;

      const email = typeof row.email === "string" ? row.email : "";
      const role = asRole(row.role);
      const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";

      if (!email || !role || !createdAt) return null;

      return {
        id,
        email,
        role,
        isBlocked: row.isBlocked === true,
        createdAt,
      } satisfies AdminUserListItem;
    })
    .filter((item): item is AdminUserListItem => item !== null);
}

export function parseAdminAuditLogs(body: unknown): AdminAuditLogListItem[] {
  const root = asRecord(body);
  if (!root || !Array.isArray(root.items)) return [];

  return root.items
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const result = asAuditResult(row.result);
      const timestamp = typeof row.timestamp === "string" ? row.timestamp : "";
      const action = typeof row.action === "string" ? row.action : "";

      if (!Number.isInteger(id) || id <= 0 || !result || !timestamp || !action) return null;

      const actorId =
        typeof row.actorId === "number" && Number.isInteger(row.actorId)
          ? row.actorId
          : row.actorId == null
            ? null
            : Number.isInteger(Number(row.actorId))
              ? Number(row.actorId)
              : null;

      return {
        id,
        timestamp,
        action,
        result,
        actorId,
        actorRole: asActorRole(row.actorRole),
        ipAddress: typeof row.ipAddress === "string" ? row.ipAddress : null,
        userAgent: typeof row.userAgent === "string" ? row.userAgent : null,
        objectName: typeof row.objectName === "string" ? row.objectName : null,
        objectId: typeof row.objectId === "string" ? row.objectId : null,
      } satisfies AdminAuditLogListItem;
    })
    .filter((item): item is AdminAuditLogListItem => item !== null);
}

export function parseAdminReservedUsernames(body: unknown): AdminReservedUsernameListItem[] {
  const root = asRecord(body);
  if (!root || !Array.isArray(root.items)) return [];

  return root.items
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;

      const id = typeof row.id === "number" ? row.id : Number(row.id);
      const username = typeof row.username === "string" ? row.username : "";
      const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";

      if (!Number.isInteger(id) || id <= 0 || !username || !createdAt) return null;

      return {
        id,
        username,
        createdAt,
      } satisfies AdminReservedUsernameListItem;
    })
    .filter((item): item is AdminReservedUsernameListItem => item !== null);
}
