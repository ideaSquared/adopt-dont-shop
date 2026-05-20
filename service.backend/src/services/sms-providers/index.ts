import { config } from '../../config';
import { logger, loggerHelpers } from '../../utils/logger';
import { SmsProvider } from './base-provider';
import { ConsoleSmsProvider } from './console-provider';
import { TwilioSmsProvider } from './twilio-provider';

let cachedProvider: SmsProvider | null = null;

const KNOWN_PROVIDERS = new Set(['console', 'twilio']);

export function getSmsProvider(): SmsProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const requested = config.sms.provider;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!KNOWN_PROVIDERS.has(requested)) {
    const message =
      `Unknown SMS_PROVIDER value: "${requested}". ` +
      `Expected one of: ${[...KNOWN_PROVIDERS].join(', ')}.`;
    if (isProduction) {
      throw new Error(message);
    }
    logger.warn(`${message} Falling back to console provider for non-production.`);
    cachedProvider = new ConsoleSmsProvider();
    logProviderInitialized('console');
    return cachedProvider;
  }

  if (isProduction && requested === 'console') {
    throw new Error('SMS_PROVIDER=console is not permitted in production.');
  }

  switch (requested) {
    case 'twilio': {
      const provider = new TwilioSmsProvider(config.sms.twilio);
      if (!provider.validateConfiguration()) {
        throw new Error(
          'Twilio SMS provider misconfigured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER are required'
        );
      }
      cachedProvider = provider;
      break;
    }
    case 'console':
    default:
      cachedProvider = new ConsoleSmsProvider();
      break;
  }

  logProviderInitialized(requested);
  return cachedProvider;
}

export function resetSmsProviderForTests(): void {
  cachedProvider = null;
}

function logProviderInitialized(provider: string): void {
  loggerHelpers.logExternalService('SMS Provider', 'Provider Initialized', {
    provider,
    environment: process.env.NODE_ENV,
  });
}

export { SmsProvider } from './base-provider';
