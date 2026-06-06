// Minimal logger contract. Providers accept any object with these optional
// methods (e.g. a Winston logger) and fall back to a no-op when omitted, so the
// package stays decoupled from any one logging implementation.
export type StorageLogger = {
  info?: (message: string, meta?: unknown) => void;
  warn?: (message: string, meta?: unknown) => void;
  error?: (message: string, meta?: unknown) => void;
};

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
