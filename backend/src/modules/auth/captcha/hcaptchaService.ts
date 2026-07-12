import { getHCaptchaConfig } from "../../../config/env";

type HCaptchaVerifyApiResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export type HCaptchaVerifyResult = {
  success: boolean;
  errorCodes: string[];
};

export async function verifyHCaptchaToken(
  token: string,
  remoteIp?: string | null
): Promise<HCaptchaVerifyResult> {
  const cfg = getHCaptchaConfig();

  const form = new URLSearchParams();
  form.set("secret", cfg.serverSecret);
  form.set("response", token.trim());

  const cleanIp = remoteIp?.trim();
  if (cleanIp) {
    form.set("remoteip", cleanIp);
  }

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`hCaptcha verification request failed (${response.status}).`);
  }

  const data = (await response.json()) as HCaptchaVerifyApiResponse;

  return {
    success: data.success === true,
    errorCodes: Array.isArray(data["error-codes"]) ? data["error-codes"] : [],
  };
}