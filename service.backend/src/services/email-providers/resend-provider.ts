import { Resend } from 'resend';
import EmailQueue from '../../models/EmailQueue';
import { logger } from '../../utils/logger';
import { BaseEmailProvider } from './base-provider';

type ResendConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
};

// Per-send timeout. A hung Resend API call must not stall the email queue
// processor indefinitely — without a ceiling one slow send blocks the whole
// batch. The Resend SDK doesn't expose an AbortSignal, so we race the send
// against a timeout (mirrors the per-request budget in
// companies-house.service.ts).
const RESEND_SEND_TIMEOUT_MS = 10_000;

export class ResendProvider extends BaseEmailProvider {
  private client: Resend;

  constructor(config: ResendConfig) {
    super(config);
    this.client = new Resend(config.apiKey);
  }

  async send(email: EmailQueue): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const sanitized = this.sanitizeEmail(email);
    const config = this.config as ResendConfig;

    const payload = {
      from: sanitized.from,
      to: sanitized.to,
      subject: sanitized.subject,
      html: sanitized.html,
      ...(sanitized.text ? { text: sanitized.text } : {}),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    };

    let result: Awaited<ReturnType<typeof this.client.emails.send>>;
    try {
      result = await this.withTimeout(this.client.emails.send(payload));
    } catch (timeoutError) {
      const message = timeoutError instanceof Error ? timeoutError.message : String(timeoutError);
      logger.error('Resend send timed out', {
        to: sanitized.to,
        subject: sanitized.subject,
        error: message,
      });
      return { success: false, error: message };
    }

    const { data, error } = result;

    if (error !== null) {
      logger.error('Failed to send email via Resend', {
        to: sanitized.to,
        subject: sanitized.subject,
        error,
      });
      return { success: false, error: error.message };
    }

    logger.info('Email sent via Resend', {
      messageId: data.id,
      to: sanitized.to,
      subject: sanitized.subject,
    });

    return { success: true, messageId: data.id };
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Resend send exceeded ${RESEND_SEND_TIMEOUT_MS}ms timeout`)),
        RESEND_SEND_TIMEOUT_MS
      );
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  getName(): string {
    return 'Resend';
  }

  validateConfiguration(): boolean {
    const config = this.config as ResendConfig;
    return Boolean(config.apiKey) && Boolean(config.fromEmail);
  }
}
