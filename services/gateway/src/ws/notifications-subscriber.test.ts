import type { NatsConnection } from 'nats';
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

type AddedConsumer = { durable_name?: string; filter_subject?: string; deliver_policy?: string };

// JetStream stand-in for the gateway WS fan-out subscribers. subscribe() now
// binds a durable consumer (jetstreamManager().consumers.add) then drives
// jetstream().consumers.get(...).consume(). The consume() iterator blocks on a
// per-filter-subject waiter queue so a test can `push` a message into a live
// subscriber on demand.
function makeNats(): {
  nats: NatsConnection;
  consumersAdded: AddedConsumer[];
  push: (subject: string, payload: unknown, id?: string) => Promise<void>;
} {
  const consumersAdded: AddedConsumer[] = [];
  const waiters = new Map<string, ((msg: { subject: string; data: Uint8Array }) => void)[]>();

  const jsm = {
    consumers: {
      add: vi.fn(async (_stream: string, cfg: AddedConsumer) => {
        consumersAdded.push(cfg);
        return cfg;
      }),
    },
  };

  const js = {
    consumers: {
      get: vi.fn(async (_stream: string, durable: string) => {
        const cfg = consumersAdded.find(c => c.durable_name === durable);
        const filter = cfg?.filter_subject ?? '';
        return {
          consume: vi.fn(async () => ({
            async *[Symbol.asyncIterator]() {
              for (;;) {
                const data = await new Promise<{ subject: string; data: Uint8Array }>(resolve => {
                  const list = waiters.get(filter) ?? [];
                  list.push(resolve);
                  waiters.set(filter, list);
                });
                yield { ...data, ack: vi.fn(), nak: vi.fn(), term: vi.fn(), redelivered: false };
              }
            },
            close: vi.fn(),
          })),
        };
      }),
    },
  };

  const nats = {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;

  const push = async (subject: string, payload: unknown, id = 'evt-1'): Promise<void> => {
    const list = waiters.get(subject);
    const resolve = list?.shift();
    if (!resolve) {
      throw new Error(`no waiter on ${subject}`);
    }
    const envelope = { id, occurredAt: '2026-06-01T10:00:00Z', payload };
    resolve({ subject, data: new TextEncoder().encode(JSON.stringify(envelope)) });
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  return { nats, consumersAdded, push };
}

// The consume loop is created in a fire-and-forget async task; give it a few
// microtasks to register its waiters before a test pushes a message.
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
}

describe('registerNotificationSubscribers — wiring', () => {
  it('binds a durable consumer for notifications.created AND notifications.dismissed', async () => {
    const { nats, consumersAdded } = makeNats();
    registerNotificationSubscribers({
      nats,
      registry: new SocketRegistry(),
      logger: quietLogger(),
    });
    await settle();

    expect(consumersAdded).toHaveLength(2);
    expect(consumersAdded.map(c => c.filter_subject)).toEqual([
      'notifications.created',
      'notifications.dismissed',
    ]);
  });

  it('uses a per-replica durable with deliver-new so every gateway replica sees every event from now', async () => {
    const { nats, consumersAdded } = makeNats();
    registerNotificationSubscribers({
      nats,
      registry: new SocketRegistry(),
      logger: quietLogger(),
    });
    await settle();

    for (const cfg of consumersAdded) {
      // gw-ws-notifications-<verb>-<uuid> — unique per process, not a shared
      // load-shared durable, so the fan-out isn't split across replicas.
      expect(cfg.durable_name).toMatch(/^gw-ws-notifications-.+-[0-9a-f-]{36}$/);
      expect(cfg.deliver_policy).toBe('new');
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
    await settle();

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
    await settle();

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
    await settle();

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
