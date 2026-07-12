export type InfobipConfig = {
    apiKey: string;
    baseUrl: string;
    smsPath: string;
    sender: string;
};

export type SmtpConfig = {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    secure: boolean;
};

export type HcaptchaConfig = {
  serverSecret: string;
  siteKey: string;
};

export type CaptchaAction = "LOGIN" | "PASSWORD_RESET";

export type CaptchaPolicyConfig = {
    loginMaxFailedAttempts: number;
    passwordResetMaxFailedAttempts: number;
    passwordResetWindowMinutes: number; 
};

export type JwtConfig = {
    secret: string; 
    expiresIn: string; 
};

export type AuthCookieSameSite = "lax" | "strict" | "none";

export type AuthCookieConfig = {
    name: string; 
    secure: boolean;
    sameSite: AuthCookieSameSite;
};

export type RefreshCookieConfig = {
    name: string;
    secure: boolean;
    sameSite: AuthCookieSameSite;
}

export type RefreshJwtConfig = {
  secret: string;
  expiresIn: string;
};

export type GoogleOAuthConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
};

export type GitHubOAuthConfig = {
    clientId: string;
    clientSecret: string;
    redirectUri: string; 
};

/* Rate Limiter */
export type RateLimitProfileConfig = {
  windowMs: number;
  limit: number;
};

export type RateLimitConfig = {
  globalApi: RateLimitProfileConfig;
  login: RateLimitProfileConfig;
  refresh: RateLimitProfileConfig;
  passwordResetRequest: RateLimitProfileConfig;
  passwordResetConfirm: RateLimitProfileConfig;
  twoFactorVerify: RateLimitProfileConfig;
  sso: RateLimitProfileConfig;
};

export type SecurityAlertConfig = {
  enabled: boolean;
  credentialStuffingThreshold: number;
  credentialStuffingWindowMinutes: number;
  bruteForceThreshold: number;
  bruteForceWindowMinutes: number;
  coordinatedAbuseThreshold: number;
  coordinatedAbuseWindowMinutes: number;
  privilegeEscalationThreshold: number;
  privilegeEscalationWindowMinutes: number;
  cooldownMinutes: number;
};