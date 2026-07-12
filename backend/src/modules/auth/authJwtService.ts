import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { getJwtConfig } from "../../config/env";
import { AccessTokenPayload, VerifiedAccessToken } from "./authJwtTypes";

function assertPayloadShape(decoded: JwtPayload | string): asserts decoded is JwtPayload {
  if (typeof decoded === "string" || !decoded) {
    throw new Error("Invalid JWT payload.");
  }
};


export function signAccessToken(payload: AccessTokenPayload): string {
  const jwtConfig = getJwtConfig();

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn as SignOptions["expiresIn"],
  });
};


export function verifyAccessToken(token: string): VerifiedAccessToken {
  const jwtConfig = getJwtConfig();
  const decoded = jwt.verify(token, jwtConfig.secret);

  assertPayloadShape(decoded);

  const userId = decoded.userId;
  const email = decoded.email;
  const twoFactorVerified = decoded.twoFactorVerified;
  const authSource = decoded.authSource;
  const iat = decoded.iat;
  const exp = decoded.exp;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("JWT payload.userId is invalid.");
  }

  if (typeof email !== "string" || !email.trim()) {
    throw new Error("JWT payload.email is invalid.");
  }

  if (typeof twoFactorVerified !== "boolean") {
    throw new Error("JWT payload.twoFactorVerified is invalid.");
  }

  if (
    authSource !== "credential" &&
    authSource !== "google" &&
    authSource !== "github" &&
    authSource !== "session"
  ) {
    throw new Error("JWT payload.authSource is invalid.");
  }

  if (typeof iat !== "number" || !Number.isInteger(iat)) {
    throw new Error("JWT iat claim is invalid.");
  }

  if (typeof exp !== "number" || !Number.isInteger(exp)) {
    throw new Error("JWT exp claim is invalid.");
  }

  return {
    userId,
    email,
    twoFactorVerified,
    authSource,
    iat,
    exp,
  };
}
