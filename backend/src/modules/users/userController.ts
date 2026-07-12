import { Request, Response } from "express";
import { randomBytes } from "crypto";
import { generateGoogleAuthUrl, exchangeCodeForGoogleIdentity } from "../auth/google/googleOAuthService";
import {
  setGoogleOauthStateCookie,
  readGoogleOauthStateCookie,
  clearGoogleOauthStateCookie,
  setGoogleSsoContextCookie,
  readGoogleSsoContextCookie,
  clearGoogleSsoContextCookie,
} from "../auth/google/googleOAuthCookieService";
import { generateGitHubAuthUrl, exchangeCodeForGitHubIdentity } from "../auth/github/githubOAuthService";
import {
  setGitHubOauthStateCookie,
  readGitHubOauthStateCookie,
  clearGitHubOauthStateCookie,
  setGitHubSsoContextCookie,
  readGitHubSsoContextCookie,
  clearGitHubSsoContextCookie,
} from "../auth/github/githubOAuthCookieService";
import { 
  loginUser, 
  registerUser, 
  verifySmsTwoFactorCodeService,
  setupTotpTwoFactorService,
  verifyTotpTwoFactorService,
  verifyEmail, 
  sendSmsTwoFactorCodeService,
  setupRecoveryCodes,
  verifyWithRecoveryCode,
  getRecoveryCodeStatus,
  sendEmailTwoFactorCodeService,
  verifyEmailTwoFactorCodeService,
  disableTwoFactorMethodService,
  refreshAuthSessionService,
  loginUserWithGoogleEmail,
  completeGoogleRegistrationService,
  linkGoogleAccountToUser,
  loginUserWithGitHubEmail,
  completeGitHubRegistrationService,
  linkGitHubAccountToUser,
  issueTrustedDeviceForUser,
  validateTrustedDeviceForUser,
  markTrustedDeviceAsUsed,
  dispatchSecondFactorChallengeForUser,
  listTrustedDevicesForUserService,
  revokeTrustedDeviceForUserService,
  listActiveSessionsForUserService,
  revokeActiveSessionForUserService,
  requestPasswordResetService,
  validatePasswordResetTokenService,
  confirmPasswordResetService,
  changePasswordService,
} from "./userService";
import {
  LoginInput,
  RegisterInput,
  TwoFactorInput,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  ChangePasswordInput,
} from "./userTypes";
import { signAccessToken } from "../auth/authJwtService";
import { readLoginJwtData, readUserFrom2faSuccess, getErrorMessage } from "./userHelpers";
import {
  setAuthCookie,
  clearAuthCookie,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
  setTrustedDeviceCookie,
  readTrustedDeviceCookie,
  clearTrustedDeviceCookie,
} from "../auth/authCookieService";

import { hashRefreshToken, signRefreshToken, verifyRefreshToken } from "../auth/refreshTokenService";
import {
  insertRefreshToken,
  revokeRefreshToken,
} from "../auth/refreshTokenRepository";
import { 
  findUserById,
  findUserByIdentifier,
 } from "./userRepository";
import {
  clearCaptchaFailures,
  getCaptchaDecision,
  recordCaptchaFailure,
} from "../auth/captcha/attemptService";
import { verifyHCaptchaToken } from "../auth/captcha/hcaptchaService";
import { logControllerEvent } from "./auditLogHelper";
import {
  maybeAlertCredentialStuffing,
  maybeAlertBruteForce,
  alertRefreshTokenReuse,
} from "../../services/securityAlertService";

// Helper
const FRONT_LOGIN_PATH = "/front/login";
const FRONT_SSO_COMPLETE_PROFILE_PATH = "/front/sso/complete-profile";

function buildFrontRedirect(path: string, params: Record<string, string>): string {
  return `${path}?${new URLSearchParams(params).toString()}`;
};

/* Trusted Device Helpers */
function isCredentialPreTwoFactorAuth(req: Request): boolean {
  return req.auth?.twoFactorVerified === false && req.auth?.authSource === "credential";
}

function readTrustDeviceFlag(req: Request): boolean {
  const value = (req.body as Record<string, unknown>)?.trustDevice;
  return value === true;
}



function readAuthUserId(req: Request, res: Response): number | null {
  if (!req.auth) {
    res.status(401).json({ error: "Missing auth context." });
    return null;
  }
  return req.auth.userId;
};

function readRequestUserAgent(req: Request): string | null {
  const ua = req.headers["user-agent"];
  if (typeof ua !== "string") return null;
  const trimmed = ua.trim();
  return trimmed ? trimmed : null;
}

function readRequestIp(req: Request): string | null {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const ip = req.ip?.trim();
  return ip ? ip : null;
}

async function issueFullAuthSession(
  req: Request,
  res: Response,
  userId: number,
  email: string,
  options?: {
    isTrustedSession?: boolean;
    trustedUntil?: Date | null;
    trustedDeviceId?: number | null;
  }
): Promise<void> {
  const accessToken = signAccessToken({
    userId,
    email,
    twoFactorVerified: true,
    authSource: "session",
  });

  const isTrustedSession = options?.isTrustedSession === true;
  const trustedUntil = options?.trustedUntil ?? null;
  const trustedDeviceId = options?.trustedDeviceId ?? null;

  let refresh;
  if (isTrustedSession && trustedUntil) {
    const ttlSeconds = Math.floor((trustedUntil.getTime() - Date.now()) / 1000);
    if (ttlSeconds <= 0) {
      throw new Error("Trusted session window already expired.");
    }
    refresh = signRefreshToken(userId, { expiresInSeconds: ttlSeconds });
  } else {
    refresh = signRefreshToken(userId);
  }
  const refreshTokenHash = hashRefreshToken(refresh.token);

  await insertRefreshToken({
    jti: refresh.jti,
    refreshTokenHash,
    isTrustedSession,
    trustedUntil: isTrustedSession ? trustedUntil : null,
    trustedDeviceId: isTrustedSession ? trustedDeviceId : null,
    userId,
    issuedAt: refresh.issuedAt,
    expiresAt: refresh.expiresAt,
    userAgent: readRequestUserAgent(req),
    ip: readRequestIp(req),
  });

  setAuthCookie(res, accessToken);
  setRefreshCookie(res, refresh.token, {
    maxAgeMs: Math.max(1, refresh.expiresAt.getTime() - Date.now()),
  });
}

function isPreTwoFactorAuth(req: Request): boolean {
  return req.auth?.twoFactorVerified === false;
}



export async function registerController(req: Request, res: Response) {
  try {
    const input = req.body as RegisterInput;
    const result = await registerUser(input);
    await logControllerEvent(req, {
      actionBase: "AUTH_REGISTER",
      status: result.status,
      objectName: "user",
      objectId: input.email?.toLowerCase?.() ?? null,
      requestData: { email: input.email, username: input.username, phone: input.phone },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_REGISTER_ERROR",
      status: 500,
      objectName: "user",
      objectId: typeof req.body?.email === "string" ? req.body.email : null,
      requestData: { email: req.body?.email, username: req.body?.username },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyEmailController(req: Request, res: Response) {
  try {
    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";

    const result = await verifyEmail(token);
    await logControllerEvent(req, {
      actionBase: "AUTH_EMAIL_VERIFY",
      status: result.status,
      objectName: "email_verification",
      objectId: token || null,
      requestData: { token },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_EMAIL_VERIFY_ERROR",
      status: 500,
      objectName: "email_verification",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}



export async function loginController(req: Request, res: Response) {
  try {
    const input = req.body as LoginInput;
    const normalizedIdentifier = input.identifier.trim().toLowerCase();
    const ip = readRequestIp(req);
    const trustedDeviceToken = readTrustedDeviceCookie(req);
    const hasTrustedDeviceCookie = typeof trustedDeviceToken === "string" && trustedDeviceToken.trim().length > 0;

    const captchaTokenRaw = (req.body as Record<string, unknown>)?.captchaToken;
    const captchaToken = typeof captchaTokenRaw === "string" ? captchaTokenRaw.trim() : "";

    const captchaDecision = await getCaptchaDecision({
      action: "LOGIN",
      identifier: input.identifier,
      ip,
    });

    if (captchaDecision.requiresCaptcha) {
      if (!captchaToken) {
        await logControllerEvent(req, {
          action: "AUTH_LOGIN_CAPTCHA_REQUIRED",
          status: 400,
          objectName: "login",
          objectId: input.identifier,
          requestData: { identifier: input.identifier, failedCount: captchaDecision.failedCount },
        });
        return res.status(400).json({
          error: "Captcha is required after multiple failed login attempts.",
          captchaRequired: true,
          failedCount: captchaDecision.failedCount,
          threshold: captchaDecision.threshold,
        });
      }

      const captchaResult = await verifyHCaptchaToken(captchaToken, ip);

      if (!captchaResult.success) {
        await logControllerEvent(req, {
          action: "AUTH_LOGIN_CAPTCHA_FAILED",
          status: 400,
          objectName: "login",
          objectId: input.identifier,
          requestData: { identifier: input.identifier, captchaErrors: captchaResult.errorCodes },
        });
        return res.status(400).json({
          error: "hCaptcha verification failed.",
          captchaRequired: true,
          captchaErrors: captchaResult.errorCodes,
        });
      }
    }

    let result = await loginUser(input, {
      issueChallenge: !hasTrustedDeviceCookie,
    });

    if (result.status === 401) {
      await recordCaptchaFailure({
        action: "LOGIN",
        identifier: input.identifier,
        ip,
      });

      const updatedDecision = await getCaptchaDecision({
        action: "LOGIN",
        identifier: input.identifier,
        ip,
      });

      await logControllerEvent(req, {
        action: "AUTH_LOGIN_FAILED",
        status: 401,
        objectName: "login",
        objectId: normalizedIdentifier,
        requestData: { identifier: normalizedIdentifier },
        originalObject: result.body,
      });

      if (normalizedIdentifier) {
        void maybeAlertCredentialStuffing(normalizedIdentifier);
      }

      if (ip) {
        void maybeAlertBruteForce(ip);
      }

      return res.status(401).json({
        ...result.body,
        captchaRequired: updatedDecision.requiresCaptcha,
        failedCount: updatedDecision.failedCount,
        threshold: updatedDecision.threshold,
      });
    }

    if (result.status >= 200 && result.status < 300) {
      await clearCaptchaFailures({
        action: "LOGIN",
        identifier: input.identifier,
        ip,
      });

      const jwtData = readLoginJwtData(result.body);

      if (jwtData) {
        const body = result.body as Record<string, unknown>;
        const mfaSetupRequired = body.mfaSetupRequired === true;
        const nextStep = typeof body.nextStep === "string" ? body.nextStep : "";
        const requires2faVerify = nextStep.includes("/api/auth/2fa/");

        if (!mfaSetupRequired && requires2faVerify) {
          if (hasTrustedDeviceCookie && trustedDeviceToken) {
            const trusted = await validateTrustedDeviceForUser({
              userId: jwtData.userId,
              token: trustedDeviceToken,
            });

            if (trusted.isValid && trusted.trustedDeviceId && trusted.trustedUntil) {
              await markTrustedDeviceAsUsed(trusted.trustedDeviceId);
              await issueFullAuthSession(req, res, jwtData.userId, jwtData.email, {
                isTrustedSession: true,
                trustedUntil: trusted.trustedUntil,
                trustedDeviceId: trusted.trustedDeviceId,
              });

              const responseBody = { ...body };
              delete responseBody.nextStep;

              await logControllerEvent(req, {
                action: "AUTH_LOGIN_SUCCESS_TRUSTED_DEVICE_BYPASS",
                status: 200,
                actorId: jwtData.userId,
                objectName: "trusted_device_session",
                objectId: trusted.trustedDeviceId,
                requestData: { identifier: input.identifier },
              });
              return res.status(200).json({
                ...responseBody,
                trustedDeviceBypass: true,
                message: "Credentials are correct. Trusted device recognized. 2FA is skipped.",
                user: {
                  id: jwtData.userId,
                  role: body.role === "admin" ? "admin" : "user",
                  fullName: typeof body.fullName === "string" ? body.fullName : "",
                  email: jwtData.email,
                  username: typeof body.username === "string" ? body.username : "",
                  phone: typeof body.phone === "string" ? body.phone : "",
                },
              });
            }

            clearTrustedDeviceCookie(res);

            const challengeResult = await dispatchSecondFactorChallengeForUser(jwtData.userId);
            if (challengeResult.status >= 200 && challengeResult.status < 300) {
              result = challengeResult;
            } else {
              return res.status(challengeResult.status).json(challengeResult.body);
            }
          }
        }

        const token = signAccessToken({
          userId: jwtData.userId,
          email: jwtData.email,
          twoFactorVerified: false,
          authSource: "credential",
        });

        setAuthCookie(res, token);
      }
    }

    const loginData = readLoginJwtData(result.body);
    await logControllerEvent(req, {
      actionBase: "AUTH_LOGIN",
      status: result.status,
      actorId: loginData?.userId ?? null,
      objectName: "login",
      objectId: input.identifier,
      requestData: { identifier: input.identifier },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_LOGIN_ERROR",
      status: 500,
      objectName: "login",
      objectId: typeof req.body?.identifier === "string" ? req.body.identifier : null,
      requestData: { identifier: req.body?.identifier },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function logoutController(req: Request, res: Response) {
  try {
    const refreshToken = readRefreshCookie(req);

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await revokeRefreshToken(payload.jti, new Date());
      } catch {
        // Invalid refresh token on logout: ignore revoke, still clear cookies
      }
    }

    clearAuthCookie(res);
    clearRefreshCookie(res);

    await logControllerEvent(req, {
      actionBase: "AUTH_LOGOUT",
      status: 200,
      actorId: req.auth?.userId ?? null,
      objectName: "session",
    });
    return res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_LOGOUT_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "session",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Password Recovery
export async function requestPasswordResetController(req: Request, res: Response) {
  try {
    const input = req.body as PasswordResetRequestInput;
    const ip = readRequestIp(req);

    const captchaDecision = await getCaptchaDecision({
      action: "PASSWORD_RESET",
      identifier: input.email,
      ip,
    });

    if (captchaDecision.requiresCaptcha) {
      const captchaToken = typeof input.captchaToken === "string" ? input.captchaToken.trim() : "";

      if (!captchaToken) {
        await logControllerEvent(req, {
          action: "AUTH_PASSWORD_RESET_CAPTCHA_REQUIRED",
          status: 400,
          objectName: "password_reset",
          objectId: input.email,
          requestData: { email: input.email, failedCount: captchaDecision.failedCount },
        });
        return res.status(400).json({
          error: "Captcha is required after multiple failed password reset attempts.",
          captchaRequired: true,
          failedCount: captchaDecision.failedCount,
          threshold: captchaDecision.threshold,
        });
      }

      const captchaResult = await verifyHCaptchaToken(captchaToken, ip);

      if (!captchaResult.success) {
        await logControllerEvent(req, {
          action: "AUTH_PASSWORD_RESET_CAPTCHA_FAILED",
          status: 400,
          objectName: "password_reset",
          objectId: input.email,
          requestData: { email: input.email, captchaErrors: captchaResult.errorCodes },
        });
        return res.status(400).json({
          error: "hCaptcha verification failed.",
          captchaRequired: true,
          captchaErrors: captchaResult.errorCodes,
        });
      }
    }

    const result = await requestPasswordResetService(input);

    if (result.status >= 200 && result.status < 300) {
      await clearCaptchaFailures({
        action: "PASSWORD_RESET",
        identifier: input.email,
        ip,
      });

      await logControllerEvent(req, {
        actionBase: "AUTH_PASSWORD_RESET_REQUEST",
        status: result.status,
        objectName: "password_reset",
        objectId: input.email,
        requestData: { email: input.email },
      });
      return res.status(result.status).json(result.body);
    }

    if (result.status >= 400 && result.status < 500) {
      await recordCaptchaFailure({
        action: "PASSWORD_RESET",
        identifier: input.email,
        ip,
      });

      const updatedDecision = await getCaptchaDecision({
        action: "PASSWORD_RESET",
        identifier: input.email,
        ip,
      });

      await logControllerEvent(req, {
        actionBase: "AUTH_PASSWORD_RESET_REQUEST",
        status: result.status,
        objectName: "password_reset",
        objectId: input.email,
        requestData: { email: input.email },
        originalObject: result.body,
      });
      return res.status(result.status).json({
        ...result.body,
        captchaRequired: updatedDecision.requiresCaptcha,
        failedCount: updatedDecision.failedCount,
        threshold: updatedDecision.threshold,
      });
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_PASSWORD_RESET_REQUEST",
      status: result.status,
      objectName: "password_reset",
      objectId: input.email,
      requestData: { email: input.email },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_PASSWORD_RESET_REQUEST_ERROR",
      status: 500,
      objectName: "password_reset",
      objectId: typeof req.body?.email === "string" ? req.body.email : null,
      requestData: { email: req.body?.email },
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function validatePasswordResetTokenController(req: Request, res: Response) {
  try {
    const token = typeof req.query?.token === "string" ? req.query.token.trim() : "";
    const result = await validatePasswordResetTokenService(token);
    await logControllerEvent(req, {
      actionBase: "AUTH_PASSWORD_RESET_VALIDATE",
      status: result.status,
      objectName: "password_reset_token",
      objectId: token || null,
      requestData: { token },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_PASSWORD_RESET_VALIDATE_ERROR",
      status: 500,
      objectName: "password_reset_token",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function confirmPasswordResetController(req: Request, res: Response) {
  try {
    const input = req.body as PasswordResetConfirmInput;
    const result = await confirmPasswordResetService(input);

    if (result.status >= 200 && result.status < 300) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      clearTrustedDeviceCookie(res);
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_PASSWORD_RESET_CONFIRM",
      status: result.status,
      objectName: "password_reset",
      objectId: input.token,
      requestData: { token: input.token },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_PASSWORD_RESET_CONFIRM_ERROR",
      status: 500,
      objectName: "password_reset",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function changePasswordController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const body = req.body as Omit<ChangePasswordInput, "userId">;

    const result = await changePasswordService({
      userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    if (result.status >= 200 && result.status < 300) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      clearTrustedDeviceCookie(res);
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_PASSWORD_CHANGE",
      status: result.status,
      actorId: userId,
      objectName: "password",
      objectId: userId,
      requestData: { userId },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_PASSWORD_CHANGE_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "password",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}


// Recovery Codes
export async function setupRecoveryCodesController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const result = await setupRecoveryCodes(userId);
    await logControllerEvent(req, {
      actionBase: "AUTH_RECOVERY_CODES_SETUP",
      status: result.status,
      actorId: userId,
      objectName: "recovery_codes",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_RECOVERY_CODES_SETUP_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "recovery_codes",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyWithRecoveryCodeController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const recoveryCode =
      typeof req.body?.recoveryCode === "string" ? req.body.recoveryCode.trim() : "";

    const result = await verifyWithRecoveryCode(userId, recoveryCode);

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readUserFrom2faSuccess(result.body);
      if (jwtData && isPreTwoFactorAuth(req)) {
        await issueFullAuthSession(req, res, jwtData.userId, jwtData.email);
      }
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_RECOVERY_CODE_VERIFY",
      status: result.status,
      actorId: userId,
      objectName: "recovery_code",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_RECOVERY_CODE_VERIFY_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "recovery_code",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function getRecoveryCodeStatusController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const result = await getRecoveryCodeStatus(userId);
    await logControllerEvent(req, {
      actionBase: "AUTH_RECOVERY_CODES_STATUS",
      status: result.status,
      actorId: userId,
      objectName: "recovery_codes",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_RECOVERY_CODES_STATUS_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "recovery_codes",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// SMS - 2FA
export async function sendSmsTwoFactorCodeController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const result = await sendSmsTwoFactorCodeService({ userId });
    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_SMS_SEND",
      status: result.status,
      actorId: userId,
      objectName: "2fa_sms",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_SMS_SEND_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_sms",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifySmsTwoFactorCodeController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const trustDevice = readTrustDeviceFlag(req);
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    const result = await verifySmsTwoFactorCodeService({ userId, code });

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readUserFrom2faSuccess(result.body);
      if (jwtData && isPreTwoFactorAuth(req)) {
        let trustedSession: { isTrustedSession: boolean; trustedUntil: Date | null } | undefined;
        if (trustDevice && isCredentialPreTwoFactorAuth(req)) {
          const trusted = await issueTrustedDeviceForUser({
            userId: jwtData.userId,
            userAgent: readRequestUserAgent(req),
            ip: readRequestIp(req),
          });
          await logControllerEvent(req, {
            action: "AUTH_TRUSTED_DEVICE_MARKED",
            status: 200,
            actorId: jwtData.userId,
            objectName: "trusted_device",
            objectId: trusted.id,
            requestData: {
              method: "sms",
              trustedUntil: trusted.expiresAt.toISOString(),
            },
          });

          trustedSession = {
            isTrustedSession: true,
            trustedUntil: trusted.expiresAt,
          };
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email, {
            ...trustedSession,
            trustedDeviceId: trusted.id,
          });
          setTrustedDeviceCookie(res, trusted.token);
        } else {
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email);
        }
      }
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_SMS_VERIFY",
      status: result.status,
      actorId: userId,
      objectName: "2fa_sms",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_SMS_VERIFY_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_sms",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// TOTP - 2FA
export async function setupTotpTwoFactorController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const result = await setupTotpTwoFactorService({ userId });
    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_TOTP_SETUP",
      status: result.status,
      actorId: userId,
      objectName: "2fa_totp",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_TOTP_SETUP_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_totp",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyTotpTwoFactorController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const trustDevice = readTrustDeviceFlag(req);

    const totp_token =
      typeof req.body?.totp_token === "string" ? req.body.totp_token.trim() : "";

    const result = await verifyTotpTwoFactorService({ userId, totp_token });

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readUserFrom2faSuccess(result.body);
      if (jwtData && isPreTwoFactorAuth(req)) {
        let trustedSession: { isTrustedSession: boolean; trustedUntil: Date | null } | undefined;
        if (trustDevice && isCredentialPreTwoFactorAuth(req)) {
          const trusted = await issueTrustedDeviceForUser({
            userId: jwtData.userId,
            userAgent: readRequestUserAgent(req),
            ip: readRequestIp(req),
          });
          await logControllerEvent(req, {
            action: "AUTH_TRUSTED_DEVICE_MARKED",
            status: 200,
            actorId: jwtData.userId,
            objectName: "trusted_device",
            objectId: trusted.id,
            requestData: {
              method: "totp",
              trustedUntil: trusted.expiresAt.toISOString(),
            },
          });

          trustedSession = {
            isTrustedSession: true,
            trustedUntil: trusted.expiresAt,
          };
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email, {
            ...trustedSession,
            trustedDeviceId: trusted.id,
          });
          setTrustedDeviceCookie(res, trusted.token);
        } else {
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email);
        }
      }
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_TOTP_VERIFY",
      status: result.status,
      actorId: userId,
      objectName: "2fa_totp",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_TOTP_VERIFY_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_totp",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// EMAIL - 2FA
export async function sendEmailTwoFactorCodeController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const result = await sendEmailTwoFactorCodeService({ userId });
    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_EMAIL_SEND",
      status: result.status,
      actorId: userId,
      objectName: "2fa_email",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_EMAIL_SEND_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_email",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function verifyEmailTwoFactorCodeController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;
    const trustDevice = readTrustDeviceFlag(req);

    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    const result = await verifyEmailTwoFactorCodeService({ userId, code });

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readUserFrom2faSuccess(result.body);
      if (jwtData && isPreTwoFactorAuth(req)) {
        let trustedSession: { isTrustedSession: boolean; trustedUntil: Date | null } | undefined;
        if (trustDevice && isCredentialPreTwoFactorAuth(req)) {
          const trusted = await issueTrustedDeviceForUser({
            userId: jwtData.userId,
            userAgent: readRequestUserAgent(req),
            ip: readRequestIp(req),
          });
          await logControllerEvent(req, {
            action: "AUTH_TRUSTED_DEVICE_MARKED",
            status: 200,
            actorId: jwtData.userId,
            objectName: "trusted_device",
            objectId: trusted.id,
            requestData: {
              method: "email",
              trustedUntil: trusted.expiresAt.toISOString(),
            },
          });

          trustedSession = {
            isTrustedSession: true,
            trustedUntil: trusted.expiresAt,
          };
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email, {
            ...trustedSession,
            trustedDeviceId: trusted.id,
          });
          setTrustedDeviceCookie(res, trusted.token);
        } else {
          await issueFullAuthSession(req, res, jwtData.userId, jwtData.email);
        }
      }
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_EMAIL_VERIFY",
      status: result.status,
      actorId: userId,
      objectName: "2fa_email",
      objectId: userId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_EMAIL_VERIFY_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_email",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Disable 2FA (For All 3)
export async function disableTwoFactorMethodController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const method = req.body?.method as "sms" | "email" | "totp";

    const result = await disableTwoFactorMethodService({ userId, method });
    await logControllerEvent(req, {
      actionBase: "AUTH_2FA_DISABLE_METHOD",
      status: result.status,
      actorId: userId,
      objectName: "2fa_method",
      objectId: method,
      requestData: { method },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_2FA_DISABLE_METHOD_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "2fa_method",
      objectId: typeof req.body?.method === "string" ? req.body.method : null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Trusted Device 
export async function listTrustedDevicesController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const result = await listTrustedDevicesForUserService(userId);
    await logControllerEvent(req, {
      actionBase: "AUTH_TRUSTED_DEVICES_LIST",
      status: result.status,
      actorId: userId,
      objectName: "trusted_device",
      objectId: userId,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_TRUSTED_DEVICES_LIST_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "trusted_device",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function revokeTrustedDeviceController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const trustedDeviceId = Number(req.params?.id);
    if (!Number.isInteger(trustedDeviceId) || trustedDeviceId <= 0) {
      return res.status(400).json({ error: "Trusted device id must be a positive integer." });
    }

    const currentTrustedToken = readTrustedDeviceCookie(req);
    let currentTrustedId: number | null = null;

    if (currentTrustedToken) {
      const currentTrusted = await validateTrustedDeviceForUser({
        userId,
        token: currentTrustedToken,
      });

      if (currentTrusted.isValid && currentTrusted.trustedDeviceId) {
        currentTrustedId = currentTrusted.trustedDeviceId;
      }
    }

    const result = await revokeTrustedDeviceForUserService({ userId, trustedDeviceId });

    if (result.status >= 200 && result.status < 300 && currentTrustedId === trustedDeviceId) {
      clearTrustedDeviceCookie(res);
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_TRUSTED_DEVICE_REVOKE",
      status: result.status,
      actorId: userId,
      objectName: "trusted_device",
      objectId: trustedDeviceId,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_TRUSTED_DEVICE_REVOKE_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "trusted_device",
      objectId: typeof req.params?.id === "string" ? req.params.id : null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Sessions
export async function listActiveSessionsController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const refreshToken = readRefreshCookie(req);
    let currentSessionJti: string | null = null;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        currentSessionJti = payload.jti;
      } catch {
        currentSessionJti = null;
      }
    }

    const result = await listActiveSessionsForUserService({ userId, currentSessionJti });
    await logControllerEvent(req, {
      actionBase: "AUTH_SESSIONS_LIST",
      status: result.status,
      actorId: userId,
      objectName: "session",
      objectId: userId,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SESSIONS_LIST_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "session",
      objectId: req.auth?.userId ?? null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

export async function revokeActiveSessionController(req: Request, res: Response) {
  try {
    const userId = readAuthUserId(req, res);
    if (!userId) return;

    const jti = typeof req.params?.jti === "string" ? req.params.jti.trim() : "";
    if (!/^[a-f0-9]{64}$/i.test(jti)) {
      return res.status(400).json({ error: "Session id (jti) must be a 64-char hex string." });
    }

    const result = await revokeActiveSessionForUserService({ userId, jti });

    const currentRefreshToken = readRefreshCookie(req);
    if (currentRefreshToken) {
      try {
        const payload = verifyRefreshToken(currentRefreshToken);
        if (payload.jti === jti && result.status >= 200 && result.status < 300) {
          clearAuthCookie(res);
          clearRefreshCookie(res);
        }
      } catch {
        // ignore invalid current refresh token parsing
      }
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_SESSION_REVOKE",
      status: result.status,
      actorId: userId,
      objectName: "session",
      objectId: jti,
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SESSION_REVOKE_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "session",
      objectId: typeof req.params?.jti === "string" ? req.params.jti : null,
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Refresh Session
export async function refreshController(req: Request, res: Response) {
  try {
    const refreshToken = readRefreshCookie(req);

    if (!refreshToken) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_REFRESH_MISSING_TOKEN",
        status: 401,
        actorId: req.auth?.userId ?? null,
        objectName: "session",
      });
      return res.status(401).json({ error: "Missing refresh token." });
    }

    const result = await refreshAuthSessionService({
      refreshToken,
      userAgent: readRequestUserAgent(req),
      ip: readRequestIp(req),
    });

    if (result.status !== 200) {
      clearAuthCookie(res);
      clearRefreshCookie(res);

      const replayDetected =
        typeof (result.body as Record<string, unknown>)?.replayDetected === "boolean" &&
        (result.body as Record<string, unknown>).replayDetected === true;

      if (replayDetected) {
        let replayJti = "unknown";
        let replayUserId: number | null = null;

        try {
          const parsed = verifyRefreshToken(refreshToken);
          replayJti = parsed.jti;
          replayUserId = parsed.sub;
        } catch {
          // leave defaults
        }

        void alertRefreshTokenReuse({
          userId: replayUserId,
          jti: replayJti,
          ipAddress: readRequestIp(req),
        });
      }
      
      await logControllerEvent(req, {
        actionBase: "AUTH_REFRESH",
        status: result.status,
        actorId: req.auth?.userId ?? null,
        objectName: "session",
        originalObject: result.body,
      });
      return res.status(result.status).json(result.body);
    }

    const userId = typeof result.body.userId === "number" ? result.body.userId : null;
    const newRefreshToken =
      typeof result.body.refreshToken === "string" ? result.body.refreshToken : null;
    const refreshExpiresAtRaw =
      typeof result.body.refreshExpiresAt === "string" ? result.body.refreshExpiresAt : null;

    if (!userId || !newRefreshToken || !refreshExpiresAtRaw) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_REFRESH_INVALID_PAYLOAD",
        status: 500,
        actorId: req.auth?.userId ?? null,
        objectName: "session",
      });
      return res.status(500).json({ error: "Invalid refresh response payload." });
    }

    const refreshExpiresAt = new Date(refreshExpiresAtRaw);
    if (Number.isNaN(refreshExpiresAt.getTime())) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_REFRESH_INVALID_EXPIRATION",
        status: 500,
        actorId: req.auth?.userId ?? null,
        objectName: "session",
      });
      return res.status(500).json({ error: "Invalid refresh expiration." });
    }

    const user = await findUserById(userId);
    if (!user) {
      clearAuthCookie(res);
      clearRefreshCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_REFRESH_USER_NOT_FOUND",
        status: 401,
        objectName: "session",
        objectId: userId,
      });
      return res.status(401).json({ error: "User not found." });
    }

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      twoFactorVerified: true,
      authSource: "session",
    });

    setAuthCookie(res, accessToken);
    setRefreshCookie(res, newRefreshToken, {
      maxAgeMs: Math.max(1, refreshExpiresAt.getTime() - Date.now()),
    });

    await logControllerEvent(req, {
      actionBase: "AUTH_REFRESH",
      status: 200,
      actorId: user.id,
      objectName: "session",
      objectId: user.id,
    });
    return res.status(200).json({ message: "Session refreshed." });
  } catch (error) {
    clearAuthCookie(res);
    clearRefreshCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_REFRESH_ERROR",
      status: 500,
      actorId: req.auth?.userId ?? null,
      objectName: "session",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// Google OAuth
export async function googleLoginController(_req: Request, res: Response) {
  try {
    const state = randomBytes(16).toString("hex");
    setGoogleOauthStateCookie(res, state);

    const authUrl = generateGoogleAuthUrl(state);
    await logControllerEvent(_req, {
      action: "AUTH_SSO_GOOGLE_LOGIN_URL_GENERATED",
      status: 200,
      objectName: "sso_google",
    });
    return res.status(200).json({ authUrl });
  } catch (error) {
    await logControllerEvent(_req, {
      action: "AUTH_SSO_GOOGLE_LOGIN_URL_ERROR",
      status: 500,
      objectName: "sso_google",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

export async function googleCallbackController(req: Request, res: Response) {
  const stateFromQuery = typeof req.query?.state === "string" ? req.query.state.trim() : "";
  const code = typeof req.query?.code === "string" ? req.query.code.trim() : "";
  const stateFromCookie = readGoogleOauthStateCookie(req);

  clearGoogleOauthStateCookie(res);

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    clearGoogleSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_CALLBACK_BAD_STATE",
      status: 400,
      objectName: "sso_google",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "google",
        status: "error",
        reason: "bad_state",
      })
    );
  }

  if (!code) {
    clearGoogleSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_CALLBACK_MISSING_CODE",
      status: 400,
      objectName: "sso_google",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "google",
        status: "error",
        reason: "missing_code",
      })
    );
  }

  try {
    const identity = await exchangeCodeForGoogleIdentity(code);
    const existingUser = await findUserByIdentifier(identity.email);

    if (!existingUser) {
      const fullName = identity.fullName.trim();

      setGoogleSsoContextCookie(res, {
        mode: "complete-registration",
        email: identity.email,
        subject: identity.subject,
        fullName,
        givenName: identity.givenName,
        familyName: identity.familyName,
        needsFullName: !fullName,
      });

      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_COMPLETE_REG_REQUIRED",
        status: 302,
        objectName: "sso_google",
        objectId: identity.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_SSO_COMPLETE_PROFILE_PATH, {
          sso: "google",
          mode: "complete-registration",
        })
      );
    }

    if (existingUser.is_blocked === 1) {
      clearGoogleSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_DENIED_BLOCKED",
        status: 403,
        actorId: existingUser.id,
        objectName: "sso_google",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "google",
          status: "error",
          reason: "blocked",
        })
      );
    }

    if (!existingUser.email_verified_at) {
      clearGoogleSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_DENIED_EMAIL_NOT_VERIFIED",
        status: 403,
        actorId: existingUser.id,
        objectName: "sso_google",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "google",
          status: "error",
          reason: "email_not_verified",
        })
      );
    }

    const linkResult = await linkGoogleAccountToUser({
      userId: existingUser.id,
      googleSubject: identity.subject,
      isSsoOnly: false,
    });

    if (linkResult) {
      clearGoogleSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_LINK_CONFLICT",
        status: 409,
        actorId: existingUser.id,
        objectName: "sso_google",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "google",
          status: "error",
          reason: "link_conflict",
        })
      );
    }

    setGoogleSsoContextCookie(res, {
      mode: "login",
      userId: existingUser.id,
      email: existingUser.email,
    });

    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_LOGIN_CONTEXT_READY",
      status: 302,
      actorId: existingUser.id,
      objectName: "sso_google",
      objectId: existingUser.email,
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "google",
        mode: "login",
      })
    );
  } catch (error) {
    console.error("Google callback error:", error);
    clearGoogleSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_CALLBACK_OAUTH_FAILED",
      status: 500,
      objectName: "sso_google",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "google",
        status: "error",
        reason: "oauth_failed",
      })
    );
  }
}

export async function googleContextController(req: Request, res: Response) {
  try {
    const context = readGoogleSsoContextCookie(req);

    if (!context) {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_CONTEXT_MISSING",
        status: 401,
        objectName: "sso_google",
      });
      return res.status(401).json({ error: "Google SSO context is missing or expired." });
    }

    if (context.mode === "complete-registration") {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_CONTEXT_COMPLETE_REG",
        status: 200,
        objectName: "sso_google",
        objectId: context.email,
      });
      return res.status(200).json({
        mode: "complete-registration",
        email: context.email,
        fullName: context.fullName,
        needsFullName: context.needsFullName,
      });
    }

    const result = await loginUserWithGoogleEmail(context.email);

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readLoginJwtData(result.body);
      if (!jwtData) {
        return res.status(500).json({ error: "Invalid login response payload." });
      }

      const token = signAccessToken({
        userId: jwtData.userId,
        email: jwtData.email,
        twoFactorVerified: false,
        authSource: "google",
      });

      setAuthCookie(res, token);
      await logControllerEvent(req, {
        actionBase: "AUTH_SSO_GOOGLE_LOGIN",
        status: 200,
        actorId: jwtData.userId,
        objectName: "sso_google",
        objectId: jwtData.email,
      });
      return res.status(200).json({ mode: "login", ...result.body });
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_SSO_GOOGLE_LOGIN",
      status: result.status,
      objectName: "sso_google",
      objectId: context.email,
      originalObject: result.body,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_CONTEXT_ERROR",
      status: 500,
      objectName: "sso_google",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

export async function googleCompleteRegistrationController(req: Request, res: Response) {
  try {
    const context = readGoogleSsoContextCookie(req);

    if (!context || context.mode !== "complete-registration") {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GOOGLE_COMPLETE_REG_CONTEXT_MISSING",
        status: 400,
        objectName: "sso_google",
      });
      return res.status(400).json({ error: "Google SSO complete-registration context is missing." });
    }

    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

    const result = await completeGoogleRegistrationService({
      email: context.email,
      googleSubject: context.subject,
      username,
      phone,
      fullNameFromGoogle: context.fullName,
      fullNameFromForm: fullName,
      needsFullName: context.needsFullName,
    });

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readLoginJwtData(result.body);

      if (!jwtData) {
        return res.status(500).json({ error: "Invalid login response payload." });
      }

      const token = signAccessToken({
        userId: jwtData.userId,
        email: jwtData.email,
        twoFactorVerified: false,
        authSource: "google",
      });

      setAuthCookie(res, token);
      clearGoogleSsoContextCookie(res);
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_SSO_GOOGLE_COMPLETE_REG",
      status: result.status,
      actorId: readLoginJwtData(result.body)?.userId ?? null,
      objectName: "sso_google",
      objectId: context.email,
      requestData: { email: context.email, username, phone },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SSO_GOOGLE_COMPLETE_REG_ERROR",
      status: 500,
      objectName: "sso_google",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

// GitHub OAuth
export async function githubLoginController(_req: Request, res: Response) {
  try {
    const state = randomBytes(16).toString("hex");
    setGitHubOauthStateCookie(res, state);

    const authUrl = generateGitHubAuthUrl(state);
    await logControllerEvent(_req, {
      action: "AUTH_SSO_GITHUB_LOGIN_URL_GENERATED",
      status: 200,
      objectName: "sso_github",
    });
    return res.status(200).json({ authUrl });
  } catch (error) {
    await logControllerEvent(_req, {
      action: "AUTH_SSO_GITHUB_LOGIN_URL_ERROR",
      status: 500,
      objectName: "sso_github",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

export async function githubCallbackController(req: Request, res: Response) {
  const stateFromQuery = typeof req.query?.state === "string" ? req.query.state.trim() : "";
  const code = typeof req.query?.code === "string" ? req.query.code.trim() : "";
  const stateFromCookie = readGitHubOauthStateCookie(req);

  clearGitHubOauthStateCookie(res);

  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    clearGitHubSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_CALLBACK_BAD_STATE",
      status: 400,
      objectName: "sso_github",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "github",
        status: "error",
        reason: "bad_state",
      })
    );
  }

  if (!code) {
    clearGitHubSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_CALLBACK_MISSING_CODE",
      status: 400,
      objectName: "sso_github",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "github",
        status: "error",
        reason: "missing_code",
      })
    );
  }

  try {
    const identity = await exchangeCodeForGitHubIdentity(code);
    const existingUser = await findUserByIdentifier(identity.email);

    if (!existingUser) {
      const fullName = identity.fullName.trim();

      setGitHubSsoContextCookie(res, {
        mode: "complete-registration",
        email: identity.email,
        subject: identity.subject,
        fullName,
        givenName: identity.givenName,
        familyName: identity.familyName,
        needsFullName: !fullName,
      });

      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_COMPLETE_REG_REQUIRED",
        status: 302,
        objectName: "sso_github",
        objectId: identity.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_SSO_COMPLETE_PROFILE_PATH, {
          sso: "github",
          mode: "complete-registration",
        })
      );
    }

    if (existingUser.is_blocked === 1) {
      clearGitHubSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_DENIED_BLOCKED",
        status: 403,
        actorId: existingUser.id,
        objectName: "sso_github",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "github",
          status: "error",
          reason: "blocked",
        })
      );
    }

    if (!existingUser.email_verified_at) {
      clearGitHubSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_DENIED_EMAIL_NOT_VERIFIED",
        status: 403,
        actorId: existingUser.id,
        objectName: "sso_github",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "github",
          status: "error",
          reason: "email_not_verified",
        })
      );
    }

    const linkResult = await linkGitHubAccountToUser({
      userId: existingUser.id,
      githubSubject: identity.subject,
      isSsoOnly: false,
    });

    if (linkResult) {
      clearGitHubSsoContextCookie(res);
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_LINK_CONFLICT",
        status: 409,
        actorId: existingUser.id,
        objectName: "sso_github",
        objectId: existingUser.email,
      });
      return res.redirect(
        buildFrontRedirect(FRONT_LOGIN_PATH, {
          sso: "github",
          status: "error",
          reason: "link_conflict",
        })
      );
    }

    setGitHubSsoContextCookie(res, {
      mode: "login",
      userId: existingUser.id,
      email: existingUser.email,
    });

    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_LOGIN_CONTEXT_READY",
      status: 302,
      actorId: existingUser.id,
      objectName: "sso_github",
      objectId: existingUser.email,
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "github",
        mode: "login",
      })
    );
  } catch (error) {
    console.error("GitHub callback error:", error);
    clearGitHubSsoContextCookie(res);
    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_CALLBACK_OAUTH_FAILED",
      status: 500,
      objectName: "sso_github",
    });
    return res.redirect(
      buildFrontRedirect(FRONT_LOGIN_PATH, {
        sso: "github",
        status: "error",
        reason: "oauth_failed",
      })
    );
  }
};

export async function githubContextController(req: Request, res: Response) {
  try {
    const context = readGitHubSsoContextCookie(req);

    if (!context) {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_CONTEXT_MISSING",
        status: 401,
        objectName: "sso_github",
      });
      return res.status(401).json({ error: "GitHub SSO context is missing or expired." });
    }

    if (context.mode === "complete-registration") {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_CONTEXT_COMPLETE_REG",
        status: 200,
        objectName: "sso_github",
        objectId: context.email,
      });
      return res.status(200).json({
        mode: "complete-registration",
        email: context.email,
        fullName: context.fullName,
        needsFullName: context.needsFullName,
      });
    }

    const result = await loginUserWithGitHubEmail(context.email);

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readLoginJwtData(result.body);

      if (!jwtData) return res.status(500).json({ error: "Invalid login response payload." });

      const token = signAccessToken({
        userId: jwtData.userId,
        email: jwtData.email,
        twoFactorVerified: false,
        authSource: "github",
      });

      setAuthCookie(res, token);
      await logControllerEvent(req, {
        actionBase: "AUTH_SSO_GITHUB_LOGIN",
        status: 200,
        actorId: jwtData.userId,
        objectName: "sso_github",
        objectId: jwtData.email,
      });
      
      return res.status(200).json({ mode: "login", ...result.body });
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_SSO_GITHUB_LOGIN",
      status: result.status,
      objectName: "sso_github",
      objectId: context.email,
      originalObject: result.body,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_CONTEXT_ERROR",
      status: 500,
      objectName: "sso_github",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

export async function githubCompleteRegistrationController(req: Request, res: Response) {
  try {
    const context = readGitHubSsoContextCookie(req);

    if (!context || context.mode !== "complete-registration") {
      await logControllerEvent(req, {
        action: "AUTH_SSO_GITHUB_COMPLETE_REG_CONTEXT_MISSING",
        status: 400,
        objectName: "sso_github",
      });
      return res.status(400).json({ error: "GitHub SSO complete-registration context is missing." });
    }

    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

    const result = await completeGitHubRegistrationService({
      email: context.email,
      githubSubject: context.subject, 
      username,
      phone,
      fullNameFromGitHub: context.fullName,
      fullNameFromForm: fullName,
      needsFullName: context.needsFullName
    });

    if (result.status >= 200 && result.status < 300) {
      const jwtData = readLoginJwtData(result.body);

      if (!jwtData) return res.status(500).json({ error: "Invalid login response payload. "});

      const token = signAccessToken({
        userId: jwtData.userId,
        email: jwtData.email,
        twoFactorVerified: false,
        authSource: "github",
      });

      setAuthCookie(res, token);
      clearGitHubSsoContextCookie(res);
    }

    await logControllerEvent(req, {
      actionBase: "AUTH_SSO_GITHUB_COMPLETE_REG",
      status: result.status,
      actorId: readLoginJwtData(result.body)?.userId ?? null,
      objectName: "sso_github",
      objectId: context.email,
      requestData: { email: context.email, username, phone },
      originalObject: result.status >= 400 ? result.body : undefined,
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    await logControllerEvent(req, {
      action: "AUTH_SSO_GITHUB_COMPLETE_REG_ERROR",
      status: 500,
      objectName: "sso_github",
    });
    return res.status(500).json({ error: getErrorMessage(error) });
  }
};

