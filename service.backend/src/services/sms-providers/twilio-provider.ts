import logger from '../../utils/logger';
import { BaseSmsProvider, type SmsSendRequest, type SmsSendResult } from './base-provider';

export type TwilioConfig = {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
};

/**
 * Twilio SMS provider scaffold. Vendor wiring deferred — install `twilio`
 * and dispatch via `client.messages.create({...})` when production needs
 * real delivery. Until then, this provider rejects sends fail-closed when
 * selected, but only loads if `SMS_PROVIDER=twilio` is explicitly set so
 * local dev stays on the console provider.
 */
export class TwilioSmsProvider extends BaseSmsProvider {
  private readonly twilioConfig: TwilioConfig;

  constructor(twilioConfig: TwilioConfig) {
    super(twilioConfig);
    this.twilioConfig = twilioConfig;
  }

  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    logger.error('TwilioSmsProvider invoked but implementation not wired', {
      to: request.to,
    });
    return {
      success: false,
      error: 'Twilio provider not implemented — vendor wiring required',
    };
  }

  getName(): string {
    return 'twilio';
  }

  validateConfiguration(): boolean {
    return Boolean(
      this.twilioConfig.accountSid && this.twilioConfig.authToken && this.twilioConfig.fromNumber
    );
  }
}
