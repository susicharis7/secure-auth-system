export type VerificationType = "EMAIL_VERIFY" | "SMS_2FA" | "EMAIL_2FA";

export type VerificationRow = {
  id: number;
  user_id: number;
  verification_type: VerificationType;
  token_hash: string | null;
  code_hash: string | null;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

export type CreateVerificationInput = {
  userId: number;
  verificationType: VerificationType;
  tokenHash?: string | null;
  codeHash?: string | null;
  expiresAt: Date;
};
