import { AppUserRole } from "../admin/adminTypes";

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
    trustedBypassEligible?: boolean;
};

export type TwoFactorInput = {
    userId: number;
    code: string;
    trustDevice?: boolean;
};

export type AuthFlowResult = {
  status: number;
  body: Record<string, unknown>;
};

export type UserRow = {
  role: AppUserRole;
  id: number;
  full_name: string;
  email: string;
  username: string;
  phone: string;
  password_hash: string | null;
  email_verified_at: Date | null;
  is_blocked: number;
  sms_2fa_enabled: number;
  email_2fa_enabled: number;
  totp_secret: string | null;
  totp_enabled: number;
};



// TOTP 
export type TotpSetupInput = {
  userId: number;
};

export type TotpVerifyInput = {
  userId: number;
  token: string;
};

export type RecoveryCodeSetup = {
  codes: string[]; 
  generatedAt: string;
};

export type RecoveryCodeValidation = {
  isValid: boolean;
  isUsed: boolean;
};


// Disable 2FA 
export type TwoFactorMethod = "sms" | "email" | "totp";

export type DisableTwoFactorInput = {
  userId: number;
  method: TwoFactorMethod;
};

// User OAuth accounts
export type OAuthProvider = 'google' | 'github';

export type UserOAuthAccountRow = {
  id: number; 
  user_id: number; 
  provider: OAuthProvider;
  provider_subject: string;
  is_sso_only: number; 
};

// Trusted Device 
export type TrustedDeviceRow = {
  id: number;
  user_id: number;
  device_token_hash: string;
  user_agent: string | null;
  ip: string | null;
  created_at: Date;
  last_used_at: Date | null;
  expires_at: Date;
  revoked_at: Date | null;
};

export type ActiveSessionSnapshot = {
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

// Password Reset 
export type PasswordResetRequestInput = {
  email: string;
  captchaToken?: string;
};

export type PasswordResetConfirmInput = {
  token: string;
  newPassword: string;
};

export type ChangePasswordInput = {
  userId: number;
  currentPassword: string;
  newPassword: string;
};

export type PasswordResetRequestRow = {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  attempts_used: number;
  attempt_window_expires_at: Date;
  created_at: Date;
  updated_at: Date;
};

