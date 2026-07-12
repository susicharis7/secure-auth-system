import { Request, Response } from "express";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { getAuthCookieConfig, getJwtConfig } from "../../../config/env";

const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
const GOOGLE_SSO_CONTEXT_COOKIE = "google_sso_context";

const GOOGLE_OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;   
const GOOGLE_SSO_CONTEXT_MAX_AGE_MS = 10 * 60 * 1000;  

export type GoogleSsoLoginContext = {
    mode: "login";
    userId: number; 
    email: string; 
};

export type GoogleSsoCompleteRegistrationContext = {
    mode: "complete-registration";
    email: string; 
    subject: string;
    fullName: string; 
    givenName: string;
    familyName: string; 
    needsFullName: boolean;
};

export type GoogleSsoContext = 
    | GoogleSsoLoginContext
    | GoogleSsoCompleteRegistrationContext;

function cookieBaseOptions() {
    const cookieConfig = getAuthCookieConfig();

    return {
        httpOnly: true as const, 
        secure: cookieConfig.secure,
        sameSite: cookieConfig.sameSite, 
        path: "/",
    };
}

/* OAuth state cookie */ 
export function setGoogleOauthStateCookie(res: Response, state: string): void {
    res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
        ...cookieBaseOptions(),
        maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_MS,
    })
}

export function readGoogleOauthStateCookie(req: Request): string | null {
  const value = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE];
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

export function clearGoogleOauthStateCookie(res: Response): void {
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, cookieBaseOptions());
}

/* Signed SSO context cookie */
export function setGoogleSsoContextCookie(res: Response, context: GoogleSsoContext): void {
  const jwtConfig = getJwtConfig();

  const token = jwt.sign(context, jwtConfig.secret, {
    expiresIn: "10m" as SignOptions["expiresIn"],
  });

  res.cookie(GOOGLE_SSO_CONTEXT_COOKIE, token, {
    ...cookieBaseOptions(),
    maxAge: GOOGLE_SSO_CONTEXT_MAX_AGE_MS,
  });
}

function isGoogleSsoContext(value: JwtPayload): value is GoogleSsoContext {
  const mode = value.mode;
  const email = value.email;

  if (typeof mode !== "string" || typeof email !== "string" || !email.trim()) {
    return false;
  }

  if (mode === "login") {
    return typeof value.userId === "number" && Number.isInteger(value.userId) && value.userId > 0;
  }

  if (mode === "complete-registration") {
    return (
      typeof value.subject === "string" &&
      typeof value.fullName === "string" &&
      typeof value.givenName === "string" &&
      typeof value.familyName === "string" &&
      typeof value.needsFullName === "boolean"
    );
  }

  return false;
}

export function readGoogleSsoContextCookie(req: Request): GoogleSsoContext | null {
  const raw = req.cookies?.[GOOGLE_SSO_CONTEXT_COOKIE];
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const decoded = jwt.verify(raw, getJwtConfig().secret);

    if (typeof decoded === "string" || !decoded) return null;
    if (!isGoogleSsoContext(decoded)) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function clearGoogleSsoContextCookie(res: Response): void {
  res.clearCookie(GOOGLE_SSO_CONTEXT_COOKIE, cookieBaseOptions());
}