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
    // Strip CR/LF before composing header values. Nodemailer ≥ 8 also
    // rejects CRLF in headers, but enforcing it at the boundary catches
    // it earlier and protects providers that may be more permissive.
    // [ADS-221]
    const stripCrlf = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

    const fromName = stripCrlf(email.fromName || "Adopt Don't Shop");
    const fromEmail = stripCrlf(email.fromEmail);
    const toName = email.toName ? stripCrlf(email.toName) : '';
    const toEmail = stripCrlf(email.toEmail);

    return {
      from: `${fromName} <${fromEmail}>`,
      to: toName ? `${toName} <${toEmail}>` : toEmail,
      subject: stripCrlf(email.subject),
      html: email.htmlContent,
      text: email.textContent,
    };
  }
}
