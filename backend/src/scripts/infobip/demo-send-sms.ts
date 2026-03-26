import { sendSMS } from "../../services/smsService";

async function main() {
  const to = process.argv[2] || process.env.INFOBIP_DESTINATION || "";
  const text = process.argv.slice(3).join(" ").trim() || "Demo SMS from Node.js script";

  if (!to) {
    console.error("Usage: npm run sms:demo -- <mobileNumber> <text>");
    process.exit(1);
  }

  const result = await sendSMS(to, text);
  console.log("HTTP status:", result.status);
  console.log("Response:", result.data);
  if (result.messageId) console.log("Message ID:", result.messageId);
}

main().catch((err) => {
  console.error("SMS demo error:", err);
  process.exit(1);
});
