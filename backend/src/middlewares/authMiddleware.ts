import { NextFunction, Request, Response } from "express";
import { readAuthCookie } from "../modules/auth/authCookieService";
import { verifyAccessToken } from "../modules/auth/authJwtService";
import { findUserById } from "../modules/users/userRepository";
import { auditLog } from "../services/auditLogService";
import { maybeAlertPrivilegeEscalation } from "../services/securityAlertService";
import { AppUserRole } from "../modules/admin/adminTypes";

function unauthorized(res: Response, message = "Unauthorized.") {
  return res.status(401).json({ error: message });
}

function normalizeRole(role: string | null | undefined): AppUserRole {
  return role === "admin" ? "admin" : "user";
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readAuthCookie(req);

  if (!token) {
    return unauthorized(res, "Missing auth token.");
  }

  try {
    const decoded = verifyAccessToken(token);
    req.auth = decoded;
    return next();
  } catch {
    return unauthorized(res, "Invalid or expired auth token.");
  }
}

export async function requireVerifiedActiveUser(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return unauthorized(res, "Missing auth context.");
  }

  const user = await findUserById(req.auth.userId);

  if (!user) {
    return unauthorized(res, "User from token does not exist.");
  }

  if (user.is_blocked === 1) {
    return res.status(403).json({ error: "User account is blocked." });
  }

  if (!user.email_verified_at) {
    return res.status(403).json({ error: "Email is not verified. Please verify your email first." });
  }

  return next();
}

export function requireTwoFactorVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return unauthorized(res, "Missing auth context.");
  }

  if (!req.auth.twoFactorVerified) {
    return res.status(403).json({ error: "2FA verification is required." });
  }

  return next();
}

export function requireRole(...allowedRoles: AppUserRole[]) {
  return async function roleGuard(req: Request, res: Response, next: NextFunction) {
    if (!req.auth) {
      return unauthorized(res, "Missing auth context.");
    }

    const user = await findUserById(req.auth.userId);
    if (!user) {
      return unauthorized(res, "User from token does not exist.");
    }

    const actualRole = normalizeRole(user.role);

    if (!allowedRoles.includes(actualRole)) {
      await auditLog({
        action: "AUTHZ_FORBIDDEN_ROLE",
        result: "denied",
        actorId: user.id,
        actorRole: actualRole,
        objectName: "authorization",
        objectId: `${req.method} ${req.originalUrl}`,
        requestData: {
          requiredRoles: allowedRoles,
          actualRole,
        },
        req,
      });

      void maybeAlertPrivilegeEscalation(user.id);

      return res.status(403).json({ error: "Insufficient role permissions." });
    }

    return next();
  };
}