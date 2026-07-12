import crypto from "crypto";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { getRefreshJwtConfig } from "../../config/env";
import { RefreshTokenPayload } from "./refreshTokenTypes";

function assertJwtPayloadShape(decoded: JwtPayload | string): asserts decoded is JwtPayload {
  if (typeof decoded === "string" || !decoded) {
    throw new Error("Invalid refresh JWT payload.");
  }
}

function assertRefreshPayload(decoded: JwtPayload): RefreshTokenPayload {
  const sub = decoded.sub;
  const jti = decoded.jti;
  const iat = decoded.iat;
  const exp = decoded.exp;

  if (!Number.isInteger(sub) || Number(sub) <= 0) {
    throw new Error("Refresh JWT sub is invalid.");
  }

  if (typeof jti !== "string" || jti.trim().length < 16) {
    throw new Error("Refresh JWT jti is invalid.");
  }

  if (!Number.isInteger(iat) || !Number.isInteger(exp)) {
    throw new Error("Refresh JWT iat/exp is invalid.");
  }

   return {
    sub: Number(sub),
    jti,
    iat: Number(iat),
    exp: Number(exp),
  };
}

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function signRefreshToken(
  userId: number,
  options?: { expiresInSeconds?: number }
): {
  token: string;
  jti: string;
  issuedAt: Date;
  expiresAt: Date;
} {
  const cfg = getRefreshJwtConfig();
  const jti = crypto.randomBytes(32).toString("hex");
  const expiresInOption =
    options?.expiresInSeconds && Number.isInteger(options.expiresInSeconds) && options.expiresInSeconds > 0
      ? options.expiresInSeconds
      : (cfg.expiresIn as SignOptions["expiresIn"]);

  const token = jwt.sign(
    { sub: userId, jti },
    cfg.secret,
    { expiresIn: expiresInOption }
  );

  const decoded = jwt.verify(token, cfg.secret);
  assertJwtPayloadShape(decoded);
  const payload = assertRefreshPayload(decoded);

  return {
    token,
    jti: payload.jti,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const cfg = getRefreshJwtConfig();
  const decoded = jwt.verify(token, cfg.secret);

  assertJwtPayloadShape(decoded);
  return assertRefreshPayload(decoded);
}
