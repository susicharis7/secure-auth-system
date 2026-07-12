import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";

const DEFAULT_ISSUER = "(Google Auth) TOTP SSD";

export type TotpSetupData = {
  otpAuthUri: string;
  qrCodeDataUrl: string;
};

export function createTotpSecret(): string {
  return generateSecret();
};

export function createTotpUri(secret: string, label: string, issuer = DEFAULT_ISSUER): string {
    return generateURI({
        strategy: "totp",
        secret,
        label,
        issuer
    });
};

export async function createTotpQrDataUrl(otpAuthUri: string): Promise<string> {
    return qrcode.toDataURL(otpAuthUri);
};

export async function buildTotpSetupData(
    secret: string,
    label: string,
    issuer = DEFAULT_ISSUER
): Promise<TotpSetupData> {
    const otpAuthUri = createTotpUri(secret, label, issuer);
    const qrCodeDataUrl = await createTotpQrDataUrl(otpAuthUri);

    return {
        otpAuthUri,
        qrCodeDataUrl
    };
}

export async function verifyTotpToken(secret: string, token: string): Promise<boolean> {
  const result = await verify({
    secret,
    token,
    strategy: "totp",
  });

  return result.valid;
}