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

    // Console-style banner so this is easy to spot in dev logs.
    // eslint-disable-next-line no-console
    console.log('\n' + '='.repeat(60));
    // eslint-disable-next-line no-console
    console.log('📱 SMS SENT VIA CONSOLE PROVIDER');
    // eslint-disable-next-line no-console
    console.log('='.repeat(60));
    // eslint-disable-next-line no-console
    console.log(`📨 Message ID: ${messageId}`);
    // eslint-disable-next-line no-console
    console.log(`📤 To: ${normalised}`);
    // eslint-disable-next-line no-console
    console.log(`📝 Body: ${request.message}`);
    // eslint-disable-next-line no-console
    console.log('='.repeat(60) + '\n');

    logger.info(`Console SMS sent: ${messageId} to ${normalised}`);

    return {
      success: true,
      messageId,
      status: 'sent',
    };
  }

  getName(): string {
    return 'Console SMS Provider';
  }

  validateConfiguration(): boolean {
    return true;
  }
}
