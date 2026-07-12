import { Request, Response } from "express";
import { auditLog } from "../../services/auditLogService";
import { getErrorMessage } from "../users/userHelpers";
import { AuditActorRoleType, AuditResultType } from "./adminTypes";
import {
  createReservedUsernameService,
  deleteReservedUsernameService,
  listAdminAuditLogsService,
  listAdminReservedUsernamesService,
  listAdminUsersService,
  setUserBlockedStateService,
  updateReservedUsernameService,
} from "./adminService";
import {
  parseAdminAuditLogsFiltersFromQuery,
  parseAdminUsersFiltersFromQuery,
  parseBlockedStateFromBody,
  parsePageInputFromQuery,
  parseReservedUsernameFromBody,
  parseReservedUsernameIdFromParams,
  parseTargetUserIdFromParams,
  readSingleParamValue,
  readSingleQueryValue,
} from "./adminValidation";

function statusToAuditResult(status: number): AuditResultType {
  if (status >= 200 && status < 400) return "success";
  if (status === 401 || status === 403) return "denied";
  if (status >= 400 && status < 500) return "failure";
  return "error";
}

function actionWithOutcome(base: string, status: number): string {
  if (status >= 200 && status < 400) return `${base}_SUCCESS`;
  if (status === 401 || status === 403) return `${base}_DENIED`;
  if (status >= 400 && status < 500) return `${base}_FAILURE`;
  return `${base}_ERROR`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

async function logAdminControllerEvent(
  req: Request,
  input: {
    actionBase?: string;
    action?: string;
    status: number;
    objectName?: string | null;
    objectId?: string | number | null;
    originalObject?: unknown;
    requestData?: unknown;
  }
): Promise<void> {
  const actorRole: AuditActorRoleType | null = req.auth ? "admin" : null;

  await auditLog({
    action: input.action ?? actionWithOutcome(input.actionBase ?? "ADMIN_GENERIC", input.status),
    result: statusToAuditResult(input.status),
    actorId: req.auth?.userId ?? null,
    actorRole,
    objectName: input.objectName ?? null,
    objectId: input.objectId ?? null,
    originalObject: input.originalObject,
    requestData: input.requestData,
    req,
  });
}

export async function listAdminUsersController(req: Request, res: Response) {
  try {
    const query = asRecord(req.query);

    const pageParsed = parsePageInputFromQuery(query);
    if (pageParsed.error || !pageParsed.value) {
      const status = 400;
      const body = { error: pageParsed.error ?? "Invalid page input." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_USERS_LIST",
        status,
        objectName: "user",
        requestData: { query: req.query },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const filtersParsed = parseAdminUsersFiltersFromQuery(query);
    if (filtersParsed.error || !filtersParsed.value) {
      const status = 400;
      const body = { error: filtersParsed.error ?? "Invalid users filters." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_USERS_LIST",
        status,
        objectName: "user",
        requestData: { query: req.query },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const result = await listAdminUsersService({
      page: pageParsed.value,
      filters: filtersParsed.value,
    });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_USERS_LIST",
      status: result.status,
      objectName: "user",
      requestData: { query: req.query },
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_USERS_LIST_ERROR",
      status: 500,
      objectName: "user",
      requestData: { query: req.query },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function setUserBlockedStateController(req: Request, res: Response) {
  try {
    const params = asRecord(req.params);
    const bodyRecord = asRecord(req.body);

    if (!req.auth) {
      const status = 401;
      const body = { error: "Missing auth context." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_USER_BLOCK_UPDATE",
        status,
        objectName: "user",
        objectId: readSingleParamValue(params.id) ?? null,
        requestData: { params: req.params, body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const targetUserIdParsed = parseTargetUserIdFromParams(params);
    if (targetUserIdParsed.error || !targetUserIdParsed.value) {
      const status = 400;
      const body = { error: targetUserIdParsed.error ?? "Invalid user id." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_USER_BLOCK_UPDATE",
        status,
        objectName: "user",
        objectId: readSingleParamValue(params.id) ?? null,
        requestData: { params: req.params, body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const blockedParsed = parseBlockedStateFromBody(bodyRecord);
    if (blockedParsed.error || blockedParsed.value == null) {
      const status = 400;
      const body = { error: blockedParsed.error ?? "Invalid blocked value." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_USER_BLOCK_UPDATE",
        status,
        objectName: "user",
        objectId: targetUserIdParsed.value,
        requestData: { params: req.params, body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const result = await setUserBlockedStateService({
      actorUserId: req.auth.userId,
      targetUserId: targetUserIdParsed.value,
      blocked: blockedParsed.value,
    });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_USER_BLOCK_UPDATE",
      status: result.status,
      objectName: "user",
      objectId: targetUserIdParsed.value,
      requestData: { blocked: blockedParsed.value },
      originalObject: result.status >= 400 ? result.body : undefined,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_USER_BLOCK_UPDATE_ERROR",
      status: 500,
      objectName: "user",
      objectId: readSingleParamValue(asRecord(req.params).id) ?? null,
      requestData: { params: req.params, body: req.body },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function listAdminAuditLogsController(req: Request, res: Response) {
  try {
    const query = asRecord(req.query);

    const pageParsed = parsePageInputFromQuery(query);
    if (pageParsed.error || !pageParsed.value) {
      const status = 400;
      const body = { error: pageParsed.error ?? "Invalid page input." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_AUDIT_LOGS_LIST",
        status,
        objectName: "audit_log",
        requestData: { query: req.query },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const filtersParsed = parseAdminAuditLogsFiltersFromQuery(query);
    if (filtersParsed.error || !filtersParsed.value) {
      const status = 400;
      const body = { error: filtersParsed.error ?? "Invalid audit filters." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_AUDIT_LOGS_LIST",
        status,
        objectName: "audit_log",
        requestData: { query: req.query },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const serviceResult = await listAdminAuditLogsService({
      page: pageParsed.value,
      filters: filtersParsed.value,
    });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_AUDIT_LOGS_LIST",
      status: serviceResult.status,
      objectName: "audit_log",
      requestData: { query: req.query },
    });

    return res.status(serviceResult.status).json(serviceResult.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_AUDIT_LOGS_LIST_ERROR",
      status: 500,
      objectName: "audit_log",
      requestData: { query: req.query },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function listAdminReservedUsernamesController(req: Request, res: Response) {
  try {
    const query = asRecord(req.query);

    const pageParsed = parsePageInputFromQuery(query);
    if (pageParsed.error || !pageParsed.value) {
      const status = 400;
      const body = { error: pageParsed.error ?? "Invalid page input." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_RESERVED_USERNAMES_LIST",
        status,
        objectName: "reserved_username",
        requestData: { query: req.query },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const search = readSingleQueryValue(query.search)?.trim();

    const result = await listAdminReservedUsernamesService({
      page: pageParsed.value,
      search: search || undefined,
    });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_RESERVED_USERNAMES_LIST",
      status: result.status,
      objectName: "reserved_username",
      requestData: { query: req.query },
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_RESERVED_USERNAMES_LIST_ERROR",
      status: 500,
      objectName: "reserved_username",
      requestData: { query: req.query },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function createReservedUsernameController(req: Request, res: Response) {
  try {
    const bodyRecord = asRecord(req.body);
    const usernameParsed = parseReservedUsernameFromBody(bodyRecord);

    if (usernameParsed.error || usernameParsed.value == null) {
      const status = 400;
      const body = { error: usernameParsed.error ?? "Invalid username." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_RESERVED_USERNAMES_CREATE",
        status,
        objectName: "reserved_username",
        requestData: { body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const result = await createReservedUsernameService({ username: usernameParsed.value });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_RESERVED_USERNAMES_CREATE",
      status: result.status,
      objectName: "reserved_username",
      objectId: usernameParsed.value || null,
      requestData: { username: usernameParsed.value },
      originalObject: result.status >= 400 ? result.body : undefined,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_RESERVED_USERNAMES_CREATE_ERROR",
      status: 500,
      objectName: "reserved_username",
      requestData: { body: req.body },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function updateReservedUsernameController(req: Request, res: Response) {
  try {
    const params = asRecord(req.params);
    const bodyRecord = asRecord(req.body);

    const idParsed = parseReservedUsernameIdFromParams(params);
    if (idParsed.error || !idParsed.value) {
      const status = 400;
      const body = { error: idParsed.error ?? "Invalid reserved username id." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_RESERVED_USERNAMES_UPDATE",
        status,
        objectName: "reserved_username",
        objectId: readSingleParamValue(params.id) ?? null,
        requestData: { params: req.params, body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const usernameParsed = parseReservedUsernameFromBody(bodyRecord);
    if (usernameParsed.error || usernameParsed.value == null) {
      const status = 400;
      const body = { error: usernameParsed.error ?? "Invalid username." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_RESERVED_USERNAMES_UPDATE",
        status,
        objectName: "reserved_username",
        objectId: idParsed.value,
        requestData: { params: req.params, body: req.body },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const result = await updateReservedUsernameService({
      id: idParsed.value,
      username: usernameParsed.value,
    });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_RESERVED_USERNAMES_UPDATE",
      status: result.status,
      objectName: "reserved_username",
      objectId: idParsed.value,
      requestData: { username: usernameParsed.value },
      originalObject: result.status >= 400 ? result.body : undefined,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_RESERVED_USERNAMES_UPDATE_ERROR",
      status: 500,
      objectName: "reserved_username",
      objectId: readSingleParamValue(asRecord(req.params).id) ?? null,
      requestData: { params: req.params, body: req.body },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function deleteReservedUsernameController(req: Request, res: Response) {
  try {
    const params = asRecord(req.params);

    const idParsed = parseReservedUsernameIdFromParams(params);
    if (idParsed.error || !idParsed.value) {
      const status = 400;
      const body = { error: idParsed.error ?? "Invalid reserved username id." };
      await logAdminControllerEvent(req, {
        actionBase: "ADMIN_RESERVED_USERNAMES_DELETE",
        status,
        objectName: "reserved_username",
        objectId: readSingleParamValue(params.id) ?? null,
        requestData: { params: req.params },
        originalObject: body,
      });
      return res.status(status).json(body);
    }

    const result = await deleteReservedUsernameService({ id: idParsed.value });

    await logAdminControllerEvent(req, {
      actionBase: "ADMIN_RESERVED_USERNAMES_DELETE",
      status: result.status,
      objectName: "reserved_username",
      objectId: idParsed.value,
      requestData: { params: req.params },
      originalObject: result.status >= 400 ? result.body : undefined,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    await logAdminControllerEvent(req, {
      action: "ADMIN_RESERVED_USERNAMES_DELETE_ERROR",
      status: 500,
      objectName: "reserved_username",
      objectId: readSingleParamValue(asRecord(req.params).id) ?? null,
      requestData: { params: req.params },
      originalObject: { error: getErrorMessage(error) },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}