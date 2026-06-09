import type { NatsConnection, Subscription } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  GDPR_ERASURE_COMPLETED,
  GDPR_ERASURE_REQUESTED,
  registerGdprSubscriber,
  type GdprErasureCompletedPayload,
  type GdprErasureRequestedPayload,
} from './index.js';

function fakeSubscription(messages: Array<Record<string, unknown>>): Subscription {
  const enc = new TextEncoder();
  const queue = messages.map(m => ({
    subject: GDPR_ERASURE_REQUESTED,
    data: enc.encode(JSON.stringify({ payload: m })),
  }));
  return {
    async *[Symbol.asyncIterator]() {
      for (const m of queue) {
        yield m;
      }
    },
    drain: vi.fn(),
    unsubscribe: vi.fn(),
  } as unknown as Subscription;
}

function fakeNats(payload: GdprErasureRequestedPayload) {
  // publish() callers pass either a JSON string (from publishStaged) or a
  // Uint8Array (from the failure path's raw publish). Store both shapes.
  const published: Array<{ subject: string; data: string | Uint8Array }> = [];
  const nc = {
    subscribe: vi
      .fn()
      .mockReturnValue(fakeSubscription([payload as unknown as Record<string, unknown>])),
    publish: vi.fn((subject: string, data: string | Uint8Array) =>
      published.push({ subject, data })
    ),
  };
  return { nc: nc as unknown as NatsConnection, published };
}

function fakePool(client: PoolClient) {
  return {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
}

const flush = async (): Promise<void> => {
  // The subscriber drives a `for await` loop, plus withTransaction does its
  // own BEGIN → callback → COMMIT chain. We need to step over enough
  // microtasks for all three to settle.
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setImmediate(r));
  }
};

const PAYLOAD: GdprErasureRequestedPayload = {
  userId: 'usr-1',
  correlationId: 'corr-abc',
  requestedAt: '2026-06-09T12:00:00Z',
};

function decode(data: string | Uint8Array): Record<string, unknown> {
  const s = typeof data === 'string' ? data : new TextDecoder().decode(data);
  return JSON.parse(s) as Record<string, unknown>;
}

describe('registerGdprSubscriber', () => {
  it('runs erase inside a transaction and publishes a completion event', async () => {
    const queries: string[] = [];
    const client = {
      query: vi.fn(async (sql: string) => {
        queries.push(sql);
        return { rows: [] };
      }),
      release: vi.fn(),
    } as unknown as PoolClient;

    const { nc, published } = fakeNats(PAYLOAD);
    registerGdprSubscriber({
      nats: nc,
      pool: fakePool(client),
      service: 'auth',
      erase: async () => 7,
    });
    await flush();

    // BEGIN + COMMIT bracket the erase callback.
    expect(queries[0]).toBe('BEGIN');
    expect(queries[queries.length - 1]).toBe('COMMIT');

    // Completion event published after commit.
    expect(published).toHaveLength(1);
    expect(published[0].subject).toBe(GDPR_ERASURE_COMPLETED);
    const env = decode(published[0].data) as { payload: GdprErasureCompletedPayload };
    expect(env.payload).toMatchObject({
      userId: 'usr-1',
      correlationId: 'corr-abc',
      service: 'auth',
      recordsErased: 7,
    });
    expect(env.payload.error).toBeUndefined();
  });

  it('rolls back and publishes a failure completion when erase throws', async () => {
    const client = {
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    } as unknown as PoolClient;

    const { nc, published } = fakeNats(PAYLOAD);
    registerGdprSubscriber({
      nats: nc,
      pool: fakePool(client),
      service: 'notifications',
      erase: async () => {
        throw new Error('boom');
      },
    });
    await flush();

    expect(published).toHaveLength(1);
    const env = decode(published[0].data) as { payload: GdprErasureCompletedPayload };
    expect(env.payload).toMatchObject({
      service: 'notifications',
      recordsErased: 0,
      error: 'boom',
    });
  });

  it('uses gdpr.<service> as the queue group by default', () => {
    const client = { query: vi.fn(), release: vi.fn() } as unknown as PoolClient;
    const subscribe = vi.fn().mockReturnValue(fakeSubscription([]));
    const nc = { subscribe, publish: vi.fn() } as unknown as NatsConnection;
    registerGdprSubscriber({
      nats: nc,
      pool: fakePool(client),
      service: 'pets',
      erase: async () => 0,
    });
    expect(subscribe.mock.calls[0][1]).toMatchObject({ queue: 'gdpr.pets' });
  });
});
