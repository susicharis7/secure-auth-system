import { OpenAPIV3 } from "openapi-types";

export const openApiSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "SSD2026 API",
    version: "1.0.0",
    description: "Authentication API for the SSD project",
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Local server",
    },
  ],
  tags: [
    { name: "Health", description: "Server check" },
    { name: "Auth", description: "Auth endpoints" },
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
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error",
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
            description: "Login success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Login successful." },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid credentials",
          },
        },
      },
    },
  },
};
