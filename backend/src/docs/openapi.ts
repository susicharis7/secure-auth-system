import { OpenAPIV3 } from "openapi-types";

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'SSD2026 API - Susic Haris',
    version: '1.0.0',
    description: 'Authentication API for the SSD Project (IT 310)'
  },
  servers: [{
    url: 'http://localhost:3000/api',
    description: 'Local Server'
  }],
  tags: [
    {name: 'Health', description: 'Basic Server (health) Check'},
    {name: 'Auth', description: 'Auth Endpoints'},
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Server OK",
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
              schema: {
                type: "object",
                properties: {
                  fullName: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "john@test.com" },
                  username: { type: "string", example: "johndoe" },
                  password: { type: "string", example: "Password123!" },
                  phone: { type: "string", example: "+38761234567" },
                },
                required: ["fullName", "email", "username", "password", "phone"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Register successful." },
                    user: {
                      type: "object",
                      properties: {
                        fullName: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "john@test.com" },
                        username: { type: "string", example: "johndoe" },
                        phone: { type: "string", example: "+38761234567" },
                      },
                    },
                  },
                  required: ["message", "user"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Invalid email format." },
                  },
                  required: ["error"],
                },
              },
            },
          },
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
              schema: {
                type: "object",
                properties: {
                  identifier: { type: "string", example: "john@test.com" },
                  password: { type: "string", example: "Password123!" },
                },
                required: ["identifier", "password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Credentials valid, SMS code sent",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "Credentials are correct. Code is sent to the users phone number via SMS.",
                    },
                    nextStep: { type: "string", example: "POST /api/auth/2fa" },
                  },
                  required: ["message", "nextStep"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Password is required." },
                  },
                  required: ["error"],
                },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid credentials." },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "500": {
            description: "Server/SMS error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "INFOBIP_API_KEY is not defined." },
                  },
                  required: ["error"],
                },
              },
            },
          },
        },
      },
    },

    "/auth/2fa": {
      post: {
        tags: ["Auth"],
        summary: "Verify 2FA code",
        operationId: "verifyTwoFactorCode",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: { type: "string", example: "123456" },
                },
                required: ["code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "2FA success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "2FA successful. User is fully logged in.",
                    },
                    dummyEndpointStatus: { type: "number", example: 200 },
                  },
                  required: ["message", "dummyEndpointStatus"],
                },
              },
            },
          },
          "400": {
            description: "Code format invalid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "Code must contain exactly 6 digits." },
                  },
                  required: ["error"],
                },
              },
            },
          },
          "401": {
            description: "Code incorrect",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Invalid 2FA code." },
                  },
                  required: ["message"],
                },
              },
            },
          },
          "500": {
            description: "Server/dummy endpoint error",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    error: { type: "string", example: "REQUEST_BIN_URL is not defined." },
                  },
                  required: ["error"],
                },
              },
            },
          },
        },
      },
    },
  },
};