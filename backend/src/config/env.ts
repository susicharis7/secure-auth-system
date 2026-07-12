import dotenv from 'dotenv';
import path from 'path';
import { 
    InfobipConfig, 
    SmtpConfig, 
    JwtConfig, 
    AuthCookieConfig, 
    RefreshCookieConfig,
    RefreshJwtConfig, 
    CaptchaPolicyConfig,
    HcaptchaConfig,
    GoogleOAuthConfig,
    GitHubOAuthConfig,
    RateLimitConfig,
    SecurityAlertConfig,
} from './envTypes';
import { parseBoolean, parseSameSite, readPositiveIntEnv } from './envHelpers';

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    db: {
        host: process.env.DB_HOST || "",
        port: Number(process.env.DB_PORT || 3306),
        name: process.env.DB_NAME || "",
        user: process.env.DB_USER || "",
        password: process.env.DB_PASSWORD || "",
    },
};

export function getInfobipConfig(): InfobipConfig {
    const apiKey = process.env.TEXT_MESSAGE_API_KEY;
    const baseUrl = process.env.TEXT_MESSAGE_BASE_URL;
    const rawPath = process.env.INFOBIP_SMS_PATH || '/sms/3/messages';
    const sender = process.env.INFOBIP_SENDER || 'ServiceSMS';

    if (!apiKey) throw new Error("TEXT_MESSAGE_API_KEY is not defined.");
    if (!baseUrl) throw new Error("TEXT_MESSAGE_BASE_URL is not defined.");

    const smsPath = rawPath;

    return {
        apiKey,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        smsPath,
        sender
    };
}

export function getRequestBinUrl(): string {
    const baseURL = process.env.REQUEST_BIN_URL;

    if (!baseURL) {
        throw new Error('REQUEST_BIN_URL is not defined.');
    };

    return baseURL;
};


export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "";

  if (!host) throw new Error("SMTP_HOST is not defined.");
  if (!Number.isFinite(port) || port <= 0) throw new Error("SMTP_PORT is invalid.");
  if (!user) throw new Error("SMTP_USER is not defined.");
  if (!pass) throw new Error("SMTP_PASS is not defined.");
  if (!from) throw new Error("SMTP_FROM is not defined.");

  return {
    host,
    port,
    user,
    pass,
    from,
    secure: port === 465,
  };
};


export function getJwtConfig(): JwtConfig {
    const secret = process.env.JWT_ACCESS_SECRET;
    const expiresIn = process.env.JWT_ACCESS_TTL || "15m";

    if (!secret || secret.trim().length < 32) {
        throw new Error("JWT_ACCESS_SECRET is missing or too short (32 chars min)");
    }

    return {
        secret,
        expiresIn,
    }
};

export function getRefreshJwtConfig(): RefreshJwtConfig {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_TTL || "7d";

  if (!secret || secret.trim().length < 32) {
    throw new Error("JWT_REFRESH_SECRET is missing or too short (32 chars min)");
  }

  return {
    secret,
    expiresIn,
  };
}

export function getAuthCookieConfig(): AuthCookieConfig {
    const name = process.env.AUTH_COOKIE_NAME || "auth_access";
    const secure = parseBoolean(process.env.AUTH_COOKIE_SECURE, false);
    const sameSite = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);

    return {
        name,
        secure,
        sameSite
    }
};

export function getRefreshCookieConfig(): RefreshCookieConfig {
  const name = process.env.REFRESH_COOKIE_NAME || "auth_refresh";
  const secure = parseBoolean(process.env.REFRESH_COOKIE_SECURE, false);
  const sameSite = parseSameSite(process.env.REFRESH_COOKIE_SAMESITE);

  return { name, secure, sameSite };
};


export function getCaptchaPolicyConfig(): CaptchaPolicyConfig {
  const loginMaxFailedAttempts = Number(process.env.CAPTCHA_LOGIN_MAX_FAILED_ATTEMPTS || 3);
  const passwordResetMaxFailedAttempts = Number(process.env.CAPTCHA_PASSWORD_RESET_MAX_FAILED_ATTEMPTS || 2);
  const passwordResetWindowMinutes = Number(process.env.CAPTCHA_PASSWORD_RESET_WINDOW_MINUTES || 10);

  if (!Number.isInteger(loginMaxFailedAttempts) || loginMaxFailedAttempts < 1) {
    throw new Error("CAPTCHA_LOGIN_MAX_FAILED_ATTEMPTS must be a positive integer.");
  }

  if (!Number.isInteger(passwordResetMaxFailedAttempts) || passwordResetMaxFailedAttempts < 1) {
    throw new Error("CAPTCHA_PASSWORD_RESET_MAX_FAILED_ATTEMPTS must be a positive integer.");
  }

  if (!Number.isInteger(passwordResetWindowMinutes) || passwordResetWindowMinutes < 1) {
    throw new Error("CAPTCHA_PASSWORD_RESET_WINDOW_MINUTES must be a positive integer.");
  }

  return {
    loginMaxFailedAttempts,
    passwordResetMaxFailedAttempts,
    passwordResetWindowMinutes,
  };
};

export function getHCaptchaConfig(): HcaptchaConfig {
  const serverSecret = process.env.HCAPTCHA_SERVER_SECRET;
  const siteKey = process.env.HCAPTCHA_SITE_KEY;

  if (!serverSecret || !serverSecret.trim()) {
    throw new Error("HCAPTCHA_SERVER_SECRET is not defined.");
  }

  if (!siteKey || !siteKey.trim()) {
    throw new Error("HCAPTCHA_SITE_KEY is not defined.");
  }

  return {
    serverSecret: serverSecret.trim(),
    siteKey: siteKey.trim(),
  };
};

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not defined.");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is not defined.");
  }

  if (!redirectUri) {
    throw new Error("GOOGLE_REDIRECT_URI is not defined.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri
  }
};

export function getGitHubOAuthConfig(): GitHubOAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GITHUB_REDIRECT_URI?.trim();

  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not defined.");

  if (!clientSecret) throw new Error("GITHUB_CLIENT_SECRET is not defined.");

  if (!redirectUri) throw new Error("GITHUB_REDIRECT_URI is not defined.");

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
};

export function getRateLimitConfig(): RateLimitConfig {
  return {
    globalApi: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_GLOBAL_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_GLOBAL_LIMIT", 100),
    },
    login: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_LOGIN_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_LOGIN_LIMIT", 10),
    },
    refresh: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_REFRESH_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_REFRESH_LIMIT", 30),
    },
    passwordResetRequest: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_PASSWORD_RESET_REQUEST_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_PASSWORD_RESET_REQUEST_LIMIT", 10),
    },
    passwordResetConfirm: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_PASSWORD_RESET_CONFIRM_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_PASSWORD_RESET_CONFIRM_LIMIT", 10),
    },
    twoFactorVerify: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_2FA_VERIFY_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_2FA_VERIFY_LIMIT", 20),
    },
    sso: {
      windowMs: readPositiveIntEnv("RATE_LIMIT_SSO_WINDOW_MS", 60_000),
      limit: readPositiveIntEnv("RATE_LIMIT_SSO_LIMIT", 20),
    },
  };
};

export function getSecurityAlertConfig(): SecurityAlertConfig {
  return {
    enabled: parseBoolean(process.env.SECURITY_ALERTS_ENABLED, true),
    credentialStuffingThreshold: readPositiveIntEnv("ALERT_CREDENTIAL_STUFFING_THRESHOLD", 5),
    credentialStuffingWindowMinutes: readPositiveIntEnv("ALERT_CREDENTIAL_STUFFING_WINDOW_MINUTES", 1),
    bruteForceThreshold: readPositiveIntEnv("ALERT_BRUTE_FORCE_THRESHOLD", 10),
    bruteForceWindowMinutes: readPositiveIntEnv("ALERT_BRUTE_FORCE_WINDOW_MINUTES", 1),
    coordinatedAbuseThreshold: readPositiveIntEnv("ALERT_COORDINATED_ABUSE_THRESHOLD", 20),
    coordinatedAbuseWindowMinutes: readPositiveIntEnv("ALERT_COORDINATED_ABUSE_WINDOW_MINUTES", 5),
    privilegeEscalationThreshold: readPositiveIntEnv("ALERT_PRIVILEGE_ESCALATION_THRESHOLD", 3),
    privilegeEscalationWindowMinutes: readPositiveIntEnv("ALERT_PRIVILEGE_ESCALATION_WINDOW_MINUTES", 5),
    cooldownMinutes: readPositiveIntEnv("ALERT_COOLDOWN_MINUTES", 5),
  };
};