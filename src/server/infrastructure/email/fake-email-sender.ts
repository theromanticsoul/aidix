import type { EmailSender, SendEmailInput } from "@/server/core/email";

export class FakeEmailSender implements EmailSender {
  readonly messages: SendEmailInput[] = [];

  async send(input: SendEmailInput): Promise<void> {
    this.messages.push(input);
  }
}
