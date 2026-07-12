import { QueryTypes, Transaction } from "sequelize";
import { sequelize } from "../../config/database";
import { NewRefreshTokenRowInput, RefreshTokenRow } from "./refreshTokenTypes";

export async function insertRefreshToken(
  input: NewRefreshTokenRowInput,
  transaction?: Transaction
): Promise<void> {
  await sequelize.query(
    `
    INSERT INTO refresh_tokens (
      jti, refresh_token_hash, is_trusted_session, trusted_until, trusted_device_id, user_id, issued_at, expires_at, user_agent, ip
    )
    VALUES (
      :jti, :refreshTokenHash, :isTrustedSession, :trustedUntil, :trustedDeviceId, :userId, :issuedAt, :expiresAt, :userAgent, :ip
    )
    `,
    {
      replacements: {
        jti: input.jti,
        refreshTokenHash: input.refreshTokenHash,
        isTrustedSession: input.isTrustedSession ? 1 : 0,
        trustedUntil: input.trustedUntil,
        trustedDeviceId: input.trustedDeviceId,
        userId: input.userId,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        userAgent: input.userAgent,
        ip: input.ip,
      },
      type: QueryTypes.INSERT,
      transaction,
    }
  );
};

export async function findRefreshTokenByJti(jti: string): Promise<RefreshTokenRow | null> {
  const rows = await sequelize.query<RefreshTokenRow>(
    `
    SELECT
      jti, refresh_token_hash, is_trusted_session, trusted_until, trusted_device_id, user_id, issued_at, expires_at, revoked_at, replaced_by, user_agent, ip
    FROM refresh_tokens
    WHERE jti = :jti
    LIMIT 1
    `,
    {
      replacements: { jti },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function revokeRefreshToken(
  jti: string,
  revokedAt: Date
): Promise<void> {
  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = :revokedAt
    WHERE jti = :jti
      AND revoked_at IS NULL
    `,
    {
      replacements: { jti, revokedAt },
      type: QueryTypes.UPDATE,
    }
  );
};

export async function revokeAndReplaceRefreshToken(
  oldJti: string,
  newJti: string,
  revokedAt: Date,
  transaction?: Transaction
): Promise<void> {
  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = :revokedAt,
        replaced_by = :newJti
    WHERE jti = :oldJti
      AND revoked_at IS NULL
    `,
    {
      replacements: { oldJti, newJti, revokedAt },
      type: QueryTypes.UPDATE,
      transaction,
    }
  );
};

export async function revokeRefreshTokenFamily(startJti: string, revokedAt: Date): Promise<void> {
  const visited = new Set<string>();
  let cursor: string | null = startJti;

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor);

    const current = await findRefreshTokenByJti(cursor);
    if (!current) break;

    await sequelize.query(
      `
      UPDATE refresh_tokens
      SET revoked_at = COALESCE(revoked_at, :revokedAt)
      WHERE jti = :jti
      `,
      {
        replacements: { jti: cursor, revokedAt },
        type: QueryTypes.UPDATE,
      }
    );

    cursor = current.replaced_by ?? null;
  }
};

export async function revokeActiveRefreshTokensForUser(
  userId: number,
  revokedAt: Date
): Promise<void> {
  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = :revokedAt
    WHERE user_id = :userId
      AND revoked_at IS NULL
    `,
    {
      replacements: { userId, revokedAt },
      type: QueryTypes.UPDATE,
    }
  );
}

export async function revokeActiveRefreshTokensByTrustedDeviceId(
  userId: number,
  trustedDeviceId: number,
  revokedAt: Date
): Promise<void> {
  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = :revokedAt
    WHERE user_id = :userId
      AND trusted_device_id = :trustedDeviceId
      AND revoked_at IS NULL
    `,
    {
      replacements: { userId, trustedDeviceId, revokedAt },
      type: QueryTypes.UPDATE,
    }
  );
}

export async function listActiveRefreshSessionsForUser(userId: number): Promise<RefreshTokenRow[]> {
  return sequelize.query<RefreshTokenRow>(
    `
    SELECT
      jti, refresh_token_hash, is_trusted_session, trusted_until, trusted_device_id, user_id, issued_at, expires_at, revoked_at, replaced_by, user_agent, ip
    FROM refresh_tokens
    WHERE user_id = :userId
      AND revoked_at IS NULL
      AND expires_at > NOW()
    ORDER BY issued_at DESC
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );
}

export async function revokeRefreshSessionForUserByJti(
  userId: number,
  jti: string,
  revokedAt: Date
): Promise<boolean> {
  const [existing] = await sequelize.query<{ jti: string }>(
    `
    SELECT jti
    FROM refresh_tokens
    WHERE user_id = :userId
      AND jti = :jti
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { userId, jti },
      type: QueryTypes.SELECT,
    }
  );

  if (!existing) return false;

  await sequelize.query(
    `
    UPDATE refresh_tokens
    SET revoked_at = :revokedAt
    WHERE user_id = :userId
      AND jti = :jti
      AND revoked_at IS NULL
    `,
    {
      replacements: { userId, jti, revokedAt },
      type: QueryTypes.UPDATE,
    }
  );

  return true;
}


