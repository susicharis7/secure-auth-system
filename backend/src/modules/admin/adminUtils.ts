import { CursorDirection, CursorPageMeta, DbError } from "./adminTypes";

/* Cursor Pagination (repository) */
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

type CursorPayload = {
  v: 1;
  id: number;
};

export type CursorListResult<T> = {
  items: T[];
  page: CursorPageMeta;
};

export function normalizeLimit(limit?: number): number {
  if (!Number.isInteger(limit) || (limit ?? 0) <= 0) return DEFAULT_LIMIT;
  return Math.min(Number(limit), MAX_LIMIT);
}

export function normalizeDirection(direction?: CursorDirection): CursorDirection {
  return direction === "prev" ? "prev" : "next";
}

export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function encodeCursor(id: number): string {
  const payload: CursorPayload = { v: 1, id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string): number | null {
  if (!cursor) return null;

  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as Partial<CursorPayload>;
    if (parsed.v !== 1) throw new Error("unsupported_cursor_version");
    if (!Number.isInteger(parsed.id) || (parsed.id ?? 0) <= 0) throw new Error("invalid_cursor_id");
    return Number(parsed.id);
  } catch {
    throw new Error("INVALID_CURSOR");
  }
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

export function buildPageMeta(ids: number[], limit: number, hasPrev: boolean, hasNext: boolean): CursorPageMeta {
  if (ids.length === 0) {
    return {
      nextCursor: null,
      prevCursor: null,
      hasNext: false,
      hasPrev: false,
      limit,
      totalItems: 0,
      rangeStart: 0,
      rangeEnd: 0,
    };
  }

  return {
    nextCursor: hasNext ? encodeCursor(ids[ids.length - 1]) : null,
    prevCursor: hasPrev ? encodeCursor(ids[0]) : null,
    hasNext,
    hasPrev,
    limit,
    totalItems: 0,
    rangeStart: 0,
    rangeEnd: 0,
  };
}

/* Admin Service */
const reservedUsernameRegex = /^[A-Za-z0-9]+$/;

function unwrapDbError(error: unknown): DbError {
  const wrapped = error as { original?: unknown; parent?: unknown };
  return (wrapped?.original ?? wrapped?.parent ?? error) as DbError;
}

export function isDuplicateEntryError(error: unknown): boolean {
  const db = unwrapDbError(error);
  return db.code === "ER_DUP_ENTRY" || db.errno === 1062;
}

export function mapReservedUsernameDuplicateMessage(error: unknown): string {
  const db = unwrapDbError(error);
  const text = `${db.sqlMessage ?? ""} ${db.message ?? ""}`.toLowerCase();

  if (text.includes("uq_reserved_usernames_username")) {
    return "Reserved username already exists.";
  }

  return "Reserved username already exists.";
}

export function validateReservedUsername(raw: string): { value: string | null; error: string | null } {
  const username = raw.trim();

  if (!username) {
    return { value: null, error: "Username is required." };
  }

  if (username.length <= 3) {
    return { value: null, error: "Username must be longer than 3 characters." };
  }

  if (!reservedUsernameRegex.test(username)) {
    return { value: null, error: "Username must be alphanumeric (no spaces/special chars)." };
  }

  return { value: username, error: null };
}



