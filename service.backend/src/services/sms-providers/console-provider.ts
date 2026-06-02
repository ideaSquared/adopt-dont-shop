import logger from '../../utils/logger';
import { BaseSmsProvider, type SmsSendRequest, type SmsSendResult } from './base-provider';

/**
 * Dev/test SMS provider. Logs the message rather than dispatching it to a
 * real carrier. Used as the default when no real provider (Twilio, SNS,
 * Vonage, …) is configured, so dev environments don't need credentials.
 */
export class ConsoleSmsProvider extends BaseSmsProvider {
  constructor() {
    super({});
  }

  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    const messageId = this.generateMessageId();
    const normalised = BaseSmsProvider.normalisePhone(request.to);
    if (!normalised) {
      return {
        success: false,
        error: `Invalid phone number: ${request.to}`,
      };
    }

    const maskedTo = ConsoleSmsProvider.maskPhone(normalised);

    // Console-style banner so this is easy to spot in dev logs. Defense in
    // depth: the recipient phone number is masked and the message body is
    // NOT logged, so even if this dev-only provider is reached in a misconfig
    // it does not leak PII or message content to the logs.

    console.log('\n' + '='.repeat(60));

    console.log('📱 SMS SENT VIA CONSOLE PROVIDER');

    console.log('='.repeat(60));

    console.log(`📨 Message ID: ${messageId}`);

    console.log(`📤 To: ${maskedTo}`);

    console.log(`📝 Body: [redacted — ${request.message.length} chars]`);

    console.log('='.repeat(60) + '\n');

    logger.info(`Console SMS sent: ${messageId} to ${maskedTo}`);

    return {
      success: true,
      messageId,
      status: 'sent',
    };
  }

  /** Mask all but the last 2 digits of a phone number for logging. */
  static maskPhone(phone: string): string {
    const visible = phone.slice(-2);
    const masked = '*'.repeat(Math.max(0, phone.length - 2));
    return `${masked}${visible}`;
  }

  getName(): string {
    return 'Console SMS Provider';
  }

  validateConfiguration(): boolean {
    return true;
  }
}
