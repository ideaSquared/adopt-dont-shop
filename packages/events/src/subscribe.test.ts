import type { NatsConnection, Subscription } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribe } from './subscribe.js';

// A tiny replayable Subscription stand-in. NATS' real Subscription is an
// async iterable that yields `Msg` objects; we provide our own queue and
// resolve the iterator once the queue is drained.
function makeSubscription(messages: Array<{ subject: string; data: Uint8Array }>): Subscription {
  let index = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          if (index >= messages.length) {
            return { value: undefined, done: true };
          }
          return { value: messages[index++], done: false };
        },
      };
    },
  } as unknown as Subscription;
}

function makeNats(messages: Array<{ subject: string; data: Uint8Array }>) {
  const subscription = makeSubscription(messages);
  const subscribeFn = vi.fn().mockReturnValue(subscription);
  return {
    nats: { subscribe: subscribeFn } as unknown as NatsConnection,
    subscribeFn,
  };
}

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}

// Spin until all queued microtasks settle. Used because subscribe() drives
// the for-await loop in a fire-and-forget IIFE.
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe('subscribe', () => {
  let calls: Array<{ payload: unknown; meta: { subject: string; id?: string } }>;

  beforeEach(() => {
    calls = [];
  });

  it('invokes the handler once per message with the decoded payload + envelope metadata', async () => {
    const { nats } = makeNats([
      {
        subject: 'pets.created',
        data: encode({ id: 'evt-1', occurredAt: '2026-01-01T00:00:00Z', payload: { petId: 'p1' } }),
      },
      {
        subject: 'pets.created',
        data: encode({ id: 'evt-2', occurredAt: '2026-01-01T00:00:01Z', payload: { petId: 'p2' } }),
      },
    ]);

    subscribe<{ petId: string }>(nats, { subject: 'pets.created' }, async (payload, meta) => {
      calls.push({ payload, meta: { subject: meta.subject, id: meta.id } });
    });

    await flushMicrotasks();

    expect(calls).toEqual([
      { payload: { petId: 'p1' }, meta: { subject: 'pets.created', id: 'evt-1' } },
      { payload: { petId: 'p2' }, meta: { subject: 'pets.created', id: 'evt-2' } },
    ]);
  });

  it('continues processing after a handler throws (CAD #4 — no poison-pill crash)', async () => {
    const errors: unknown[] = [];
    const { nats } = makeNats([
      { subject: 's', data: encode({ id: '1', payload: { ok: true } }) },
      { subject: 's', data: encode({ id: '2', payload: { ok: false } }) },
      { subject: 's', data: encode({ id: '3', payload: { ok: true } }) },
    ]);

    subscribe<{ ok: boolean }>(
      nats,
      {
        subject: 's',
        onError: err => {
          errors.push(err);
        },
      },
      async payload => {
        if (!payload.ok) {
          throw new Error('handler crashed');
        }
        calls.push({ payload, meta: { subject: 's' } });
      }
    );

    await flushMicrotasks();

    expect(calls.map(c => c.payload)).toEqual([{ ok: true }, { ok: true }]);
    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('handler crashed');
  });

  it('treats a malformed (non-JSON) message as a clean skip', async () => {
    const errors: unknown[] = [];
    const { nats } = makeNats([
      { subject: 's', data: new TextEncoder().encode('not-valid-json{{') },
      { subject: 's', data: encode({ id: '2', payload: { ok: true } }) },
    ]);

    subscribe<{ ok: boolean }>(
      nats,
      {
        subject: 's',
        onError: err => {
          errors.push(err);
        },
      },
      async payload => {
        calls.push({ payload, meta: { subject: 's' } });
      }
    );

    await flushMicrotasks();

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toEqual({ ok: true });
    expect(errors).toHaveLength(1);
  });

  it('passes the queue option through when supplied (load-shared consumers)', async () => {
    const { nats, subscribeFn } = makeNats([]);

    subscribe(nats, { subject: 'pets.>', queue: 'pets-workers' }, async () => undefined);

    expect(subscribeFn).toHaveBeenCalledWith('pets.>', { queue: 'pets-workers' });
  });

  it('does not pass a queue option when omitted', async () => {
    const { nats, subscribeFn } = makeNats([]);

    subscribe(nats, { subject: 'pets.>' }, async () => undefined);

    expect(subscribeFn).toHaveBeenCalledWith('pets.>', undefined);
  });
});
