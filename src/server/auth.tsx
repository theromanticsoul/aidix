import { render } from "@react-email/render";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { serverEnv } from "@/server/config/env/server";
import { db } from "@/server/infrastructure/db/client";
import { SmtpEmailSender } from "@/server/infrastructure/email/smtp/sender";
import { OtpEmail } from "@/server/infrastructure/email/templates/otp-email";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: serverEnv.BETTER_AUTH_URL,
  secret: serverEnv.BETTER_AUTH_SECRET,
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        const html = await render(<OtpEmail code={otp} />);
        await new SmtpEmailSender().send({
          to: email,
          subject: "Ваш одноразовый код AIDIX",
          html,
        });
      },
    }),
  ],
});
