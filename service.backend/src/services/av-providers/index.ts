import * as path from 'path';

import { config } from '../../config';
import { logger, loggerHelpers } from '../../utils/logger';
import { AvProvider } from './base-provider';
import { ClamAvProvider } from './clamav-provider';
import { NoopAvProvider } from './noop-provider';

let cachedProvider: AvProvider | null = null;

const KNOWN_PROVIDERS = new Set(['noop', 'clamav']);

export function getAvProvider(): AvProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const requested = config.av.provider;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!KNOWN_PROVIDERS.has(requested)) {
    const message =
      `Unknown AV_PROVIDER value: "${requested}". ` +
      `Expected one of: ${[...KNOWN_PROVIDERS].join(', ')}.`;
    if (isProduction) {
      throw new Error(message);
    }
    logger.warn(`${message} Falling back to noop provider for non-production.`);
    cachedProvider = new NoopAvProvider();
    logProviderInitialized('noop');
    return cachedProvider;
  }

  if (isProduction && requested === 'noop') {
    throw new Error(
      'AV_PROVIDER=noop is not permitted in production. Set AV_PROVIDER=clamav and provide CLAMAV_HOST/CLAMAV_PORT.'
    );
  }

  switch (requested) {
    case 'clamav': {
      const provider = new ClamAvProvider({
        host: config.av.clamav.host,
        port: config.av.clamav.port,
        timeoutMs: config.av.clamav.timeoutMs,
        allowedRoots: [path.resolve(config.storage.local.directory)],
      });
      if (!provider.validateConfiguration()) {
        throw new Error('ClamAV provider misconfigured: CLAMAV_HOST and CLAMAV_PORT are required');
      }
      cachedProvider = provider;
      break;
    }
    case 'noop':
    default:
      cachedProvider = new NoopAvProvider();
      break;
  }

  logProviderInitialized(requested);
  return cachedProvider;
}

/**
 * ADS-602: startup smoke check. Resolves only when the configured
 * provider is actually reachable. For ClamAV this means a successful
 * PING/PONG round-trip; for noop it's an immediate success. Call this
 * from server startup so a misconfigured AV daemon fails the boot
 * instead of silently rejecting every upload at request time.
 */
export async function initializeAvProvider(): Promise<void> {
  const provider = getAvProvider();
  if (provider instanceof ClamAvProvider) {
    await provider.ping();
    logger.info('ClamAV daemon reachable (PING/PONG ok)', {
      host: config.av.clamav.host,
      port: config.av.clamav.port,
    });
  }
}

export function resetAvProviderForTests(): void {
  cachedProvider = null;
}

function logProviderInitialized(provider: string): void {
  loggerHelpers.logExternalService('AV Provider', 'Provider Initialized', {
    provider,
    environment: process.env.NODE_ENV,
  });
}
