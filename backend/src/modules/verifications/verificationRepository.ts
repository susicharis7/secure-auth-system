import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database";
import {
  CreateVerificationInput,
  VerificationRow,
  VerificationType,
} from "./verificationTypes";

export async function createVerification(input: CreateVerificationInput): Promise<void> {
  await sequelize.query(
    `
    INSERT INTO user_verifications (user_id, verification_type, token_hash, code_hash, expires_at)
    VALUES (:userId, :verificationType, :tokenHash, :codeHash, :expiresAt)
    `,
    {
      replacements: {
        userId: input.userId,
        verificationType: input.verificationType,
        tokenHash: input.tokenHash ?? null,
        codeHash: input.codeHash ?? null,
        expiresAt: input.expiresAt,
      },
    }
  );
}

export async function findActiveVerificationByTokenHash(
  verificationType: VerificationType,
  tokenHash: string
): Promise<VerificationRow | null> {
  const rows = await sequelize.query<VerificationRow>(
    `
    SELECT id, user_id, verification_type, token_hash, code_hash, expires_at, used_at, created_at
    FROM user_verifications
    WHERE verification_type = :verificationType
      AND token_hash = :tokenHash
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { verificationType, tokenHash },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
}

export async function findActiveVerificationByCodeHash(
  userId: number,
  verificationType: VerificationType,
  codeHash: string
): Promise<VerificationRow | null> {
  const rows = await sequelize.query<VerificationRow>(
    `
    SELECT id, user_id, verification_type, token_hash, code_hash, expires_at, used_at, created_at
    FROM user_verifications
    WHERE user_id = :userId
      AND verification_type = :verificationType
      AND code_hash = :codeHash
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
    `,
    {
      replacements: { userId, verificationType, codeHash },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
}

export async function markVerificationAsUsed(verificationId: number): Promise<void> {
  await sequelize.query(
    `
    UPDATE user_verifications
    SET used_at = NOW()
    WHERE id = :verificationId
      AND used_at IS NULL
    `,
    {
      replacements: { verificationId },
    }
  );
}

export async function invalidateActiveVerifications(
  userId: number,
  verificationType: VerificationType
): Promise<void> {
  await sequelize.query(
    `
    UPDATE user_verifications
    SET used_at = NOW()
    WHERE user_id = :userId
      AND verification_type = :verificationType
      AND used_at IS NULL
      AND expires_at > NOW()
    `,
    {
      replacements: { userId, verificationType },
    }
  );
}
