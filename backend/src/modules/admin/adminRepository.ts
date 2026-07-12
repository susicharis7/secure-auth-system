import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database";
import {
  AdminAuditLogListItem,
  AdminAuditLogsFilters,
  AdminReservedUsernameListItem,
  AdminUserListItem,
  AdminUsersListFilters,
  CursorPageInput,
  AdminUserDbRow,
  AdminAuditLogDbRow,
  AdminReservedUsernameDbRow,
} from "./adminTypes";

import { 
    buildPageMeta, 
    CursorListResult, 
    decodeCursor, 
    normalizeDirection, 
    normalizeLimit, 
    parseJsonObject, 
    toIsoString 
} from "./adminUtils";

function toCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function pageRange(totalItems: number, itemsCount: number, beforeCount: number) {
  if (totalItems === 0 || itemsCount === 0) {
    return { rangeStart: 0, rangeEnd: 0 };
  }

  const rangeStart = beforeCount + 1;
  return {
    rangeStart,
    rangeEnd: rangeStart + itemsCount - 1,
  };
}

export async function getAdminUserById(userId: number): Promise<AdminUserListItem | null> {
  const rows = await sequelize.query<AdminUserDbRow>(
    `
    SELECT
      u.id,
      u.email,
      u.role,
      u.is_blocked,
      u.created_at
    FROM users u
    WHERE u.id = :userId
    LIMIT 1
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isBlocked: Number(row.is_blocked) === 1,
    createdAt: toIsoString(row.created_at),
  };
}

export async function setUserBlockedState(userId: number, blocked: boolean): Promise<boolean> {
  const existing = await getAdminUserById(userId);
  if (!existing) return false;

  await sequelize.query(
    `
    UPDATE users
    SET is_blocked = :blocked
    WHERE id = :userId
    `,
    {
      replacements: { userId, blocked: blocked ? 1 : 0 },
      type: QueryTypes.UPDATE,
    }
  );

  return true;
}

export async function revokeActiveTrustedDevicesForUser(userId: number, revokedAt: Date): Promise<void> {
  await sequelize.query(
    `
    UPDATE trusted_devices
    SET revoked_at = :revokedAt
    WHERE user_id = :userId
      AND revoked_at IS NULL
      AND expires_at > NOW()
    `,
    {
      replacements: { userId, revokedAt },
      type: QueryTypes.UPDATE,
    }
  );
}

export async function listAdminUsers(input: {
  page: CursorPageInput;
  filters: AdminUsersListFilters;
}): Promise<CursorListResult<AdminUserListItem>> {
  const limit = normalizeLimit(input.page.limit);
  const direction = normalizeDirection(input.page.direction);
  const cursorId = decodeCursor(input.page.cursor);

  const where: string[] = [];
  const replacements: Record<string, unknown> = {};

  const emailFilter = input.filters.searchEmail?.trim().toLowerCase();
  if (emailFilter) {
    where.push("LOWER(u.email) LIKE :searchEmail");
    replacements.searchEmail = `%${emailFilter}%`;
  }

  if (input.filters.blocked === true) where.push("u.is_blocked = 1");
  if (input.filters.blocked === false) where.push("u.is_blocked = 0");

  if (cursorId != null) {
    where.push(direction === "next" ? "u.id < :cursorId" : "u.id > :cursorId");
    replacements.cursorId = cursorId;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = direction === "prev" ? "u.id ASC" : "u.id DESC";

  const rows = await sequelize.query<AdminUserDbRow>(
    `
    SELECT
      u.id,
      u.email,
      u.role,
      u.is_blocked,
      u.created_at
    FROM users u
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT :queryLimit
    `,
    {
      replacements: {
        ...replacements,
        queryLimit: limit + 1,
      },
      type: QueryTypes.SELECT,
    }
  );

  const slice = rows.slice(0, limit);
  const ordered = direction === "prev" ? slice.reverse() : slice;

  const items: AdminUserListItem[] = ordered.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    isBlocked: Number(row.is_blocked) === 1,
    createdAt: toIsoString(row.created_at),
  }));

  const baseWhere: string[] = [];
  const baseReplacements: Record<string, unknown> = {};

  if (emailFilter) {
    baseWhere.push("LOWER(u.email) LIKE :searchEmail");
    baseReplacements.searchEmail = `%${emailFilter}%`;
  }

  if (input.filters.blocked === true) baseWhere.push("u.is_blocked = 1");
  if (input.filters.blocked === false) baseWhere.push("u.is_blocked = 0");

  const baseWhereSql = baseWhere.length > 0 ? `WHERE ${baseWhere.join(" AND ")}` : "";
  const totalRows = await sequelize.query<{ total_items: number | string }>(
    `
    SELECT COUNT(*) AS total_items
    FROM users u
    ${baseWhereSql}
    `,
    {
      replacements: baseReplacements,
      type: QueryTypes.SELECT,
    }
  );
  const totalItems = toCount(totalRows[0]?.total_items);

  if (items.length === 0) {
    return {
      items: [],
      page: {
        nextCursor: null,
        prevCursor: null,
        hasNext: false,
        hasPrev: false,
        limit,
        totalItems,
        rangeStart: 0,
        rangeEnd: 0,
      },
    };
  }

  const firstId = items[0].id;
  const lastId = items[items.length - 1].id;

  const hasPrevWhere = [...baseWhere, "u.id > :firstId"];
  const hasNextWhere = [...baseWhere, "u.id < :lastId"];

  const beforeRows = await sequelize.query<{ before_items: number | string }>(
    `
    SELECT COUNT(*) AS before_items
    FROM users u
    WHERE ${hasPrevWhere.join(" AND ")}
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );
  const range = pageRange(totalItems, items.length, toCount(beforeRows[0]?.before_items));

  const hasPrevRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM users u
    WHERE ${hasPrevWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );

  const hasNextRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM users u
    WHERE ${hasNextWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        lastId,
      },
      type: QueryTypes.SELECT,
    }
  );

  return {
    items,
    page: {
      ...buildPageMeta(
        items.map((item) => item.id),
        limit,
        hasPrevRows.length > 0,
        hasNextRows.length > 0
      ),
      totalItems,
      ...range,
    },
  };
}

export async function listAdminAuditLogs(input: {
  page: CursorPageInput;
  filters: AdminAuditLogsFilters;
}): Promise<CursorListResult<AdminAuditLogListItem>> {
  const limit = normalizeLimit(input.page.limit);
  const direction = normalizeDirection(input.page.direction);
  const cursorId = decodeCursor(input.page.cursor);

  const where: string[] = [];
  const replacements: Record<string, unknown> = {};

  const actionFilter = input.filters.action?.trim().toLowerCase();
  if (actionFilter) {
    where.push("LOWER(a.action) LIKE :action");
    replacements.action = `%${actionFilter}%`;
  }

  if (input.filters.result) {
    where.push("a.result = :result");
    replacements.result = input.filters.result;
  }

  if (typeof input.filters.actorId === "number" && Number.isInteger(input.filters.actorId)) {
    where.push("a.actor_id = :actorId");
    replacements.actorId = input.filters.actorId;
  }

  if (input.filters.actorRole) {
    where.push("a.actor_role = :actorRole");
    replacements.actorRole = input.filters.actorRole;
  }

  if (cursorId != null) {
    where.push(direction === "next" ? "a.id < :cursorId" : "a.id > :cursorId");
    replacements.cursorId = cursorId;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = direction === "prev" ? "a.id ASC" : "a.id DESC";

  const rows = await sequelize.query<AdminAuditLogDbRow>(
    `
    SELECT
      a.id,
      a.created_at,
      a.action,
      a.result,
      a.actor_id,
      a.actor_role,
      a.ip_address,
      a.user_agent,
      a.object_name,
      a.object_id,
      a.original_object,
      a.request_data
    FROM audit_logs a
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT :queryLimit
    `,
    {
      replacements: {
        ...replacements,
        queryLimit: limit + 1,
      },
      type: QueryTypes.SELECT,
    }
  );

  const slice = rows.slice(0, limit);
  const ordered = direction === "prev" ? slice.reverse() : slice;

  const items: AdminAuditLogListItem[] = ordered.map((row) => ({
    id: row.id,
    timestamp: toIsoString(row.created_at),
    action: row.action,
    result: row.result,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    objectName: row.object_name,
    objectId: row.object_id,
    originalObject: parseJsonObject(row.original_object),
    requestData: parseJsonObject(row.request_data),
  }));

  const baseWhere: string[] = [];
  const baseReplacements: Record<string, unknown> = {};

  if (actionFilter) {
    baseWhere.push("LOWER(a.action) LIKE :action");
    baseReplacements.action = `%${actionFilter}%`;
  }

  if (input.filters.result) {
    baseWhere.push("a.result = :result");
    baseReplacements.result = input.filters.result;
  }

  if (typeof input.filters.actorId === "number" && Number.isInteger(input.filters.actorId)) {
    baseWhere.push("a.actor_id = :actorId");
    baseReplacements.actorId = input.filters.actorId;
  }

  if (input.filters.actorRole) {
    baseWhere.push("a.actor_role = :actorRole");
    baseReplacements.actorRole = input.filters.actorRole;
  }

  const baseWhereSql = baseWhere.length > 0 ? `WHERE ${baseWhere.join(" AND ")}` : "";
  const totalRows = await sequelize.query<{ total_items: number | string }>(
    `
    SELECT COUNT(*) AS total_items
    FROM audit_logs a
    ${baseWhereSql}
    `,
    {
      replacements: baseReplacements,
      type: QueryTypes.SELECT,
    }
  );
  const totalItems = toCount(totalRows[0]?.total_items);

  if (items.length === 0) {
    return {
      items: [],
      page: {
        nextCursor: null,
        prevCursor: null,
        hasNext: false,
        hasPrev: false,
        limit,
        totalItems,
        rangeStart: 0,
        rangeEnd: 0,
      },
    };
  }

  const firstId = items[0].id;
  const lastId = items[items.length - 1].id;

  const hasPrevWhere = [...baseWhere, "a.id > :firstId"];
  const hasNextWhere = [...baseWhere, "a.id < :lastId"];

  const beforeRows = await sequelize.query<{ before_items: number | string }>(
    `
    SELECT COUNT(*) AS before_items
    FROM audit_logs a
    WHERE ${hasPrevWhere.join(" AND ")}
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );
  const range = pageRange(totalItems, items.length, toCount(beforeRows[0]?.before_items));

  const hasPrevRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM audit_logs a
    WHERE ${hasPrevWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );

  const hasNextRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM audit_logs a
    WHERE ${hasNextWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        lastId,
      },
      type: QueryTypes.SELECT,
    }
  );

  return {
    items,
    page: {
      ...buildPageMeta(
        items.map((item) => item.id),
        limit,
        hasPrevRows.length > 0,
        hasNextRows.length > 0
      ),
      totalItems,
      ...range,
    },
  };
}

export async function listAdminReservedUsernames(input: {
  page: CursorPageInput;
  search?: string;
}): Promise<CursorListResult<AdminReservedUsernameListItem>> {
  const limit = normalizeLimit(input.page.limit);
  const direction = normalizeDirection(input.page.direction);
  const cursorId = decodeCursor(input.page.cursor);

  const where: string[] = [];
  const replacements: Record<string, unknown> = {};

  const search = input.search?.trim().toLowerCase();
  if (search) {
    where.push("LOWER(r.username) LIKE :search");
    replacements.search = `%${search}%`;
  }

  if (cursorId != null) {
    where.push(direction === "next" ? "r.id < :cursorId" : "r.id > :cursorId");
    replacements.cursorId = cursorId;
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = direction === "prev" ? "r.id ASC" : "r.id DESC";

  const rows = await sequelize.query<AdminReservedUsernameDbRow>(
    `
    SELECT
      r.id,
      r.username,
      r.created_at
    FROM reserved_usernames r
    ${whereSql}
    ORDER BY ${orderSql}
    LIMIT :queryLimit
    `,
    {
      replacements: {
        ...replacements,
        queryLimit: limit + 1,
      },
      type: QueryTypes.SELECT,
    }
  );

  const slice = rows.slice(0, limit);
  const ordered = direction === "prev" ? slice.reverse() : slice;

  const items: AdminReservedUsernameListItem[] = ordered.map((row) => ({
    id: row.id,
    username: row.username,
    createdAt: toIsoString(row.created_at),
  }));

  const baseWhere: string[] = [];
  const baseReplacements: Record<string, unknown> = {};

  if (search) {
    baseWhere.push("LOWER(r.username) LIKE :search");
    baseReplacements.search = `%${search}%`;
  }

  const baseWhereSql = baseWhere.length > 0 ? `WHERE ${baseWhere.join(" AND ")}` : "";
  const totalRows = await sequelize.query<{ total_items: number | string }>(
    `
    SELECT COUNT(*) AS total_items
    FROM reserved_usernames r
    ${baseWhereSql}
    `,
    {
      replacements: baseReplacements,
      type: QueryTypes.SELECT,
    }
  );
  const totalItems = toCount(totalRows[0]?.total_items);

  if (items.length === 0) {
    return {
      items: [],
      page: {
        nextCursor: null,
        prevCursor: null,
        hasNext: false,
        hasPrev: false,
        limit,
        totalItems,
        rangeStart: 0,
        rangeEnd: 0,
      },
    };
  }

  const firstId = items[0].id;
  const lastId = items[items.length - 1].id;

  const hasPrevWhere = [...baseWhere, "r.id > :firstId"];
  const hasNextWhere = [...baseWhere, "r.id < :lastId"];

  const beforeRows = await sequelize.query<{ before_items: number | string }>(
    `
    SELECT COUNT(*) AS before_items
    FROM reserved_usernames r
    WHERE ${hasPrevWhere.join(" AND ")}
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );
  const range = pageRange(totalItems, items.length, toCount(beforeRows[0]?.before_items));

  const hasPrevRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM reserved_usernames r
    WHERE ${hasPrevWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        firstId,
      },
      type: QueryTypes.SELECT,
    }
  );

  const hasNextRows = await sequelize.query<{ exists_flag: number }>(
    `
    SELECT 1 AS exists_flag
    FROM reserved_usernames r
    WHERE ${hasNextWhere.join(" AND ")}
    LIMIT 1
    `,
    {
      replacements: {
        ...baseReplacements,
        lastId,
      },
      type: QueryTypes.SELECT,
    }
  );

  return {
    items,
    page: {
      ...buildPageMeta(
        items.map((item) => item.id),
        limit,
        hasPrevRows.length > 0,
        hasNextRows.length > 0
      ),
      totalItems,
      ...range,
    },
  };
}

export async function getReservedUsernameById(id: number): Promise<AdminReservedUsernameListItem | null> {
  const rows = await sequelize.query<AdminReservedUsernameDbRow>(
    `
    SELECT id, username, created_at
    FROM reserved_usernames
    WHERE id = :id
    LIMIT 1
    `,
    {
      replacements: { id },
      type: QueryTypes.SELECT,
    }
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    createdAt: toIsoString(row.created_at),
  };
}

export async function createReservedUsername(username: string): Promise<number> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("RESERVED_USERNAME_REQUIRED");

  const [insertId] = await sequelize.query(
    `
    INSERT INTO reserved_usernames (username)
    VALUES (:username)
    `,
    {
      replacements: { username: normalized },
      type: QueryTypes.INSERT,
    }
  );

  return Number(insertId);
}

export async function updateReservedUsername(id: number, username: string): Promise<boolean> {
  const existing = await getReservedUsernameById(id);
  if (!existing) return false;

  const normalized = username.trim().toLowerCase();
  if (!normalized) throw new Error("RESERVED_USERNAME_REQUIRED");

  await sequelize.query(
    `
    UPDATE reserved_usernames
    SET username = :username
    WHERE id = :id
    `,
    {
      replacements: { id, username: normalized },
      type: QueryTypes.UPDATE,
    }
  );

  return true;
}

export async function deleteReservedUsername(id: number): Promise<boolean> {
  const existing = await getReservedUsernameById(id);
  if (!existing) return false;

  await sequelize.query(
    `
    DELETE FROM reserved_usernames
    WHERE id = :id
    `,
    {
      replacements: { id },
      type: QueryTypes.DELETE,
    }
  );

  return true;
}
