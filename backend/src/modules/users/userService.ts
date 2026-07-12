import { getRequestBinUrl } from "../../config/env";
import { sequelize } from "../../config/database";
import { httpClient } from "../../services/httpClient";
import { sendVerificationCodeSMS } from "../../services/smsService";
import { 
  LoginInput,
  RegisterInput, 
  TwoFactorInput, 
  AuthFlowResult, 
  TwoFactorMethod, 
  UserRow,
  OAuthProvider,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  ChangePasswordInput,
  ActiveSessionSnapshot,
} from "./userTypes";
import { checkPasswordHIBP } from "../../services/hibpService";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  findUserById,
  findUserByTotpSecret,
  saveUserTotpSecret,
  createUser,
  findUserByIdentifier,
  markUserEmailVerified,
  enableSms2fa,
  enableEmail2fa,
  hasAtLeastOneEnabled2fa,
  enableTotp2fa,
  generateRecoveryCodes,
  getRecoveryCodesCount,
  verifyRecoveryCode,
  deleteAllRecoveryCodes,
  hasUnusedRecoveryCodes,

  disableSms2fa,
  disableEmail2fa,
  disableTotp2fa,

  isPasswordLoginBlockedForUser,
  findOAuthAccountByProviderSubject,
  findOAuthAccountByUserIdAndProvider,
  createOAuthAccount,

  createTrustedDevice,
  findActiveTrustedDeviceByHashForUser,
  findActiveTrustedDeviceByIdForUser,
  touchTrustedDeviceLastUsed,
  listActiveTrustedDevicesForUser,
  revokeTrustedDeviceForUser,

  invalidateActivePasswordResetRequestsForUser,
  createPasswordResetRequest,
  findPasswordResetRequestByTokenHash,
  incrementPasswordResetRequestAttempts,
  markPasswordResetRequestUsed,
  updateUserPasswordHash,
} from "./userRepository";
import { buildTotpSetupData, createTotpSecret, verifyTotpToken } from "../../services/totpService";
import { randomBytes } from "crypto";
import {
  getDbError,
  mapUserDuplicateMessage,
  formatDateTimeForEmail,
  TRUSTED_DEVICE_TOKEN_BYTES,
  buildTrustedDeviceExpiresAt,
  hashTrustedDeviceToken,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS,
  hashPasswordResetToken,
  buildPasswordResetExpiresAt,
  buildPasswordResetAttemptWindowExpiresAt,
  validateNewPasswordPolicy,
  buildPasswordResetLink,
  getBackendPublicBaseUrl,
} from "./userHelpers";
import { sendEmail } from "../../services/mailService";
import {
  consumeEmailVerifyToken,
  issueEmailVerifyToken,
  issueSms2faCode,
  verifySms2faCode,
  issueEmail2faCode,
  verifyEmail2faCode,
} from "../verifications/verificationService";

import { hashRefreshToken, signRefreshToken, verifyRefreshToken } from "../auth/refreshTokenService";
import {
  findRefreshTokenByJti,
  insertRefreshToken,
  revokeAndReplaceRefreshToken,
  revokeRefreshTokenFamily,
  revokeActiveRefreshTokensForUser,
  revokeActiveRefreshTokensByTrustedDeviceId,
  listActiveRefreshSessionsForUser,
  revokeRefreshSessionForUserByJti,
} from "../auth/refreshTokenRepository";



/* helper for ALL 2FA */
export async function buildPostPrimaryAuthResult(
  user: UserRow,
  options?: { issueChallenge?: boolean }
): Promise<AuthFlowResult> {
  const issueChallenge = options?.issueChallenge ?? true;
  const hasAny2fa = await hasAtLeastOneEnabled2fa(user.id);
  const enabledMethods = getEnabled2faMethods(user);

  if (!hasAny2fa) {
    return {
      status: 200,
      body: {
        message: "No 2FA method is enabled yet. Choose a 2FA method to continue.",
        mfaSetupRequired: true,
        userId: user.id,
        role: user.role,
        email: user.email,
        enabledMethods,
        availableMethods: ["sms", "email", "totp"],
        nextSteps: {
          sms: "POST /api/auth/2fa/sms/send",
          email: "POST /api/auth/2fa/email/send",
          totp: "POST /api/auth/2fa/totp/setup",
        },
      },
    };
  }

  if (user.sms_2fa_enabled === 1) {
    if (issueChallenge) {
      const { code } = await issueSms2faCode(user.id);
      await sendVerificationCodeSMS(user.phone, code);
    }

    return {
      status: 200,
      body: {
        message: "Credentials are correct. SMS 2FA code sent.",
        nextStep: "POST /api/auth/2fa/sms/verify",
        enabledMethods,
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    };
  }

  if (user.email_2fa_enabled === 1) {
    if (issueChallenge) {
      const { code } = await issueEmail2faCode(user.id);

      await sendEmail(
        user.email,
        "Your 2FA code",
        `Your 2FA code is: ${code}`,
        `<p>Your 2FA code is: <strong>${code}</strong></p>`
      );
    }

    return {
      status: 200,
      body: {
        message: "Credentials are correct. Email 2FA code sent.",
        nextStep: "POST /api/auth/2fa/email/verify",
        enabledMethods,
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    };
  }

  if (user.totp_enabled === 1) {
    return {
      status: 200,
      body: {
        message: "Credentials are correct. Submit TOTP token.",
        nextStep: "POST /api/auth/2fa/totp/verify",
        enabledMethods,
        userId: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    };
  }

  return {
    status: 500,
    body: { error: "2FA configuration is invalid." },
  };

}

export async function loginUser(
  input: LoginInput,
  options?: { issueChallenge?: boolean }
): Promise<AuthFlowResult> {
  const user = await findUserByIdentifier(input.identifier);

  if (!user) {
    return {
      status: 401,
      body: { message: "Invalid credentials." },
    };
  }

  const passwordLoginBlocked = await isPasswordLoginBlockedForUser(user.id);
  if (passwordLoginBlocked) {
    return {
      status: 403,
      body: { error: "Password login is disabled for this account. Use SSO login."}
    };
  }

  if (!user.password_hash) {
    return {
      status: 403,
      body: { error: "Password login is disabled for this account. Use SSO login." },
    };
  }

  const isPasswordValid = await verifyPassword(input.password, user.password_hash);

  if (!isPasswordValid) {
    return {
      status: 401,
      body: { message: "Invalid credentials." },
    };
  }

  if (user.is_blocked === 1) {
    return {
      status: 403,
      body: { error: "User account is blocked." },
    };
  }

  if (!user.email_verified_at) {
    return {
      status: 403,
      body: { error: "Email is not verified. Please verify your email first." },
    };
  }

  return buildPostPrimaryAuthResult(user, options);
};

export async function dispatchSecondFactorChallengeForUser(userId: number): Promise<AuthFlowResult> {
  const user = await findUserById(userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  return buildPostPrimaryAuthResult(user, { issueChallenge: true });
}

/* SSO (Google + GitHub) */
function getProviderDisplayName(provider: OAuthProvider): string {
  return provider === "google" ? "Google" : "GitHub";
}

export async function linkOAuthAccountToUser(input: {
  userId: number;
  provider: OAuthProvider;
  providerSubject: string;
  isSsoOnly: boolean;
}): Promise<AuthFlowResult | null> {
  const subjectLink = await findOAuthAccountByProviderSubject(input.provider, input.providerSubject);

  if (subjectLink && subjectLink.user_id !== input.userId) {
    return {
      status: 409,
      body: { error: `This ${getProviderDisplayName(input.provider)} account is already linked to another user.` },
    };
  }

  const userProviderLink = await findOAuthAccountByUserIdAndProvider(input.userId, input.provider);

  if (userProviderLink) {
    return null;
  }

  await createOAuthAccount({
    userId: input.userId,
    provider: input.provider,
    providerSubject: input.providerSubject,
    isSsoOnly: input.isSsoOnly,
  });

  return null;
}

export async function loginUserWithSsoEmail(email: string): Promise<AuthFlowResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByIdentifier(normalizedEmail);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (user.is_blocked === 1) {
    return {
      status: 403,
      body: { error: "User account is blocked." },
    };
  }

  if (!user.email_verified_at) {
    return {
      status: 403,
      body: { error: "Email is not verified. Please verify your email first." },
    };
  }

  return buildPostPrimaryAuthResult(user);
}

export async function completeSsoRegistrationService(input: {
  provider: OAuthProvider;
  providerSubject: string;
  email: string;
  username: string;
  phone: string;
  fullNameFromProvider: string;
  fullNameFromForm: string;
  needsFullName: boolean;
}): Promise<AuthFlowResult> {
  const email = input.email.trim().toLowerCase();

  const existing = await findUserByIdentifier(email);
  if (existing) {
    return {
      status: 409,
      body: { error: "Email already exists." },
    };
  }

  let resolvedFullName = input.fullNameFromProvider.trim();

  if (input.needsFullName) {
    resolvedFullName = input.fullNameFromForm.trim();
  } else if (!resolvedFullName) {
    resolvedFullName = input.fullNameFromForm.trim();
  }

  if (!resolvedFullName) {
    return {
      status: 400,
      body: { error: "Full name is required." },
    };
  }

  let userId = 0;

  try {
    userId = await createUser({
      fullName: resolvedFullName,
      email,
      username: input.username,
      phone: input.phone,
      passwordHash: null,
    });
  } catch (error: unknown) {
    const dbError = getDbError(error);

    if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) {
      return {
        status: 409,
        body: { error: mapUserDuplicateMessage(error) },
      };
    }

    return {
      status: 500,
      body: { error: "Failed to create user." },
    };
  }

  await markUserEmailVerified(userId);

  const linkResult = await linkOAuthAccountToUser({
    userId,
    provider: input.provider,
    providerSubject: input.providerSubject,
    isSsoOnly: true,
  });

  if (linkResult) return linkResult;

  const user = await findUserById(userId);

  if (!user) {
    return {
      status: 500,
      body: { error: "User not found after creation." },
    };
  }

  return buildPostPrimaryAuthResult(user);
}

/* Google wrappers (backward-compatible with existing controllers) */
export async function linkGoogleAccountToUser(input: {
  userId: number;
  googleSubject: string;
  isSsoOnly: boolean;
}): Promise<AuthFlowResult | null> {
  return linkOAuthAccountToUser({
    userId: input.userId,
    provider: "google",
    providerSubject: input.googleSubject,
    isSsoOnly: input.isSsoOnly,
  });
}

export async function loginUserWithGoogleEmail(email: string): Promise<AuthFlowResult> {
  return loginUserWithSsoEmail(email);
}

export async function completeGoogleRegistrationService(input: {
  email: string;
  googleSubject: string;
  username: string;
  phone: string;
  fullNameFromGoogle: string;
  fullNameFromForm: string;
  needsFullName: boolean;
}): Promise<AuthFlowResult> {
  return completeSsoRegistrationService({
    provider: "google",
    providerSubject: input.googleSubject,
    email: input.email,
    username: input.username,
    phone: input.phone,
    fullNameFromProvider: input.fullNameFromGoogle,
    fullNameFromForm: input.fullNameFromForm,
    needsFullName: input.needsFullName,
  });
}

/* GitHub wrappers */
export async function linkGitHubAccountToUser(input: {
  userId: number;
  githubSubject: string;
  isSsoOnly: boolean;
}): Promise<AuthFlowResult | null> {
  return linkOAuthAccountToUser({
    userId: input.userId,
    provider: "github",
    providerSubject: input.githubSubject,
    isSsoOnly: input.isSsoOnly,
  });
}

export async function loginUserWithGitHubEmail(email: string): Promise<AuthFlowResult> {
  return loginUserWithSsoEmail(email);
}

export async function completeGitHubRegistrationService(input: {
  email: string;
  githubSubject: string;
  username: string;
  phone: string;
  fullNameFromGitHub: string;
  fullNameFromForm: string;
  needsFullName: boolean;
}): Promise<AuthFlowResult> {
  return completeSsoRegistrationService({
    provider: "github",
    providerSubject: input.githubSubject,
    email: input.email,
    username: input.username,
    phone: input.phone,
    fullNameFromProvider: input.fullNameFromGitHub,
    fullNameFromForm: input.fullNameFromForm,
    needsFullName: input.needsFullName,
  });
}



// REGISTER WITH VERIFY EMAIL
export async function registerUser(input: RegisterInput): Promise<AuthFlowResult> {
  const hibp = await checkPasswordHIBP(input.password);

  if (hibp.isPwned) {
    return {
      status: 400,
      body: {
        error: `Password is compromised (${hibp.count} times). Choose another one.`,
      },
    };
  }

  const passwordHash = await hashPassword(input.password);

  let userId = 0;

  try {
    userId = await createUser({
      fullName: input.fullName,
      email: input.email,
      username: input.username,
      phone: input.phone,
      passwordHash,
    });
  } catch (error: unknown) {
    const dbError = getDbError(error);

    if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) {
      return {
        status: 409,
        body: { error: mapUserDuplicateMessage(error) },
      };
    }

    return {
      status: 500,
      body: { error: "Failed to create user." },
    };
  }

  try {
    const { token, expiresAt } = await issueEmailVerifyToken(userId);

    const expiresAtFormatted = formatDateTimeForEmail(expiresAt);

    const backendBaseUrl = getBackendPublicBaseUrl();
    const verifyLink = `${backendBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await sendEmail(
      input.email,
      "Verify your email",
      `Open this link to verify your account: ${verifyLink}. This link expires at ${expiresAtFormatted}.`,
      `<p>Hello <strong>${input.fullName}</strong>,</p>
       <p>Please verify your account by clicking the link below:</p>
       <p><a href="${verifyLink}">Verify Email</a></p>
       <p>This link expires at: <strong>${expiresAtFormatted}</strong></p>`
    );
  } catch (error) {
    console.error("Verification email send failed:", error);
    return {
      status: 500,
      body: { error: "User created, but verification email could not be sent." },
    };
  }

  return {
    status: 200,
    body: {
      message: "Register successful. Please verify your email before login.",
      user: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        username: input.username,
        phone: input.phone,
      },
    },
  };
};

export async function verifyEmail(token: string): Promise<AuthFlowResult> {
  if (!token) {
    return {
      status: 400,
      body: { error: "Verification token is required." },
    };
  }

  const result = await consumeEmailVerifyToken(token);

  if (!result.ok || !result.userId) {
    return {
      status: 400,
      body: { error: "Verification link is invalid, expired, or already used." },
    };
  }

  await markUserEmailVerified(result.userId);

  return {
    status: 200,
    body: { message: "Email verified successfully. You can now log in." },
  };
};

// Reset Password
export async function requestPasswordResetService(
  input: PasswordResetRequestInput
): Promise<AuthFlowResult> {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByIdentifier(email);

  if (!user || user.email.toLowerCase() !== email) {
    return {
      status: 404,
      body: { error: "No account found for this email." },
    };
  }

  if (user.is_blocked === 1) {
    return {
      status: 403,
      body: { error: "Blocked accounts cannot recover passwords." },
    };
  }

  if (!user.email_verified_at) {
    return {
      status: 403,
      body: { error: "Unverified accounts cannot recover passwords." },
    };
  }

  if (!user.password_hash) {
    return {
      status: 403,
      body: { error: "Password recovery is unavailable for SSO-only accounts." },
    };
  }

  await invalidateActivePasswordResetRequestsForUser(user.id);

  const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = buildPasswordResetExpiresAt();
  const attemptWindowExpiresAt = buildPasswordResetAttemptWindowExpiresAt();

  await createPasswordResetRequest({
    userId: user.id,
    tokenHash,
    expiresAt,
    attemptWindowExpiresAt,
  });

  const resetLink = buildPasswordResetLink(rawToken);
  const expiresAtFormatted = formatDateTimeForEmail(expiresAt);

  await sendEmail(
    user.email,
    "Reset your password",
    `Open this link to reset your password: ${resetLink}. This link expires at ${expiresAtFormatted}.`,
    `<p>Hello <strong>${user.full_name}</strong>,</p>
     <p>Click the link below to reset your password:</p>
     <p><a href="${resetLink}">Reset Password</a></p>
     <p>This link expires at: <strong>${expiresAtFormatted}</strong></p>
     <p>If you did not request this, you can ignore this email.</p>`
  );

  return {
    status: 200,
    body: { message: "Password reset email sent." },
  };
}

export async function validatePasswordResetTokenService(token: string): Promise<AuthFlowResult> {
  const rawToken = token.trim();
  if (!rawToken) {
    return {
      status: 400,
      body: { error: "Reset token is required." },
    };
  }

  const tokenHash = hashPasswordResetToken(rawToken);
  const request = await findPasswordResetRequestByTokenHash(tokenHash);

  if (!request) {
    return {
      status: 400,
      body: { error: "Reset link is invalid, expired, or already used." },
    };
  }

  const now = Date.now();

  if (request.used_at) {
    return {
      status: 400,
      body: { error: "Reset link is invalid, expired, or already used." },
    };
  }

  if (request.expires_at.getTime() <= now) {
    return {
      status: 400,
      body: { error: "Reset link is invalid, expired, or already used." },
    };
  }

  const attemptsBlocked =
    request.attempt_window_expires_at.getTime() > now &&
    request.attempts_used >= PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS;

  if (attemptsBlocked) {
    return {
      status: 400,
      body: { error: "Reset link attempts exceeded. Start password reset again." },
    };
  }

  return {
    status: 200,
    body: { valid: true, message: "Reset token is valid." },
  };
}

export async function confirmPasswordResetService(
  input: PasswordResetConfirmInput
): Promise<AuthFlowResult> {
  const rawToken = input.token.trim();
  const newPassword = input.newPassword;

  const tokenHash = hashPasswordResetToken(rawToken);
  const request = await findPasswordResetRequestByTokenHash(tokenHash);

  if (!request) {
    return {
      status: 400,
      body: { error: "Reset link is invalid, expired, or already used." },
    };
  }

  const now = Date.now();

  if (request.used_at || request.expires_at.getTime() <= now) {
    return {
      status: 400,
      body: { error: "Reset link is invalid, expired, or already used." },
    };
  }

  const attemptsBlocked =
    request.attempt_window_expires_at.getTime() > now &&
    request.attempts_used >= PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS;

  if (attemptsBlocked) {
    return {
      status: 400,
      body: { error: "Reset link attempts exceeded. Start password reset again." },
    };
  }

  const user = await findUserById(request.user_id);
  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (user.is_blocked === 1) {
    return {
      status: 403,
      body: { error: "Blocked accounts cannot reset password." },
    };
  }

  if (!user.email_verified_at) {
    return {
      status: 403,
      body: { error: "Unverified accounts cannot reset password." },
    };
  }

  if (!user.password_hash) {
    return {
      status: 403,
      body: { error: "Password reset is unavailable for SSO-only accounts." },
    };
  }

  const policyError = await validateNewPasswordPolicy(newPassword);
  if (policyError) {
    await incrementPasswordResetRequestAttempts(request.id);

    const usedAfter = request.attempts_used + 1;
    if (usedAfter >= PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS) {
      return {
        status: 400,
        body: { error: "Reset link attempts exceeded. Start password reset again." },
      };
    }

    return {
      status: 400,
      body: { error: policyError },
    };
  }

  const sameAsCurrent = await verifyPassword(newPassword, user.password_hash);
  if (sameAsCurrent) {
    await incrementPasswordResetRequestAttempts(request.id);

    const usedAfter = request.attempts_used + 1;
    if (usedAfter >= PASSWORD_RESET_CONFIRM_MAX_ATTEMPTS) {
      return {
        status: 400,
        body: { error: "Reset link attempts exceeded. Start password reset again." },
      };
    }

    return {
      status: 400,
      body: { error: "New password must be different from current password." },
    };
  }

  const newPasswordHash = await hashPassword(newPassword);

  await sequelize.transaction(async () => {
    await updateUserPasswordHash(user.id, newPasswordHash);
    await markPasswordResetRequestUsed(request.id);
    await revokeActiveRefreshTokensForUser(user.id, new Date());
  });

  await sendEmail(
    user.email,
    "Password changed successfully",
    "Your password was changed successfully. If this was not you, contact support immediately.",
    `<p>Hello <strong>${user.full_name}</strong>,</p>
     <p>Your password was changed successfully.</p>
     <p>If this was not you, contact support immediately.</p>`
  );

  return {
    status: 200,
    body: { message: "Password has been reset successfully." },
  };
}

export async function changePasswordService(
  input: ChangePasswordInput
): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (!user.password_hash) {
    return {
      status: 403,
      body: { error: "Password change is unavailable for SSO-only accounts." },
    };
  }

  const currentValid = await verifyPassword(input.currentPassword, user.password_hash);
  if (!currentValid) {
    return {
      status: 401,
      body: { error: "Current password is incorrect." },
    };
  }

  const policyError = await validateNewPasswordPolicy(input.newPassword);
  if (policyError) {
    return {
      status: 400,
      body: { error: policyError },
    };
  }

  const sameAsCurrent = await verifyPassword(input.newPassword, user.password_hash);
  if (sameAsCurrent) {
    return {
      status: 400,
      body: { error: "New password must be different from current password." },
    };
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await sequelize.transaction(async () => {
    await updateUserPasswordHash(user.id, newPasswordHash);
    await revokeActiveRefreshTokensForUser(user.id, new Date());
  });

  await sendEmail(
    user.email,
    "Password changed successfully",
    "Your password was changed successfully. If this was not you, contact support immediately.",
    `<p>Hello <strong>${user.full_name}</strong>,</p>
     <p>Your password was changed successfully.</p>
     <p>If this was not you, contact support immediately.</p>`
  );

  return {
    status: 200,
    body: { message: "Password changed successfully." },
  };
}

// Helpers for Disabling 2FA
function getEnabled2faMethods(user: UserRow): TwoFactorMethod[] {
  const enabled: TwoFactorMethod[] = [];

  if (user.sms_2fa_enabled === 1) enabled.push("sms");
  if (user.email_2fa_enabled === 1) enabled.push("email");
  if (user.totp_enabled === 1) enabled.push("totp");

  return enabled;
};

function assertCanDisable2fa(user: UserRow, methodToDisable: TwoFactorMethod): AuthFlowResult | null {
  const enabled = getEnabled2faMethods(user);

  if (!enabled.includes(methodToDisable)) {
    return {
      status: 400,
      body: { error: `2FA method '${methodToDisable}' is not enabled.` },
    };
  }

  if (enabled.length <= 1) {
    return {
      status: 400,
      body: { error: "You must keep at least one 2FA method enabled." },
    };
  }

  return null;
};

// Disable 2FA (For All 3)
export async function disableTwoFactorMethodService(input: {
  userId: number;
  method: TwoFactorMethod;
}): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  const guardError = assertCanDisable2fa(user, input.method);
  if (guardError) {
    return guardError;
  }

  switch (input.method) {
    case "sms":
      await disableSms2fa(user.id);
      break;
    case "email":
      await disableEmail2fa(user.id);
      break;
    case "totp":
      await disableTotp2fa(user.id);
      break;
  }

  const updatedUser = await findUserById(user.id);

  return {
    status: 200,
    body: {
      message: `2FA method '${input.method}' disabled successfully.`,
      enabledMethods: updatedUser ? getEnabled2faMethods(updatedUser) : [],
    },
  };
}

// SMS - 2FA
export async function sendSmsTwoFactorCodeService(input: { userId: number }): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }


  const { code } = await issueSms2faCode(user.id);
  await sendVerificationCodeSMS(user.phone, code);

  return {
    status: 200,
    body: {
      message: "SMS 2FA code sent.",
      nextStep: "POST /api/auth/2fa/sms/verify",
      userId: user.id,
    },
  };
}

export async function verifySmsTwoFactorCodeService(input: TwoFactorInput): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  const isValid = await verifySms2faCode(input.userId, input.code);

  if (!isValid) {
    return {
      status: 401,
      body: { message: "Invalid 2FA code." },
    };
  }

  await enableSms2fa(input.userId);

  const requestBinUrl = getRequestBinUrl();

  const dummyResult = await httpClient(requestBinUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "2fa_login_completed",
      userId: input.userId,
      timestamp: new Date().toISOString(),
    }),
  });

  return {
    status: 200,
    body: {
      message: "2FA successful. User is fully logged in.",
      dummyEndpointStatus: dummyResult.status,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    },
  };

};


// TOTP - 2FA
export async function setupTotpTwoFactorService(input: { userId: number }): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found. " },
    }
  };

  let secret = "";
  let attempts = 0;

  do {
    secret = createTotpSecret();
    
    const existingUser = await findUserByTotpSecret(secret);
    if (!existingUser) break;
    attempts++;
  } while (attempts < 5);

  if (!secret) {
    return {
      status: 500,
      body: { error: "Failed to generate unique TOTP secret. "} 
    }
  };

  await saveUserTotpSecret(user.id, secret);

  const setupData = await buildTotpSetupData(secret, user.email);


  return {
    status: 200,
    body: {
      message: "TOTP Setup generated.",
      otpAuthUri: setupData.otpAuthUri,
      qrCodeDataUrl: setupData.qrCodeDataUrl
    }
  }
};

export async function verifyTotpTwoFactorService(input: { userId: number; totp_token: string }): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  if (!user.totp_secret) {
    return {
      status: 400,
      body: { error: "TOTP is not set up for this user." },
    };
  }

  const valid = await verifyTotpToken(user.totp_secret, input.totp_token);

  if (!valid) {
    return {
      status: 401,
      body: { message: "Invalid TOTP token." },
    };
  }

  await enableTotp2fa(input.userId);


  return {
    status: 200,
    body: {
      message: "TOTP token verified successfully.",
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    },
  };

};


// EMAIL - 2FA
export async function sendEmailTwoFactorCodeService(input: { userId: number }): Promise<AuthFlowResult> {
  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }


  const { code } = await issueEmail2faCode(user.id);

  await sendEmail(
    user.email,
    "Your 2FA code",
    `Your 2FA code is: ${code}`,
    `<p>Your 2FA code is: <strong>${code}</strong></p>`
  );

  return {
    status: 200,
    body: {
      message: "2FA code sent to email.",
      nextStep: "POST /api/auth/2fa/email/verify",
      userId: user.id,
    },
  };
};

export async function verifyEmailTwoFactorCodeService(input: TwoFactorInput): Promise<AuthFlowResult> {

  const user = await findUserById(input.userId);

  if (!user) {
    return {
      status: 404,
      body: { error: "User not found." },
    };
  }

  const isValid = await verifyEmail2faCode(input.userId, input.code);

  if (!isValid) {
    return {
      status: 401,
      body: { message: "Invalid 2FA code." },
    };
  }

  await enableEmail2fa(input.userId);

  return {
    status: 200,
    body: {
      message: "Email 2FA successful. User is fully logged in.",
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        username: user.username,
        phone: user.phone,
      },
    },
  };

};


// Recovery Codes
export async function setupRecoveryCodes(
  userId: number
): Promise<AuthFlowResult> {
  try {
    const user = await findUserById(userId);

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found." },
      };
    }

    const plainCodes = await generateRecoveryCodes(userId);

    return {
      status: 200,
      body: {
        message: "Recovery codes generated successfully",
        codes: plainCodes,
        warning: "Save these codes in a safe place. Each can be used only once.",
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Recovery codes generation failed:", error);
    return {
      status: 500,
      body: { error: "Failed to generate recovery codes." },
    };
  }
}

export async function verifyWithRecoveryCode(
  userId: number,
  recoveryCode: string
): Promise<AuthFlowResult> {
  try {
    const user = await findUserById(userId);

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found." },
      };
    }

    const hasCodes = await hasUnusedRecoveryCodes(user.id);
    if (!hasCodes) {
      return {
        status: 403,
        body: { error: "Recovery codes are not set up. Generate backup codes first." },
      };
    }


    const cleanCode = recoveryCode.replace(/-/g, "");
    const isCodeValid = await verifyRecoveryCode(user.id, cleanCode);

    if (!isCodeValid) {
      return {
        status: 400,
        body: { error: "Invalid or already used recovery code." },
      };
    }

    const codesRemaining = await getRecoveryCodesCount(user.id);

    return {
      status: 200,
      body: {
        message: "Authenticated with recovery code",
        user: {
          id: user.id,
          role: user.role,
          fullName: user.full_name,
          email: user.email,
          username: user.username,
          phone: user.phone,
        },
        warning: "You used a recovery code. Please generate new ones for backup.",
        codesRemaining,
      },
    };
  } catch (error) {
    console.error("Recovery code authentication failed:", error);
    return {
      status: 500,
      body: { error: "Authentication failed." },
    };
  }
}


export async function getRecoveryCodeStatus(
  userId: number
): Promise<AuthFlowResult> {
  try {
    const user = await findUserById(userId);

    if (!user) {
      return {
        status: 404,
        body: { error: "User not found." },
      };
    }

    const count = await getRecoveryCodesCount(userId);

    return {
      status: 200,
      body: {
        message: "Recovery codes status",
        user: {
          id: user.id,
          role: user.role,
          fullName: user.full_name,
          email: user.email,
          username: user.username,
          phone: user.phone,
        },
        codesRemaining: count,
        hasBackupCodes: count > 0,
      },
    };
  } catch (error) {
    console.error("Failed to fetch recovery codes status:", error);
    return {
      status: 500,
      body: { error: "Failed to fetch recovery codes status." },
    };
  }
}

// Refresh Session
export async function refreshAuthSessionService(input: {
  refreshToken: string;
  userAgent: string | null;
  ip: string | null;
}): Promise<AuthFlowResult> {
  const raw = input.refreshToken?.trim();
  if (!raw) {
    return { status: 401, body: { error: "Missing refresh token." } };
  }

  let payload: { sub: number; jti: string; iat: number; exp: number };
  try {
    payload = verifyRefreshToken(raw);
  } catch {
    return { status: 401, body: { error: "Invalid refresh token." } };
  }

  const existing = await findRefreshTokenByJti(payload.jti);
  const refreshTokenHash = hashRefreshToken(raw);

  if (!existing || existing.user_id !== payload.sub) {
    return { status: 401, body: { error: "Invalid refresh token." } };
  }

  if (existing.refresh_token_hash && existing.refresh_token_hash !== refreshTokenHash) {
    return { status: 401, body: { error: "Invalid refresh token." } };
  }

  if (existing.revoked_at) {
    if (existing.replaced_by) {
      await revokeRefreshTokenFamily(existing.jti, new Date());
      return {
        status: 401,
        body: { error: "Refresh token replay detected.", replayDetected: true },
      };
    }

    return { status: 401, body: { error: "Refresh token is revoked." } };
  }

  if (existing.expires_at.getTime() <= Date.now()) {
    return { status: 401, body: { error: "Refresh token expired." } };
  }

  const isTrustedSession = existing.is_trusted_session === 1 || existing.is_trusted_session === true;
  const trustedUntilDate = existing.trusted_until ? new Date(existing.trusted_until) : null;
  const trustedDeviceId =
    typeof existing.trusted_device_id === "number" && Number.isInteger(existing.trusted_device_id)
      ? existing.trusted_device_id
      : null;
  const nowMs = Date.now();

  let rotated;
  if (isTrustedSession) {
    if (!trustedUntilDate || Number.isNaN(trustedUntilDate.getTime()) || trustedUntilDate.getTime() <= nowMs) {
      await revokeRefreshTokenFamily(existing.jti, new Date());
      return {
        status: 401,
        body: { error: "Trusted session expired. Please log in again." },
      };
    }

    const ttlSeconds = Math.floor((trustedUntilDate.getTime() - nowMs) / 1000);
    if (ttlSeconds <= 0) {
      await revokeRefreshTokenFamily(existing.jti, new Date());
      return {
        status: 401,
        body: { error: "Trusted session expired. Please log in again." },
      };
    }

    if (!trustedDeviceId) {
      await revokeRefreshTokenFamily(existing.jti, new Date());
      return {
        status: 401,
        body: { error: "Trusted session is invalid. Please log in again." },
      };
    }

    const trustedDevice = await findActiveTrustedDeviceByIdForUser(existing.user_id, trustedDeviceId);
    if (!trustedDevice) {
      await revokeRefreshTokenFamily(existing.jti, new Date());
      return {
        status: 401,
        body: { error: "Trusted device is revoked or expired. Please log in again." },
      };
    }

    rotated = signRefreshToken(existing.user_id, { expiresInSeconds: ttlSeconds });
  } else {
    rotated = signRefreshToken(existing.user_id);
  }

  const rotatedRefreshTokenHash = hashRefreshToken(rotated.token);
  const revokedAt = new Date();

  await sequelize.transaction(async (transaction) => {
    await insertRefreshToken(
      {
        jti: rotated.jti,
        refreshTokenHash: rotatedRefreshTokenHash,
        isTrustedSession,
        trustedUntil: isTrustedSession ? trustedUntilDate : null,
        trustedDeviceId: isTrustedSession ? trustedDeviceId : null,
        userId: existing.user_id,
        issuedAt: rotated.issuedAt,
        expiresAt: rotated.expiresAt,
        userAgent: input.userAgent,
        ip: input.ip,
      },
      transaction
    );

    await revokeAndReplaceRefreshToken(
      existing.jti,
      rotated.jti,
      revokedAt,
      transaction
    );
  });

  return {
    status: 200,
    body: {
      message: "Session refreshed.",
      userId: existing.user_id,
      refreshToken: rotated.token,
      refreshExpiresAt: rotated.expiresAt.toISOString(),
    },
  };
}

// Trusted Device
export async function issueTrustedDeviceForUser(input: {
  userId: number;
  userAgent: string | null;
  ip: string | null;
}): Promise<{ id: number; token: string; expiresAt: Date }> {
  const token = randomBytes(TRUSTED_DEVICE_TOKEN_BYTES).toString("hex");
  const deviceTokenHash = hashTrustedDeviceToken(token);
  const expiresAt = buildTrustedDeviceExpiresAt();

  const id = await createTrustedDevice({
    userId: input.userId,
    deviceTokenHash,
    userAgent: input.userAgent,
    ip: input.ip,
    expiresAt,
  });

  return { id, token, expiresAt };
}

export async function validateTrustedDeviceForUser(input: {
  userId: number;
  token: string;
}): Promise<{ isValid: boolean; trustedDeviceId: number | null; trustedUntil: Date | null }> {
  const raw = input.token.trim();
  if (!raw) {
    return { isValid: false, trustedDeviceId: null, trustedUntil: null };
  }

  const deviceTokenHash = hashTrustedDeviceToken(raw);
  const trusted = await findActiveTrustedDeviceByHashForUser(input.userId, deviceTokenHash);

  if (!trusted) {
    return { isValid: false, trustedDeviceId: null, trustedUntil: null };
  }

  return {
    isValid: true,
    trustedDeviceId: trusted.id,
    trustedUntil: trusted.expires_at instanceof Date ? trusted.expires_at : new Date(trusted.expires_at),
  };
}

export async function markTrustedDeviceAsUsed(trustedDeviceId: number): Promise<void> {
  await touchTrustedDeviceLastUsed(trustedDeviceId);
}

export async function listTrustedDevicesForUserService(userId: number): Promise<AuthFlowResult> {
  const rows = await listActiveTrustedDevicesForUser(userId);

  return {
    status: 200,
    body: {
      devices: rows.map((row) => ({
        id: row.id,
        userAgent: row.user_agent,
        ip: row.ip,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        lastUsedAt: row.last_used_at instanceof Date ? row.last_used_at.toISOString() : null,
        expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
      })),
    },
  };
}

export async function revokeTrustedDeviceForUserService(input: {
  userId: number;
  trustedDeviceId: number;
}): Promise<AuthFlowResult> {
  const revoked = await revokeTrustedDeviceForUser(input.userId, input.trustedDeviceId);

  if (!revoked) {
    return {
      status: 404,
      body: { error: "Trusted device not found." },
    };
  }

  await revokeActiveRefreshTokensByTrustedDeviceId(input.userId, input.trustedDeviceId, new Date());

  return {
    status: 200,
    body: { message: "Trusted device revoked successfully." },
  };
}

export async function listActiveSessionsForUserService(input: {
  userId: number;
  currentSessionJti: string | null;
}): Promise<AuthFlowResult> {
  const rows = await listActiveRefreshSessionsForUser(input.userId);
  const sessions: ActiveSessionSnapshot[] = rows.map((row) => ({
    jti: row.jti,
    userAgent: row.user_agent,
    ip: row.ip,
    issuedAt: row.issued_at instanceof Date ? row.issued_at.toISOString() : String(row.issued_at),
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
    isTrustedSession: row.is_trusted_session === 1 || row.is_trusted_session === true,
    trustedUntil: row.trusted_until
      ? row.trusted_until instanceof Date
        ? row.trusted_until.toISOString()
        : String(row.trusted_until)
      : null,
    trustedDeviceId:
      typeof row.trusted_device_id === "number" && Number.isInteger(row.trusted_device_id)
        ? row.trusted_device_id
        : null,
    isCurrent: input.currentSessionJti ? row.jti === input.currentSessionJti : false,
  }));

  return {
    status: 200,
    body: { sessions },
  };
}

export async function revokeActiveSessionForUserService(input: {
  userId: number;
  jti: string;
}): Promise<AuthFlowResult> {
  const revoked = await revokeRefreshSessionForUserByJti(input.userId, input.jti, new Date());

  if (!revoked) {
    return {
      status: 404,
      body: { error: "Session not found." },
    };
  }

  return {
    status: 200,
    body: { message: "Session revoked successfully." },
  };
}



