import { CaptchaAction } from "../../../config/envTypes";

export type CaptchaAttemptRow = {
  id: number;
  action: CaptchaAction;
  identifier_hash: string;
  ip: string;
  failed_count: number;
  first_failed_at: Date;
  last_failed_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type CaptchaAttemptKey = {
  action: CaptchaAction;
  identifierHash: string;
  ip: string;
};

export type UpsertCaptchaFailureInput = CaptchaAttemptKey & {
  occurredAt: Date;
};

export type CaptchaDecision = {
  requiresCaptcha: boolean;
  failedCount: number;
  threshold: number;
};