import type { NatsConnection, Subscription } from 'nats';
import type { Socket } from 'socket.io';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { registerNotificationSubscribers } from './notifications-subscriber.js';
import { SocketRegistry } from './socket-registry.js';

function fakeSocket(): Socket & { emit: ReturnType<typeof vi.fn> } {
  return { emit: vi.fn() } as unknown as Socket & { emit: ReturnType<typeof vi.fn> };
}

function quietLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  } as unknown as Logger;
}

// Fake NatsConnection that captures subscriptions and exposes a way to
// inject messages back through them. The @adopt-dont-shop/events
// `subscribe` helper calls `nats.subscribe(subject, opts?)` then
// runs a for-await loop on the returned Subscription; we hand it a
// fresh async iterable per subject so the test can push test events
// in deterministically.
function makeNats(): {
  nats: NatsConnection;
  subscribeFn: ReturnType<typeof vi.fn>;
  push: (subject: string, payload: unknown, id?: string) => Promise<void>;
} {
  const queues = new Map<
    string,
    { resolve: (msg: { subject: string; data: Uint8Array } | typeof DONE) => void }[]
  >();
  const DONE = Symbol('done');

  const subscribeFn = vi.fn((subject: string) => {
    const sub = {
      [Symbol.asyncIterator]() {
        return {
          next: (): Promise<{ value: { subject: string; data: Uint8Array }; done: boolean }> => {
            return new Promise(resolve => {
              const waiters = queues.get(subject) ?? [];
              waiters.push({
                resolve: msg => {
                  if (msg === DONE) {
                    resolve({ value: undefined as never, done: true });
                  } else {
                    resolve({ value: msg, done: false });
                  }
                },
              });
              queues.set(subject, waiters);
            });
          },
        };
      },
    };
    return sub as unknown as Subscription;
  });

  const nats = { subscribe: subscribeFn } as unknown as NatsConnection;

  const push = async (subject: string, payload: unknown, id = 'evt-1'): Promise<void> => {
    const waiters = queues.get(subject);
    const waiter = waiters?.shift();
    if (!waiter) {
      throw new Error(`no waiter on ${subject}`);
    }
    const envelope = { id, occurredAt: '2026-06-01T10:00:00Z', payload };
    waiter.resolve({
      subject,
      data: new TextEncoder().encode(JSON.stringify(envelope)),
    });
    // Yield so the subscribe loop's microtask consumes the message
    // before the caller asserts on the side effects.
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  return { nats, subscribeFn, push };
}

describe('registerNotificationSubscribers — wiring', () => {
  it('subscribes to notifications.created AND notifications.dismissed', () => {
    const { nats, subscribeFn } = makeNats();
    registerNotificationSubscribers({
      nats,
      registry: new SocketRegistry(),
      logger: quietLogger(),
    });

    expect(subscribeFn).toHaveBeenCalledTimes(2);
    const subjects = subscribeFn.mock.calls.map(c => c[0]);
    expect(subjects).toEqual(['notifications.created', 'notifications.dismissed']);
  });

  it('does NOT use a queue group — every gateway replica sees every event', () => {
    const { nats, subscribeFn } = makeNats();
    registerNotificationSubscribers({
      nats,
      registry: new SocketRegistry(),
      logger: quietLogger(),
    });

    // Second arg is the subscribe-options object @adopt-dont-shop/events
    // hands the underlying client. queue absent → no queue grouping.
    for (const call of subscribeFn.mock.calls) {
      expect(call[1]).toBeUndefined();
    }
  });
});

describe('registerNotificationSubscribers — fan-out behaviour', () => {
  it('emits notification:created to every socket the recipient has on THIS replica', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    const s2 = fakeSocket();
    const otherUserSocket = fakeSocket();
    registry.add('usr-recipient', s1);
    registry.add('usr-recipient', s2);
    registry.add('usr-other', otherUserSocket);

    registerNotificationSubscribers({ nats, registry, logger: quietLogger() });

    await push('notifications.created', {
      notificationId: 'n-1',
      userId: 'usr-recipient',
      type: 'application_status',
      channel: 'in_app',
    });

    expect(s1.emit).toHaveBeenCalledWith(
      'notification:created',
      expect.objectContaining({
        notificationId: 'n-1',
        userId: 'usr-recipient',
      })
    );
    expect(s2.emit).toHaveBeenCalledWith(
      'notification:created',
      expect.objectContaining({
        notificationId: 'n-1',
      })
    );
    expect(otherUserSocket.emit).not.toHaveBeenCalled();
  });

  it('emits notification:dismissed only to the recipient', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const target = fakeSocket();
    registry.add('usr-1', target);

    registerNotificationSubscribers({ nats, registry, logger: quietLogger() });

    await push('notifications.dismissed', {
      notificationId: 'n-9',
      userId: 'usr-1',
    });

    expect(target.emit).toHaveBeenCalledWith(
      'notification:dismissed',
      expect.objectContaining({
        notificationId: 'n-9',
      })
    );
  });

  it('no-ops when the recipient has no connected sockets on this replica', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const otherUserSocket = fakeSocket();
    registry.add('usr-other', otherUserSocket);

    registerNotificationSubscribers({ nats, registry, logger: quietLogger() });

    // No throw — the subscriber's poison-pill protection treats the
    // event as a clean fan-out to zero sockets.
    await push('notifications.created', {
      notificationId: 'n-2',
      userId: 'usr-not-here',
      type: 'application_status',
      channel: 'in_app',
    });

    expect(otherUserSocket.emit).not.toHaveBeenCalled();
  });
});
