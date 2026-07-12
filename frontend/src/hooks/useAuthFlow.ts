import { useEffect, useMemo, useState } from "react";
import * as authService from "../services/authService";
import type {
  ApiResult,
  ChangePasswordInput,
  AuthLoading,
  AuthResultKey,
  AuthResults,
  AuthStep,
  DemoUser,
  LoginInput,
  MfaMethod,
  PasswordResetConfirmInput,
  RegisterInput,
  SsoCompleteContext,
  SsoProvider,
  ActiveSession,
  TrustedDevice,
} from "../types/auth";
import {
  extractToken,
  nextStepToMethod,
  readBooleanField,
  readMfaMethods,
  readStringField,
  readUserFromResponse,
  readUserObject,
  toErrorResult,
} from "../utils/authParsers";
import { pushApiToast } from "../utils/toast";

const LOCAL_USER_KEY = "auth_demo_user";
const LOCAL_ENABLED_METHODS_KEY = "auth_enabled_methods";
const LOCAL_VERIFY_METHODS_KEY = "auth_verify_methods";
const LOCAL_TWO_FACTOR_MODE_KEY = "auth_two_factor_mode";
const LOCAL_TRUST_DEVICE_ELIGIBLE_KEY = "auth_trust_device_eligible";

type TwoFactorMode = "setup" | "verify";
const ALL_MFA_METHODS: MfaMethod[] = ["sms", "email", "totp"];
const AUTH_TOAST_TITLES: Partial<Record<AuthResultKey, string>> = {
  register: "Registration",
  verifyEmail: "Email verification",
  login: "Login",
  passwordResetRequest: "Password reset",
  passwordResetValidate: "Reset link",
  passwordResetConfirm: "Password reset",
  changePassword: "Password change",
  googleLogin: "Google SSO",
  googleContext: "Google SSO",
  googleCompleteRegistration: "Google profile",
  githubLogin: "GitHub SSO",
  githubContext: "GitHub SSO",
  githubCompleteRegistration: "GitHub profile",
  smsSend: "SMS code",
  smsVerify: "SMS verification",
  emailSend: "Email code",
  emailVerify: "Email verification",
  totpSetup: "TOTP setup",
  totpVerify: "TOTP verification",
  disable2fa: "2FA settings",
  recoverySetup: "Recovery codes",
  recoveryVerify: "Recovery code",
  recoveryStatus: "Recovery status",
  trustedDevicesList: "Trusted devices",
  trustedDeviceRevoke: "Trusted device",
  sessionsList: "Active sessions",
  sessionRevoke: "Session revoked",
  logout: "Logout",
};
const AUTH_SILENT_SUCCESS_KEYS = new Set<AuthResultKey>([
  "sessionProbe",
  "trustedDevicesList",
  "sessionsList",
  "recoveryStatus",
]);
type StartupRouteIntent =
  | { step: "forgot-password" }
  | { step: "reset-password"; token: string };

function readUserFromStorage(): DemoUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DemoUser>;
    if (!parsed || typeof parsed.id !== "number") return null;
    if (parsed.role !== "admin" && parsed.role !== "user") return null;
    if (typeof parsed.fullName !== "string") return null;
    if (typeof parsed.email !== "string") return null;
    if (typeof parsed.username !== "string") return null;
    if (typeof parsed.phone !== "string") return null;
    return {
      id: parsed.id,
      role: parsed.role,
      fullName: parsed.fullName,
      email: parsed.email,
      username: parsed.username,
      phone: parsed.phone,
    };
  } catch {
    return null;
  }
}

function persistUser(user: DemoUser | null): void {
  if (!user) {
    localStorage.removeItem(LOCAL_USER_KEY);
    return;
  }
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
}

function readMethodsFromStorage(key: string): MfaMethod[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is MfaMethod => item === "sms" || item === "email" || item === "totp");
  } catch {
    return [];
  }
}

function persistMethods(key: string, methods: MfaMethod[]): void {
  if (methods.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(methods));
}

function readTwoFactorModeFromStorage(): TwoFactorMode | null {
  const value = localStorage.getItem(LOCAL_TWO_FACTOR_MODE_KEY);
  if (value === "setup" || value === "verify") return value;
  return null;
}

function persistTwoFactorMode(mode: TwoFactorMode | null): void {
  if (!mode) {
    localStorage.removeItem(LOCAL_TWO_FACTOR_MODE_KEY);
    return;
  }
  localStorage.setItem(LOCAL_TWO_FACTOR_MODE_KEY, mode);
}

function readTrustDeviceEligibleFromStorage(): boolean {
  return localStorage.getItem(LOCAL_TRUST_DEVICE_ELIGIBLE_KEY) === "1";
}

function persistTrustDeviceEligible(value: boolean): void {
  if (!value) {
    localStorage.removeItem(LOCAL_TRUST_DEVICE_ELIGIBLE_KEY);
    return;
  }

  localStorage.setItem(LOCAL_TRUST_DEVICE_ELIGIBLE_KEY, "1");
}

function parseTrustedDevicesFromBody(body: unknown): TrustedDevice[] {
  if (!body || typeof body !== "object") return [];

  const rawDevices = (body as Record<string, unknown>).devices;
  if (!Array.isArray(rawDevices)) return [];

  return rawDevices
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const id = typeof row.id === "number" ? row.id : Number(row.id);
      if (!Number.isInteger(id) || id <= 0) return null;

      const createdAt = typeof row.createdAt === "string" ? row.createdAt : "";
      const expiresAt = typeof row.expiresAt === "string" ? row.expiresAt : "";
      if (!createdAt || !expiresAt) return null;

      return {
        id,
        userAgent: typeof row.userAgent === "string" ? row.userAgent : null,
        ip: typeof row.ip === "string" ? row.ip : null,
        createdAt,
        lastUsedAt: typeof row.lastUsedAt === "string" ? row.lastUsedAt : null,
        expiresAt,
      } satisfies TrustedDevice;
    })
    .filter((item): item is TrustedDevice => item !== null);
}

function parseActiveSessionsFromBody(body: unknown): ActiveSession[] {
  if (!body || typeof body !== "object") return [];

  const rawSessions = (body as Record<string, unknown>).sessions;
  if (!Array.isArray(rawSessions)) return [];

  return rawSessions
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;
      const jti = typeof row.jti === "string" ? row.jti : "";
      if (!/^[a-fA-F0-9]{64}$/.test(jti)) return null;

      const issuedAt = typeof row.issuedAt === "string" ? row.issuedAt : "";
      const expiresAt = typeof row.expiresAt === "string" ? row.expiresAt : "";
      if (!issuedAt || !expiresAt) return null;

      return {
        jti,
        userAgent: typeof row.userAgent === "string" ? row.userAgent : null,
        ip: typeof row.ip === "string" ? row.ip : null,
        issuedAt,
        expiresAt,
        isTrustedSession: row.isTrustedSession === true,
        trustedUntil: typeof row.trustedUntil === "string" ? row.trustedUntil : null,
        trustedDeviceId:
          typeof row.trustedDeviceId === "number" && Number.isInteger(row.trustedDeviceId)
            ? row.trustedDeviceId
            : null,
        isCurrent: row.isCurrent === true,
      } satisfies ActiveSession;
    })
    .filter((item): item is ActiveSession => item !== null);
}

function readSsoRedirectParams(): { provider: SsoProvider; status: string | null; reason: string } | null {
  const params = new URLSearchParams(window.location.search);
  const rawProvider = params.get("sso");

  if (rawProvider !== "google" && rawProvider !== "github") {
    return null;
  }

  return {
    provider: rawProvider,
    status: params.get("status"),
    reason: params.get("reason") ?? "unknown_error",
  };
}

function clearLocationQueryString(): void {
  const cleanPath = window.location.pathname;
  window.history.replaceState({}, "", cleanPath);
}

function getSsoLabel(provider: SsoProvider): string {
  return provider === "google" ? "Google" : "GitHub";
}

function getSsoResultKeys(provider: SsoProvider): {
  login: AuthResultKey;
  context: AuthResultKey;
  complete: AuthResultKey;
} {
  if (provider === "google") {
    return {
      login: "googleLogin",
      context: "googleContext",
      complete: "googleCompleteRegistration",
    };
  }

  return {
    login: "githubLogin",
    context: "githubContext",
    complete: "githubCompleteRegistration",
  };
}

function readStartupRouteIntent(): StartupRouteIntent | null {
  const path = window.location.pathname.toLowerCase();

  if (path.endsWith("/forgot-password") || path.includes("/forgot-password")) {
    return { step: "forgot-password" };
  }

  if (path.endsWith("/reset-password") || path.includes("/reset-password")) {
    const token = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    return { step: "reset-password", token };
  }

  return null;
}

export function useAuthFlow() {
  const [step, setStep] = useState<AuthStep>("loading");
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ssoCompleteContext, setSsoCompleteContext] = useState<SsoCompleteContext | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [passwordResetEmail, setPasswordResetEmail] = useState("");
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<MfaMethod[]>(ALL_MFA_METHODS);
  const [enabledMethods, setEnabledMethods] = useState<MfaMethod[]>(readMethodsFromStorage(LOCAL_ENABLED_METHODS_KEY));
  const [verifyMethods, setVerifyMethods] = useState<MfaMethod[]>(readMethodsFromStorage(LOCAL_VERIFY_METHODS_KEY));
  const [totpQrDataUrl, setTotpQrDataUrl] = useState("");
  const [trustDeviceEligible, setTrustDeviceEligible] = useState<boolean>(readTrustDeviceEligibleFromStorage());
  const [trustDeviceSelected, setTrustDeviceSelected] = useState(false);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [results, setResults] = useState<AuthResults>({});
  const [loading, setLoading] = useState<AuthLoading>({});

  function setResult(key: AuthResultKey, result: ApiResult) {
    setResults((current) => ({ ...current, [key]: result }));

    const title = AUTH_TOAST_TITLES[key];
    const ok = result.status >= 200 && result.status < 300;
    if (title && (!ok || !AUTH_SILENT_SUCCESS_KEYS.has(key))) {
      pushApiToast(title, result);
    }
  }

  function setLoadingFlag(key: AuthResultKey, value: boolean) {
    setLoading((current) => ({ ...current, [key]: value }));
  }

  function applyUser(nextUser: DemoUser | null) {
    setUser(nextUser);
    persistUser(nextUser);
  }

  function applyEnabledMethods(methods: MfaMethod[]) {
    setEnabledMethods(methods);
    persistMethods(LOCAL_ENABLED_METHODS_KEY, methods);
  }

  function applyVerifyMethods(methods: MfaMethod[]) {
    setVerifyMethods(methods);
    persistMethods(LOCAL_VERIFY_METHODS_KEY, methods);
  }

  function applyTrustDeviceEligible(value: boolean) {
    setTrustDeviceEligible(value);
    persistTrustDeviceEligible(value);

    if (!value) {
      setTrustDeviceSelected(false);
    }
  }

  function setStepRegister() {
    applyTrustDeviceEligible(false);
    setTrustedDevices([]);
    setActiveSessions([]);
    setPasswordResetToken("");
    setStep("register");
  }

  function setStepLogin() {
    setSsoCompleteContext(null);
    applyTrustDeviceEligible(false);
    setTrustedDevices([]);
    setActiveSessions([]);
    setPasswordResetToken("");
    setStep("login");
  }

  function setStepForgotPassword(prefillEmail?: string) {
    setSsoCompleteContext(null);
    applyTrustDeviceEligible(false);
    setTrustedDevices([]);
    setActiveSessions([]);
    setPasswordResetEmail(prefillEmail?.trim().toLowerCase() ?? "");
    setPasswordResetToken("");
    setStep("forgot-password");
  }

  function setStepResetPassword(tokenOrLink?: string) {
    const token = tokenOrLink ? extractToken(tokenOrLink).trim() : "";
    setPasswordResetToken(token);
    setStep("reset-password");
  }

  function makeClientResult(status: number, body: unknown): ApiResult {
    return {
      status,
      body,
      receivedAt: new Date().toLocaleString(),
    };
  }

  function applyPrimaryAuthResult(result: ApiResult, fallbackIdentifier: string, source: "credential" | "sso") {
    if (result.status < 200 || result.status >= 300) return;

    const resolvedUser = readUserFromResponse(result.body, fallbackIdentifier);
    if (resolvedUser) {
      applyUser(resolvedUser);
    }

    const setupRequired = readBooleanField(result.body, "mfaSetupRequired");
    const nextStep = readStringField(result.body, "nextStep");
    const nextMethod = nextStepToMethod(nextStep);
    const setupMethods = readMfaMethods(result.body, "availableMethods");
    const parsedEnabledMethods = readMfaMethods(result.body, "enabledMethods");
    const resolvedEnabledMethods =
      parsedEnabledMethods.length > 0
        ? parsedEnabledMethods
        : readMfaMethods(result.body, "availableVerifyMethods");

    if (nextMethod) {
      setSelectedMethod(nextMethod);
    }

    if (setupRequired) {
      setAvailableMethods(setupMethods.length > 0 ? setupMethods : ALL_MFA_METHODS);
      applyEnabledMethods([]);
      applyVerifyMethods([]);
      applyTrustDeviceEligible(source === "credential");
      persistTwoFactorMode("setup");
      setStep("setup-2fa");
      setTotpQrDataUrl("");
      return;
    }

    if (nextStep?.includes("/api/auth/2fa/")) {
      const resolvedVerifyMethods =
        resolvedEnabledMethods.length > 0
          ? resolvedEnabledMethods
          : nextMethod
            ? [nextMethod]
            : ALL_MFA_METHODS;
      setAvailableMethods(ALL_MFA_METHODS);
      applyEnabledMethods(resolvedVerifyMethods);
      applyVerifyMethods(resolvedVerifyMethods);
      applyTrustDeviceEligible(source === "credential");
      persistTwoFactorMode("verify");
      if (!nextMethod && resolvedVerifyMethods.length > 0) {
        setSelectedMethod(resolvedVerifyMethods[0]);
      }
      setStep("verify-2fa");
      setTotpQrDataUrl("");
      return;
    }

    persistTwoFactorMode(null);
    applyTrustDeviceEligible(false);
    setStep("dashboard");
  }

  function handleUnauthorized(result: ApiResult): boolean {
    if (result.status !== 401) return false;

    applyUser(null);
    applyEnabledMethods([]);
    applyVerifyMethods([]);
    setSsoCompleteContext(null);
    persistTwoFactorMode(null);
    setTotpQrDataUrl("");
    setRecoveryCodes([]);
    setTrustedDevices([]);
    setActiveSessions([]);
    setSelectedMethod(null);
    applyTrustDeviceEligible(false);
    setPasswordResetToken("");
    setAvailableMethods(ALL_MFA_METHODS);
    setStep("login");

    return true;
  }

  async function resolveSsoContext(provider: SsoProvider) {
    const keys = getSsoResultKeys(provider);
    const providerLabel = getSsoLabel(provider);

    setLoadingFlag(keys.context, true);
    try {
      const result =
        provider === "google"
          ? await authService.getGoogleSsoContext()
          : await authService.getGitHubSsoContext();

      setResult(keys.context, result);

      if (result.status < 200 || result.status >= 300) {
        setSsoCompleteContext(null);
        applyTrustDeviceEligible(false);
        setStep("login");
        return;
      }

      const mode = readStringField(result.body, "mode");

      if (mode === "complete-registration") {
        const email = readStringField(result.body, "email") ?? "";
        const fullName = readStringField(result.body, "fullName") ?? "";
        const needsFullName = readBooleanField(result.body, "needsFullName");

        if (!email) {
          setSsoCompleteContext(null);
          applyTrustDeviceEligible(false);
          setResult(
            keys.context,
            makeClientResult(500, { error: `${providerLabel} SSO context email is missing.` })
          );
          setStep("login");
          return;
        }

        setSsoCompleteContext({
          provider,
          email,
          fullName,
          needsFullName,
        });
        setStep("sso-complete-profile");
        return;
      }

      if (mode === "login") {
        setSsoCompleteContext(null);
        const fallbackEmail = readStringField(result.body, "email") ?? provider;
        applyPrimaryAuthResult(result, fallbackEmail, "sso");
        return;
      }

      setSsoCompleteContext(null);
      applyTrustDeviceEligible(false);
      setResult(
        keys.context,
        makeClientResult(500, { error: `Unsupported ${providerLabel} SSO mode.` })
      );
      setStep("login");
    } catch (error) {
      setSsoCompleteContext(null);
      applyTrustDeviceEligible(false);
      setResult(keys.context, toErrorResult(error));
      setStep("login");
    } finally {
      setLoadingFlag(keys.context, false);
    }
  }

  async function bootstrapSession() {
    setLoadingFlag("sessionProbe", true);
    try {
      const startupRouteIntent = readStartupRouteIntent();
      if (startupRouteIntent) {
        if (startupRouteIntent.step === "forgot-password") {
          setStep("forgot-password");
          return;
        }

        setPasswordResetToken(startupRouteIntent.token);
        setStep("reset-password");
        return;
      }

      const ssoRedirectParams = readSsoRedirectParams();
      if (ssoRedirectParams) {
        clearLocationQueryString();

        const keys = getSsoResultKeys(ssoRedirectParams.provider);
        const providerLabel = getSsoLabel(ssoRedirectParams.provider);

        if (ssoRedirectParams.status === "error") {
          applyUser(null);
          applyEnabledMethods([]);
          applyVerifyMethods([]);
          setSsoCompleteContext(null);
          applyTrustDeviceEligible(false);
          setTrustedDevices([]);
          setActiveSessions([]);
          persistTwoFactorMode(null);
          setResult(
            keys.context,
            makeClientResult(400, { error: `${providerLabel} SSO failed: ${ssoRedirectParams.reason}` })
          );
          setStep("login");
          return;
        }

        await resolveSsoContext(ssoRedirectParams.provider);
        return;
      }

      const probe = await authService.probeSession();
      setResult("sessionProbe", probe);

      if (probe.status === 200) {
        const storedUser = readUserFromStorage();
        const probeUser = readUserObject(probe.body) ?? storedUser;
        applyUser(probeUser);
        applyVerifyMethods([]);
        setSsoCompleteContext(null);
        setTrustedDevices([]);
        setActiveSessions([]);
        applyTrustDeviceEligible(false);
        persistTwoFactorMode(null);
        setStep("dashboard");
        return;
      }

      if (probe.status === 403) {
        const storedUser = readUserFromStorage();
        applyUser(storedUser);
        setSsoCompleteContext(null);
        const mode = readTwoFactorModeFromStorage();
        const storedVerifyMethods = readMethodsFromStorage(LOCAL_VERIFY_METHODS_KEY);
        const storedEnabledMethods = readMethodsFromStorage(LOCAL_ENABLED_METHODS_KEY);
        const trustEligible = readTrustDeviceEligibleFromStorage();
        applyEnabledMethods(storedEnabledMethods);
        applyTrustDeviceEligible(trustEligible);
        setTrustedDevices([]);
        setActiveSessions([]);

        if (mode === "setup") {
          applyVerifyMethods([]);
          setAvailableMethods(ALL_MFA_METHODS);
          setStep("setup-2fa");
          return;
        }

        const resolvedVerifyMethods = storedVerifyMethods.length > 0 ? storedVerifyMethods : storedEnabledMethods;
        applyVerifyMethods(resolvedVerifyMethods);
        if (resolvedVerifyMethods.length > 0) {
          setSelectedMethod(resolvedVerifyMethods[0]);
        }
        setStep("verify-2fa");
        return;
      }

      applyUser(null);
      applyEnabledMethods([]);
      applyVerifyMethods([]);
      setSsoCompleteContext(null);
      applyTrustDeviceEligible(false);
      setTrustedDevices([]);
      setActiveSessions([]);
      persistTwoFactorMode(null);
      setStep("login");
    } catch (error) {
      setResult("sessionProbe", toErrorResult(error));
      applyUser(null);
      setSsoCompleteContext(null);
      applyTrustDeviceEligible(false);
      setTrustedDevices([]);
      setActiveSessions([]);
      setStep("login");
    } finally {
      setLoadingFlag("sessionProbe", false);
    }
  }

  useEffect(() => {
    void bootstrapSession();
  }, []);

  async function startSsoLogin(provider: SsoProvider) {
    const keys = getSsoResultKeys(provider);
    const providerLabel = getSsoLabel(provider);

    setLoadingFlag(keys.login, true);
    try {
      const result =
        provider === "google"
          ? await authService.getGoogleLoginUrl()
          : await authService.getGitHubLoginUrl();

      setResult(keys.login, result);

      const authUrl = readStringField(result.body, "authUrl");
      if (result.status >= 200 && result.status < 300 && authUrl) {
        window.location.assign(authUrl);
        return;
      }

      if (result.status >= 200 && result.status < 300 && !authUrl) {
        setResult(keys.login, makeClientResult(500, { error: `${providerLabel} auth URL is missing.` }));
      }
    } catch (error) {
      setResult(keys.login, toErrorResult(error));
    } finally {
      setLoadingFlag(keys.login, false);
    }
  }

  async function startGoogleLogin() {
    await startSsoLogin("google");
  }

  async function startGitHubLogin() {
    await startSsoLogin("github");
  }

  async function register(input: RegisterInput) {
    setLoadingFlag("register", true);
    try {
      const result = await authService.registerUser(input);
      setResult("register", result);

      if (result.status >= 200 && result.status < 300) {
        setSsoCompleteContext(null);
        setPendingEmail(input.email);
        setStep("verify-email");
      }
    } catch (error) {
      setResult("register", toErrorResult(error));
    } finally {
      setLoadingFlag("register", false);
    }
  }

  async function verifyEmail(tokenOrLink: string) {
    setLoadingFlag("verifyEmail", true);
    try {
      const token = extractToken(tokenOrLink);
      if (!token) {
        setResult("verifyEmail", {
          status: 400,
          body: { error: "Token/link is required." },
          receivedAt: new Date().toLocaleString(),
        });
        return;
      }

      const result = await authService.verifyEmailToken(token);
      setResult("verifyEmail", result);

      if (result.status >= 200 && result.status < 300) {
        setSsoCompleteContext(null);
        setStep("login");
      }
    } catch (error) {
      setResult("verifyEmail", toErrorResult(error));
    } finally {
      setLoadingFlag("verifyEmail", false);
    }
  }

  async function login(input: LoginInput) {
    setLoadingFlag("login", true);
    try {
      const result = await authService.loginUser(input);
      setResult("login", result);
      if (result.status >= 200 && result.status < 300) {
        setSsoCompleteContext(null);
        setTrustedDevices([]);
        setActiveSessions([]);
      }
      applyPrimaryAuthResult(result, input.identifier, "credential");
    } catch (error) {
      setResult("login", toErrorResult(error));
    } finally {
      setLoadingFlag("login", false);
    }
  }

  async function requestPasswordReset(email: string, captchaToken?: string) {
    setLoadingFlag("passwordResetRequest", true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      setPasswordResetEmail(normalizedEmail);
      const result = await authService.requestPasswordReset({
        email: normalizedEmail,
        captchaToken: captchaToken?.trim() || undefined,
      });
      setResult("passwordResetRequest", result);
    } catch (error) {
      setResult("passwordResetRequest", toErrorResult(error));
    } finally {
      setLoadingFlag("passwordResetRequest", false);
    }
  }

  async function validatePasswordResetToken(tokenOrLink: string) {
    setLoadingFlag("passwordResetValidate", true);
    try {
      const token = extractToken(tokenOrLink).trim();

      if (!token) {
        setResult("passwordResetValidate", makeClientResult(400, { error: "Reset token is required." }));
        return;
      }

      setPasswordResetToken(token);
      const result = await authService.validatePasswordResetToken(token);
      setResult("passwordResetValidate", result);
    } catch (error) {
      setResult("passwordResetValidate", toErrorResult(error));
    } finally {
      setLoadingFlag("passwordResetValidate", false);
    }
  }

  async function confirmPasswordReset(input: PasswordResetConfirmInput) {
    setLoadingFlag("passwordResetConfirm", true);
    try {
      const token = extractToken(input.token || passwordResetToken).trim();

      if (!token) {
        setResult("passwordResetConfirm", makeClientResult(400, { error: "Reset token is required." }));
        return;
      }

      setPasswordResetToken(token);
      const result = await authService.confirmPasswordReset({
        token,
        newPassword: input.newPassword,
      });
      setResult("passwordResetConfirm", result);

      if (result.status >= 200 && result.status < 300) {
        applyUser(null);
        applyEnabledMethods([]);
        applyVerifyMethods([]);
        setSsoCompleteContext(null);
        persistTwoFactorMode(null);
        setTotpQrDataUrl("");
        setRecoveryCodes([]);
        setTrustedDevices([]);
        setActiveSessions([]);
        setSelectedMethod(null);
        applyTrustDeviceEligible(false);
        setAvailableMethods(ALL_MFA_METHODS);
        setPasswordResetToken("");
        setStep("login");
      }
    } catch (error) {
      setResult("passwordResetConfirm", toErrorResult(error));
    } finally {
      setLoadingFlag("passwordResetConfirm", false);
    }
  }

  async function completeSsoRegistration(input: {
    fullName?: string;
    username: string;
    phone: string;
  }) {
    if (!ssoCompleteContext) {
      const missingContextResult = makeClientResult(400, { error: "SSO complete-registration context is missing." });
      setResult("googleCompleteRegistration", missingContextResult);
      setResult("githubCompleteRegistration", missingContextResult);
      return;
    }

    const keys = getSsoResultKeys(ssoCompleteContext.provider);

    setLoadingFlag(keys.complete, true);
    try {
      const result =
        ssoCompleteContext.provider === "google"
          ? await authService.completeGoogleRegistration({
              fullName: input.fullName?.trim() || undefined,
              username: input.username.trim(),
              phone: input.phone.trim(),
            })
          : await authService.completeGitHubRegistration({
              fullName: input.fullName?.trim() || undefined,
              username: input.username.trim(),
              phone: input.phone.trim(),
            });

      setResult(keys.complete, result);

      if (result.status >= 200 && result.status < 300) {
        const fallbackEmail = ssoCompleteContext.email;
        setSsoCompleteContext(null);
        applyPrimaryAuthResult(result, fallbackEmail, "sso");
      }
    } catch (error) {
      setResult(keys.complete, toErrorResult(error));
    } finally {
      setLoadingFlag(keys.complete, false);
    }
  }

  function finalize2faSuccess(result: ApiResult, method: MfaMethod) {
    if (result.status < 200 || result.status >= 300) return;

    const fromBodyUser = readUserObject(result.body);
    if (fromBodyUser) {
      applyUser(fromBodyUser);
    }

    const nextEnabledMethods = enabledMethods.includes(method)
      ? enabledMethods
      : [...enabledMethods, method];
    applyEnabledMethods(nextEnabledMethods);
    applyVerifyMethods([]);
    persistTwoFactorMode(null);
    applyTrustDeviceEligible(false);
    setSelectedMethod(method);
    setStep("dashboard");
  }

  async function sendSmsCode() {
    setSelectedMethod("sms");
    setLoadingFlag("smsSend", true);
    try {
      const result = await authService.sendSms2faCode();
      setResult("smsSend", result);
      if (handleUnauthorized(result)) return;
    } catch (error) {
      setResult("smsSend", toErrorResult(error));
    } finally {
      setLoadingFlag("smsSend", false);
    }
  }

  async function verifySmsCode(code: string) {
    setLoadingFlag("smsVerify", true);
    try {
      const result = await authService.verifySms2faCode(
        code.trim(),
        trustDeviceEligible && trustDeviceSelected
      );
      setResult("smsVerify", result);
      if (handleUnauthorized(result)) return;
      finalize2faSuccess(result, "sms");
    } catch (error) {
      setResult("smsVerify", toErrorResult(error));
    } finally {
      setLoadingFlag("smsVerify", false);
    }
  }

  async function sendEmailCode() {
    setSelectedMethod("email");
    setLoadingFlag("emailSend", true);
    try {
      const result = await authService.sendEmail2faCode();
      setResult("emailSend", result);
      if (handleUnauthorized(result)) return;
    } catch (error) {
      setResult("emailSend", toErrorResult(error));
    } finally {
      setLoadingFlag("emailSend", false);
    }
  }

  async function verifyEmailCode(code: string) {
    setLoadingFlag("emailVerify", true);
    try {
      const result = await authService.verifyEmail2faCode(
        code.trim(),
        trustDeviceEligible && trustDeviceSelected
      );
      setResult("emailVerify", result);
      if (handleUnauthorized(result)) return;
      finalize2faSuccess(result, "email");
    } catch (error) {
      setResult("emailVerify", toErrorResult(error));
    } finally {
      setLoadingFlag("emailVerify", false);
    }
  }

  async function setupTotp() {
    setSelectedMethod("totp");
    setLoadingFlag("totpSetup", true);
    try {
      const result = await authService.setupTotp();
      const qrDataUrl = readStringField(result.body, "qrCodeDataUrl");
      const bodyRecord =
        result.body && typeof result.body === "object"
          ? (result.body as Record<string, unknown>)
          : null;
      const resultBodyWithoutQr = { ...(bodyRecord ?? {}) };
      delete resultBodyWithoutQr.qrCodeDataUrl;

      setResult(
        "totpSetup",
        bodyRecord
          ? { ...result, body: resultBodyWithoutQr }
          : result
      );

      if (handleUnauthorized(result)) return;
      setTotpQrDataUrl(qrDataUrl ?? "");
    } catch (error) {
      setResult("totpSetup", toErrorResult(error));
    } finally {
      setLoadingFlag("totpSetup", false);
    }
  }

  async function verifyTotp(token: string) {
    setLoadingFlag("totpVerify", true);
    try {
      const result = await authService.verifyTotp(
        token.trim(),
        trustDeviceEligible && trustDeviceSelected
      );
      setResult("totpVerify", result);
      if (handleUnauthorized(result)) return;
      finalize2faSuccess(result, "totp");
    } catch (error) {
      setResult("totpVerify", toErrorResult(error));
    } finally {
      setLoadingFlag("totpVerify", false);
    }
  }

  async function verifyRecoveryCode(code: string) {
    setLoadingFlag("recoveryVerify", true);
    try {
      const result = await authService.verifyRecoveryCode(code.trim().toUpperCase());
      setResult("recoveryVerify", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        const fallbackMethod = selectedMethod ?? verifyMethods[0] ?? "email";
        finalize2faSuccess(result, fallbackMethod);
      }
    } catch (error) {
      setResult("recoveryVerify", toErrorResult(error));
    } finally {
      setLoadingFlag("recoveryVerify", false);
    }
  }

  async function disableMethod(method: MfaMethod) {
    setLoadingFlag("disable2fa", true);
    try {
      const result = await authService.disableTwoFactorMethod(method);
      setResult("disable2fa", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        const methods = readMfaMethods(result.body, "enabledMethods");
        applyEnabledMethods(methods);
      }
    } catch (error) {
      setResult("disable2fa", toErrorResult(error));
    } finally {
      setLoadingFlag("disable2fa", false);
    }
  }

  async function generateRecoveryCodes() {
    setLoadingFlag("recoverySetup", true);
    try {
      const result = await authService.generateRecoveryCodes();
      setResult("recoverySetup", result);
      if (handleUnauthorized(result)) return;

      const codes = Array.isArray((result.body as Record<string, unknown>).codes)
        ? ((result.body as Record<string, unknown>).codes as string[])
        : [];
      setRecoveryCodes(codes);
    } catch (error) {
      setResult("recoverySetup", toErrorResult(error));
    } finally {
      setLoadingFlag("recoverySetup", false);
    }
  }

  async function refreshRecoveryStatus() {
    setLoadingFlag("recoveryStatus", true);
    try {
      const result = await authService.getRecoveryStatus();
      setResult("recoveryStatus", result);
      if (handleUnauthorized(result)) return;
    } catch (error) {
      setResult("recoveryStatus", toErrorResult(error));
    } finally {
      setLoadingFlag("recoveryStatus", false);
    }
  }

  async function loadTrustedDevices() {
    setLoadingFlag("trustedDevicesList", true);
    try {
      const result = await authService.getTrustedDevices();
      setResult("trustedDevicesList", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        setTrustedDevices(parseTrustedDevicesFromBody(result.body));
      }
    } catch (error) {
      setResult("trustedDevicesList", toErrorResult(error));
    } finally {
      setLoadingFlag("trustedDevicesList", false);
    }
  }

  async function revokeTrustedDevice(id: number) {
    setLoadingFlag("trustedDeviceRevoke", true);
    try {
      const result = await authService.revokeTrustedDevice(id);
      setResult("trustedDeviceRevoke", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        setTrustedDevices((current) => current.filter((device) => device.id !== id));
      }
    } catch (error) {
      setResult("trustedDeviceRevoke", toErrorResult(error));
    } finally {
      setLoadingFlag("trustedDeviceRevoke", false);
    }
  }

  async function changePassword(input: ChangePasswordInput) {
    setLoadingFlag("changePassword", true);
    try {
      const result = await authService.changePassword(input);
      setResult("changePassword", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        applyUser(null);
        applyEnabledMethods([]);
        applyVerifyMethods([]);
        setSsoCompleteContext(null);
        persistTwoFactorMode(null);
        applyTrustDeviceEligible(false);
        setTotpQrDataUrl("");
        setTrustedDevices([]);
        setActiveSessions([]);
        setRecoveryCodes([]);
        setSelectedMethod(null);
        setAvailableMethods(ALL_MFA_METHODS);
        setStep("login");
      }
    } catch (error) {
      setResult("changePassword", toErrorResult(error));
    } finally {
      setLoadingFlag("changePassword", false);
    }
  }

  async function logout() {
    setLoadingFlag("logout", true);
    try {
      const result = await authService.logoutUser();
      setResult("logout", result);
      if (handleUnauthorized(result)) return;

      applyUser(null);
      applyEnabledMethods([]);
      applyVerifyMethods([]);
      setSsoCompleteContext(null);
      persistTwoFactorMode(null);
      applyTrustDeviceEligible(false);
      setTotpQrDataUrl("");
      setTrustedDevices([]);
      setActiveSessions([]);
      setRecoveryCodes([]);
      setSelectedMethod(null);
      setAvailableMethods(ALL_MFA_METHODS);
      setStep("login");
    } catch (error) {
      setResult("logout", toErrorResult(error));
    } finally {
      setLoadingFlag("logout", false);
    }
  }

  async function loadActiveSessions() {
    setLoadingFlag("sessionsList", true);
    try {
      const result = await authService.getActiveSessions();
      setResult("sessionsList", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        setActiveSessions(parseActiveSessionsFromBody(result.body));
      }
    } catch (error) {
      setResult("sessionsList", toErrorResult(error));
    } finally {
      setLoadingFlag("sessionsList", false);
    }
  }

  async function revokeActiveSession(jti: string) {
    setLoadingFlag("sessionRevoke", true);
    try {
      const result = await authService.revokeActiveSession(jti);
      setResult("sessionRevoke", result);
      if (handleUnauthorized(result)) return;

      if (result.status >= 200 && result.status < 300) {
        setActiveSessions((current) => current.filter((session) => session.jti !== jti));
      }
    } catch (error) {
      setResult("sessionRevoke", toErrorResult(error));
    } finally {
      setLoadingFlag("sessionRevoke", false);
    }
  }

  return useMemo(
    () => ({
      step,
      user,
      ssoCompleteContext,
      pendingEmail,
      passwordResetEmail,
      passwordResetToken,
      selectedMethod,
      availableMethods,
      verifyMethods,
      enabledMethods,
      totpQrDataUrl,
      trustDeviceEligible,
      trustDeviceSelected,
      trustedDevices,
      activeSessions,
      recoveryCodes,
      results,
      loading,
      setStepRegister,
      setStepLogin,
      setStepForgotPassword,
      setStepResetPassword,
      setSelectedMethod,
      setTrustDeviceSelected,
      startGoogleLogin,
      startGitHubLogin,
      completeSsoRegistration,
      register,
      verifyEmail,
      login,
      requestPasswordReset,
      validatePasswordResetToken,
      confirmPasswordReset,
      sendSmsCode,
      verifySmsCode,
      sendEmailCode,
      verifyEmailCode,
      setupTotp,
      verifyTotp,
      verifyRecoveryCode,
      disableMethod,
      generateRecoveryCodes,
      refreshRecoveryStatus,
      loadTrustedDevices,
      revokeTrustedDevice,
      loadActiveSessions,
      revokeActiveSession,
      changePassword,
      logout,
    }),
    [
      step,
      user,
      ssoCompleteContext,
      pendingEmail,
      passwordResetEmail,
      passwordResetToken,
      selectedMethod,
      availableMethods,
      verifyMethods,
      enabledMethods,
      totpQrDataUrl,
      trustDeviceEligible,
      trustDeviceSelected,
      trustedDevices,
      activeSessions,
      recoveryCodes,
      results,
      loading,
    ]
  );
}
