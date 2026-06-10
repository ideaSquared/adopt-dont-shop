import type { NatsConnection } from 'nats';
import type { Socket } from 'socket.io';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { registerChatSubscribers } from './chat-subscriber.js';
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
// subscriber on demand — same ergonomics as the old waiter harness.
function makeNats(): {
  nats: NatsConnection;
  consumersAdded: AddedConsumer[];
  push: (subject: string, payload: unknown, id?: string) => Promise<void>;
} {
  const consumersAdded: AddedConsumer[] = [];
  // filter_subject → list of pending next() resolvers.
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
              // Block until a test pushes a message for this filter subject.
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

describe('registerChatSubscribers — wiring', () => {
  it('binds a durable consumer for all four chat.* subjects', async () => {
    const { nats, consumersAdded } = makeNats();
    registerChatSubscribers({ nats, registry: new SocketRegistry(), logger: quietLogger() });
    await settle();

    expect(consumersAdded).toHaveLength(4);
    expect(consumersAdded.map(c => c.filter_subject)).toEqual([
      'chat.messageCreated',
      'chat.messageRead',
      'chat.reactionAdded',
      'chat.reactionRemoved',
    ]);
  });

  it('uses a per-replica durable with deliver-new so every replica sees every event from now', async () => {
    const { nats, consumersAdded } = makeNats();
    registerChatSubscribers({ nats, registry: new SocketRegistry(), logger: quietLogger() });
    await settle();

    for (const cfg of consumersAdded) {
      // gw-ws-<subject>-<uuid> — unique per process, not a shared load-shared
      // durable, so the fan-out isn't split across replicas.
      expect(cfg.durable_name).toMatch(/^gw-ws-chat-.+-[0-9a-f-]{36}$/);
      expect(cfg.deliver_policy).toBe('new');
    }
  });
});

describe('registerChatSubscribers — fan-out', () => {
  it('emits chat:message:created to every participant socket on THIS replica', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    const s2 = fakeSocket();
    const otherUserSocket = fakeSocket();
    registry.add('usr-adopter', s1);
    registry.add('usr-rescue', s2);
    registry.add('usr-bystander', otherUserSocket);

    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.messageCreated', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'usr-adopter',
      body: 'Hello',
      participantUserIds: ['usr-adopter', 'usr-rescue'],
    });

    // Both participants receive — sender included so their other tabs
    // get the new message too.
    expect(s1.emit).toHaveBeenCalledWith(
      'chat:message:created',
      expect.objectContaining({
        messageId: 'msg-1',
        chatId: 'chat-1',
        senderUserId: 'usr-adopter',
        body: 'Hello',
      })
    );
    expect(s2.emit).toHaveBeenCalledWith('chat:message:created', expect.any(Object));
    // Non-participant gets nothing.
    expect(otherUserSocket.emit).not.toHaveBeenCalled();
  });

  it('strips participantUserIds from the emitted payload', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    registry.add('usr-adopter', s1);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.messageCreated', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'usr-adopter',
      body: 'Hi',
      participantUserIds: ['usr-adopter', 'usr-rescue'],
    });

    const [, payload] = s1.emit.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload).not.toHaveProperty('participantUserIds');
  });

  it('emits chat:message:read on chat.messageRead', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    const s2 = fakeSocket();
    registry.add('usr-adopter', s1);
    registry.add('usr-rescue', s2);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.messageRead', {
      chatId: 'chat-1',
      userId: 'usr-rescue',
      upToMessageId: 'msg-1',
      participantUserIds: ['usr-adopter', 'usr-rescue'],
    });

    expect(s1.emit).toHaveBeenCalledWith(
      'chat:message:read',
      expect.objectContaining({
        chatId: 'chat-1',
        userId: 'usr-rescue',
        upToMessageId: 'msg-1',
      })
    );
    expect(s2.emit).toHaveBeenCalledWith('chat:message:read', expect.any(Object));
  });

  it('emits chat:reaction:added on chat.reactionAdded', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    registry.add('usr-adopter', s1);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.reactionAdded', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      userId: 'usr-rescue',
      emoji: '👍',
      participantUserIds: ['usr-adopter'],
    });

    expect(s1.emit).toHaveBeenCalledWith(
      'chat:reaction:added',
      expect.objectContaining({
        messageId: 'msg-1',
        chatId: 'chat-1',
        userId: 'usr-rescue',
        emoji: '👍',
      })
    );
  });

  it('emits chat:reaction:removed on chat.reactionRemoved', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    registry.add('usr-adopter', s1);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.reactionRemoved', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      userId: 'usr-rescue',
      emoji: '👍',
      participantUserIds: ['usr-adopter'],
    });

    expect(s1.emit).toHaveBeenCalledWith('chat:reaction:removed', expect.any(Object));
  });

  it('dedupes duplicate participant entries in the event payload', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    registry.add('usr-adopter', s1);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.messageCreated', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'usr-adopter',
      body: 'Hi',
      participantUserIds: ['usr-adopter', 'usr-adopter'],
    });

    expect(s1.emit).toHaveBeenCalledTimes(1);
  });

  it('emits nothing when no participant has a socket on this replica', async () => {
    const { nats, push } = makeNats();
    const registry = new SocketRegistry();
    const s1 = fakeSocket();
    registry.add('usr-other', s1);
    registerChatSubscribers({ nats, registry, logger: quietLogger() });
    await settle();

    await push('chat.messageCreated', {
      messageId: 'msg-1',
      chatId: 'chat-1',
      senderUserId: 'usr-adopter',
      body: 'Hi',
      participantUserIds: ['usr-adopter', 'usr-rescue'],
    });

    expect(s1.emit).not.toHaveBeenCalled();
  });
});
