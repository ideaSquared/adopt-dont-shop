import { vi, beforeEach, describe, it, expect } from 'vitest';

/**
 * ADS-105: Report cache degrades gracefully when Redis is unavailable.
 *
 * The whole feature is meant to keep working without the cache, so
 * `get` must return null and `set`/`bust` must not throw when redis
 * is down.
 */

vi.mock('../../lib/redis', () => ({
  ensureRedisReady: vi.fn(async () => false),
  getRedis: vi.fn(() => null),
  isRedisReady: vi.fn(() => false),
}));

import { ReportCache } from '../../services/report-cache.service';
import type { ReportConfig } from '../../schemas/reports.schema';

const config: ReportConfig = {
  filters: {},
  layout: { columns: 2 },
  widgets: [
    {
      id: '11111111-1111-4111-9111-111111111111',
      title: 'X',
      position: { x: 0, y: 0, w: 2, h: 2 },
      metric: 'adoption',
      chartType: 'line',
      options: { xKey: 'date', series: [{ key: 'count', label: 'Count' }] },
    },
  ],
};

describe('ReportCache (Redis down)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('get returns null without throwing', async () => {
    const result = await ReportCache.get('platform', config);
    expect(result).toBeNull();
  });

  it('set is a no-op when Redis is unavailable', async () => {
    await expect(ReportCache.set('platform', config, { foo: 1 })).resolves.toBeUndefined();
  });

  it('bust is a no-op when Redis is unavailable', async () => {
    await expect(ReportCache.bust('platform')).resolves.toBeUndefined();
  });
});
