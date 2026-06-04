import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withTransaction } from './publish.js';

function makeMocks() {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
  };
  const nats = {
    publish: vi.fn(),
  };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient & {
      query: ReturnType<typeof vi.fn>;
      release: ReturnType<typeof vi.fn>;
    },
    nats: nats as unknown as NatsConnection,
    natsMock: nats,
    poolMock: pool,
    clientMock: client,
  };
}

describe('withTransaction', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
  });

  it('runs BEGIN, the work function, and COMMIT in order on success', async () => {
    const order: string[] = [];
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      order.push(sql);
      return { rows: [] };
    });

    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async () => {
      order.push('fn');
      return 'result';
    });

    expect(order).toEqual(['BEGIN', 'fn', 'COMMIT']);
    expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('publishes staged events ONLY after the commit succeeds (CAD publish-after-commit)', async () => {
    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
      publish({ type: 'pets.created', id: 'evt-1', payload: { petId: 'p1' } });
      publish({ type: 'pets.created', id: 'evt-2', payload: { petId: 'p2' } });
      // No publish should have happened yet — we're pre-commit.
      expect(mocks.natsMock.publish).not.toHaveBeenCalled();
    });

    expect(mocks.natsMock.publish).toHaveBeenCalledTimes(2);
    expect(mocks.natsMock.publish).toHaveBeenNthCalledWith(
      1,
      'pets.created',
      expect.stringContaining('"id":"evt-1"')
    );
    expect(mocks.natsMock.publish).toHaveBeenNthCalledWith(
      2,
      'pets.created',
      expect.stringContaining('"id":"evt-2"')
    );
  });

  it('does NOT publish staged events when the work function throws (no phantom events on rollback)', async () => {
    const boom = new Error('work blew up');

    await expect(
      withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
        publish({ type: 'pets.created', id: 'evt-1', payload: {} });
        throw boom;
      })
    ).rejects.toThrow('work blew up');

    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
    expect(mocks.clientMock.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('does NOT publish staged events when COMMIT itself fails', async () => {
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql === 'COMMIT') {
        throw new Error('serialization failure');
      }
      return { rows: [] };
    });

    await expect(
      withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
        publish({ type: 'pets.created', id: 'evt-1', payload: {} });
      })
    ).rejects.toThrow('serialization failure');

    expect(mocks.natsMock.publish).not.toHaveBeenCalled();
    expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('releases the client even when ROLLBACK also fails', async () => {
    mocks.clientMock.query.mockImplementation(async (sql: string) => {
      if (sql === 'ROLLBACK') {
        throw new Error('connection already gone');
      }
      return { rows: [] };
    });

    await expect(
      withTransaction({ pool: mocks.pool, nats: mocks.nats }, async () => {
        throw new Error('original error');
      })
    ).rejects.toThrow('original error');

    expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('stamps occurredAt with the provided value when set', async () => {
    const occurredAt = new Date('2026-01-15T10:30:00Z');

    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
      publish({ type: 'pets.created', id: 'evt-1', occurredAt, payload: {} });
    });

    const [, body] = mocks.natsMock.publish.mock.calls[0];
    const envelope = JSON.parse(body as string);
    expect(envelope.occurredAt).toBe('2026-01-15T10:30:00.000Z');
  });
});
