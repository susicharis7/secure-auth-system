import { requestApi } from "./apiClient";
import type {
  ChangePasswordInput,
  LoginInput,
  MfaMethod,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
  SsoProvider,
} from "../types/auth";

// Public endpoints (no auto refresh)
export function registerUser(input: RegisterInput) {
  return requestApi("/api/register", "POST", input);
}

export function verifyEmailToken(token: string) {
  return requestApi(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, "GET");
}

export function loginUser(input: LoginInput) {
  return requestApi("/api/login", "POST", input);
}

export function requestPasswordReset(input: PasswordResetRequestInput) {
  return requestApi("/api/auth/password-reset/request", "POST", input);
}

export function validatePasswordResetToken(token: string) {
  return requestApi(`/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`, "GET");
}

export function confirmPasswordReset(input: PasswordResetConfirmInput) {
  return requestApi("/api/auth/password-reset/confirm", "POST", input);
}

function getSsoLoginUrl(provider: SsoProvider) {
  return requestApi(`/api/auth/${provider}/login`, "GET");
}

function getSsoContext(provider: SsoProvider) {
  return requestApi(`/api/auth/${provider}/context`, "GET");
}

function completeSsoRegistration(
  provider: SsoProvider,
  input: {
    fullName?: string;
    username: string;
    phone: string;
  }
) {
  return requestApi(`/api/auth/${provider}/complete-registration`, "POST", input);
}

// Google SSO
export function getGoogleLoginUrl() {
  return getSsoLoginUrl("google");
}

export function getGoogleSsoContext() {
  return getSsoContext("google");
}

export function completeGoogleRegistration(input: {
  fullName?: string;
  username: string;
  phone: string;
}) {
  return completeSsoRegistration("google", input);
}

// GitHub SSO
export function getGitHubLoginUrl() {
  return getSsoLoginUrl("github");
}

export function getGitHubSsoContext() {
  return getSsoContext("github");
}

export function completeGitHubRegistration(input: {
  fullName?: string;
  username: string;
  phone: string;
}) {
  return completeSsoRegistration("github", input);
}

export function refreshSession() {
  return requestApi("/api/auth/refresh", "POST");
}

// Protected endpoints (auto refresh + retry once on 401)
export function logoutUser() {
  return requestApi("/api/logout", "POST", undefined, { retryOn401: true });
}

export function changePassword(input: ChangePasswordInput) {
  return requestApi("/api/auth/password/change", "POST", input, { retryOn401: true });
}

export function probeSession() {
  return requestApi("/api/auth/2fa/recovery/status", "GET", undefined, { retryOn401: true });
}

export function sendSms2faCode() {
  return requestApi("/api/auth/2fa/sms/send", "POST", undefined, { retryOn401: true });
}

export function verifySms2faCode(code: string, trustDevice = false) {
  return requestApi("/api/auth/2fa/sms/verify", "POST", { code, trustDevice }, { retryOn401: true });
}

export function sendEmail2faCode() {
  return requestApi("/api/auth/2fa/email/send", "POST", undefined, { retryOn401: true });
}

export function verifyEmail2faCode(code: string, trustDevice = false) {
  return requestApi("/api/auth/2fa/email/verify", "POST", { code, trustDevice }, { retryOn401: true });
}

export function setupTotp() {
  return requestApi("/api/auth/2fa/totp/setup", "POST", undefined, { retryOn401: true });
}

export function verifyTotp(totpToken: string, trustDevice = false) {
  return requestApi(
    "/api/auth/2fa/totp/verify",
    "POST",
    { totp_token: totpToken, trustDevice },
    { retryOn401: true }
  );
}

export function disableTwoFactorMethod(method: MfaMethod) {
  return requestApi("/api/auth/2fa/disable", "POST", { method }, { retryOn401: true });
}

export function generateRecoveryCodes() {
  return requestApi("/api/auth/2fa/recovery/setup", "POST", undefined, { retryOn401: true });
}

export function getRecoveryStatus() {
  return requestApi("/api/auth/2fa/recovery/status", "GET", undefined, { retryOn401: true });
}

export function verifyRecoveryCode(recoveryCode: string) {
  return requestApi(
    "/api/auth/2fa/verify-recovery",
    "POST",
    { recoveryCode },
    { retryOn401: true }
  );
}

export function getTrustedDevices() {
  return requestApi("/api/auth/trusted-devices", "GET", undefined, { retryOn401: true });
}

export function revokeTrustedDevice(id: number) {
  return requestApi(`/api/auth/trusted-devices/${id}`, "DELETE", undefined, { retryOn401: true });
}

export function getActiveSessions() {
  return requestApi("/api/auth/sessions", "GET", undefined, { retryOn401: true });
}

export function revokeActiveSession(jti: string) {
  return requestApi(`/api/auth/sessions/${encodeURIComponent(jti)}`, "DELETE", undefined, { retryOn401: true });
}
