export type AuthStep =
  | "loading"
  | "register"
  | "verify-email"
  | "login"
  | "forgot-password"
  | "reset-password"
  | "sso-complete-profile"
  | "setup-2fa"
  | "verify-2fa"
  | "dashboard";

export type ApiResult = {
  status: number;
  body: unknown;
  receivedAt: string;
};

export type MfaMethod = "sms" | "email" | "totp";

export type SsoProvider = "google" | "github";
export type AppUserRole = "user" | "admin";

export type DemoUser = {
  id: number;
  role: AppUserRole;
  fullName: string;
  email: string;
  username: string;
  phone: string;
};

export type CursorDirection = "next" | "prev";

export type CursorPageMeta = {
  nextCursor: string | null;
  prevCursor: string | null;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
  totalItems: number;
  rangeStart: number;
  rangeEnd: number;
};

export type AdminUsersFilterInput = {
  searchEmail?: string;
  blocked?: "all" | "true" | "false";
};

export type AdminUserListItem = {
  id: number;
  email: string;
  role: AppUserRole;
  isBlocked: boolean;
  createdAt: string;
};

export type AdminAuditResultType = "success" | "failure" | "denied" | "error";
export type AdminAuditActorRole = AppUserRole | "system";

export type AdminAuditLogsFilterInput = {
  action?: string;
  result?: AdminAuditResultType | "all";
  actorId?: string;
  actorRole?: AdminAuditActorRole | "all";
};

export type AdminAuditLogListItem = {
  id: number;
  timestamp: string;
  action: string;
  result: AdminAuditResultType;
  actorId: number | null;
  actorRole: AdminAuditActorRole | null;
  ipAddress: string | null;
  userAgent: string | null;
  objectName: string | null;
  objectId: string | null;
};

export type AdminReservedUsernameListItem = {
  id: number;
  username: string;
  createdAt: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
};

export type LoginInput = {
  identifier: string;
  password: string;
  captchaToken?: string;
};

export type PasswordResetRequestInput = {
  email: string;
  captchaToken?: string;
};

export type PasswordResetConfirmInput = {
  token: string;
  newPassword: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type SsoCompleteContext = {
  provider: SsoProvider;
  email: string;
  fullName: string;
  needsFullName: boolean;
};

export type TrustedDevice = {
  id: number;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

export type ActiveSession = {
  jti: string;
  userAgent: string | null;
  ip: string | null;
  issuedAt: string;
  expiresAt: string;
  isTrustedSession: boolean;
  trustedUntil: string | null;
  trustedDeviceId: number | null;
  isCurrent: boolean;
};

export type AuthResultKey =
  | "sessionProbe"
  | "register"
  | "verifyEmail"
  | "login"
  | "passwordResetRequest"
  | "passwordResetValidate"
  | "passwordResetConfirm"
  | "changePassword"
  | "googleLogin"
  | "googleContext"
  | "googleCompleteRegistration"
  | "githubLogin"
  | "githubContext"
  | "githubCompleteRegistration"
  | "smsSend"
  | "smsVerify"
  | "emailSend"
  | "emailVerify"
  | "totpSetup"
  | "totpVerify"
  | "disable2fa"
  | "recoverySetup"
  | "recoveryVerify"
  | "recoveryStatus"
  | "trustedDevicesList"
  | "trustedDeviceRevoke"
  | "sessionsList"
  | "sessionRevoke"
  | "logout";

export type AuthResults = Partial<Record<AuthResultKey, ApiResult>>;

export type AuthLoading = Partial<Record<AuthResultKey, boolean>>;
