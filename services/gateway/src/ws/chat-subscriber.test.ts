import type { NatsConnection, Subscription } from 'nats';
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

// Reused from notifications-subscriber.test.ts — same shape but kept
// inline so each WS subscriber test is self-contained.
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
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
  };

  return { nats, subscribeFn, push };
}

describe('registerChatSubscribers — wiring', () => {
  it('subscribes to all four chat.* subjects', () => {
    const { nats, subscribeFn } = makeNats();
    registerChatSubscribers({ nats, registry: new SocketRegistry(), logger: quietLogger() });

    expect(subscribeFn).toHaveBeenCalledTimes(4);
    const subjects = subscribeFn.mock.calls.map(c => c[0]);
    expect(subjects).toEqual([
      'chat.messageCreated',
      'chat.messageRead',
      'chat.reactionAdded',
      'chat.reactionRemoved',
    ]);
  });

  it('does NOT use a queue group — every replica sees every event', () => {
    const { nats, subscribeFn } = makeNats();
    registerChatSubscribers({ nats, registry: new SocketRegistry(), logger: quietLogger() });
    for (const call of subscribeFn.mock.calls) {
      expect(call[1]).toBeUndefined();
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
