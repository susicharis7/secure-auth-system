import nodemailer from "nodemailer";
import { getSmtpConfig } from "../config/env";

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  if (!to.trim()) throw new Error("Recipient email is required.");
  if (!subject.trim()) throw new Error("Email subject is required.");
  if (!text.trim()) throw new Error("Email text body is required.");

  const smtp = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  const info = await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    text,
    html,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}
