import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  GDPR_ERASURE_COMPLETED,
  GDPR_ERASURE_REQUESTED,
  registerGdprSubscriber,
  type GdprErasureCompletedPayload,
  type GdprErasureRequestedPayload,
} from './index.js';

// JetStream fake tuned for the saga: the request event sits in the durable
// stream backlog (modelling "arrived while this service was restarting"), the
// subscriber binds a durable consumer and replays it, and js.publish()
// captures the completion event. One bus serves both the read (consume) and
// write (publish) sides — the same NatsConnection the saga uses for both.
function makeBus(request: GdprErasureRequestedPayload) {
  const published: Array<{ subject: string; data: Uint8Array; opts?: { msgID?: string } }> = [];

  // The request event is already durably in the stream before the subscriber
  // exists — the compliance scenario this migration fixes.
  const backlog = new TextEncoder().encode(JSON.stringify({ payload: request }));

  const consumersAdded: Array<{ durable_name?: string; filter_subject?: string }> = [];

  const jsm = {
    consumers: {
      add: vi.fn(
        async (_stream: string, cfg: { durable_name?: string; filter_subject?: string }) => {
          consumersAdded.push(cfg);
          return cfg;
        }
      ),
    },
  };

  const js = {
    publish: vi.fn(async (subject: string, data: Uint8Array, opts?: { msgID?: string }) => {
      published.push({ subject, data, opts });
      return { stream: 'DOMAIN_EVENTS', seq: published.length, duplicate: false };
    }),
    consumers: {
      get: vi.fn(async (_stream: string, durable: string) => {
        const cfg = consumersAdded.find(c => c.durable_name === durable);
        const onlyRequest = cfg?.filter_subject === GDPR_ERASURE_REQUESTED;
        return {
          consume: vi.fn(async () => ({
            async *[Symbol.asyncIterator]() {
              if (onlyRequest) {
                yield {
                  subject: GDPR_ERASURE_REQUESTED,
                  data: backlog,
                  ack: vi.fn(),
                  nak: vi.fn(),
                  term: vi.fn(),
                  redelivered: false,
                };
              }
            },
            close: vi.fn(async () => undefined),
          })),
        };
      }),
    },
  };

  const nc = {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;

  return { nc, published, consumersAdded };
}

function fakePool(client: PoolClient): Pool {
  return {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
}

const flush = async (): Promise<void> => {
  // The subscriber drives a consume loop, plus withTransaction does its own
  // BEGIN → callback → COMMIT chain and an awaited JetStream publish. Step
  // over enough microtasks for all of it to settle.
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setImmediate(r));
  }
};

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-1',
  correlationId: 'corr-abc',
  requestedAt: '2026-06-09T12:00:00Z',
};

function decode(data: Uint8Array): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(data)) as Record<string, unknown>;
}

describe('registerGdprSubscriber', () => {
  it('replays a request from the durable stream, erases in a transaction, and publishes completion', async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      }),
      release: vi.fn(),
    } as unknown as PoolClient;

    const bus = makeBus(PAYLOAD);
    registerGdprSubscriber({
      nats: bus.nc,
      pool: fakePool(client),
      service: 'auth',
      erase: async () => 7,
    });
    await flush();

    // BEGIN + COMMIT bracket the erase callback.
    expect(queries[0]).toBe('BEGIN');
    expect(queries[queries.length - 1]).toBe('COMMIT');

    // Completion event published to JetStream after commit.
    expect(bus.published).toHaveLength(1);
    expect(bus.published[0].subject).toBe(GDPR_ERASURE_COMPLETED);
    const env = decode(bus.published[0].data) as { payload: GdprErasureCompletedPayload };
    expect(env.payload).toMatchObject({
      userId: 'usr-1',
      correlationId: 'corr-abc',
      service: 'auth',
      recordsErased: 7,
    });
    expect(env.payload.error).toBeUndefined();
  });

  it('rolls back and publishes a (durable) failure completion when erase throws', async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    } as unknown as PoolClient;

    const bus = makeBus(PAYLOAD);
    registerGdprSubscriber({
      nats: bus.nc,
      pool: fakePool(client),
      service: 'notifications',
      erase: async () => {
        throw new Error('boom');
      },
    });
    await flush();

    expect(bus.published).toHaveLength(1);
    const env = decode(bus.published[0].data) as { payload: GdprErasureCompletedPayload };
    expect(env.payload).toMatchObject({
      service: 'notifications',
      recordsErased: 0,
      error: 'boom',
    });
    // The failure completion is published with a msgID for de-dup.
    expect(bus.published[0].opts).toMatchObject({ msgID: 'corr-abc.notifications' });
  });

  it('binds a durable consumer named gdpr-<service> by default', async () => {
    const client = { query: vi.fn(), release: vi.fn() } as unknown as PoolClient;
    const bus = makeBus(PAYLOAD);
    registerGdprSubscriber({
      nats: bus.nc,
      pool: fakePool(client),
      service: 'pets',
      erase: async () => 0,
    });
    await flush();

    expect(bus.consumersAdded[0]).toMatchObject({
      durable_name: 'gdpr-pets',
      filter_subject: GDPR_ERASURE_REQUESTED,
    });
  });
});
