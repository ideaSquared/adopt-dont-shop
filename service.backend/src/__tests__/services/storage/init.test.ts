/**
 * ADS-611 — storage provider-factory smoke tests.
 *
 * `getStorageProvider()` is the only entry point used by the file
 * upload pipeline, so the factory's selection / unknown-provider /
 * S3-misconfig-fail contract is worth pinning down. Pattern mirrors
 * `av-providers/init.test.ts` (ADS-602). Unlike sms/push, the
 * storage factory does NOT forbid `local` in production — local
 * storage is a valid prod choice for single-server deployments.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type LoadedModule = {
  getStorageProvider: () => { getName: () => string };
  resetStorageProviderForTests: () => void;
};

const loadFactoryWithConfig = async (storageConfig: {
  provider: string;
  s3?: {
    bucketName?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}): Promise<LoadedModule> => {
  vi.resetModules();
  vi.doMock('../../../config', () => ({
    config: {
      storage: {
        provider: storageConfig.provider,
        local: {
          directory: 'uploads',
          maxFileSize: 10 * 1024 * 1024,
          serveLocalUploads: true,
        },
        s3: storageConfig.s3 ?? {},
      },
    },
  }));
  vi.doMock('../../../utils/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    loggerHelpers: { logExternalService: vi.fn() },
  }));
  return await import('../../../services/storage');
};

describe('getStorageProvider', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.doUnmock('../../../config');
    vi.doUnmock('../../../utils/logger');
  });

  it('selects the local provider in development', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'local' });
    const provider = mod.getStorageProvider();
    expect(provider.getName()).toBe('local');
    mod.resetStorageProviderForTests();
  });

  it('selects the local provider in production (unlike sms/push factories)', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'local' });
    const provider = mod.getStorageProvider();
    expect(provider.getName()).toBe('local');
    mod.resetStorageProviderForTests();
  });

  it('falls back to local for an unknown provider in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'azure-blob' });
    const provider = mod.getStorageProvider();
    expect(provider.getName()).toBe('local');
    mod.resetStorageProviderForTests();
  });

  it('refuses an unknown provider in production', async () => {
    process.env.NODE_ENV = 'production';
    const mod = await loadFactoryWithConfig({ provider: 'azure-blob' });
    expect(() => mod.getStorageProvider()).toThrow(/Unknown STORAGE_PROVIDER value: "azure-blob"/);
    mod.resetStorageProviderForTests();
  });

  it('rejects s3 at construction time when required credentials are missing', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 's3', s3: {} });
    expect(() => mod.getStorageProvider()).toThrow(
      /S3 storage provider misconfigured: S3_BUCKET_NAME, S3_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required/
    );
    mod.resetStorageProviderForTests();
  });

  it('caches the resolved provider so subsequent calls return the same instance', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'local' });
    const first = mod.getStorageProvider();
    const second = mod.getStorageProvider();
    expect(second).toBe(first);
    mod.resetStorageProviderForTests();
  });

  it('resetStorageProviderForTests releases the cache so a re-init picks new config', async () => {
    process.env.NODE_ENV = 'development';
    const mod = await loadFactoryWithConfig({ provider: 'local' });
    const first = mod.getStorageProvider();
    mod.resetStorageProviderForTests();
    const second = mod.getStorageProvider();
    expect(second).not.toBe(first);
  });
});
