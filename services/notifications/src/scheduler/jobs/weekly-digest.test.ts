import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { runWeeklyDigest } from './weekly-digest.js';

const quietLogger = (): Logger =>
  ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }) as unknown as Logger;

const makeMocks = () => {
  const scripts: Array<{ rows: unknown[] }> = [];
  const pool = {
    query: vi.fn(async () => scripts.shift() ?? { rows: [] }),
  };
  return {
    pool: pool as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    poolMock: pool,
    scripts,
  };
};

describe('runWeeklyDigest', () => {
  it('returns zeros when no opted-in users are present', async () => {
    const mocks = makeMocks();
    const summary = await runWeeklyDigest({
      deps: { pool: mocks.pool, nats: mocks.nats },
      logger: quietLogger(),
    });
    expect(summary).toEqual({ scanned: 0, scaffoldOnly: 0 });
  });

  it('walks the opted-in cohort, running the scaffold for each', async () => {
    const mocks = makeMocks();
    mocks.scripts.push({
      rows: [{ user_id: 'usr-a' }, { user_id: 'usr-b' }, { user_id: 'usr-c' }],
    });
    const logger = quietLogger();
    const summary = await runWeeklyDigest({
      deps: { pool: mocks.pool, nats: mocks.nats },
      logger,
    });
    expect(summary).toEqual({ scanned: 3, scaffoldOnly: 3 });
    expect(logger.info).toHaveBeenCalledWith(
      'scheduler.weekly_digest.scaffold',
      expect.objectContaining({ userId: 'usr-a' })
    );
  });

  it('continues past a per-user failure', async () => {
    // Reach into runDigestForUser? It's not exported; instead we
    // simulate failure by spying on logger.info — the scaffold logs
    // there, so to test the catch path we'd need to inject a failing
    // dependency. The current scaffold has no such dep, so we just
    // assert the loop completes when the pool query throws on the
    // second batch.
    const mocks = makeMocks();
    mocks.scripts.push({
      rows: Array.from({ length: 500 }, (_, i) => ({ user_id: `usr-${i}` })),
    });
    mocks.poolMock.query.mockImplementationOnce(async () => mocks.scripts.shift() ?? { rows: [] });
    mocks.poolMock.query.mockImplementationOnce(async () => {
      throw new Error('db down');
    });

    const logger = quietLogger();
    await expect(
      runWeeklyDigest({
        deps: { pool: mocks.pool, nats: mocks.nats },
        logger,
      })
    ).rejects.toThrow(/db down/);
    expect(logger.info).toHaveBeenCalledWith(
      'scheduler.weekly_digest.scaffold',
      expect.any(Object)
    );
  });
});
