import type { StorageProvider } from './base-provider.js';
import type { StorageConfig } from './config.js';
import { LocalStorageProvider } from './local-storage-provider.js';
import { S3StorageProvider } from './s3-storage-provider.js';

// Config-injected factory: returns a Local or S3 provider based on
// `config.provider`. Callers own where the config comes from — there is no
// global config import.
export const createStorageProvider = (config: StorageConfig): StorageProvider => {
  if (config.provider === 's3') {
    const provider = new S3StorageProvider(config.s3, config.logger);
    if (!provider.validateConfiguration()) {
      throw new Error(
        'S3 storage provider misconfigured: bucket, region, accessKeyId and secretAccessKey are required'
      );
    }
    return provider;
  }

  return new LocalStorageProvider(config.local, config.logger);
};
