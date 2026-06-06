import type { NatsConnection, Subscription } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import type { HandlerDeps } from '../grpc/adapter.js';

import { registerSubscribers } from './subscribers.js';

// Async-iterable stub the subscribe()'s for-await loop can drain
// immediately (no messages → consumer cleans up).
function fakeSubscription(): Subscription {
  return {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ value: undefined, done: true }) as const };
    },
  } as unknown as Subscription;
}

function makeNats(): { nats: NatsConnection; subscribeFn: ReturnType<typeof vi.fn> } {
  const subscribeFn = vi.fn().mockReturnValue(fakeSubscription());
  const nats = { subscribe: subscribeFn } as unknown as NatsConnection;
  return { nats, subscribeFn };
}

const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;
const logger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerSubscribers>[0]['logger'];

describe('registerSubscribers', () => {
  it('subscribes to chat.messageCreated + pets.created + applications.submitted under one queue group', () => {
    const { nats, subscribeFn } = makeNats();
    const subs = registerSubscribers({ nats, deps, logger });

    expect(subs).toHaveLength(3);
    expect(subscribeFn.mock.calls.map(c => c[0])).toEqual([
      'chat.messageCreated',
      'pets.created',
      'applications.submitted',
    ]);
    for (const call of subscribeFn.mock.calls) {
      expect(call[1]).toEqual({ queue: 'moderation-workers' });
    }
  });
});
