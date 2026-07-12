import { createHash, randomBytes, randomInt } from "crypto";
import {
  createVerification,
  findActiveVerificationByCodeHash,
  findActiveVerificationByTokenHash,
  invalidateActiveVerifications,
  markVerificationAsUsed,
} from "./verificationRepository";
import { VerificationType } from "./verificationTypes";

const VERIFICATION_TTL_MINUTES = 15;
const TOKEN_BYTES = 32;
const MAX_6_DIGIT_CODE = 1_000_000;

type TwoFactorCodeType = "SMS_2FA" | "EMAIL_2FA";

function getExpiresAt(): Date {
  return new Date(Date.now() + VERIFICATION_TTL_MINUTES * 60 * 1000);
}

function hashSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

function generateCode(): string {
  return randomInt(0, MAX_6_DIGIT_CODE).toString().padStart(6, "0");
}

async function issueCodeByType(
  userId: number,
  verificationType: TwoFactorCodeType
): Promise<{ code: string; expiresAt: Date }> {
  await invalidateActiveVerifications(userId, verificationType);

  const code = generateCode();
  const codeHash = hashSecret(code);
  const expiresAt = getExpiresAt();

  await createVerification({
    userId,
    verificationType,
    codeHash,
    expiresAt,
  });

  return { code, expiresAt };
}

async function verifyCodeByType(
  userId: number,
  verificationType: TwoFactorCodeType,
  code: string
): Promise<boolean> {
  const codeHash = hashSecret(code);

  const row = await findActiveVerificationByCodeHash(userId, verificationType, codeHash);

  if (!row) {
    return false;
  }

  await markVerificationAsUsed(row.id);
  return true;
}

export async function issueEmailVerifyToken(
  userId: number
): Promise<{ token: string; expiresAt: Date }> {
  await invalidateActiveVerifications(userId, "EMAIL_VERIFY");

  const token = generateToken();
  const tokenHash = hashSecret(token);
  const expiresAt = getExpiresAt();

  await createVerification({
    userId,
    verificationType: "EMAIL_VERIFY",
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function consumeEmailVerifyToken(
  token: string
): Promise<{ ok: boolean; userId: number | null }> {
  const tokenHash = hashSecret(token);

  const row = await findActiveVerificationByTokenHash("EMAIL_VERIFY", tokenHash);

  if (!row) {
    return { ok: false, userId: null };
  }

  await markVerificationAsUsed(row.id);

  return { ok: true, userId: row.user_id };
}

// SMS - 2FA
export async function issueSms2faCode(
  userId: number
): Promise<{ code: string; expiresAt: Date }> {
  return issueCodeByType(userId, "SMS_2FA");
}

export async function verifySms2faCode(userId: number, code: string): Promise<boolean> {
  return verifyCodeByType(userId, "SMS_2FA", code);
}

// EMAIL - 2FA 
export async function issueEmail2faCode(userId: number): Promise<{ code: string; expiresAt: Date }> {
  return issueCodeByType(userId, "EMAIL_2FA");
};

export async function verifyEmail2faCode(userId: number, code: string): Promise<boolean> {
  return verifyCodeByType(userId, "EMAIL_2FA", code);
}
