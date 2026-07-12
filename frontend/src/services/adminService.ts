import { requestApi } from "./apiClient";
import type { CursorDirection } from "../types/auth";

type ListPageInput = {
  cursor?: string;
  direction?: CursorDirection;
  limit?: number;
};

type AdminUsersListInput = ListPageInput & {
  searchEmail?: string;
  blocked?: "all" | "true" | "false";
};

type AdminAuditLogsListInput = ListPageInput & {
  action?: string;
  result?: "success" | "failure" | "denied" | "error" | "all";
  actorId?: string;
  actorRole?: "user" | "admin" | "system" | "all";
};

type AdminReservedUsernamesListInput = ListPageInput & {
  search?: string;
};

function withPageParams(page: ListPageInput): URLSearchParams {
  const params = new URLSearchParams();

  if (page.cursor) params.set("cursor", page.cursor);
  if (page.direction) params.set("direction", page.direction);
  if (typeof page.limit === "number" && Number.isInteger(page.limit) && page.limit > 0) {
    params.set("limit", String(page.limit));
  }

  return params;
}

export function listAdminUsers(input: AdminUsersListInput = {}) {
  const params = withPageParams(input);
  if (input.searchEmail?.trim()) params.set("searchEmail", input.searchEmail.trim());
  if (input.blocked && input.blocked !== "all") params.set("blocked", input.blocked);
  return requestApi(`/api/admin/users?${params.toString()}`, "GET", undefined, { retryOn401: true });
}

export function setAdminUserBlockedState(userId: number, blocked: boolean) {
  return requestApi(`/api/admin/users/${userId}/block`, "PATCH", { blocked }, { retryOn401: true });
}

export function listAdminAuditLogs(input: AdminAuditLogsListInput = {}) {
  const params = withPageParams(input);
  if (input.action?.trim()) params.set("action", input.action.trim());
  if (input.result && input.result !== "all") params.set("result", input.result);
  if (input.actorId?.trim()) params.set("actorId", input.actorId.trim());
  if (input.actorRole && input.actorRole !== "all") params.set("actorRole", input.actorRole);
  return requestApi(`/api/admin/audit-logs?${params.toString()}`, "GET", undefined, { retryOn401: true });
}

export function listAdminReservedUsernames(input: AdminReservedUsernamesListInput = {}) {
  const params = withPageParams(input);
  if (input.search?.trim()) params.set("search", input.search.trim());
  return requestApi(`/api/admin/reserved-usernames?${params.toString()}`, "GET", undefined, {
    retryOn401: true,
  });
}

export function createAdminReservedUsername(username: string) {
  return requestApi("/api/admin/reserved-usernames", "POST", { username }, { retryOn401: true });
}

export function updateAdminReservedUsername(id: number, username: string) {
  return requestApi(`/api/admin/reserved-usernames/${id}`, "PUT", { username }, { retryOn401: true });
}

export function deleteAdminReservedUsername(id: number) {
  return requestApi(`/api/admin/reserved-usernames/${id}`, "DELETE", undefined, { retryOn401: true });
}
