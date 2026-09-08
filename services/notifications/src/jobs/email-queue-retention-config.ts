// Config for the email-queue retention purge job (ADS-1320), read directly
// from process.env rather than through ./config.ts (loadConfig) — this
// service's config.ts is owned by another concurrent change, so this job
// gets its own small, self-contained env reader instead of touching it.
// See docs/env-reference.md's "Retention purge jobs" section.

export type EmailQueueRetentionConfig = {
  retentionDays: number;
  purgeIntervalMs: number;
  batchSize: number;
};

const DEFAULT_RETENTION_DAYS = 365;
const DEFAULT_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 500;

const parsePositiveInt = (raw: string | undefined, fallback: number, name: string): number => {
  const trimmed = raw?.trim();
  const value = trimmed ? Number.parseInt(trimmed, 10) : fallback;
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got "${trimmed}"`);
  }
  return value;
};

export const loadEmailQueueRetentionConfig = (
  env: NodeJS.ProcessEnv = process.env
): EmailQueueRetentionConfig => ({
  retentionDays: parsePositiveInt(
    env.EMAIL_QUEUE_RETENTION_DAYS,
    DEFAULT_RETENTION_DAYS,
    'EMAIL_QUEUE_RETENTION_DAYS'
  ),
  purgeIntervalMs: parsePositiveInt(
    env.EMAIL_QUEUE_PURGE_INTERVAL_MS,
    DEFAULT_PURGE_INTERVAL_MS,
    'EMAIL_QUEUE_PURGE_INTERVAL_MS'
  ),
  batchSize: parsePositiveInt(
    env.EMAIL_QUEUE_PURGE_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    'EMAIL_QUEUE_PURGE_BATCH_SIZE'
  ),
});
