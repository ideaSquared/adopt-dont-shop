import { JsonObject } from '../../types/common';

export type SmsSendRequest = {
  to: string;
  message: string;
  /**
   * Implementation-specific metadata (e.g. Twilio messagingServiceSid, AWS
   * SNS topicArn). Providers may ignore unrecognised keys.
   */
  metadata?: JsonObject;
};

export type SmsSendResult = {
  success: boolean;
  /** Provider message id when delivery is accepted (Twilio SID, SNS MessageId, …). */
  messageId?: string;
  /** Provider-side delivery state when known synchronously. */
  status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'undeliverable';
  /** Human-readable error when `success === false`. */
  error?: string;
  /** Cost charged by the provider in micro-units of currency, when reported. */
  costMicros?: number;
};

export interface SmsProvider {
  send(request: SmsSendRequest): Promise<SmsSendResult>;
  getName(): string;
  validateConfiguration(): boolean;
}

/**
 * Shared behaviour every SMS provider needs:
 *   - phone-number normalisation to E.164 (the de-facto standard for Twilio,
 *     SNS, Vonage and Plivo). Numbers that fail to normalise are rejected
 *     before they hit the wire.
 *   - synchronous configuration validation so the orchestrator can degrade
 *     to a stub provider rather than throwing on every send.
 */
export abstract class BaseSmsProvider implements SmsProvider {
  protected readonly config: JsonObject;

  constructor(config: JsonObject = {}) {
    this.config = config;
  }

  abstract send(request: SmsSendRequest): Promise<SmsSendResult>;
  abstract getName(): string;
  abstract validateConfiguration(): boolean;

  /**
   * Normalise an arbitrary user-entered phone number to E.164 form
   * (`+<country><subscriber>`). Returns `null` when the input cannot be
   * coerced into a plausible international number.
   *
   * Rules:
   *   - strip whitespace, hyphens, parentheses, and dots
   *   - if the input begins with `+`, keep the `+` and treat the digits as authoritative
   *   - if the input begins with `00`, replace with `+`
   *   - if the input is purely digits, fall back to the supplied `defaultCountryCode`
   *     when given (numeric, no leading `+`)
   *   - resulting digits must be 8..15 chars (E.164 max length)
   */
  static normalisePhone(raw: string, defaultCountryCode?: string): string | null {
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    // 00-prefix → +
    const withPlus = trimmed.startsWith('00') ? `+${trimmed.slice(2)}` : trimmed;

    // strip non-digit punctuation but keep a leading +
    const hasPlus = withPlus.startsWith('+');
    const digits = withPlus.replace(/[^\d]/g, '');

    if (digits.length === 0) {
      return null;
    }

    let canonical: string;
    if (hasPlus) {
      canonical = `+${digits}`;
    } else if (defaultCountryCode) {
      const cc = defaultCountryCode.replace(/[^\d]/g, '');
      if (!cc) {
        return null;
      }
      canonical = `+${cc}${digits}`;
    } else {
      // Without a country, we can't safely build E.164.
      return null;
    }

    const subscriberDigits = canonical.slice(1);
    if (subscriberDigits.length < 8 || subscriberDigits.length > 15) {
      return null;
    }
    return canonical;
  }

  /**
   * Generate a deterministic-looking message id when the underlying provider
   * does not return one (e.g. console/dev providers).
   */
  protected generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
