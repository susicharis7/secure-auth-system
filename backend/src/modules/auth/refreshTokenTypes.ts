export type RefreshTokenRow = {
  jti: string;
  refresh_token_hash: string | null;
  is_trusted_session: number | boolean;
  trusted_until: Date | null;
  trusted_device_id: number | null;
  user_id: number;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
  user_agent: string | null;
  ip: string | null;
};

export type NewRefreshTokenRowInput = {
  jti: string;
  refreshTokenHash: string | null;
  isTrustedSession: boolean;
  trustedUntil: Date | null;
  trustedDeviceId: number | null;
  userId: number;
  issuedAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
};

export type RefreshTokenPayload = {
  sub: number; // userId
  jti: string;
  iat: number;
  exp: number;
};
