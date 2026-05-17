import { config } from '../../config';
import { logger, loggerHelpers } from '../../utils/logger';
import { StorageProvider } from './base-provider';
import { LocalStorageProvider } from './local-storage-provider';
import { S3StorageProvider } from './s3-storage-provider';

let cachedProvider: StorageProvider | null = null;

const KNOWN_PROVIDERS = new Set(['local', 's3']);

export function getStorageProvider(): StorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const requested = config.storage.provider;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!KNOWN_PROVIDERS.has(requested)) {
    const message =
      `Unknown STORAGE_PROVIDER value: "${requested}". ` +
      `Expected one of: ${[...KNOWN_PROVIDERS].join(', ')}.`;
    if (isProduction) {
      throw new Error(message);
    }
    logger.warn(`${message} Falling back to local provider for non-production.`);
    cachedProvider = new LocalStorageProvider();
    logProviderInitialized('local');
    return cachedProvider;
  }

  switch (requested) {
    case 's3': {
      const provider = new S3StorageProvider(config.storage.s3);
      if (!provider.validateConfiguration()) {
        throw new Error(
          'S3 storage provider misconfigured: S3_BUCKET_NAME, S3_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required'
        );
      }
      cachedProvider = provider;
      break;
    }
    case 'local':
    default:
      cachedProvider = new LocalStorageProvider();
      break;
  }

  logProviderInitialized(requested);
  return cachedProvider;
}

export function resetStorageProviderForTests(): void {
  cachedProvider = null;
}

function logProviderInitialized(provider: string): void {
  loggerHelpers.logExternalService('Storage Provider', 'Provider Initialized', {
    provider,
    environment: process.env.NODE_ENV,
  });
}

export { StorageProvider } from './base-provider';
export { LocalStorageProvider } from './local-storage-provider';
export { S3StorageProvider } from './s3-storage-provider';
