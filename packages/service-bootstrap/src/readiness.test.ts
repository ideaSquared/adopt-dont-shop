import { describe, expect, it, vi } from 'vitest';

import { checkReadiness } from './readiness.js';

describe('checkReadiness', () => {
  it('is ready with no checks when no dependencies are configured', async () => {
    const result = await checkReadiness({});
    expect(result).toEqual({ ok: true, checks: {} });
  });

  it('probes the database with SELECT 1 and reports ok', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const result = await checkReadiness({ pool: { query } });

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({ ok: true, checks: { database: 'ok' } });
  });

  it('reports the database not ready when the query rejects', async () => {
    const query = vi.fn(async () => {
      throw new Error('connection terminated');
    });
    const result = await checkReadiness({ pool: { query } });

    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe('error');
  });

  it('reports nats not ready when the connection is closed', async () => {
    const result = await checkReadiness({ nats: { isClosed: () => true } });
    expect(result).toEqual({ ok: false, checks: { nats: 'error' } });
  });

  it('reports nats ready when the connection is open', async () => {
    const result = await checkReadiness({ nats: { isClosed: () => false } });
    expect(result).toEqual({ ok: true, checks: { nats: 'ok' } });
  });

  it('probes redis with PING and reports ok', async () => {
    const ping = vi.fn(async () => 'PONG');
    const result = await checkReadiness({ redis: { ping } });

    expect(ping).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, checks: { redis: 'ok' } });
  });

  it('is not ready overall when any single dependency fails', async () => {
    const result = await checkReadiness({
      pool: { query: vi.fn(async () => ({ rows: [] })) },
      nats: { isClosed: () => false },
      redis: {
        ping: vi.fn(async () => {
          throw new Error('LOADING Redis is loading the dataset in memory');
        }),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.checks).toEqual({ database: 'ok', nats: 'ok', redis: 'error' });
  });

  it('treats a probe that never resolves as a failure (bounded by the timeout)', async () => {
    vi.useFakeTimers();
    try {
      const promise = checkReadiness(
        { pool: { query: vi.fn(() => new Promise<never>(() => undefined)) } },
        { timeoutMs: 1_000 }
      );
      await vi.advanceTimersByTimeAsync(1_001);
      const result = await promise;

      expect(result.ok).toBe(false);
      expect(result.checks.database).toBe('error');
    } finally {
      vi.useRealTimers();
    }
  });

  it('logs a warning naming the failed dependency', async () => {
    const warn = vi.fn();
    const logger = {
      info: () => undefined,
      error: () => undefined,
      warn,
      debug: () => undefined,
      silly: () => undefined,
    } as unknown as ReturnType<typeof import('@adopt-dont-shop/observability').createLogger>;

    await checkReadiness({ nats: { isClosed: () => true } }, { logger });

    expect(warn).toHaveBeenCalledWith(
      'readiness probe failed',
      expect.objectContaining({ check: 'nats' })
    );
  });
});
