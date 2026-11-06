import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/server/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  attachment?: { filename: string; content: Buffer };
}

export interface EmailProvider {
  state: "configured" | "not_configured";
  send(message: EmailMessage): Promise<{ id: string }>;
}

export class NotConfiguredEmailProvider implements EmailProvider {
  state = "not_configured" as const;
  async send(): Promise<{ id: string }> {
    throw new Error("email_not_configured");
  }
}

export class ResendEmailProvider implements EmailProvider {
  state = "configured" as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage) {
    const resend = new Resend(this.apiKey);
    const response = await resend.emails.send(
      {
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        attachments: message.attachment
          ? [{ filename: message.attachment.filename, content: message.attachment.content, contentType: "application/pdf" }]
          : undefined,
      },
      message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
    );
    if (response.error || !response.data?.id) {
      const failure = response.error as { message?: string; statusCode?: number } | null;
      const status = failure?.statusCode ?? "unknown";
      const reason = failure?.message ?? "sem resposta do provedor";
      throw new Error(`email_send_failed ${status}: ${reason}`.slice(0, 400));
    }
    return { id: response.data.id };
  }
}

export function createEmailProvider(): EmailProvider {
  const env = getServerEnv();
  if (!env.resendApiKey || !env.emailFrom) return new NotConfiguredEmailProvider();
  return new ResendEmailProvider(env.resendApiKey, env.emailFrom);
}
