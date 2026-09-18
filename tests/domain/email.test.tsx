import { describe, expect, test } from "bun:test";
import { render } from "@react-email/render";
import { FakeEmailSender } from "@/server/infrastructure/email/fake-email-sender";
import { OtpEmail } from "@/server/infrastructure/email/templates/otp-email";

describe("OTP email boundary", () => {
  test("renders the user-facing OTP and sends through the fake sender", async () => {
    const sender = new FakeEmailSender();
    const html = await render(<OtpEmail code="123456" />);
    await sender.send({ to: "user@example.com", subject: "AIDIX OTP", html });
    expect(sender.messages).toHaveLength(1);
    expect(sender.messages[0]?.html).toContain("123456");
    expect(sender.messages[0]?.to).toBe("user@example.com");
  });
});
