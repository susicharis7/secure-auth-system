import { getRequestBinUrl } from "../../config/env";
import { httpClient } from "../../services/httpClient";
import { sendVerificationCodeSMS } from "../../services/smsService";
import { LoginInput, RegisterInput, TwoFactorInput, AuthFlowResult } from "./userTypes";

const HARD_CODED_2FA_CODE = "123456";

const DEMO_USER = {
  fullName: "John Doe",
  email: "john@test.com",
  username: "johndoe",
  password: "Password123!",
  phone: process.env.INFOBIP_DESTINATION || "+38760000000",
};

export function registerUser(input: RegisterInput): AuthFlowResult {
    return {
        status: 200,
        body: {
            message: 'Register successful.',
            user: {
                fullName: input.fullName,
                email: input.email,
                username: input.username,
                phone: input.phone
            },
        },
    };
};

export async function loginUser(input: LoginInput): Promise<AuthFlowResult> {
    const identifier = input.identifier.toLowerCase();
    const isIdentifierValid = 
        identifier === DEMO_USER.email.toLowerCase() ||
        identifier === DEMO_USER.username.toLowerCase();

    const isPasswordValid = input.password === DEMO_USER.password;

    if (!isIdentifierValid || !isPasswordValid) {
        return {
            status: 401,
            body: { message: 'Invalid credentials. '}
        };
    };

    await sendVerificationCodeSMS(DEMO_USER.phone, HARD_CODED_2FA_CODE);

    return {
        status: 200,
        body: {
            message: 'Credentials are correct. Code is sent to the users phone number via SMS.',
            nextStep: 'POST /api/auth/2fa'
        },
    };
};

export async function verifyTwoFactorCode(input: TwoFactorInput): Promise<AuthFlowResult> {
  if (input.code !== HARD_CODED_2FA_CODE) {
    return {
      status: 401,
      body: { message: "Invalid 2FA code." },
    };
  }

  const requestBinUrl = getRequestBinUrl();

  const dummyResult = await httpClient(requestBinUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "2fa_login_completed",
      code: input.code,
      timestamp: new Date().toISOString(),
    }),
  });

  return {
    status: 200,
    body: {
      message: "2FA successful. User is fully logged in.",
      dummyEndpointStatus: dummyResult.status,
    },
  };
};

