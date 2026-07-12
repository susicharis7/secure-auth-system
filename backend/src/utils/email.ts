import tlds from "tlds";

const VALID_TLDS = new Set(tlds.map((item) => item.toLowerCase()));

export function extractTld(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const domain = normalized.split("@")[1];

  if (!domain) return null;

  const tld = domain.split(".").pop();
  if (!tld) return null;

  return tld;
};

export function isValidTld(tld: string): boolean {
    return VALID_TLDS.has(tld.toLowerCase())
};

export function validateEmailTld(email: string): { isValid: true } | { isValid: false; error: string } {
  const tld = extractTld(email);

  if (!tld) {
    return { isValid: false, error: "Unable to extract email TLD." };
  }

  if (!isValidTld(tld)) {
    return { isValid: false, error: "Email has invalid TLD." };
  }

  return { isValid: true };
};