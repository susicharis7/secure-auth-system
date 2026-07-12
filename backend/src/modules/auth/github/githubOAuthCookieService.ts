import { Request, Response } from "express";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { getAuthCookieConfig, getJwtConfig } from "../../../config/env";
import { GitHubSsoContext } from "./githubOAuthTypes";

const GITHUB_OAUTH_STATE_COOKIE = "github_oauth_state";
const GITHUB_SSO_CONTEXT_COOKIE = "github_sso_context";

const GITHUB_OAUTH_STATE_MAX_AGE_MS = 5 * 60 * 1000;
const GITHUB_SSO_CONTEXT_MAX_AGE_MS = 10 * 60 * 1000;


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
export function setGitHubOauthStateCookie(res: Response, state: string): void {
  res.cookie(GITHUB_OAUTH_STATE_COOKIE, state, {
    ...cookieBaseOptions(),
    maxAge: GITHUB_OAUTH_STATE_MAX_AGE_MS,
  });
}

export function readGitHubOauthStateCookie(req: Request): string | null {
  const value = req.cookies?.[GITHUB_OAUTH_STATE_COOKIE];
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

export function clearGitHubOauthStateCookie(res: Response): void {
  res.clearCookie(GITHUB_OAUTH_STATE_COOKIE, cookieBaseOptions());
}

/* Signed SSO context cookie */
export function setGitHubSsoContextCookie(
  res: Response,
  context: GitHubSsoContext
): void {
  const jwtConfig = getJwtConfig();

  const token = jwt.sign(context, jwtConfig.secret, {
    expiresIn: "10m" as SignOptions["expiresIn"],
  });

  res.cookie(GITHUB_SSO_CONTEXT_COOKIE, token, {
    ...cookieBaseOptions(),
    maxAge: GITHUB_SSO_CONTEXT_MAX_AGE_MS,
  });
}

function isGitHubSsoContext(value: JwtPayload): value is GitHubSsoContext {
  const mode = value.mode;
  const email = value.email;

  if (typeof mode !== "string" || typeof email !== "string" || !email.trim()) {
    return false;
  }

  if (mode === "login") {
    return (
      typeof value.userId === "number" &&
      Number.isInteger(value.userId) &&
      value.userId > 0
    );
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

export function readGitHubSsoContextCookie(req: Request): GitHubSsoContext | null {
  const raw = req.cookies?.[GITHUB_SSO_CONTEXT_COOKIE];
  if (typeof raw !== "string" || !raw.trim()) return null;

  try {
    const decoded = jwt.verify(raw, getJwtConfig().secret);

    if (typeof decoded === "string" || !decoded) return null;
    if (!isGitHubSsoContext(decoded)) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function clearGitHubSsoContextCookie(res: Response): void {
  res.clearCookie(GITHUB_SSO_CONTEXT_COOKIE, cookieBaseOptions());
}