import type { NatsConnection } from 'nats';
import type { Server as IOServer } from 'socket.io';
import type { Logger } from 'winston';
import { describe, expect, it, vi } from 'vitest';

import { getMetricsRegistry } from '@adopt-dont-shop/observability';

import { registerAuthSubscribers } from './auth-subscriber.js';

function quietLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    silly: vi.fn(),
  } as unknown as Logger;
}

// Stand-in for the Socket.IO Server surface this subscriber depends on:
// io.in(room).disconnectSockets(close). Room-based, not the per-replica
// SocketRegistry — see auth-subscriber.ts's module comment for why.
function fakeIo(): {
  io: IOServer;
  inMock: ReturnType<typeof vi.fn>;
  disconnectSocketsMock: ReturnType<typeof vi.fn>;
} {
  const disconnectSocketsMock = vi.fn();
  const inMock = vi.fn(() => ({ disconnectSockets: disconnectSocketsMock }));
  return { io: { in: inMock } as unknown as IOServer, inMock, disconnectSocketsMock };
}

type AddedConsumer = { durable_name?: string; filter_subject?: string; deliver_policy?: string };

// JetStream stand-in, mirroring notifications-subscriber.test.ts /
// chat-subscriber.test.ts: subscribe() binds a durable consumer then drives
// consume(); the consume() iterator blocks on a per-filter-subject waiter
// queue so a test can `push` a message into a live subscriber on demand.
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

async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
}

describe('registerAuthSubscribers — wiring', () => {
  it('binds a durable consumer for all three revocation subjects, deliver-new', async () => {
    const { nats, consumersAdded } = makeNats();
    const { io } = fakeIo();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settle();

    expect(consumersAdded.map(c => c.filter_subject)).toEqual([
      'auth.sessionRevoked',
      'auth.sessionRevokedByAdmin',
      'auth.tokenRevoked',
    ]);
    for (const cfg of consumersAdded) {
      expect(cfg.deliver_policy).toBe('new');
      // Unique per gateway process — every replica fans out independently,
      // never load-shares the revocation stream.
      expect(cfg.durable_name).toMatch(/^gw-ws-auth-.+-[0-9a-f-]{36}$/);
    }
  });
});

describe('registerAuthSubscribers — eviction behaviour (ADS-1036)', () => {
  it('force-disconnects the room for auth.sessionRevoked — self-service revoke', async () => {
    const { nats, push } = makeNats();
    const { io, inMock, disconnectSocketsMock } = fakeIo();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settle();

    await push('auth.sessionRevoked', {
      sessionId: 'sess-1',
      familyId: 'fam-1',
      userId: 'usr-1',
    });

    expect(inMock).toHaveBeenCalledWith('usr-1');
    expect(disconnectSocketsMock).toHaveBeenCalledWith(true);
  });

  it('force-disconnects the room for auth.sessionRevokedByAdmin — targets the victim, not the admin', async () => {
    const { nats, push } = makeNats();
    const { io, inMock, disconnectSocketsMock } = fakeIo();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settle();

    await push('auth.sessionRevokedByAdmin', {
      sessionId: 'sess-2',
      familyId: 'fam-2',
      userId: 'usr-victim',
      revokedBy: 'usr-admin',
    });

    expect(inMock).toHaveBeenCalledWith('usr-victim');
    expect(inMock).not.toHaveBeenCalledWith('usr-admin');
    expect(disconnectSocketsMock).toHaveBeenCalledWith(true);
  });

  it('force-disconnects the room for auth.tokenRevoked — covers logout', async () => {
    const { nats, push } = makeNats();
    const { io, inMock, disconnectSocketsMock } = fakeIo();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settle();

    await push('auth.tokenRevoked', {
      userId: 'usr-logout',
      jti: 'jti-1',
      tokenType: 'refresh',
    });

    expect(inMock).toHaveBeenCalledWith('usr-logout');
    expect(disconnectSocketsMock).toHaveBeenCalledWith(true);
  });

  it('increments gateway_ws_revocation_disconnects_total labeled by reason', async () => {
    const counter = getMetricsRegistry().getSingleMetric('gateway_ws_revocation_disconnects_total');
    const readReason = async (reason: string): Promise<number> => {
      const snapshot = await counter?.get();
      return snapshot?.values.find(v => v.labels.reason === reason)?.value ?? 0;
    };
    const before = await readReason('session_revoked');

    const { nats, push } = makeNats();
    const { io } = fakeIo();
    registerAuthSubscribers({ nats, io, logger: quietLogger() });
    await settle();

    await push('auth.sessionRevoked', {
      sessionId: 'sess-3',
      familyId: 'fam-3',
      userId: 'usr-metrics',
    });

    expect(await readReason('session_revoked')).toBe(before + 1);
  });
});
