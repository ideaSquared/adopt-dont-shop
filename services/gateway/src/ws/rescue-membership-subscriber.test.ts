import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRescueMembershipSubscribers } from './rescue-membership-subscriber.js';
import { invalidateRescueIdCache } from '../middleware/authenticate.js';
import { makeTestLogger } from '../../test/helpers/test-logger.js';

vi.mock('../middleware/authenticate.js', () => ({ invalidateRescueIdCache: vi.fn() }));

type AddedConsumer = {
  durable_name?: string;
  filter_subject?: string;
  deliver_policy?: string;
  inactive_threshold?: number;
};

// JetStream stand-in, same shape as auth-subscriber.test.ts.
function makeNats(): {
  nats: NatsConnection;
  consumersAdded: AddedConsumer[];
  push: (subject: string, payload: unknown) => Promise<void>;
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
        const filter = consumersAdded.find(c => c.durable_name === durable)?.filter_subject ?? '';
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

  const push = async (subject: string, payload: unknown): Promise<void> => {
    const resolve = waiters.get(subject)?.shift();
    if (!resolve) {
      throw new Error(`no waiter on ${subject}`);
    }
    const envelope = { id: 'evt-1', occurredAt: '2026-06-01T10:00:00Z', payload };
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

describe('registerRescueMembershipSubscribers (ENG-1508)', () => {
  beforeEach(() => {
    vi.mocked(invalidateRescueIdCache).mockClear();
  });

  it('binds a per-replica deliver-new durable consumer on rescue.staffMemberRemoved', async () => {
    const { nats, consumersAdded } = makeNats();
    registerRescueMembershipSubscribers({ nats, logger: makeTestLogger().logger });
    await settle();

    expect(consumersAdded).toHaveLength(1);
    expect(consumersAdded[0]?.filter_subject).toBe('rescue.staffMemberRemoved');
    expect(consumersAdded[0]?.deliver_policy).toBe('new');
    // Per-boot durable names are reaped by the broker once the replica is gone.
    expect(consumersAdded[0]?.inactive_threshold).toBeGreaterThan(0);
    expect(consumersAdded[0]?.durable_name).toMatch(
      /^gw-rescue-membership-rescue-staffMemberRemoved-[0-9a-f-]{36}$/
    );
  });

  it('drops the removed user cached membership so their next request carries no rescue scope', async () => {
    const { nats, push } = makeNats();
    registerRescueMembershipSubscribers({ nats, logger: makeTestLogger().logger });
    await settle();

    await push('rescue.staffMemberRemoved', {
      staffMemberId: 'stf-1',
      rescueId: 'rsc-1',
      userId: 'usr-removed',
    });

    expect(invalidateRescueIdCache).toHaveBeenCalledWith('usr-removed');
  });
});
