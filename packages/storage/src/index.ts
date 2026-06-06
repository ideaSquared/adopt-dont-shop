// NOTE: Malware / AV scanning is intentionally OUT OF SCOPE for this package.
// The monolith's AV providers are not ported here. Callers (e.g. the gateway)
// use this package without AV for now; integrating a scanning step is a
// documented follow-up.
export { createStorageProvider } from './factory.js';
export { LocalStorageProvider } from './local-storage-provider.js';
export { S3StorageProvider } from './s3-storage-provider.js';
export type { FileInfo, StorageCategory, StorageProvider, UploadResult } from './base-provider.js';
export type {
  LocalStorageConfig,
  S3StorageConfig,
  StorageConfig,
  StorageLogger,
} from './config.js';
