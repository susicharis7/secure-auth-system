import { Request, Response } from "express";
import { getAuthCookieConfig, getJwtConfig, getRefreshCookieConfig } from "../../config/env";

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const TRUSTED_DEVICE_COOKIE_NAME = "trusted_device";
const TRUSTED_DEVICE_MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string): void {
  const cookieConfig = getAuthCookieConfig();
  const jwtConfig = getJwtConfig();

  res.cookie(cookieConfig.name, token, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: "/",
    maxAge: parseJwtExpiryToMs(jwtConfig.expiresIn),
  });
}

export function clearAuthCookie(res: Response): void {
  const cookieConfig = getAuthCookieConfig();

  res.clearCookie(cookieConfig.name, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: "/",
  });
}

export function readAuthCookie(req: Request): string | null {
  const cookieConfig = getAuthCookieConfig();
  const token = req.cookies?.[cookieConfig.name];

  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  return token;
}

/* Refresh Cookie */
export function setRefreshCookie(
  res: Response,
  token: string,
  options?: { maxAgeMs?: number }
): void {
    const cookieConfig = getRefreshCookieConfig();
    const resolvedMaxAgeMs =
      options?.maxAgeMs && Number.isFinite(options.maxAgeMs) && options.maxAgeMs > 0
        ? Math.floor(options.maxAgeMs)
        : REFRESH_COOKIE_MAX_AGE_MS;

    res.cookie(cookieConfig.name, token, {
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
      path: "/",
      maxAge: resolvedMaxAgeMs,
    });
}

export function clearRefreshCookie(res: Response): void {
  const cookieConfig = getRefreshCookieConfig();

  res.clearCookie(cookieConfig.name, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: "/",
  });
}

export function readRefreshCookie(req: Request): string | null {
  const cookieConfig = getRefreshCookieConfig();
  const token = req.cookies?.[cookieConfig.name];

  if (typeof token !== "string" || !token.trim()) {
    return null;
  }

  return token;
}

/* Trusted Device Cookie */
export function setTrustedDeviceCookie(res: Response, token: string): void {
  const cookieConfig = getAuthCookieConfig();

  res.cookie(TRUSTED_DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    path: "/",
    maxAge: TRUSTED_DEVICE_MAX_AGE_MS,
  });
}

export function clearTrustedDeviceCookie(res: Response): void {
  const cookieConfig = getAuthCookieConfig();

  res.clearCookie(TRUSTED_DEVICE_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieConfig.secure, 
    sameSite: cookieConfig.sameSite,
    path: "/",
  });
}

export function readTrustedDeviceCookie(req: Request): string | null {
  const token = req.cookies?.[TRUSTED_DEVICE_COOKIE_NAME];

  if (typeof token !== "string" || !token.trim()) return null;

  return token;
}

function parseJwtExpiryToMs(expiresIn: string): number | undefined {

  const raw = expiresIn.trim().toLowerCase();

  if (/^\d+$/.test(raw)) {
    return Number(raw) * 1000;
  }

  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return undefined;

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  return value * 24 * 60 * 60 * 1000; 
}


