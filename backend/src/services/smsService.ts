import { getInfobipConfig } from "../config/env";

export type SendSMSResult = {
  status: number;
  data: unknown;
  messageId?: string;
};

export async function sendSMS(
  mobileNumber: string,
  text: string
): Promise<SendSMSResult> {
  if (!mobileNumber.trim()) throw new Error("Mobile number is required.");
  if (!text.trim()) throw new Error("SMS text is required.");

  const infobip = getInfobipConfig();

  const response = await fetch(`${infobip.baseUrl}${infobip.smsPath}`, {
    method: "POST",
    headers: {
      Authorization: `App ${infobip.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          sender: infobip.sender,
          destinations: [{ to: mobileNumber }],
          content: { text },
        },
      ],
    }),
  });

  const raw = await response.text();
  let data: unknown = raw;

  try {
    data = JSON.parse(raw);
  } catch {}

  if (!response.ok) {
    throw new Error(`Infobip request failed (${response.status}): ${raw}`);
  }

  const messageId = (data as { messages?: Array<{ messageId?: string }> })
    ?.messages?.[0]?.messageId;

  return {
    status: response.status,
    data,
    messageId,
  };
}

export async function sendVerificationCodeSMS(
  mobileNumber: string,
  code: string
): Promise<SendSMSResult> {
  if (!code.trim()) throw new Error("Code is required.");
  return sendSMS(mobileNumber, `Your verification code is: ${code}`);
}
