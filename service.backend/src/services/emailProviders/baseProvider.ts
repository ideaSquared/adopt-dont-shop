import EmailQueue from '../../models/EmailQueue';
import { JsonObject } from '../../types/common';

export interface EmailProvider {
  send(email: EmailQueue): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getName(): string;
  validateConfiguration(): boolean;
}

export abstract class BaseEmailProvider implements EmailProvider {
  protected config: JsonObject;

  constructor(config: JsonObject) {
    this.config = config;
  }

  abstract send(
    email: EmailQueue
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
  abstract getName(): string;
  abstract validateConfiguration(): boolean;

  protected generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  protected validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected sanitizeEmail(email: EmailQueue): {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
  } {
    return {
      from: `${email.fromName || "Adopt Don't Shop"} <${email.fromEmail}>`,
      to: email.toName ? `${email.toName} <${email.toEmail}>` : email.toEmail,
      subject: email.subject,
      html: email.htmlContent,
      text: email.textContent,
    };
  }
}
