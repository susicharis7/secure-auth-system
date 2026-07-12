import { useEffect } from "react";
import { SsoCompleteProfilePage } from "./pages/SsoCompleteProfilePage";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { TwoFactorSetupPage } from "./pages/TwoFactorSetupPage";
import { TwoFactorVerifyPage } from "./pages/TwoFactorVerifyPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { useAuthFlow } from "./hooks/useAuthFlow";
import { PageLayout } from "./components/layout/PageLayout";
import { ToastViewport } from "./components/ui/ToastViewport";
import type { AuthStep } from "./types/auth";

const APP_PATHS = {
  register: "/register",
  verifyEmail: "/verify-email",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  ssoCompleteProfile: "/sso/complete-profile",
  setup2fa: "/setup-2fa",
  verify2fa: "/verify-2fa",
  dashboard: "/dashboard",
} as const;

function pathForStep(step: AuthStep): string {
  if (step === "register") return APP_PATHS.register;
  if (step === "verify-email") return APP_PATHS.verifyEmail;
  if (step === "login") return APP_PATHS.login;
  if (step === "forgot-password") return APP_PATHS.forgotPassword;
  if (step === "reset-password") return APP_PATHS.resetPassword;
  if (step === "sso-complete-profile") return APP_PATHS.ssoCompleteProfile;
  if (step === "setup-2fa") return APP_PATHS.setup2fa;
  if (step === "verify-2fa") return APP_PATHS.verify2fa;
  if (step === "dashboard") return APP_PATHS.dashboard;
  return APP_PATHS.login;
}

function getRouterBasename(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base === "/") return "/";
  return base.replace(/\/$/, "");
}

function LoadingScreen() {
  return (
    <PageLayout eyebrow="Auth Flow" title="Loading session" subtitle="Checking auth cookie...">
      <div className="app-card">
        <p className="text-sm text-[var(--text-muted)]">Initializing frontend auth flow.</p>
      </div>
    </PageLayout>
  );
}

function AppRoutes() {
  const auth = useAuthFlow();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.step === "loading") return;
    const target = pathForStep(auth.step);
    if (location.pathname !== target) {
      navigate(target, { replace: true });
    }
  }, [auth.step, location.pathname, navigate]);

  if (auth.step === "loading") {
    return <LoadingScreen />;
  }

  function guard(step: AuthStep) {
    if (auth.step === "loading") return <LoadingScreen />;
    if (auth.step !== step) return <Navigate to={pathForStep(auth.step)} replace />;
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to={pathForStep(auth.step)} replace />} />
      <Route
        path={APP_PATHS.register}
        element={
          guard("register") ?? (
            <RegisterPage
              loading={Boolean(auth.loading.register)}
              result={auth.results.register}
              googleLoading={Boolean(auth.loading.googleLogin) || Boolean(auth.loading.googleContext)}
              githubLoading={Boolean(auth.loading.githubLogin) || Boolean(auth.loading.githubContext)}
              onSubmit={auth.register}
              onGoogleLogin={auth.startGoogleLogin}
              onGitHubLogin={auth.startGitHubLogin}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.verifyEmail}
        element={
          guard("verify-email") ?? (
            <VerifyEmailPage
              pendingEmail={auth.pendingEmail}
              loading={Boolean(auth.loading.verifyEmail)}
              result={auth.results.verifyEmail}
              onSubmit={auth.verifyEmail}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.login}
        element={
          guard("login") ?? (
            <LoginPage
              loading={Boolean(auth.loading.login)}
              result={auth.results.login}
              googleResult={auth.results.googleContext ?? auth.results.googleLogin}
              githubResult={auth.results.githubContext ?? auth.results.githubLogin}
              passwordResetConfirmResult={auth.results.passwordResetConfirm}
              changePasswordResult={auth.results.changePassword}
              googleLoading={Boolean(auth.loading.googleLogin) || Boolean(auth.loading.googleContext)}
              githubLoading={Boolean(auth.loading.githubLogin) || Boolean(auth.loading.githubContext)}
              onSubmit={auth.login}
              onGoogleLogin={auth.startGoogleLogin}
              onGitHubLogin={auth.startGitHubLogin}
              onGoForgotPassword={() => auth.setStepForgotPassword()}
              onGoRegister={auth.setStepRegister}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.forgotPassword}
        element={
          guard("forgot-password") ?? (
            <ForgotPasswordPage
              prefilledEmail={auth.passwordResetEmail}
              loading={Boolean(auth.loading.passwordResetRequest)}
              result={auth.results.passwordResetRequest}
              onSubmit={auth.requestPasswordReset}
              onGoResetPassword={() => auth.setStepResetPassword()}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.resetPassword}
        element={
          guard("reset-password") ?? (
            <ResetPasswordPage
              token={auth.passwordResetToken}
              validateLoading={Boolean(auth.loading.passwordResetValidate)}
              confirmLoading={Boolean(auth.loading.passwordResetConfirm)}
              validateResult={auth.results.passwordResetValidate}
              confirmResult={auth.results.passwordResetConfirm}
              onValidateToken={auth.validatePasswordResetToken}
              onSubmit={auth.confirmPasswordReset}
              onGoForgotPassword={() => auth.setStepForgotPassword(auth.passwordResetEmail)}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.ssoCompleteProfile}
        element={
          guard("sso-complete-profile") ?? (
            <SsoCompleteProfilePage
              context={auth.ssoCompleteContext}
              result={auth.results.googleCompleteRegistration ?? auth.results.githubCompleteRegistration}
              loading={Boolean(auth.loading.googleCompleteRegistration) || Boolean(auth.loading.githubCompleteRegistration)}
              onSubmit={auth.completeSsoRegistration}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.setup2fa}
        element={
          guard("setup-2fa") ?? (
            <TwoFactorSetupPage
              user={auth.user}
              selectedMethod={auth.selectedMethod}
              availableMethods={auth.availableMethods}
              enabledMethods={auth.enabledMethods}
              totpQrDataUrl={auth.totpQrDataUrl}
              trustDeviceEligible={auth.trustDeviceEligible}
              trustDeviceSelected={auth.trustDeviceSelected}
              results={auth.results}
              loading={auth.loading}
              onSelectMethod={auth.setSelectedMethod}
              onTrustDeviceChange={auth.setTrustDeviceSelected}
              onSendSms={auth.sendSmsCode}
              onVerifySms={auth.verifySmsCode}
              onSendEmail={auth.sendEmailCode}
              onVerifyEmail={auth.verifyEmailCode}
              onSetupTotp={auth.setupTotp}
              onVerifyTotp={auth.verifyTotp}
              onGoLogin={auth.setStepLogin}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.verify2fa}
        element={
          guard("verify-2fa") ?? (
            <TwoFactorVerifyPage
              user={auth.user}
              methods={auth.verifyMethods}
              selectedMethod={auth.selectedMethod}
              trustDeviceEligible={auth.trustDeviceEligible}
              trustDeviceSelected={auth.trustDeviceSelected}
              loading={auth.loading}
              results={auth.results}
              onSelectMethod={auth.setSelectedMethod}
              onTrustDeviceChange={auth.setTrustDeviceSelected}
              onSendSms={auth.sendSmsCode}
              onSendEmail={auth.sendEmailCode}
              onVerifySms={auth.verifySmsCode}
              onVerifyEmail={auth.verifyEmailCode}
              onVerifyTotp={auth.verifyTotp}
              onVerifyRecoveryCode={auth.verifyRecoveryCode}
            />
          )
        }
      />
      <Route
        path={APP_PATHS.dashboard}
        element={
          guard("dashboard") ?? (
            auth.user?.role === "admin" ? (
              <AdminDashboardPage
                user={auth.user}
                onLogout={auth.logout}
                logoutLoading={Boolean(auth.loading.logout)}
              />
            ) : (
              <DashboardPage
                user={auth.user}
                selectedMethod={auth.selectedMethod}
                availableMethods={auth.availableMethods}
                enabledMethods={auth.enabledMethods}
                totpQrDataUrl={auth.totpQrDataUrl}
                trustedDevices={auth.trustedDevices}
                activeSessions={auth.activeSessions}
                recoveryCodes={auth.recoveryCodes}
                results={auth.results}
                loading={auth.loading}
                onSelectMethod={auth.setSelectedMethod}
                onSendSms={auth.sendSmsCode}
                onVerifySms={auth.verifySmsCode}
                onSendEmail={auth.sendEmailCode}
                onVerifyEmail={auth.verifyEmailCode}
                onSetupTotp={auth.setupTotp}
                onVerifyTotp={auth.verifyTotp}
                onDisableMethod={auth.disableMethod}
                onGenerateRecoveryCodes={auth.generateRecoveryCodes}
                onRefreshRecoveryStatus={auth.refreshRecoveryStatus}
                onLoadTrustedDevices={auth.loadTrustedDevices}
                onRevokeTrustedDevice={auth.revokeTrustedDevice}
                onLoadActiveSessions={auth.loadActiveSessions}
                onRevokeActiveSession={auth.revokeActiveSession}
                changePasswordLoading={Boolean(auth.loading.changePassword)}
                changePasswordResult={auth.results.changePassword}
                onChangePassword={auth.changePassword}
                onGoForgotPassword={auth.setStepForgotPassword}
                onLogout={auth.logout}
              />
            )
          )
        }
      />
      <Route path="*" element={<Navigate to={pathForStep(auth.step)} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter basename={getRouterBasename()}>
      <AppRoutes />
      <ToastViewport />
    </BrowserRouter>
  );
}

export default App;
