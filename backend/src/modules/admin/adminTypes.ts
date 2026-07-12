export type AppUserRole = "user" | "admin";

export type CursorDirection = "next" | "prev";

export type CursorPageInput = {
  cursor?: string;
  direction?: CursorDirection;
  limit?: number;
};

export type CursorPageMeta = {
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
};

export type AuditResultType = "success" | "failure" | "denied" | "error";
export type AuditActorRoleType = AppUserRole | "system";

export type AdminUsersListFilters = {
  searchEmail?: string;
  blocked?: boolean | null;
};

export type AdminUserListItem = {
  id: number;
  email: string;
  role: AppUserRole;
  isBlocked: boolean;
  createdAt: string;
};

export type AdminAuditLogsFilters = {
  action?: string;
  result?: AuditResultType;
  actorId?: number;
  actorRole?: AuditActorRoleType;
};

export type AdminAuditLogListItem = {
  id: number;
  timestamp: string;
  action: string;
  result: AuditResultType;
  actorId: number | null;
  actorRole: AuditActorRoleType | null;
  ipAddress: string | null;
  userAgent: string | null;
  objectName: string | null;
  objectId: string | null;
  originalObject: Record<string, unknown> | null;
  requestData: Record<string, unknown> | null;
};

export type AdminReservedUsernameListItem = {
  id: number;
  username: string;
  createdAt: string;
};

/* Admin Repository */
export type AdminUserDbRow = {
  id: number;
  email: string;
  role: AppUserRole;
  is_blocked: number;
  created_at: Date | string;
};

export type AdminAuditLogDbRow = {
  id: number;
  created_at: Date | string;
  action: string;
  result: AuditResultType;
  actor_id: number | null;
  actor_role: AppUserRole | "system" | null;
  ip_address: string | null;
  user_agent: string | null;
  object_name: string | null;
  object_id: string | null;
  original_object: unknown;
  request_data: unknown;
};

export type AdminReservedUsernameDbRow = {
  id: number;
  username: string;
  created_at: Date | string;
};

/* Admin Service */
export type AdminServiceResult = {
  status: number;
  body: Record<string, unknown>;
};

export type DbError = {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  message?: string;
};

