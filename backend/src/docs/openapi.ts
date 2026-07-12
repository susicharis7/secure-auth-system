import { OpenAPIV3 } from "openapi-types";

const errorResponse: OpenAPIV3.ResponseObject = {
  description: "Error response",
  content: {
    "application/json": {
      schema: {
        $ref: "#/components/schemas/ErrorResponse",
      },
    },
  },
};

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "SSD2026 API - Susic Haris",
    version: "1.0.0",
    description: "Authentication, session management, and 2FA API",
  },
  servers: [
    {
      url: "/api",
      description: "Current host",
    },
  ],
  tags: [
    { name: "Health", description: "Service health" },
    { name: "Auth", description: "Register/Login/Verify/Refresh/Logout" },
    { name: "SSO", description: "Google/GitHub OAuth entry points and SSO completion flow" },
    { name: "2FA", description: "2FA setup and verification flows" },
    { name: "Recovery", description: "Recovery code endpoints" },
    { name: "Trusted Devices", description: "Trusted device listing and revocation" },
    { name: "Sessions", description: "Active session listing and revocation" },
    { name: "Admin", description: "Admin dashboard endpoints (users, audit logs, reserved usernames)" },
  ],
  components: {
    securitySchemes: {
      authAccessCookie: {
        type: "apiKey",
        in: "cookie",
        name: "auth_access",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "Invalid refresh token." },
        },
        required: ["error"],
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "OK" },
        },
        required: ["message"],
      },
      RegisterRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "John Doe" },
          username: { type: "string", example: "johndoe" },
          email: { type: "string", example: "john@example.com" },
          password: { type: "string", example: "Password123!" },
          phone: { type: "string", example: "+38761234567" },
        },
        required: ["fullName", "username", "email", "password", "phone"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          identifier: { type: "string", example: "john@example.com" },
          password: { type: "string", example: "Password123!" },
          captchaToken: {
            type: "string",
            example: "10000000-aaaa-bbbb-cccc-000000000001",
            description: "hCaptcha token (required only after captchaRequired=true responses).",
          },
        },
        required: ["identifier", "password"],
      },
      TwoFactorCodeRequest: {
        type: "object",
        properties: {
          code: { type: "string", example: "123456", pattern: "^\\d{6}$" },
          trustDevice: {
            type: "boolean",
            example: true,
            description: "When true (credential login flow only), marks current device as trusted for 10 days after successful 2FA verification.",
          },
        },
        required: ["code"],
      },
      TotpVerifyRequest: {
        type: "object",
        properties: {
          totp_token: { type: "string", example: "123456", pattern: "^\\d{6}$" },
          trustDevice: {
            type: "boolean",
            example: true,
            description: "When true (credential login flow only), marks current device as trusted for 10 days after successful 2FA verification.",
          },
        },
        required: ["totp_token"],
      },
      RecoveryVerifyRequest: {
        type: "object",
        properties: {
          recoveryCode: { type: "string", example: "ABC-1234", pattern: "^[A-Z0-9]{3}-[A-Z0-9]{4}$" },
        },
        required: ["recoveryCode"],
      },
      Disable2faRequest: {
        type: "object",
        properties: {
          method: { type: "string", enum: ["sms", "email", "totp"], example: "email" },
        },
        required: ["method"],
      },
      UserSnapshot: {
        type: "object",
        properties: {
          id: { type: "number", example: 1 },
          fullName: { type: "string", example: "John Doe" },
          email: { type: "string", example: "john@example.com" },
          username: { type: "string", example: "johndoe" },
          phone: { type: "string", example: "+38761234567" },
        },
      },
      GoogleSsoLoginUrlResponse: {
        type: "object",
        properties: {
          authUrl: { type: "string", example: "https://accounts.google.com/o/oauth2/v2/auth?..." },
        },
        required: ["authUrl"],
      },
      GoogleSsoContextResponse: {
        oneOf: [
          {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["login"] },
              message: { type: "string" },
              nextStep: { type: "string" },
              mfaSetupRequired: { type: "boolean" },
              enabledMethods: {
                type: "array",
                items: { type: "string", enum: ["sms", "email", "totp"] },
              },
            },
            required: ["mode"],
          },
          {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["complete-registration"] },
              email: { type: "string", example: "user@gmail.com" },
              fullName: { type: "string", example: "John Doe" },
              needsFullName: { type: "boolean", example: false },
            },
            required: ["mode", "email", "fullName", "needsFullName"],
          },
        ],
      },
      GoogleSsoCompleteRegistrationRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "John Doe" },
          username: { type: "string", example: "johndoe" },
          phone: { type: "string", example: "+38761111222" },
        },
        required: ["username", "phone"],
      },
      GitHubSsoLoginUrlResponse: {
        type: "object",
        properties: {
          authUrl: { type: "string", example: "https://github.com/login/oauth/authorize?..." },
        },
        required: ["authUrl"],
      },
      GitHubSsoContextResponse: {
        oneOf: [
          {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["login"] },
              message: { type: "string" },
              nextStep: { type: "string" },
              mfaSetupRequired: { type: "boolean" },
              enabledMethods: {
                type: "array",
                items: { type: "string", enum: ["sms", "email", "totp"] },
              },
            },
            required: ["mode"],
          },
          {
            type: "object",
            properties: {
              mode: { type: "string", enum: ["complete-registration"] },
              email: { type: "string", example: "user@github.com" },
              fullName: { type: "string", example: "John Doe" },
              needsFullName: { type: "boolean", example: false },
            },
            required: ["mode", "email", "fullName", "needsFullName"],
          },
        ],
      },
      GitHubSsoCompleteRegistrationRequest: {
        type: "object",
        properties: {
          fullName: { type: "string", example: "John Doe" },
          username: { type: "string", example: "johndoe" },
          phone: { type: "string", example: "+38761111222" },
        },
        required: ["username", "phone"],
      },
      TrustedDeviceSnapshot: {
        type: "object",
        properties: {
          id: { type: "number", example: 12 },
          userAgent: { type: "string", example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36" },
          ip: { type: "string", example: "::1" },
          createdAt: { type: "string", format: "date-time" },
          lastUsedAt: { type: "string", format: "date-time", nullable: true },
          expiresAt: { type: "string", format: "date-time" },
        },
        required: ["id", "createdAt", "expiresAt"],
      },
      TrustedDevicesListResponse: {
        type: "object",
        properties: {
          devices: {
            type: "array",
            items: { $ref: "#/components/schemas/TrustedDeviceSnapshot" },
          },
        },
        required: ["devices"],
      },
      SessionSnapshot: {
        type: "object",
        properties: {
          jti: { type: "string", example: "a3b4... (64-char hex)" },
          userAgent: { type: "string", nullable: true },
          ip: { type: "string", nullable: true },
          issuedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          isTrustedSession: { type: "boolean", example: false },
          trustedUntil: { type: "string", format: "date-time", nullable: true },
          trustedDeviceId: { type: "number", nullable: true },
          isCurrent: { type: "boolean", example: false },
        },
        required: ["jti", "issuedAt", "expiresAt", "isTrustedSession", "isCurrent"],
      },
      SessionsListResponse: {
        type: "object",
        properties: {
          sessions: {
            type: "array",
            items: { $ref: "#/components/schemas/SessionSnapshot" },
          },
        },
        required: ["sessions"],
      },
      AdminCursorPageMeta: {
        type: "object",
        properties: {
          nextCursor: { type: "string", nullable: true },
          prevCursor: { type: "string", nullable: true },
          hasNext: { type: "boolean" },
          hasPrev: { type: "boolean" },
          limit: { type: "integer", minimum: 1, maximum: 100, example: 10 },
        },
        required: ["nextCursor", "prevCursor", "hasNext", "hasPrev", "limit"],
      },
      AdminUserListItem: {
        type: "object",
        properties: {
          id: { type: "integer", minimum: 1, example: 17 },
          email: { type: "string", example: "user@example.com" },
          role: { type: "string", enum: ["user", "admin"], example: "user" },
          isBlocked: { type: "boolean", example: false },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "email", "role", "isBlocked", "createdAt"],
      },
      AdminUsersListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminUserListItem" },
          },
          page: { $ref: "#/components/schemas/AdminCursorPageMeta" },
        },
        required: ["items", "page"],
      },
      AdminAuditLogListItem: {
        type: "object",
        properties: {
          id: { type: "integer", minimum: 1, example: 501 },
          timestamp: { type: "string", format: "date-time" },
          action: { type: "string", example: "ADMIN_USER_BLOCK_UPDATE_SUCCESS" },
          result: { type: "string", enum: ["success", "failure", "denied", "error"], example: "success" },
          actorId: { type: "integer", nullable: true, example: 1 },
          actorRole: { type: "string", enum: ["user", "admin", "system"], nullable: true, example: "admin" },
          ipAddress: { type: "string", nullable: true, example: "::1" },
          userAgent: { type: "string", nullable: true },
          objectName: { type: "string", nullable: true, example: "user" },
          objectId: { type: "string", nullable: true, example: "17" },
          originalObject: {
            type: "object",
            nullable: true,
            additionalProperties: true,
          },
          requestData: {
            type: "object",
            nullable: true,
            additionalProperties: true,
          },
        },
        required: [
          "id",
          "timestamp",
          "action",
          "result",
          "actorId",
          "actorRole",
          "ipAddress",
          "userAgent",
          "objectName",
          "objectId",
          "originalObject",
          "requestData",
        ],
      },
      AdminAuditLogsListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminAuditLogListItem" },
          },
          page: { $ref: "#/components/schemas/AdminCursorPageMeta" },
        },
        required: ["items", "page"],
      },
      AdminReservedUsernameListItem: {
        type: "object",
        properties: {
          id: { type: "integer", minimum: 1, example: 3 },
          username: { type: "string", example: "support" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "username", "createdAt"],
      },
      AdminReservedUsernamesListResponse: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminReservedUsernameListItem" },
          },
          page: { $ref: "#/components/schemas/AdminCursorPageMeta" },
        },
        required: ["items", "page"],
      },
      AdminUserBlockUpdateRequest: {
        type: "object",
        properties: {
          blocked: { type: "boolean", example: true },
        },
        required: ["blocked"],
      },
      AdminReservedUsernameRequest: {
        type: "object",
        properties: {
          username: { type: "string", example: "security" },
        },
        required: ["username"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                  required: ["status"],
                },
              },
            },
          },
        },
      },
    },
    "/register": {
      post: {
        tags: ["Auth"],
        summary: "Register user",
        operationId: "registerUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "User registered (email verification required)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Register successful. Please verify your email before login." },
                    user: {
                      type: "object",
                      properties: {
                        fullName: { type: "string" },
                        email: { type: "string" },
                        username: { type: "string" },
                        phone: { type: "string" },
                      },
                    },
                  },
                  required: ["message", "user"],
                },
              },
            },
          },
          "400": errorResponse,
          "409": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        operationId: "loginUser",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Credentials accepted (may require setup/2FA verify step)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Credentials are correct. Submit TOTP token." },
                    nextStep: { type: "string", example: "POST /api/auth/2fa/totp/verify" },
                    mfaSetupRequired: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error / captcha required / captcha verification failed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Captcha is required after multiple failed login attempts." },
                    captchaRequired: { type: "boolean", example: true },
                    failedCount: { type: "number", example: 3 },
                    threshold: { type: "number", example: 3 },
                    captchaErrors: {
                      type: "array",
                      items: { type: "string" },
                      example: ["invalid-input-response"],
                    },
                  },
                  required: ["error"],
                },
              },
            },
          },
          "401": {
            description: "Invalid credentials / invalid code",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid credentials." },
                    error: { type: "string", example: "Invalid credentials." },
                    captchaRequired: { type: "boolean", example: true },
                    failedCount: { type: "number", example: 3 },
                    threshold: { type: "number", example: 3 },
                  },
                },
              },
            },
          },
          "403": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user",
        operationId: "logoutUser",
        description: "Revokes refresh token when present and always clears auth cookies.",
        responses: {
          "200": {
            description: "Logout successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "500": errorResponse,
        },
      },
    },
    "/auth/verify-email": {
      get: {
        tags: ["Auth"],
        summary: "Verify email using token",
        operationId: "verifyEmail",
        parameters: [
          {
            in: "query",
            name: "token",
            required: true,
            schema: { type: "string" },
            description: "Email verification token",
          },
        ],
        responses: {
          "200": {
            description: "Email verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh session",
        operationId: "refreshSession",
        description: "Rotates refresh token and issues new access cookie.",
        responses: {
          "200": {
            description: "Session refreshed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "401": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/google/login": {
      get: {
        tags: ["SSO"],
        summary: "Start Google OAuth login",
        operationId: "googleLogin",
        responses: {
          "200": {
            description: "Google OAuth URL generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GoogleSsoLoginUrlResponse" },
              },
            },
          },
          "500": errorResponse,
        },
      },
    },
    "/auth/google/callback": {
      get: {
        tags: ["SSO"],
        summary: "Google OAuth callback (redirect endpoint)",
        operationId: "googleCallback",
        description: "Handles Google code/state exchange and redirects to frontend login or SSO completion route.",
        parameters: [
          {
            in: "query",
            name: "code",
            required: false,
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "state",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "302": {
            description: "Redirects browser to frontend flow route",
            headers: {
              Location: {
                description: "Frontend redirect URL (for example /front/login or /front/sso/complete-profile).",
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/auth/google/context": {
      get: {
        tags: ["SSO"],
        summary: "Resolve Google SSO context",
        operationId: "googleContext",
        description: "Returns current Google SSO mode (login or complete-registration) from short-lived SSO context cookie.",
        responses: {
          "200": {
            description: "Google SSO context resolved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GoogleSsoContextResponse" },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/google/complete-registration": {
      post: {
        tags: ["SSO"],
        summary: "Complete registration for Google first-time sign-in",
        operationId: "googleCompleteRegistration",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GoogleSsoCompleteRegistrationRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration completed and user moved into existing 2FA flow",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    nextStep: { type: "string" },
                    mfaSetupRequired: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": errorResponse,
          "409": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/github/login": {
      get: {
        tags: ["SSO"],
        summary: "Start GitHub OAuth login",
        operationId: "githubLogin",
        responses: {
          "200": {
            description: "GitHub OAuth URL generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GitHubSsoLoginUrlResponse" },
              },
            },
          },
          "500": errorResponse,
        },
      },
    },
    "/auth/github/callback": {
      get: {
        tags: ["SSO"],
        summary: "GitHub OAuth callback (redirect endpoint)",
        operationId: "githubCallback",
        description: "Handles GitHub code/state exchange and redirects to frontend login or SSO completion route.",
        parameters: [
          {
            in: "query",
            name: "code",
            required: false,
            schema: { type: "string" },
          },
          {
            in: "query",
            name: "state",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "302": {
            description: "Redirects browser to frontend flow route",
            headers: {
              Location: {
                description: "Frontend redirect URL (for example /front/login or /front/sso/complete-profile).",
                schema: { type: "string" },
              },
            },
          },
        },
      },
    },
    "/auth/github/context": {
      get: {
        tags: ["SSO"],
        summary: "Resolve GitHub SSO context",
        operationId: "githubContext",
        description: "Returns current GitHub SSO mode (login or complete-registration) from short-lived SSO context cookie.",
        responses: {
          "200": {
            description: "GitHub SSO context resolved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GitHubSsoContextResponse" },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/github/complete-registration": {
      post: {
        tags: ["SSO"],
        summary: "Complete registration for GitHub first-time sign-in",
        operationId: "githubCompleteRegistration",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GitHubSsoCompleteRegistrationRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Registration completed and user moved into existing 2FA flow",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    nextStep: { type: "string" },
                    mfaSetupRequired: { type: "boolean" },
                  },
                },
              },
            },
          },
          "400": errorResponse,
          "409": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/sms/send": {
      post: {
        tags: ["2FA"],
        summary: "Send SMS 2FA code",
        operationId: "sendSms2faCode",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "SMS code sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "SMS 2FA code sent." },
                    nextStep: { type: "string", example: "POST /api/auth/2fa/sms/verify" },
                    userId: { type: "number", example: 1 },
                  },
                  required: ["message", "nextStep", "userId"],
                },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/sms/verify": {
      post: {
        tags: ["2FA"],
        summary: "Verify SMS 2FA code",
        operationId: "verifySms2faCode",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TwoFactorCodeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "SMS 2FA verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "2FA successful. User is fully logged in." },
                    dummyEndpointStatus: { type: "number", example: 100 },
                    user: { $ref: "#/components/schemas/UserSnapshot" },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": {
            description: "Invalid auth/code",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid 2FA code." },
                    error: { type: "string", example: "Invalid or expired auth token." },
                  },
                },
              },
            },
          },
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/email/send": {
      post: {
        tags: ["2FA"],
        summary: "Send email 2FA code",
        operationId: "sendEmail2faCode",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "Email code sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "2FA code sent to email." },
                    nextStep: { type: "string", example: "POST /api/auth/2fa/email/verify" },
                    userId: { type: "number", example: 1 },
                  },
                  required: ["message", "nextStep", "userId"],
                },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/email/verify": {
      post: {
        tags: ["2FA"],
        summary: "Verify email 2FA code",
        operationId: "verifyEmail2faCode",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TwoFactorCodeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Email 2FA verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Email 2FA successful. User is fully logged in." },
                    user: { $ref: "#/components/schemas/UserSnapshot" },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": {
            description: "Invalid auth/code",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid 2FA code." },
                    error: { type: "string", example: "Invalid or expired auth token." },
                  },
                },
              },
            },
          },
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/totp/setup": {
      post: {
        tags: ["2FA"],
        summary: "Setup TOTP",
        operationId: "setupTotp2fa",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "TOTP setup generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "TOTP Setup generated." },
                    otpAuthUri: { type: "string" },
                    qrCodeDataUrl: { type: "string" },
                  },
                  required: ["message", "otpAuthUri", "qrCodeDataUrl"],
                },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/totp/verify": {
      post: {
        tags: ["2FA"],
        summary: "Verify TOTP code",
        operationId: "verifyTotp2fa",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TotpVerifyRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "TOTP verified",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "TOTP token verified successfully." },
                    user: { $ref: "#/components/schemas/UserSnapshot" },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": {
            description: "Invalid auth/token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid TOTP token." },
                    error: { type: "string", example: "Invalid or expired auth token." },
                  },
                },
              },
            },
          },
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/disable": {
      post: {
        tags: ["2FA"],
        summary: "Disable one 2FA method",
        operationId: "disable2faMethod",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Disable2faRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "2FA method disabled",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "2FA method 'email' disabled successfully." },
                    enabledMethods: {
                      type: "array",
                      items: { type: "string", enum: ["sms", "email", "totp"] },
                    },
                  },
                  required: ["message", "enabledMethods"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/recovery/setup": {
      post: {
        tags: ["Recovery"],
        summary: "Generate recovery codes",
        operationId: "setupRecoveryCodes",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "Recovery codes generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Recovery codes generated successfully" },
                    codes: {
                      type: "array",
                      items: { type: "string", example: "ABC-1234" },
                    },
                    warning: { type: "string" },
                    generatedAt: { type: "string", format: "date-time" },
                  },
                  required: ["message", "codes", "warning", "generatedAt"],
                },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/verify-recovery": {
      post: {
        tags: ["Recovery"],
        summary: "Authenticate with recovery code",
        operationId: "verifyRecoveryCode",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecoveryVerifyRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated with recovery code",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Authenticated with recovery code" },
                    user: { $ref: "#/components/schemas/UserSnapshot" },
                    warning: { type: "string" },
                    codesRemaining: { type: "number", example: 7 },
                  },
                  required: ["message", "user", "warning", "codesRemaining"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/2fa/recovery/status": {
      get: {
        tags: ["Recovery"],
        summary: "Get recovery code status",
        operationId: "recoveryCodeStatus",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "Recovery status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Recovery codes status" },
                    codesRemaining: { type: "number", example: 8 },
                    hasBackupCodes: { type: "boolean", example: true },
                  },
                  required: ["message", "codesRemaining", "hasBackupCodes"],
                },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/trusted-devices": {
      get: {
        tags: ["Trusted Devices"],
        summary: "List active trusted devices for current user",
        operationId: "listTrustedDevices",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "Trusted devices fetched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TrustedDevicesListResponse" },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/trusted-devices/{id}": {
      delete: {
        tags: ["Trusted Devices"],
        summary: "Revoke one trusted device",
        operationId: "revokeTrustedDevice",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "Trusted device record id",
          },
        ],
        responses: {
          "200": {
            description: "Trusted device revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Trusted device revoked successfully." },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/sessions": {
      get: {
        tags: ["Sessions"],
        summary: "List active sessions for current user",
        operationId: "listActiveSessions",
        security: [{ authAccessCookie: [] }],
        responses: {
          "200": {
            description: "Active sessions fetched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionsListResponse" },
              },
            },
          },
          "401": errorResponse,
          "403": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/auth/sessions/{jti}": {
      delete: {
        tags: ["Sessions"],
        summary: "Revoke one active session",
        operationId: "revokeActiveSession",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "jti",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
            description: "Refresh token JTI (64-char hex).",
          },
        ],
        responses: {
          "200": {
            description: "Session revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Session revoked successfully." },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List users for admin dashboard",
        operationId: "adminListUsers",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "cursor",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "direction",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["next", "prev"] },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, example: 10 },
          },
          {
            name: "searchEmail",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "blocked",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["true", "false", "1", "0", "all"] },
          },
        ],
        responses: {
          "200": {
            description: "Admin users list fetched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminUsersListResponse" },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/admin/users/{id}/block": {
      patch: {
        tags: ["Admin"],
        summary: "Block or unblock a user",
        operationId: "adminSetUserBlockedState",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
            description: "Target user id",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminUserBlockUpdateRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "User block state updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: {
                      allOf: [{ $ref: "#/components/schemas/AdminUserListItem" }],
                      nullable: true,
                    },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "List audit logs for admin dashboard",
        operationId: "adminListAuditLogs",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "cursor",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "direction",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["next", "prev"] },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, example: 10 },
          },
          {
            name: "action",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "result",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["success", "failure", "denied", "error"] },
          },
          {
            name: "actorId",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "actorRole",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["user", "admin", "system"] },
          },
        ],
        responses: {
          "200": {
            description: "Admin audit logs fetched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminAuditLogsListResponse" },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/admin/reserved-usernames": {
      get: {
        tags: ["Admin"],
        summary: "List reserved usernames",
        operationId: "adminListReservedUsernames",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "cursor",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "direction",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["next", "prev"] },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, example: 10 },
          },
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Reserved usernames fetched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminReservedUsernamesListResponse" },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "500": errorResponse,
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Create reserved username",
        operationId: "adminCreateReservedUsername",
        security: [{ authAccessCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminReservedUsernameRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Reserved username created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    item: {
                      allOf: [{ $ref: "#/components/schemas/AdminReservedUsernameListItem" }],
                      nullable: true,
                    },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "409": errorResponse,
          "500": errorResponse,
        },
      },
    },
    "/admin/reserved-usernames/{id}": {
      put: {
        tags: ["Admin"],
        summary: "Update reserved username",
        operationId: "adminUpdateReservedUsername",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AdminReservedUsernameRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Reserved username updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    item: {
                      allOf: [{ $ref: "#/components/schemas/AdminReservedUsernameListItem" }],
                      nullable: true,
                    },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "409": errorResponse,
          "500": errorResponse,
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete reserved username",
        operationId: "adminDeleteReservedUsername",
        security: [{ authAccessCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          "200": {
            description: "Reserved username deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          "400": errorResponse,
          "401": errorResponse,
          "403": errorResponse,
          "404": errorResponse,
          "500": errorResponse,
        },
      },
    },
  },
};

