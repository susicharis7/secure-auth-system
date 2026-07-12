import { parsePhoneNumberFromString, ParseError } from "libphonenumber-js/max";

export type PhoneValidationResult =
  | { isValid: true; normalized: string }
  | { isValid: false; error: string };

export function validateInternationalMobilePhone(input: string): PhoneValidationResult {
  const raw = input.trim();

  if (!raw) {
    return { isValid: false, error: "Phone number is required." };
  }

  try {
    const parsed = parsePhoneNumberFromString(raw, "BA");

    if (!parsed || !parsed.isValid()) {
      return {
        isValid: false,
        error: "Invalid phone format. Use +country... or BA local format like 06x...",
      };
    }

    const type = parsed.getType();
    if (type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") {
      return { isValid: false, error: "Phone number must be mobile." };
    }

    return { isValid: true, normalized: parsed.number };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        isValid: false,
        error: "Invalid phone format. Use +country... or BA local format like 06x...",
      };
    }
    throw error;
  }
}
