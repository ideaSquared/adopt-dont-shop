import { describe, expect, it } from 'vitest';

import { loadEmailQueueRetentionConfig } from './email-queue-retention-config.js';

describe('loadEmailQueueRetentionConfig', () => {
  it('uses the documented defaults when unset', () => {
    const config = loadEmailQueueRetentionConfig({});
    expect(config).toEqual({
      retentionDays: 365,
      purgeIntervalMs: 24 * 60 * 60 * 1000,
      batchSize: 500,
    });
  });

  it('honours env overrides', () => {
    const config = loadEmailQueueRetentionConfig({
      EMAIL_QUEUE_RETENTION_DAYS: '30',
      EMAIL_QUEUE_PURGE_INTERVAL_MS: '3600000',
      EMAIL_QUEUE_PURGE_BATCH_SIZE: '100',
    });
    expect(config).toEqual({ retentionDays: 30, purgeIntervalMs: 3_600_000, batchSize: 100 });
  });

  it('rejects a non-numeric retention days value', () => {
    expect(() => loadEmailQueueRetentionConfig({ EMAIL_QUEUE_RETENTION_DAYS: 'forever' })).toThrow(
      /EMAIL_QUEUE_RETENTION_DAYS must be a positive integer/
    );
  });

  it('rejects a zero batch size', () => {
    expect(() => loadEmailQueueRetentionConfig({ EMAIL_QUEUE_PURGE_BATCH_SIZE: '0' })).toThrow(
      /EMAIL_QUEUE_PURGE_BATCH_SIZE must be a positive integer/
    );
  });
});
