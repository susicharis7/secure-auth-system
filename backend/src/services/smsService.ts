import { getInfobipConfig } from "../config/env";
import { httpClient } from "./httpClient";

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

  const response = await httpClient(`${infobip.baseUrl}${infobip.smsPath}`, {
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

   if (response.status < 200 || response.status >= 300) {
    const raw = typeof response.data === "string" ? response.data : "";
    throw new Error(`Infobip request failed (${response.status}): ${raw}`);
  }



  const messageId = (response.data as { messages?: Array<{ messageId?: string }> })
    ?.messages?.[0]?.messageId;

  return {
    status: response.status,
    data: response.data,
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
