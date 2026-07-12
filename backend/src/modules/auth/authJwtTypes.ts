import { Request } from "express";

export type AuthSource = "credential" | "google" | "github" | "session";

export type AccessTokenPayload = {
  userId: number;
  email: string;
  twoFactorVerified: boolean;
  authSource: AuthSource;
};

export type VerifiedAccessToken = AccessTokenPayload & {
  iat: number;
  exp: number;
};

export type AuthContext = {
  userId: number;
  email: string;
  twoFactorVerified: boolean;
  authSource: AuthSource;
  iat: number;
  exp: number;
};

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};
