import type { BaseLogger } from '@adopt-dont-shop/observability';

// Providers accept any shared logger (or a subset of its methods) and fall back
// to a no-op when omitted.
export type StorageLogger = Partial<Pick<BaseLogger, 'info' | 'warn' | 'error'>>;

export type LocalStorageConfig = {
  directory: string;
  publicPath: string;
};

export type S3StorageConfig = {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  cloudFrontDomain?: string;
};

// Mirrors the monolith's `config.storage` shape. Injected into providers via
// the factory rather than read from a global, so any service can own its own
// configuration source.
export type StorageConfig = {
  provider: 'local' | 's3';
  local: LocalStorageConfig;
  s3: S3StorageConfig;
  logger?: StorageLogger;
};

const NOOP = () => {};

// Resolve a logger that always has callable info/warn/error methods, so call
// sites never need to null-check.
export const resolveLogger = (logger?: StorageLogger): Required<StorageLogger> => ({
  info: logger?.info ?? NOOP,
  warn: logger?.warn ?? NOOP,
  error: logger?.error ?? NOOP,
});
