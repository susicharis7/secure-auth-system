import {
  createReservedUsername,
  deleteReservedUsername,
  getAdminUserById,
  getReservedUsernameById,
  listAdminAuditLogs,
  listAdminReservedUsernames,
  listAdminUsers,
  revokeActiveTrustedDevicesForUser,
  setUserBlockedState,
  updateReservedUsername,
} from "./adminRepository";
import { revokeActiveRefreshTokensForUser } from "../auth/refreshTokenRepository";
import {
  AdminAuditLogsFilters,
  AdminServiceResult,
  AdminUsersListFilters,
  CursorPageInput,
} from "./adminTypes";
import { isDuplicateEntryError, mapReservedUsernameDuplicateMessage, validateReservedUsername } from "./adminUtils";

export async function listAdminUsersService(input: {
  page: CursorPageInput;
  filters: AdminUsersListFilters;
}): Promise<AdminServiceResult> {
  const result = await listAdminUsers(input);

  return {
    status: 200,
    body: {
      items: result.items,
      page: result.page,
    },
  };
}

export async function setUserBlockedStateService(input: {
  actorUserId: number;
  targetUserId: number;
  blocked: boolean;
}): Promise<AdminServiceResult> {
  if (!Number.isInteger(input.actorUserId) || input.actorUserId <= 0) {
    return { status: 400, body: { error: "Invalid actor user id." } };
  }

  if (!Number.isInteger(input.targetUserId) || input.targetUserId <= 0) {
    return { status: 400, body: { error: "Invalid target user id." } };
  }

  if (input.actorUserId === input.targetUserId) {
    return {
      status: 400,
      body: { error: "Admin cannot block/unblock own account." },
    };
  }

  const existing = await getAdminUserById(input.targetUserId);

  if (!existing) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (existing.isBlocked === input.blocked) {
    return {
      status: 200,
      body: {
        message: input.blocked ? "User is already blocked." : "User is already unblocked.",
        user: existing,
      },
    };
  }

  const changed = await setUserBlockedState(input.targetUserId, input.blocked);

  if (!changed) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (input.blocked) {
    const revokedAt = new Date();

    await Promise.all([
      revokeActiveRefreshTokensForUser(input.targetUserId, revokedAt),
      revokeActiveTrustedDevicesForUser(input.targetUserId, revokedAt),
    ]);
  }

  const updated = await getAdminUserById(input.targetUserId);

  return {
    status: 200,
    body: {
      message: input.blocked
        ? "User blocked successfully. Active sessions and trusted devices revoked."
        : "User unblocked successfully.",
      user: updated,
    },
  };
}

export async function listAdminAuditLogsService(input: {
  page: CursorPageInput;
  filters: AdminAuditLogsFilters;
}): Promise<AdminServiceResult> {
  const result = await listAdminAuditLogs(input);

  return {
    status: 200,
    body: {
      items: result.items,
      page: result.page,
    },
  };
}

export async function listAdminReservedUsernamesService(input: {
  page: CursorPageInput;
  search?: string;
}): Promise<AdminServiceResult> {
  const result = await listAdminReservedUsernames(input);

  return {
    status: 200,
    body: {
      items: result.items,
      page: result.page,
    },
  };
}

export async function createReservedUsernameService(input: {
  username: string;
}): Promise<AdminServiceResult> {
  const validated = validateReservedUsername(input.username);
  if (validated.error || !validated.value) {
    return { status: 400, body: { error: validated.error ?? "Invalid username." } };
  }

  try {
    const id = await createReservedUsername(validated.value);
    const item = await getReservedUsernameById(id);

    return {
      status: 201,
      body: {
        message: "Reserved username created successfully.",
        item,
      },
    };
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return {
        status: 409,
        body: { error: mapReservedUsernameDuplicateMessage(error) },
      };
    }

    throw error;
  }
}

export async function updateReservedUsernameService(input: {
  id: number;
  username: string;
}): Promise<AdminServiceResult> {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { status: 400, body: { error: "Invalid reserved username id." } };
  }

  const validated = validateReservedUsername(input.username);
  if (validated.error || !validated.value) {
    return { status: 400, body: { error: validated.error ?? "Invalid username." } };
  }

  try {
    const updated = await updateReservedUsername(input.id, validated.value);

    if (!updated) {
      return { status: 404, body: { error: "Reserved username not found." } };
    }

    const item = await getReservedUsernameById(input.id);

    return {
      status: 200,
      body: {
        message: "Reserved username updated successfully.",
        item,
      },
    };
  } catch (error) {
    if (isDuplicateEntryError(error)) {
      return {
        status: 409,
        body: { error: mapReservedUsernameDuplicateMessage(error) },
      };
    }

    throw error;
  }
}

export async function deleteReservedUsernameService(input: {
  id: number;
}): Promise<AdminServiceResult> {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    return { status: 400, body: { error: "Invalid reserved username id." } };
  }

  const deleted = await deleteReservedUsername(input.id);

  if (!deleted) {
    return {
      status: 404,
      body: { error: "Reserved username not found." },
    };
  }

  return {
    status: 200,
    body: { message: "Reserved username deleted successfully." },
  };
}