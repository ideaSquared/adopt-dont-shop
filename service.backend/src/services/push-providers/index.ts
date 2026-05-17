import { config } from '../../config';
import { logger, loggerHelpers } from '../../utils/logger';
import { PushProvider } from './base-provider';
import { ConsolePushProvider } from './console-provider';
import { FcmPushProvider } from './fcm-provider';

let cachedProvider: PushProvider | null = null;

const KNOWN_PROVIDERS = new Set(['console', 'fcm']);

export function getPushProvider(): PushProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const requested = config.push.provider;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!KNOWN_PROVIDERS.has(requested)) {
    const message =
      `Unknown PUSH_PROVIDER value: "${requested}". ` +
      `Expected one of: ${[...KNOWN_PROVIDERS].join(', ')}.`;
    if (isProduction) {
      throw new Error(message);
    }
    logger.warn(`${message} Falling back to console provider for non-production.`);
    cachedProvider = new ConsolePushProvider();
    logProviderInitialized('console');
    return cachedProvider;
  }

  if (isProduction && requested === 'console') {
    throw new Error('PUSH_PROVIDER=console is not permitted in production.');
  }

  switch (requested) {
    case 'fcm': {
      const provider = new FcmPushProvider(config.push.fcm);
      if (!provider.validateConfiguration()) {
        throw new Error(
          'FCM push provider misconfigured: FCM_SERVICE_ACCOUNT_JSON and FCM_PROJECT_ID are required'
        );
      }
      cachedProvider = provider;
      break;
    }
    case 'console':
    default:
      cachedProvider = new ConsolePushProvider();
      break;
  }

  logProviderInitialized(requested);
  return cachedProvider;
}

export function resetPushProviderForTests(): void {
  cachedProvider = null;
}

function logProviderInitialized(provider: string): void {
  loggerHelpers.logExternalService('Push Provider', 'Provider Initialized', {
    provider,
    environment: process.env.NODE_ENV,
  });
}

export { PushProvider } from './base-provider';
