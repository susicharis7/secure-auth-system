import { NextFunction, Request, Response } from "express";
import { validateInternationalMobilePhone } from "../../utils/phone";
import { validateEmailTld } from "../../utils/email";
import { hasMxRecords } from "../../utils/mx";
import { validateDisposableEmail } from "../../utils/disposableEmail";
import { isReservedUsername } from "./userRepository";
import { parseCaptchaToken, parseTrustDeviceFlag } from "./userHelpers";

const usernameRegex = /^[A-Za-z0-9]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordComplexRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const htmlTagRegex = /<\s*\/?\s*[a-z][^>]*>/i;
const encodedHtmlTagRegex = /&lt;\s*\/?\s*[a-z][^&]*&gt;/i;
const twoFactorCodeRegex = /^\d{6}$/;


export async function validateRegisterInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  // Full Name
  if (!fullName) return res.status(400).json({ error: "Full name is required." });

  if (fullName.length < 3 || fullName.length > 100) {
    return res.status(400).json({ error: "Full name must be between 3 and 100 characters." });
  };

  if (
    htmlTagRegex.test(fullName) ||
    encodedHtmlTagRegex.test(fullName) ||
    fullName.includes("<") ||
    fullName.includes(">")
  ) {
    return res
      .status(400)
      .json({ error: "Full name must not contain script or HTML tags." });
  };



  // Username
  if (!username) return res.status(400).json({ error: "Username is required." });

  if (username.length <= 3) {
    return res.status(400).json({ error: "Username must be longer than 3 characters." });
  };

  if (!usernameRegex.test(username)) {
    return res
      .status(400)
      .json({ error: "Username must be alphanumeric (no spaces/special chars)." });
  };

  try {
    const usernameReserved = await isReservedUsername(username);

    if (usernameReserved) {
      return res.status(400).json({ error: "Username is reserved. "});
    }
  } catch {
    return res.status(500).json({ error: "Failed to validate reserved username."});
  }

  // Password
  if (!password) return res.status(400).json({ error: "Password is required." });

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  };

  if (!passwordComplexRegex.test(password)) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number and special character.",
    });
  };


  /* Email */
  if (!email) return res.status(400).json({ error: "Email is required." });

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  };
  
    // TLD
  const emailTldResult = validateEmailTld(email);

  if (!emailTldResult.isValid) {
    return res.status(400).json({ error: emailTldResult.error });
  };

   // MX 
  const domain = email.split("@")[1];
  if (!domain) {
    return res.status(400).json({ error: "Invalid email domain. "});
  }

  const hasMx = await hasMxRecords(domain);
  if (!hasMx) {
    return res.status(400).json({
      error: "Email domain has no valid MX records."
    })
  };

   // Disposable Check
  const disposableResult = validateDisposableEmail(email);

  if (!disposableResult.isValid) {
    return res.status(400).json({ error: disposableResult.error });
  }

  // Phone
  const phoneResult = validateInternationalMobilePhone(phone);

  if (!phoneResult.isValid) {
    return res.status(400).json({ error: phoneResult.error });
  }

  req.body = { fullName, username, password, email, phone: phoneResult.normalized };
  return next();
};

export function validateLoginInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!identifier) {
    return res.status(400).json({ error: "Username/Email is required." });
  }

  if (identifier.includes("@")) {
    if (!emailRegex.test(identifier)) return res.status(400).json({ error: "Invalid email format." });
  } else {
    if (!usernameRegex.test(identifier) || identifier.length <= 3) {
      return res.status(400).json({ error: "Invalid username format." });
    }
  };


  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  };

  const captchaToken = parseCaptchaToken(body as Record<string, unknown>);

  req.body = { identifier, password, captchaToken };
  return next();
};

// Reset Password
export function validatePasswordResetRequestInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const captchaToken = parseCaptchaToken(body as Record<string, unknown>);

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  req.body = { email, captchaToken };
  return next();
}

export function validatePasswordResetConfirmInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token) {
    return res.status(400).json({ error: "Reset token is required." });
  }

  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: "Reset token format is invalid." });
  }

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  if (!passwordComplexRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number and special character.",
    });
  }

  req.body = { token, newPassword };
  return next();
}

export function validateChangePasswordInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return res.status(400).json({ error: "Current password is required." });
  }

  if (!newPassword) {
    return res.status(400).json({ error: "New password is required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  if (!passwordComplexRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Password must include uppercase, lowercase, number and special character.",
    });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({ error: "New password must be different from current password." });
  }

  req.body = { currentPassword, newPassword };
  return next();
}

// SMS & EMAIL 2FA
export function validateTwoFactorInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const trustDevice = parseTrustDeviceFlag(body.trustDevice);

  if (!twoFactorCodeRegex.test(code)) {
    return res.status(400).json({ error: "Code must contain exactly 6 digits." });
  }

  req.body = { code, trustDevice };
  return next();
}

// Recovery Codes
export function validateRecoveryCodeInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  const recoveryCode = typeof body.recoveryCode === "string" ? body.recoveryCode.trim() : "";

  if (!recoveryCode) {
    return res.status(400).json({ error: "Recovery code is required." });
  }

  const compact = recoveryCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const compactRegex = /^[A-Z0-9]{8}$/;

  if (!compactRegex.test(compact)) {
    return res.status(400).json({ error: "Recovery code format is invalid (XXXXXXXX or XXX-XXXXX)." });
  }

  const normalized = `${compact.slice(0, 3)}-${compact.slice(3)}`;
  req.body = { recoveryCode: normalized };
  return next();
}

// TOTP
export function validateTotpVerifyInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  const totp_token = typeof body.totp_token === "string" ? body.totp_token.trim() : "";
  const trustDevice = parseTrustDeviceFlag(body.trustDevice);

  if (!/^\d{6}$/.test(totp_token)) {
    return res.status(400).json({ error: "Token must contain exactly 6 digits." });
  }

  req.body = { totp_token, trustDevice };
  return next();
}

// Disable 2FA (All 3)
export function validateDisableTwoFactorInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  const method = typeof body.method === "string" ? body.method.trim().toLowerCase() : "";

  if (!["sms", "email", "totp"].includes(method)) {
    return res.status(400).json({ error: "Method must be one of: sms, email, totp." });
  }

  req.body = { method };
  return next();
}

// SSO complete-registration input 
export async function validateSsoCompleteRegistrationInput(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const username = typeof body.username === "string" ? body.username.trim(): "";
  const phone = typeof body.phone === "string" ? body.phone.trim(): "";

  if (fullName) {
    if (fullName.length < 3 || fullName.length > 100) {
      return res.status(400).json({ error: "Full name must be between 3 and 100 characters."});
    }

    if (
      htmlTagRegex.test(fullName) || 
      encodedHtmlTagRegex.test(fullName) || 
      fullName.includes("<") || 
      fullName.includes(">")
    ) {
      return res.status(400).json({ error: "Full name must not contain script or HTML tags."});
    }
  }

  if (!username) {
    return res.status(400).json({ error: "Username is required."});
  }

  if (username.length <= 3) {
    return res.status(400).json({ error: "Username must be longer than 3 characters."});
  }

  if (!usernameRegex.test(username)) {
    return res
      .status(400)
      .json({ error: "Username must be alphanumeric (no spaces/special chars)." });
  }

  try {
    const usernameReserved = await isReservedUsername(username);

    if (usernameReserved) {
      return res.status(400).json({ error: 'Username is reserved.'});
    }
  } catch {
    return res.status(500).json({ error: 'Failed to validate reserved username.'});
  }

  const phoneResult = validateInternationalMobilePhone(phone);
  if (!phoneResult.isValid) {
    return res.status(400).json({ error: phoneResult.error });
  }

  req.body = {
    fullName,
    username,
    phone: phoneResult.normalized
  };

  return next();
}

export async function validateGoogleCompleteRegistrationInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return validateSsoCompleteRegistrationInput(req, res, next);
}

export async function validateGitHubCompleteRegistrationInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return validateSsoCompleteRegistrationInput(req, res, next);
}
