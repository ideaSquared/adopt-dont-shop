import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-characters-long-12345',
    REDIS_URL: undefined,
  },
}));

vi.mock('../../models/WebhookEventId', () => ({
  __esModule: true,
  default: {
    destroy: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import WebhookEventId from '../../models/WebhookEventId';
import { purgeStaleWebhookEvents } from '../../jobs/webhook-events-purge.job';

describe('purgeStaleWebhookEvents (ADS-734)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes rows whose received_at is older than the 7-day retention', async () => {
    (WebhookEventId.destroy as ReturnType<typeof vi.fn>).mockResolvedValue(4);

    const deleted = await purgeStaleWebhookEvents();

    expect(deleted).toBe(4);
    expect(WebhookEventId.destroy).toHaveBeenCalledTimes(1);
    const call = (WebhookEventId.destroy as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(Object.keys(call.where)).toContain('received_at');
    const clause = call.where.received_at as Record<symbol, Date>;
    const symbols = Object.getOwnPropertySymbols(clause);
    expect(symbols.length).toBe(1);
    expect(clause[symbols[0]]).toBeInstanceOf(Date);
  });

  it('returns zero when no rows are stale', async () => {
    (WebhookEventId.destroy as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    const deleted = await purgeStaleWebhookEvents();
    expect(deleted).toBe(0);
  });
});
