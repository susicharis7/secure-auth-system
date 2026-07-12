import {
  AdminAuditLogsFilters,
  AdminUsersListFilters,
  AuditActorRoleType,
  AuditResultType,
  CursorPageInput,
} from "./adminTypes";

export type ParsedValue<T> = {
  value: T | null;
  error: string | null;
};

function ok<T>(value: T): ParsedValue<T> {
  return { value, error: null };
}

function fail<T>(error: string): ParsedValue<T> {
  return { value: null, error };
}

export function readSingleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function readSingleParamValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

export function parsePositiveInt(raw: string): number | null {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

export function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }

  return null;
}

export function parsePageInputFromQuery(query: Record<string, unknown>): ParsedValue<CursorPageInput> {
  const cursor = readSingleQueryValue(query.cursor);
  const directionRaw = readSingleQueryValue(query.direction);
  const limitRaw = readSingleQueryValue(query.limit);

  let direction: "next" | "prev" | undefined;
  if (directionRaw !== undefined) {
    const normalizedDirection = directionRaw.trim().toLowerCase();
    if (normalizedDirection !== "next" && normalizedDirection !== "prev") {
      return fail("direction must be 'next' or 'prev'.");
    }
    direction = normalizedDirection;
  }

  let limit: number | undefined;
  if (limitRaw !== undefined) {
    const parsed = parsePositiveInt(limitRaw);
    if (parsed == null) {
      return fail("limit must be a positive integer.");
    }
    limit = parsed;
  }

  return ok({
    cursor: cursor?.trim() || undefined,
    direction,
    limit,
  });
}

export function parseAdminUsersFiltersFromQuery(
  query: Record<string, unknown>
): ParsedValue<AdminUsersListFilters> {
  const searchEmailRaw = readSingleQueryValue(query.searchEmail);
  const blockedRaw = readSingleQueryValue(query.blocked);

  let blocked: boolean | null | undefined = undefined;

  if (blockedRaw !== undefined) {
    const normalized = blockedRaw.trim().toLowerCase();

    if (normalized === "all" || normalized === "") {
      blocked = null;
    } else {
      const parsedBlocked = parseBooleanLike(normalized);
      if (parsedBlocked == null) {
        return fail("blocked must be true/false/1/0/all.");
      }
      blocked = parsedBlocked;
    }
  }

  return ok({
    searchEmail: searchEmailRaw?.trim().toLowerCase() || undefined,
    blocked,
  });
}

export function parseAdminAuditLogsFiltersFromQuery(
  query: Record<string, unknown>
): ParsedValue<AdminAuditLogsFilters> {
  const action = readSingleQueryValue(query.action)?.trim();
  const resultRaw = readSingleQueryValue(query.result)?.trim().toLowerCase();
  const actorIdRaw = readSingleQueryValue(query.actorId)?.trim();
  const actorRoleRaw = readSingleQueryValue(query.actorRole)?.trim().toLowerCase();

  let result: AuditResultType | undefined;
  if (resultRaw) {
    if (!["success", "failure", "denied", "error"].includes(resultRaw)) {
      return fail("result must be one of: success, failure, denied, error.");
    }
    result = resultRaw as AuditResultType;
  }

  let actorId: number | undefined;
  if (actorIdRaw) {
    const parsedActorId = parsePositiveInt(actorIdRaw);
    if (parsedActorId == null) {
      return fail("actorId must be a positive integer.");
    }
    actorId = parsedActorId;
  }

  let actorRole: AuditActorRoleType | undefined;
  if (actorRoleRaw) {
    if (!["user", "admin", "system"].includes(actorRoleRaw)) {
      return fail("actorRole must be one of: user, admin, system.");
    }
    actorRole = actorRoleRaw as AuditActorRoleType;
  }

  return ok({
    action: action || undefined,
    result,
    actorId,
    actorRole,
  });
}

export function parseTargetUserIdFromParams(params: Record<string, unknown>): ParsedValue<number> {
  const rawId = readSingleParamValue(params.id) ?? "";
  const parsed = parsePositiveInt(rawId);
  if (parsed == null) return fail("User id must be a positive integer.");
  return ok(parsed);
}

export function parseBlockedStateFromBody(body: Record<string, unknown>): ParsedValue<boolean> {
  const blocked = parseBooleanLike(body.blocked);
  if (blocked == null) return fail("blocked is required and must be true/false.");
  return ok(blocked);
}

export function parseReservedUsernameIdFromParams(
  params: Record<string, unknown>
): ParsedValue<number> {
  const rawId = readSingleParamValue(params.id) ?? "";
  const parsed = parsePositiveInt(rawId);
  if (parsed == null) return fail("Reserved username id must be a positive integer.");
  return ok(parsed);
}

export function parseReservedUsernameFromBody(
  body: Record<string, unknown>
): ParsedValue<string> {
  const username = typeof body.username === "string" ? body.username : "";
  return ok(username);
}