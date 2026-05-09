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

    const { data, error } = await this.client.emails.send(payload);

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

  getName(): string {
    return 'Resend';
  }

  validateConfiguration(): boolean {
    const config = this.config as ResendConfig;
    return Boolean(config.apiKey) && Boolean(config.fromEmail);
  }
}
