import nodemailer from "nodemailer";
import { serverEnv } from "@/server/config/env/server";
import type { EmailSender, SendEmailInput } from "@/server/core/email";

export class SmtpEmailSender implements EmailSender {
  async send(input: SendEmailInput): Promise<void> {
    const transport = nodemailer.createTransport({
      host: serverEnv.SMTP_HOST,
      port: serverEnv.SMTP_PORT,
      secure: serverEnv.SMTP_SECURE,
      auth: { user: serverEnv.SMTP_USER, pass: serverEnv.SMTP_PASSWORD },
    });

    await transport.sendMail({
      from: `${serverEnv.SMTP_FROM_NAME} <${serverEnv.SMTP_FROM_EMAIL}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }
}
