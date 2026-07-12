import { useMemo, useState } from "react";
import type {
  AdminAuditLogListItem,
  AdminAuditLogsFilterInput,
  AdminReservedUsernameListItem,
  AdminUserListItem,
  AdminUsersFilterInput,
  ApiResult,
  CursorDirection,
  CursorPageMeta,
} from "../types/auth";
import * as adminService from "../services/adminService";
import {
  parseAdminAuditLogs,
  parseAdminReservedUsernames,
  parseAdminUsers,
  parseCursorPageMeta,
} from "../utils/adminParsers";
import { toErrorResult } from "../utils/authParsers";
import { pushApiToast } from "../utils/toast";

type AdminResultKey =
  | "usersList"
  | "userBlockUpdate"
  | "auditLogsList"
  | "reservedList"
  | "reservedCreate"
  | "reservedUpdate"
  | "reservedDelete";

type AdminResults = Partial<Record<AdminResultKey, ApiResult>>;
type AdminLoading = Partial<Record<AdminResultKey, boolean>>;
const ADMIN_TOAST_TITLES: Record<AdminResultKey, string> = {
  usersList: "Users",
  userBlockUpdate: "User access",
  auditLogsList: "Audit logs",
  reservedList: "Reserved usernames",
  reservedCreate: "Reserved username",
  reservedUpdate: "Reserved username",
  reservedDelete: "Reserved username",
};
const ADMIN_SILENT_SUCCESS_KEYS = new Set<AdminResultKey>(["usersList", "auditLogsList", "reservedList"]);

type CursorJumpInput = {
  cursor?: string | null;
  direction?: CursorDirection;
};

const DEFAULT_LIMIT = 10;

export function useAdminDashboard() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersPage, setUsersPage] = useState<CursorPageMeta | null>(null);
  const [usersFilters, setUsersFilters] = useState<AdminUsersFilterInput>({ blocked: "all" });

  const [auditLogs, setAuditLogs] = useState<AdminAuditLogListItem[]>([]);
  const [auditLogsPage, setAuditLogsPage] = useState<CursorPageMeta | null>(null);
  const [auditFilters, setAuditFilters] = useState<AdminAuditLogsFilterInput>({
    result: "all",
    actorRole: "all",
  });

  const [reservedUsernames, setReservedUsernames] = useState<AdminReservedUsernameListItem[]>([]);
  const [reservedPage, setReservedPage] = useState<CursorPageMeta | null>(null);
  const [reservedSearch, setReservedSearch] = useState("");

  const [results, setResults] = useState<AdminResults>({});
  const [loading, setLoading] = useState<AdminLoading>({});

  function setResult(key: AdminResultKey, result: ApiResult) {
    setResults((current) => ({ ...current, [key]: result }));

    const ok = result.status >= 200 && result.status < 300;
    if (!ok || !ADMIN_SILENT_SUCCESS_KEYS.has(key)) {
      pushApiToast(ADMIN_TOAST_TITLES[key], result);
    }
  }

  function setLoadingFlag(key: AdminResultKey, value: boolean) {
    setLoading((current) => ({ ...current, [key]: value }));
  }

  async function loadUsersPageData(jump?: CursorJumpInput, nextFilters?: AdminUsersFilterInput) {
    const filters = nextFilters ?? usersFilters;
    if (nextFilters) setUsersFilters(nextFilters);

    setLoadingFlag("usersList", true);
    try {
      const result = await adminService.listAdminUsers({
        limit: usersPage?.limit ?? DEFAULT_LIMIT,
        cursor: jump?.cursor ?? undefined,
        direction: jump?.direction ?? "next",
        searchEmail: filters.searchEmail?.trim() || undefined,
        blocked: filters.blocked ?? "all",
      });

      setResult("usersList", result);
      if (result.status >= 200 && result.status < 300) {
        setUsers(parseAdminUsers(result.body));
        setUsersPage(parseCursorPageMeta(result.body));
      }
    } catch (error) {
      setResult("usersList", toErrorResult(error));
    } finally {
      setLoadingFlag("usersList", false);
    }
  }

  async function setUserBlockedState(userId: number, blocked: boolean) {
    setLoadingFlag("userBlockUpdate", true);
    try {
      const result = await adminService.setAdminUserBlockedState(userId, blocked);
      setResult("userBlockUpdate", result);

      if (result.status >= 200 && result.status < 300) {
        setUsers((current) =>
          current.map((user) => (user.id === userId ? { ...user, isBlocked: blocked } : user))
        );
      }
    } catch (error) {
      setResult("userBlockUpdate", toErrorResult(error));
    } finally {
      setLoadingFlag("userBlockUpdate", false);
    }
  }

  async function loadAuditLogsPageData(jump?: CursorJumpInput, nextFilters?: AdminAuditLogsFilterInput) {
    const filters = nextFilters ?? auditFilters;
    if (nextFilters) setAuditFilters(nextFilters);

    setLoadingFlag("auditLogsList", true);
    try {
      const result = await adminService.listAdminAuditLogs({
        limit: auditLogsPage?.limit ?? DEFAULT_LIMIT,
        cursor: jump?.cursor ?? undefined,
        direction: jump?.direction ?? "next",
        action: filters.action?.trim() || undefined,
        result: filters.result ?? "all",
        actorId: filters.actorId?.trim() || undefined,
        actorRole: filters.actorRole ?? "all",
      });

      setResult("auditLogsList", result);
      if (result.status >= 200 && result.status < 300) {
        setAuditLogs(parseAdminAuditLogs(result.body));
        setAuditLogsPage(parseCursorPageMeta(result.body));
      }
    } catch (error) {
      setResult("auditLogsList", toErrorResult(error));
    } finally {
      setLoadingFlag("auditLogsList", false);
    }
  }

  async function loadReservedUsernamesPageData(jump?: CursorJumpInput, searchValue?: string) {
    const activeSearch = searchValue ?? reservedSearch;
    if (searchValue != null) setReservedSearch(searchValue);

    setLoadingFlag("reservedList", true);
    try {
      const result = await adminService.listAdminReservedUsernames({
        limit: reservedPage?.limit ?? DEFAULT_LIMIT,
        cursor: jump?.cursor ?? undefined,
        direction: jump?.direction ?? "next",
        search: activeSearch.trim() || undefined,
      });

      setResult("reservedList", result);
      if (result.status >= 200 && result.status < 300) {
        setReservedUsernames(parseAdminReservedUsernames(result.body));
        setReservedPage(parseCursorPageMeta(result.body));
      }
    } catch (error) {
      setResult("reservedList", toErrorResult(error));
    } finally {
      setLoadingFlag("reservedList", false);
    }
  }

  async function createReservedUsername(username: string) {
    setLoadingFlag("reservedCreate", true);
    try {
      const result = await adminService.createAdminReservedUsername(username.trim());
      setResult("reservedCreate", result);

      if (result.status >= 200 && result.status < 300) {
        await loadReservedUsernamesPageData();
      }
    } catch (error) {
      setResult("reservedCreate", toErrorResult(error));
    } finally {
      setLoadingFlag("reservedCreate", false);
    }
  }

  async function updateReservedUsername(id: number, username: string) {
    setLoadingFlag("reservedUpdate", true);
    try {
      const result = await adminService.updateAdminReservedUsername(id, username.trim());
      setResult("reservedUpdate", result);

      if (result.status >= 200 && result.status < 300) {
        await loadReservedUsernamesPageData();
      }
    } catch (error) {
      setResult("reservedUpdate", toErrorResult(error));
    } finally {
      setLoadingFlag("reservedUpdate", false);
    }
  }

  async function deleteReservedUsername(id: number) {
    setLoadingFlag("reservedDelete", true);
    try {
      const result = await adminService.deleteAdminReservedUsername(id);
      setResult("reservedDelete", result);

      if (result.status >= 200 && result.status < 300) {
        await loadReservedUsernamesPageData();
      }
    } catch (error) {
      setResult("reservedDelete", toErrorResult(error));
    } finally {
      setLoadingFlag("reservedDelete", false);
    }
  }

  return useMemo(
    () => ({
      users,
      usersPage,
      usersFilters,
      auditLogs,
      auditLogsPage,
      auditFilters,
      reservedUsernames,
      reservedPage,
      reservedSearch,
      results,
      loading,
      setUsersFilters,
      setAuditFilters,
      setReservedSearch,
      loadUsersPageData,
      setUserBlockedState,
      loadAuditLogsPageData,
      loadReservedUsernamesPageData,
      createReservedUsername,
      updateReservedUsername,
      deleteReservedUsername,
    }),
    [
      users,
      usersPage,
      usersFilters,
      auditLogs,
      auditLogsPage,
      auditFilters,
      reservedUsernames,
      reservedPage,
      reservedSearch,
      results,
      loading,
    ]
  );
}

