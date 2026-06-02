import logger from '../utils/logger';
import {
  BaseSmsProvider,
  type SmsProvider,
  type SmsSendRequest,
  type SmsSendResult,
} from './sms-providers/base-provider';
import { getSmsProvider } from './sms-providers';

export type SmsServiceConfig = {
  /** Pre-built provider, used by tests and by callers that swap providers at runtime. */
  provider?: SmsProvider;
  /** ISO country code (e.g. "44") to assume when the user's phone has no leading +. */
  defaultCountryCode?: string;
};

/**
 * Single-instance SMS orchestrator. Picks a provider implementation, holds a
 * default country code for phone normalisation, and exposes `send` for the
 * notification service.
 *
 * Today only the ConsoleSmsProvider ships in the repo. Adding a real provider
 * (Twilio, AWS SNS, Vonage, …) is a matter of:
 *   1. Implement BaseSmsProvider.send() against the carrier's SDK
 *   2. Construct it from env in a factory and pass it via SmsServiceConfig.provider
 * The notification service does NOT need to change.
 */
export class SmsService {
  private readonly injectedProvider?: SmsProvider;
  private readonly defaultCountryCode?: string;

  constructor(config: SmsServiceConfig = {}) {
    this.injectedProvider = config.provider;
    this.defaultCountryCode = config.defaultCountryCode;
    // NB: deliberately NOT resolving the provider in the constructor. The
    // default singleton below is instantiated at module load, which happens
    // before some test files' `vi.mock('../utils/logger', ...)` factories
    // return their default export. The factory (`getSmsProvider`) logs on
    // resolution, so we resolve lazily on first send() instead — which also
    // lets the factory's production guard (throw on console-in-prod) surface
    // at send time, where the notification service already catches it.
  }

  /**
   * Resolve the provider. An explicitly-injected provider wins (tests, runtime
   * swaps); otherwise we go through the prod-guarded `getSmsProvider()` factory
   * so production never silently falls back to the console provider.
   */
  private resolveProvider(): SmsProvider {
    return this.injectedProvider ?? getSmsProvider();
  }

  getProviderName(): string {
    return this.resolveProvider().getName();
  }

  async send(request: SmsSendRequest): Promise<SmsSendResult> {
    if (!request.to || !request.message) {
      return { success: false, error: 'Both `to` and `message` are required' };
    }
    if (request.message.length > 1600) {
      // Twilio max body; carriers segment into 153-char SMS pieces. We refuse
      // anything beyond Twilio's hard cap so callers chunk before us rather
      // than after the carrier rejects.
      return { success: false, error: 'Message exceeds 1600 characters' };
    }

    const normalised = BaseSmsProvider.normalisePhone(request.to, this.defaultCountryCode);
    if (!normalised) {
      return { success: false, error: `Invalid phone number: ${request.to}` };
    }

    try {
      const provider = this.resolveProvider();
      const result = await provider.send({ ...request, to: normalised });
      if (!result.success) {
        logger.error(`SMS send failed via ${provider.getName()}: ${result.error}`);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown SMS error';
      logger.error(`SMS provider threw: ${message}`);
      return { success: false, error: message };
    }
  }
}

/**
 * Default app-wide SMS service. Apps that need a custom provider should
 * construct their own SmsService with `new SmsService({ provider })`
 * rather than relying on this singleton.
 */
export const smsService = new SmsService({
  defaultCountryCode: process.env.SMS_DEFAULT_COUNTRY_CODE,
});
