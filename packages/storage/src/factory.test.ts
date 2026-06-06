import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorageProvider } from './factory.js';
import type { StorageConfig } from './config.js';

const dirs: string[] = [];

const makeLocalConfig = async (): Promise<StorageConfig> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'storage-factory-'));
  dirs.push(directory);
  return {
    provider: 'local',
    local: { directory, publicPath: '/uploads' },
    s3: {},
  };
};

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true })));
});

describe('createStorageProvider', () => {
  it('returns the local provider for provider "local"', async () => {
    const provider = createStorageProvider(await makeLocalConfig());
    expect(provider.getName()).toBe('local');
  });

  it('returns the s3 provider for provider "s3"', () => {
    const config: StorageConfig = {
      provider: 's3',
      local: { directory: 'uploads', publicPath: '/uploads' },
      s3: {
        bucket: 'b',
        region: 'eu-west-2',
        accessKeyId: 'k',
        secretAccessKey: 's',
      },
    };

    const provider = createStorageProvider(config);
    expect(provider.getName()).toBe('s3');
  });

  it('throws when the s3 provider is misconfigured', () => {
    const config: StorageConfig = {
      provider: 's3',
      local: { directory: 'uploads', publicPath: '/uploads' },
      s3: { bucket: 'b' },
    };

    expect(() => createStorageProvider(config)).toThrow(/misconfigured/);
  });
});
