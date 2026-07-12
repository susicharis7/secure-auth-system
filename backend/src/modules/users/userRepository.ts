import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database";
import { 
  UserRow, 
  UserOAuthAccountRow, 
  OAuthProvider,
  TrustedDeviceRow, 
  PasswordResetRequestRow,
} from "./userTypes";

export async function findUserByIdentifier(identifier: string): Promise<UserRow | null> {
  const value = identifier.toLowerCase();

  const rows = await sequelize.query<UserRow>(
    `
    SELECT 
      id, 
      role,
      full_name, 
      email, 
      username, 
      phone, 
      password_hash,
      email_verified_at, 
      is_blocked,
      sms_2fa_enabled, 
      email_2fa_enabled,
      totp_secret, 
      totp_enabled
    FROM users
    WHERE LOWER(email) = :identifier OR LOWER(username) = :identifier
    LIMIT 1
    `,
    {
      replacements: { identifier: value },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
}

export async function hasAtLeastOneEnabled2fa(userId: number): Promise<boolean> {
  const rows = await sequelize.query<{ has_2fa: number }>(
    `
    SELECT
      CASE
        WHEN sms_2fa_enabled = 1 OR email_2fa_enabled = 1 OR totp_enabled = 1 THEN 1
        ELSE 0
      END AS has_2fa
    FROM users
    WHERE id = :userId
    LIMIT 1
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  if (!rows[0]) return false;
  return Number(rows[0].has_2fa) === 1;
};



export async function createUser(input: {
  fullName: string;
  email: string;
  username: string;
  phone: string;
  passwordHash: string | null;
}): Promise<number> {
  const [insertId] = await sequelize.query(
    `
    INSERT INTO users(full_name, email, username, phone, password_hash)
    VALUES (:fullName, :email, :username, :phone, :passwordHash)
    `,
    {
      replacements: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        username: input.username,
        phone: input.phone,
        passwordHash: input.passwordHash,
      },
      type: QueryTypes.INSERT,
    }
  );

  return Number(insertId);
};


export async function findUserById(id: number): Promise<UserRow | null> {
  const rows = await sequelize.query<UserRow>(
    `
    SELECT 
      id, 
      role,
      full_name, 
      email, 
      username, 
      phone, 
      password_hash,
      email_verified_at, 
      is_blocked,
      sms_2fa_enabled, 
      email_2fa_enabled,
      totp_secret, 
      totp_enabled
    FROM users
    WHERE id = :id
    LIMIT 1
    `,
    {
      replacements: { id },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function listActiveVerifiedAdminEmails(): Promise<string[]> {
  const rows = await sequelize.query<{ email: string }>(
    `
    SELECT email
    FROM users
    WHERE role = 'admin'
      AND is_blocked = 0
      AND email_verified_at IS NOT NULL
    `,
    {
      type: QueryTypes.SELECT,
    }
  );

  return rows.map((row) => row.email).filter(Boolean);
};






export async function isReservedUsername(username: string): Promise<boolean> {
  const rows = await sequelize.query<{id: number}>(
    `
    SELECT id
    FROM reserved_usernames
    WHERE LOWER(username) = LOWER(:username)
    LIMIT 1
    `, 
    {
      replacements: { username },
      type: QueryTypes.SELECT,
    }
  );

  return rows.length > 0;
};

export async function markUserEmailVerified(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET email_verified_at = NOW()
    WHERE id = :userId
    `,
    { replacements: { userId } }
  );
};

/* Password Reset */
export async function invalidateActivePasswordResetRequestsForUser(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE password_reset_requests
    SET used_at = NOW()
    WHERE user_id = :userId
      AND used_at IS NULL
      AND expires_at > NOW()
    `,
    {
      replacements: { userId },
      type: QueryTypes.UPDATE,
    }
  )
};

export async function createPasswordResetRequest(input: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  attemptWindowExpiresAt: Date;
}): Promise<void> {
  await sequelize.query(
    `
    INSERT INTO password_reset_requests (
      user_id,
      token_hash,
      expires_at,
      used_at,
      attempts_used,
      attempt_window_expires_at
    )
    VALUES (
      :userId,
      :tokenHash,
      :expiresAt,
      NULL,
      0,
      :attemptWindowExpiresAt
    )
    `,
    {
      replacements: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        attemptWindowExpiresAt: input.attemptWindowExpiresAt,
      },
      type: QueryTypes.INSERT,
    }
  );
};

export async function findPasswordResetRequestByTokenHash(
  tokenHash: string
): Promise<PasswordResetRequestRow | null> {
  const rows = await sequelize.query<PasswordResetRequestRow>(
    `
    SELECT
      id,
      user_id,
      token_hash,
      expires_at,
      used_at,
      attempts_used,
      attempt_window_expires_at,
      created_at,
      updated_at
    FROM password_reset_requests
    WHERE token_hash = :tokenHash
    LIMIT 1
    `,
    {
      replacements: { tokenHash },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function incrementPasswordResetRequestAttempts(requestId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE password_reset_requests
    SET attempts_used = attempts_used + 1
    WHERE id = :requestId
    `,
    {
      replacements: { requestId },
      type: QueryTypes.UPDATE,
    }
  );
};

export async function markPasswordResetRequestUsed(requestId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE password_reset_requests
    SET used_at = NOW()
    WHERE id = :requestId
      AND used_at IS NULL
    `,
    {
      replacements: { requestId },
      type: QueryTypes.UPDATE,
    }
  );
};

export async function updateUserPasswordHash(userId: number, passwordHash: string): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET password_hash = :passwordHash
    WHERE id = :userId
    `,
    {
      replacements: { userId, passwordHash },
      type: QueryTypes.UPDATE,
    }
  );
};

/* SMS - 2FA */
export async function enableSms2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET sms_2fa_enabled = 1
    WHERE id = :userId
    `,
    { replacements: { userId } }
  );
};

export async function disableSms2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET sms_2fa_enabled = 0
    WHERE id = :userId
    `,
    {
      replacements: { userId },
    }
  );
}

/* EMAIL - 2FA */
export async function enableEmail2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET email_2fa_enabled = 1
    WHERE id = :userId
    `,
    { replacements: { userId } }
  );
};

export async function disableEmail2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET email_2fa_enabled = 0
    WHERE id = :userId
    `,
    {
      replacements: { userId },
    }
  );
}

/* Recovery Codes */
export async function generateRecoveryCodes(userId: number): Promise<string[]> {
  const crypto = await import("crypto");
  
  await sequelize.query(
    `DELETE FROM user_recovery_codes WHERE user_id = :userId`,
    {
      replacements: { userId },
      type: QueryTypes.DELETE,
    }
  );

  const plainCodes: string[] = [];
  
  for (let i = 0; i < 10; i++) {
    const plainCode = crypto
      .randomBytes(6)
      .toString("hex")
      .toUpperCase()
      .slice(0, 8);
    
    const codeHash = crypto
      .createHash("sha256")
      .update(plainCode)
      .digest("hex");
    
    plainCodes.push(`${plainCode.slice(0, 3)}-${plainCode.slice(3)}`);
    
    await sequelize.query(
      `INSERT INTO user_recovery_codes (user_id, code_hash) VALUES (:userId, :codeHash)`,
      {
        replacements: { userId, codeHash },
        type: QueryTypes.INSERT,
      }
    );
  }

  return plainCodes;
}

export async function getRecoveryCodesCount(userId: number): Promise<number> {
  const rows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM user_recovery_codes WHERE user_id = :userId AND used_at IS NULL`,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0]?.count ?? 0;
}

export async function verifyRecoveryCode(userId: number, plainCode: string): Promise<boolean> {
  const crypto = await import("crypto");
  
  const codeHash = crypto
    .createHash("sha256")
    .update(plainCode)
    .digest("hex");

  const rows = await sequelize.query<{ id: number }>(
    `SELECT id FROM user_recovery_codes 
     WHERE user_id = :userId AND code_hash = :codeHash AND used_at IS NULL 
     LIMIT 1`,
    {
      replacements: { userId, codeHash },
      type: QueryTypes.SELECT,
    }
  );

  if (!rows[0]) return false;


  await sequelize.query(
    `UPDATE user_recovery_codes SET used_at = NOW() WHERE id = :id`,
    {
      replacements: { id: rows[0].id },
      type: QueryTypes.UPDATE,
    }
  );

  return true;
}

export async function deleteAllRecoveryCodes(userId: number): Promise<void> {
  await sequelize.query(
    `DELETE FROM user_recovery_codes WHERE user_id = :userId`,
    {
      replacements: { userId },
      type: QueryTypes.DELETE,
    }
  );
}

export async function hasUnusedRecoveryCodes(userId: number): Promise<boolean> {
  const rows = await sequelize.query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM user_recovery_codes 
     WHERE user_id = :userId AND used_at IS NULL LIMIT 1`,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  return (rows[0]?.count ?? 0) > 0;
}

/* TOTP */
export async function findUserByTotpSecret(secret: string): Promise<UserRow | null> {
  const rows = await sequelize.query<UserRow>(
    `
    SELECT id, email
    FROM users
    WHERE totp_secret = :secret
    LIMIT 1
    `,
    {
      replacements: { secret },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function saveUserTotpSecret(userId: number, secret: string): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET totp_secret = :secret
    WHERE id = :userId
    `,
    {
      replacements: { secret, userId },
    }
  );
};

export async function enableTotp2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET totp_enabled = 1
    WHERE id = :userId
    `,
    {
      replacements: { userId },
    }
  );
};

export async function disableTotp2fa(userId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE users
    SET totp_enabled = 0,
        totp_secret = NULL
    WHERE id = :userId
    `,
    {
      replacements: { userId },
    }
  );
};

/* User OAuth */ 
export async function findOAuthAccountByProviderSubject(
  provider: OAuthProvider, 
  providerSubject: string 
): Promise<UserOAuthAccountRow | null> {
  const rows = await sequelize.query<UserOAuthAccountRow>(
    `
    SELECT id, user_id, provider, provider_subject, is_sso_only 
    FROM user_oauth_accounts
    WHERE provider = :provider AND provider_subject = :providerSubject
    LIMIT 1
    `,
    {
      replacements: { provider, providerSubject },
      type: QueryTypes.SELECT 
    }
  );

  return rows[0] ?? null; 
};

export async function createOAuthAccount(input: {
  userId: number;
  provider: OAuthProvider; 
  providerSubject: string; 
  isSsoOnly: boolean;
}): Promise<void> {
  await sequelize.query(
    `
    INSERT INTO user_oauth_accounts (user_id, provider, provider_subject, is_sso_only)
    VALUES (:userId, :provider, :providerSubject, :isSsoOnly)
    `, {
      replacements: {
        userId: input.userId,
        provider: input.provider,
        providerSubject: input.providerSubject,
        isSsoOnly: input.isSsoOnly ? 1 : 0,
      },
      type: QueryTypes.INSERT
    }
  )
};

export async function isPasswordLoginBlockedForUser(userId: number): Promise<boolean> {
  const rows = await sequelize.query<{ blocked: number }>(
    `
    SELECT
      CASE WHEN EXISTS (
        SELECT 1
        FROM user_oauth_accounts
        WHERE user_id = :userId AND is_sso_only = 1
      ) THEN 1 ELSE 0 END AS blocked 
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );

  return Number(rows[0]?.blocked ?? 0) === 1;
};

export async function findOAuthAccountByUserIdAndProvider(
  userId: number,
  provider: OAuthProvider
): Promise<UserOAuthAccountRow | null> {
  const rows = await sequelize.query<UserOAuthAccountRow>(
    `
    SELECT id, user_id, provider, provider_subject, is_sso_only
    FROM user_oauth_accounts
    WHERE user_id = :userId AND provider = :provider
    LIMIT 1
    `,
    {
      replacements: { userId, provider },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

/* Trusted Devices */
export async function createTrustedDevice(input: {
  userId: number;
  deviceTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
}): Promise<number> {
  const [insertId] = await sequelize.query(
    `
    INSERT INTO trusted_devices (
      user_id, device_token_hash, user_agent, ip, expires_at
    )
    VALUES (
      :userId, :deviceTokenHash, :userAgent, :ip, :expiresAt
    )
    `,
    {
      replacements: {
        userId: input.userId,
        deviceTokenHash: input.deviceTokenHash,
        userAgent: input.userAgent,
        ip: input.ip,
        expiresAt: input.expiresAt,
      },
      type: QueryTypes.INSERT,
    }
  );

  return Number(insertId);
};

export async function findActiveTrustedDeviceByHashForUser(
  userId: number,
  deviceTokenHash: string
): Promise<TrustedDeviceRow | null> {
  const rows = await sequelize.query<TrustedDeviceRow>(
    `
    SELECT
      id, user_id, device_token_hash, user_agent, ip,
      created_at, last_used_at, expires_at, revoked_at
    FROM trusted_devices
    WHERE user_id = :userId
      AND device_token_hash = :deviceTokenHash
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { userId, deviceTokenHash },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function findActiveTrustedDeviceByIdForUser(
  userId: number,
  trustedDeviceId: number
): Promise<TrustedDeviceRow | null> {
  const rows = await sequelize.query<TrustedDeviceRow>(
    `
    SELECT
      id, user_id, device_token_hash, user_agent, ip,
      created_at, last_used_at, expires_at, revoked_at
    FROM trusted_devices
    WHERE user_id = :userId
      AND id = :trustedDeviceId
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { userId, trustedDeviceId },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function touchTrustedDeviceLastUsed(trustedDeviceId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE trusted_devices
    SET last_used_at = NOW()
    WHERE id = :trustedDeviceId
      AND revoked_at IS NULL
      AND expires_at > NOW()
    `,
    {
      replacements: { trustedDeviceId },
      type: QueryTypes.UPDATE,
    }
  );
};

export async function listActiveTrustedDevicesForUser(userId: number): Promise<TrustedDeviceRow[]> {
  return sequelize.query<TrustedDeviceRow>(
    `
    SELECT
      id, user_id, device_token_hash, user_agent, ip,
      created_at, last_used_at, expires_at, revoked_at
    FROM trusted_devices
    WHERE user_id = :userId
      AND revoked_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    `,
    {
      replacements: { userId },
      type: QueryTypes.SELECT,
    }
  );
};

export async function revokeTrustedDeviceForUser(
  userId: number,
  trustedDeviceId: number
): Promise<boolean> {
  const existing = await sequelize.query<TrustedDeviceRow>(
    `
    SELECT
      id, user_id, device_token_hash, user_agent, ip,
      created_at, last_used_at, expires_at, revoked_at
    FROM trusted_devices
    WHERE id = :trustedDeviceId
      AND user_id = :userId
    LIMIT 1
    `,
    {
      replacements: { trustedDeviceId, userId },
      type: QueryTypes.SELECT,
    }
  );

  const row = existing[0];
  if (!row || row.revoked_at) {
    return false;
  }

  await sequelize.query(
    `
    UPDATE trusted_devices
    SET revoked_at = NOW()
    WHERE id = :trustedDeviceId
      AND user_id = :userId
      AND revoked_at IS NULL
    `,
    {
      replacements: { trustedDeviceId, userId },
      type: QueryTypes.UPDATE,
    }
  );

  return true;
};

