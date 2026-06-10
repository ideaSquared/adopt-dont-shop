import type { NatsConnection } from 'nats';
import { describe, expect, it, vi } from 'vitest';

import type { HandlerDeps } from '../grpc/adapter.js';

import { registerSubscribers } from './subscribers.js';

// subscribe() now binds durable JetStream consumers: it calls
// jetstreamManager().consumers.add(...) then jetstream().consumers.get(...)
// .consume(). We stub a JetStream connection whose consume() yields nothing
// and capture the durable configs each subscriber requests.
type AddedConsumer = { durable_name?: string; filter_subject?: string };

function makeNats(): { nats: NatsConnection; consumersAdded: AddedConsumer[] } {
  const consumersAdded: AddedConsumer[] = [];
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
      get: vi.fn(async () => ({
        consume: vi.fn(async () => ({
          async *[Symbol.asyncIterator]() {
            // no messages
          },
          close: vi.fn(),
        })),
      })),
    },
  };
  const nats = {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;
  return { nats, consumersAdded };
}

const deps = { pool: {}, nats: {} } as unknown as HandlerDeps;
const logger = {
  info: () => undefined,
  error: () => undefined,
  warn: () => undefined,
  debug: () => undefined,
  silly: () => undefined,
} as unknown as Parameters<typeof registerSubscribers>[0]['logger'];

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
};

describe('registerSubscribers', () => {
  it('binds a durable consumer for chat.messageCreated + pets.created + applications.submitted under the moderation-workers prefix', async () => {
    const { nats, consumersAdded } = makeNats();
    const subs = registerSubscribers({ nats, deps, logger });
    await flush();

    expect(subs).toHaveLength(3);
    expect(consumersAdded.map(c => c.filter_subject)).toEqual([
      'chat.messageCreated',
      'pets.created',
      'applications.submitted',
    ]);
    for (const cfg of consumersAdded) {
      expect(cfg.durable_name).toMatch(/^moderation-workers-/);
    }
  });
});
