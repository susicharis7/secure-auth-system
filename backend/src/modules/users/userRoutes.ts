import { Router } from "express";
import { 
    loginController, 
    logoutController,
    registerController, 
    verifySmsTwoFactorCodeController,
    setupTotpTwoFactorController,
    verifyTotpTwoFactorController,
    verifyEmailController,
    sendEmailTwoFactorCodeController,
    verifyEmailTwoFactorCodeController,
    sendSmsTwoFactorCodeController,
    setupRecoveryCodesController,
    verifyWithRecoveryCodeController,
    getRecoveryCodeStatusController,
    disableTwoFactorMethodController,
    refreshController,
    googleLoginController,
    googleCallbackController,
    googleContextController,
    googleCompleteRegistrationController,
    githubLoginController,
    githubCallbackController,
    githubContextController,
    githubCompleteRegistrationController,
    listTrustedDevicesController,
    revokeTrustedDeviceController,
    listActiveSessionsController,
    revokeActiveSessionController,
    requestPasswordResetController,
    validatePasswordResetTokenController,
    confirmPasswordResetController,
    changePasswordController,
} from "./userController";
import { 
    validateLoginInput, 
    validateRegisterInput, 
    validateTwoFactorInput,
    validateTotpVerifyInput,
    validateRecoveryCodeInput,
    validateDisableTwoFactorInput,
    validateSsoCompleteRegistrationInput,
    validatePasswordResetRequestInput,
    validatePasswordResetConfirmInput,
    validateChangePasswordInput,
} from "./userValidation";

import {
  loginLimiter,
  refreshLimiter,
  passwordResetRequestLimiter,
  passwordResetConfirmLimiter,
  twoFactorVerifyLimiter,
  ssoLimiter,
} from "../../middlewares/rateLimiters";

import { 
  requireAuth, 
  requireVerifiedActiveUser, 
  requireTwoFactorVerified 
} from "../../middlewares/authMiddleware";

export const authRouter = Router();

// Register + Login Flow
authRouter.post("/register", validateRegisterInput, registerController);
authRouter.post("/login", loginLimiter, validateLoginInput, loginController);
authRouter.post("/logout", logoutController);
authRouter.post("/auth/refresh", refreshLimiter, refreshController);
authRouter.get("/auth/verify-email", verifyEmailController);

// Password Recovery
authRouter.post(
  "/auth/password-reset/request",
  passwordResetRequestLimiter,
  validatePasswordResetRequestInput,
  requestPasswordResetController
);

authRouter.get(
  "/auth/password-reset/validate",
  validatePasswordResetTokenController
);

authRouter.post(
  "/auth/password-reset/confirm",
  passwordResetConfirmLimiter,
  validatePasswordResetConfirmInput,
  confirmPasswordResetController
);

// Change Password (authenticated)
authRouter.post(
  "/auth/password/change",
  requireAuth,
  requireVerifiedActiveUser,
  requireTwoFactorVerified,
  validateChangePasswordInput,
  changePasswordController
);

// Google SSO
authRouter.get("/auth/google/login", ssoLimiter, googleLoginController);
authRouter.get("/auth/google/callback", ssoLimiter, googleCallbackController);
authRouter.get("/auth/google/context", googleContextController);
authRouter.post(
  "/auth/google/complete-registration",
  validateSsoCompleteRegistrationInput,
  googleCompleteRegistrationController
);

// GitHub SSO
authRouter.get("/auth/github/login", ssoLimiter, githubLoginController);
authRouter.get("/auth/github/callback", ssoLimiter, githubCallbackController);
authRouter.get("/auth/github/context", githubContextController);
authRouter.post(
    "/auth/github/complete-registration",
    validateSsoCompleteRegistrationInput,
    githubCompleteRegistrationController,
);

// Recovery codes
authRouter.post("/auth/2fa/recovery/setup", requireAuth, requireVerifiedActiveUser, requireTwoFactorVerified, setupRecoveryCodesController);
authRouter.post("/auth/2fa/verify-recovery", twoFactorVerifyLimiter, requireAuth, requireVerifiedActiveUser, validateRecoveryCodeInput, verifyWithRecoveryCodeController);
authRouter.get("/auth/2fa/recovery/status", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, getRecoveryCodeStatusController);

// Trusted Device
authRouter.get("/auth/trusted-devices", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, listTrustedDevicesController);
authRouter.delete("/auth/trusted-devices/:id", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, revokeTrustedDeviceController);

// Sessions
authRouter.get("/auth/sessions", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, listActiveSessionsController);
authRouter.delete("/auth/sessions/:jti", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, revokeActiveSessionController);


// Disable 2FA
authRouter.post("/auth/2fa/disable", requireAuth, requireTwoFactorVerified, requireVerifiedActiveUser, validateDisableTwoFactorInput, disableTwoFactorMethodController);

// 2FA - TOTP
authRouter.post("/auth/2fa/totp/setup", requireAuth, requireVerifiedActiveUser, setupTotpTwoFactorController);
authRouter.post("/auth/2fa/totp/verify", twoFactorVerifyLimiter, requireAuth, requireVerifiedActiveUser, validateTotpVerifyInput, verifyTotpTwoFactorController);

// 2FA - EMAIL
authRouter.post("/auth/2fa/email/send", requireAuth, requireVerifiedActiveUser, sendEmailTwoFactorCodeController);
authRouter.post("/auth/2fa/email/verify", twoFactorVerifyLimiter, requireAuth, requireVerifiedActiveUser, validateTwoFactorInput, verifyEmailTwoFactorCodeController);

// 2FA - SMS
authRouter.post("/auth/2fa/sms/send", requireAuth, requireVerifiedActiveUser, sendSmsTwoFactorCodeController);
authRouter.post("/auth/2fa/sms/verify", twoFactorVerifyLimiter, requireAuth, requireVerifiedActiveUser, validateTwoFactorInput, verifySmsTwoFactorCodeController);




