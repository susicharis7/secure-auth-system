import { QueryTypes } from "sequelize";
import { sequelize } from "../../../config/database";
import {
  CaptchaAttemptKey,
  CaptchaAttemptRow,
  UpsertCaptchaFailureInput,
} from "./attemptTypes";

export async function findCaptchaAttemptByKey(
  key: CaptchaAttemptKey
): Promise<CaptchaAttemptRow | null> {
  const rows = await sequelize.query<CaptchaAttemptRow>(
    `
    SELECT
      id,
      action,
      identifier_hash,
      ip,
      failed_count,
      first_failed_at,
      last_failed_at,
      created_at,
      updated_at
    FROM captcha_attempts
    WHERE action = :action
      AND identifier_hash = :identifierHash
      AND ip = :ip
    LIMIT 1
    `,
    {
      replacements: {
        action: key.action,
        identifierHash: key.identifierHash,
        ip: key.ip,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows[0] ?? null;
};

export async function upsertCaptchaFailure(
  input: UpsertCaptchaFailureInput
): Promise<void> {
  await sequelize.query(
    `
    INSERT INTO captcha_attempts (
      action,
      identifier_hash,
      ip,
      failed_count,
      first_failed_at,
      last_failed_at
    )
    VALUES (
      :action,
      :identifierHash,
      :ip,
      1,
      :occurredAt,
      :occurredAt
    )
    ON DUPLICATE KEY UPDATE
      failed_count = failed_count + 1,
      last_failed_at = :occurredAt
    `,
    {
      replacements: {
        action: input.action,
        identifierHash: input.identifierHash,
        ip: input.ip,
        occurredAt: input.occurredAt,
      },
      type: QueryTypes.INSERT,
    }
  );
};

export async function resetCaptchaFailures(key: CaptchaAttemptKey): Promise<void> {
  await sequelize.query(
    `
    DELETE FROM captcha_attempts
    WHERE action = :action
      AND identifier_hash = :identifierHash
      AND ip = :ip
    `,
    {
      replacements: {
        action: key.action,
        identifierHash: key.identifierHash,
        ip: key.ip,
      },
      type: QueryTypes.DELETE,
    }
  );
};


