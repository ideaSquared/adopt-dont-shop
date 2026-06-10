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
  // The JetStream client returns a PubAck from publish(). We capture the
  // subject + decoded payload so the assertions stay payload-shaped rather
  // than asserting on raw bytes.
  const jsPublish = vi
    .fn()
    .mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1, duplicate: false });
  const nats = {
    jetstream: vi.fn().mockReturnValue({ publish: jsPublish }),
  };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient & {
      query: ReturnType<typeof vi.fn>;
      release: ReturnType<typeof vi.fn>;
    },
    nats: nats as unknown as NatsConnection,
    jsPublish,
    poolMock: pool,
    clientMock: client,
  };
}

function decodeBody(body: unknown): Record<string, unknown> {
  const s = body instanceof Uint8Array ? new TextDecoder().decode(body) : String(body);
  return JSON.parse(s) as Record<string, unknown>;
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

  it('publishes staged events to JetStream ONLY after commit, awaiting the ack', async () => {
    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
      publish({ type: 'pets.created', id: 'evt-1', payload: { petId: 'p1' } });
      publish({ type: 'pets.created', id: 'evt-2', payload: { petId: 'p2' } });
      // No publish should have happened yet — we're pre-commit.
      expect(mocks.jsPublish).not.toHaveBeenCalled();
    });

    expect(mocks.jsPublish).toHaveBeenCalledTimes(2);
    expect(mocks.jsPublish.mock.calls[0][0]).toBe('pets.created');
    expect(decodeBody(mocks.jsPublish.mock.calls[0][1])).toMatchObject({ id: 'evt-1' });
    expect(decodeBody(mocks.jsPublish.mock.calls[1][1])).toMatchObject({ id: 'evt-2' });
  });

  it('sets the JetStream msgID to the event id for broker-side de-dup', async () => {
    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
      publish({ type: 'pets.created', id: 'evt-1', payload: { petId: 'p1' } });
    });

    expect(mocks.jsPublish.mock.calls[0][2]).toMatchObject({ msgID: 'evt-1' });
  });

  it('does NOT publish staged events when the work function throws (no phantom events on rollback)', async () => {
    const boom = new Error('work blew up');

    await expect(
      withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
        publish({ type: 'pets.created', id: 'evt-1', payload: {} });
        throw boom;
      })
    ).rejects.toThrow('work blew up');

    expect(mocks.jsPublish).not.toHaveBeenCalled();
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

    expect(mocks.jsPublish).not.toHaveBeenCalled();
    expect(mocks.clientMock.release).toHaveBeenCalledTimes(1);
  });

  it('surfaces a JetStream publish failure to the caller (no silent fire-and-forget)', async () => {
    mocks.jsPublish.mockRejectedValueOnce(new Error('no stream ack'));

    await expect(
      withTransaction({ pool: mocks.pool, nats: mocks.nats }, async ({ publish }) => {
        publish({ type: 'pets.created', id: 'evt-1', payload: {} });
      })
    ).rejects.toThrow('no stream ack');

    // The commit already happened — we do NOT roll back on a publish failure.
    expect(mocks.clientMock.query).toHaveBeenCalledWith('COMMIT');
    expect(mocks.clientMock.query).not.toHaveBeenCalledWith('ROLLBACK');
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

    const envelope = decodeBody(mocks.jsPublish.mock.calls[0][1]);
    expect(envelope.occurredAt).toBe('2026-01-15T10:30:00.000Z');
  });

  it('does not touch JetStream when no events are staged', async () => {
    await withTransaction({ pool: mocks.pool, nats: mocks.nats }, async () => 'ok');
    expect(mocks.nats.jetstream).not.toHaveBeenCalled();
  });
});
