import { getRateLimitConfig } from "../config/env";
import { createRateLimiter } from "./rateLimitFactory";

const cfg = getRateLimitConfig();

export const globalApiLimiter = createRateLimiter({
  name: "global_api",
  windowMs: cfg.globalApi.windowMs,
  limit: cfg.globalApi.limit,
  keyStrategy: "ip",
  message: "Too many API requests, please try again later.",
  objectName: "rate_limit_global",
});

export const loginLimiter = createRateLimiter({
  name: "login",
  windowMs: cfg.login.windowMs,
  limit: cfg.login.limit,
  keyStrategy: "ip",
  message: "Too many login attempts, please try again later.",
  objectName: "rate_limit_login",
});

export const refreshLimiter = createRateLimiter({
  name: "refresh",
  windowMs: cfg.refresh.windowMs,
  limit: cfg.refresh.limit,
  keyStrategy: "ip",
  message: "Too many refresh attempts, please try again later.",
  objectName: "rate_limit_refresh",
});

export const passwordResetRequestLimiter = createRateLimiter({
  name: "password_reset_request",
  windowMs: cfg.passwordResetRequest.windowMs,
  limit: cfg.passwordResetRequest.limit,
  keyStrategy: "email",
  message: "Too many password reset requests, please try again later.",
  objectName: "rate_limit_password_reset_request",
});

export const passwordResetConfirmLimiter = createRateLimiter({
  name: "password_reset_confirm",
  windowMs: cfg.passwordResetConfirm.windowMs,
  limit: cfg.passwordResetConfirm.limit,
  keyStrategy: "ip",
  message: "Too many password reset confirmations, please try again later.",
  objectName: "rate_limit_password_reset_confirm",
});

export const twoFactorVerifyLimiter = createRateLimiter({
  name: "two_factor_verify",
  windowMs: cfg.twoFactorVerify.windowMs,
  limit: cfg.twoFactorVerify.limit,
  keyStrategy: "ip",
  message: "Too many 2FA verification attempts, please try again later.",
  objectName: "rate_limit_2fa_verify",
});

export const ssoLimiter = createRateLimiter({
  name: "sso",
  windowMs: cfg.sso.windowMs,
  limit: cfg.sso.limit,
  keyStrategy: "ip",
  message: "Too many SSO attempts, please try again later.",
  objectName: "rate_limit_sso",
});