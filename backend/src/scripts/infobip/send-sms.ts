import { sendVerificationCodeSMS } from "../../services/smsService";

async function main() {
  const mobileNumber = process.argv[2];
  const code = process.argv[3];

  if (!mobileNumber || !code) {
    console.error("Usage: npm run sms:send -- <mobileNumber> <code>");
    process.exit(1);
  }

  const result = await sendVerificationCodeSMS(mobileNumber, code);
  console.log("HTTP Status:", result.status);
  console.log("Response:", JSON.stringify(result.data, null, 2));


  if (result.messageId) {
    console.log("Message ID:", result.messageId);
  }
}

main().catch((err) => {
  console.error("SMS send error:", err);
  process.exit(1);
});
