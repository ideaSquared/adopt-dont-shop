import type { NatsConnection } from 'nats';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deadLetter, handleFailure, MAX_DELIVER, nakBackoffMs, subscribe } from './subscribe.js';
import { DLQ_SUBJECT_PREFIX, DOMAIN_STREAM } from './stream.js';

// A minimal in-memory JetStream stand-in. It models the one property that
// matters for this migration: messages live in the STREAM (not in a live
// subscription), so a consumer created AFTER publish still receives the
// backlog — that's the durable/at-least-once guarantee we're testing. Each
// delivered message carries ack/nak/term spies; nak() requeues once as a
// redelivery so we can prove idempotent reprocessing.

type FakeMsg = {
  subject: string;
  data: Uint8Array;
  ack: ReturnType<typeof vi.fn>;
  nak: ReturnType<typeof vi.fn>;
  term: ReturnType<typeof vi.fn>;
  redelivered: boolean;
};

function encode(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj));
}

function makeBus() {
  // Subject → list of raw published payloads (the durable stream backlog).
  const stream: Array<{ subject: string; data: Uint8Array }> = [];
  const consumersAdded: Array<{ durable_name?: string; filter_subject?: string }> = [];

  // Publish into the stream BEFORE any consumer exists — simulating an event
  // that fired while the subscriber was down.
  const publish = (subject: string, data: Uint8Array): void => {
    stream.push({ subject, data });
  };

  const jsm = {
    consumers: {
      add: vi.fn(
        async (_stream: string, cfg: { durable_name?: string; filter_subject?: string }) => {
          consumersAdded.push(cfg);
          return cfg;
        }
      ),
    },
  };

  const buildConsume = (filterSubject: string) => {
    const queue: FakeMsg[] = [];

    const makeMsg = (subject: string, data: Uint8Array, redelivered: boolean): FakeMsg => ({
      subject,
      data,
      redelivered,
      ack: vi.fn(),
      term: vi.fn(),
      nak: vi.fn(() => {
        // Requeue once as a redelivery so a transient handler failure is
        // retried (and the handler can dedupe on its second attempt).
        if (!redelivered) {
          queue.push(makeMsg(subject, data, true));
        }
      }),
    });

    // Seed from the stream backlog matching this consumer's filter — exactly
    // the messages a durable consumer replays on (re)connect.
    for (const m of stream) {
      if (subjectMatches(filterSubject, m.subject)) {
        queue.push(makeMsg(m.subject, m.data, false));
      }
    }

    return {
      async *[Symbol.asyncIterator]() {
        // Drain everything queued, including redeliveries nak() pushes back.
        while (queue.length > 0) {
          const msg = queue.shift();
          if (msg) {
            yield msg;
          }
        }
      },
      close: vi.fn(async () => undefined),
    };
  };

  const js = {
    consumers: {
      get: vi.fn(async (_stream: string, durable: string) => {
        const cfg = consumersAdded.find(c => c.durable_name === durable);
        const filter = cfg?.filter_subject ?? '>';
        return { consume: vi.fn(async () => buildConsume(filter)) };
      }),
    },
  };

  const nc = {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;

  return { nc, publish, consumersAdded, jsmAdd: jsm.consumers.add };
}

function subjectMatches(filter: string, subject: string): boolean {
  if (filter === '>' || filter === subject) {
    return true;
  }
  // Good enough for tests: support a trailing `>` wildcard.
  if (filter.endsWith('.>')) {
    return subject.startsWith(filter.slice(0, -1));
  }
  return false;
}

// Spin until queued tasks settle — subscribe() drives the consume loop in a
// fire-and-forget IIFE that awaits the JetStream manager + consumer.
async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await new Promise(r => setImmediate(r));
  }
}

describe('subscribe (durable JetStream consumer)', () => {
  let calls: Array<{ payload: unknown; meta: { subject: string; id?: string } }>;

  beforeEach(() => {
    calls = [];
  });

  it('creates a durable consumer filtered to the subject with explicit ack', async () => {
    const bus = makeBus();
    subscribe(bus.nc, { subject: 'pets.created', durable: 'pets-workers' }, async () => undefined);
    await flush();

    expect(bus.jsmAdd).toHaveBeenCalledWith(
      DOMAIN_STREAM,
      expect.objectContaining({
        durable_name: 'pets-workers',
        filter_subject: 'pets.created',
      })
    );
  });

  it('caps redeliveries via max_deliver so poison messages eventually dead-letter', async () => {
    const bus = makeBus();
    subscribe(bus.nc, { subject: 'pets.created', durable: 'pets-workers' }, async () => undefined);
    await flush();

    expect(bus.jsmAdd).toHaveBeenCalledWith(
      DOMAIN_STREAM,
      expect.objectContaining({ max_deliver: MAX_DELIVER })
    );
  });

  it('delivers an event that was published WHILE the subscriber was down', async () => {
    const bus = makeBus();
    // Event fires first — no consumer exists yet (subscriber is "down").
    bus.publish('pets.created', encode({ id: 'evt-1', payload: { petId: 'p1' } }));

    // Subscriber comes up afterwards and binds a durable consumer.
    subscribe<{ petId: string }>(
      bus.nc,
      { subject: 'pets.created', durable: 'pets-workers' },
      async (payload, meta) => {
        calls.push({ payload, meta: { subject: meta.subject, id: meta.id } });
      }
    );
    await flush();

    // The backlogged event is redelivered to the late subscriber.
    expect(calls).toEqual([
      { payload: { petId: 'p1' }, meta: { subject: 'pets.created', id: 'evt-1' } },
    ]);
  });

  it('acks each successfully-handled message (no redelivery loop)', async () => {
    const bus = makeBus();
    bus.publish('pets.created', encode({ id: 'evt-1', payload: { petId: 'p1' } }));

    let handled = 0;
    subscribe<{ petId: string }>(bus.nc, { subject: 'pets.created', durable: 'd1' }, async () => {
      handled += 1;
    });
    await flush();

    // One handler call → the message was acked, not nak()'d into a loop.
    expect(handled).toBe(1);
  });

  it('nak()s a thrown handler so JetStream redelivers it (CAD #4); the handler dedupes on redelivery', async () => {
    const bus = makeBus();
    bus.publish('s', encode({ id: 'evt-1', payload: { n: 1 } }));

    const errors: unknown[] = [];
    const seen: string[] = [];
    let attempts = 0;

    subscribe<{ n: number }>(
      bus.nc,
      {
        subject: 's',
        durable: 'd2',
        onError: err => {
          errors.push(err);
        },
      },
      async (_payload, meta) => {
        attempts += 1;
        // Fail the first delivery (transient), succeed on the redelivery —
        // and prove the handler dedupes on the event id.
        if (attempts === 1) {
          throw new Error('transient blip');
        }
        if (meta.id && seen.includes(meta.id)) {
          return; // idempotent skip
        }
        if (meta.id) {
          seen.push(meta.id);
        }
      }
    );
    await flush();

    expect(errors).toHaveLength(1);
    expect((errors[0] as Error).message).toBe('transient blip');
    // First delivery failed → nak; redelivery succeeded.
    expect(attempts).toBe(2);
    expect(seen).toEqual(['evt-1']);
  });

  it('term()s a malformed (non-JSON) message — a clean skip', async () => {
    const bus = makeBus();
    bus.publish('s', new TextEncoder().encode('not-valid-json{{'));
    bus.publish('s', encode({ id: 'evt-2', payload: { ok: true } }));

    const errors: unknown[] = [];
    subscribe<{ ok: boolean }>(
      bus.nc,
      {
        subject: 's',
        durable: 'd3',
        onError: err => {
          errors.push(err);
        },
      },
      async payload => {
        calls.push({ payload, meta: { subject: 's' } });
      }
    );
    await flush();

    // The malformed message is skipped; the valid one is handled.
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toEqual({ ok: true });
    expect(errors).toHaveLength(1);
  });

  it('processes a backlog of multiple events in order', async () => {
    const bus = makeBus();
    bus.publish('pets.created', encode({ id: '1', payload: { petId: 'p1' } }));
    bus.publish('pets.created', encode({ id: '2', payload: { petId: 'p2' } }));

    subscribe<{ petId: string }>(
      bus.nc,
      { subject: 'pets.created', durable: 'd4' },
      async (payload, meta) => {
        calls.push({ payload, meta: { subject: meta.subject, id: meta.id } });
      }
    );
    await flush();

    expect(calls.map(c => c.meta.id)).toEqual(['1', '2']);
  });
});

describe('nakBackoffMs', () => {
  it('is fast on the first redelivery, grows exponentially, and caps', () => {
    expect(nakBackoffMs(1)).toBe(1_000);
    expect(nakBackoffMs(2)).toBe(2_000);
    expect(nakBackoffMs(3)).toBe(4_000);
    expect(nakBackoffMs(5)).toBe(16_000);
    // Capped at 30s no matter how many redeliveries.
    expect(nakBackoffMs(6)).toBe(30_000);
    expect(nakBackoffMs(100)).toBe(30_000);
  });

  it('never returns a negative delay for a degenerate attempt count', () => {
    expect(nakBackoffMs(0)).toBe(1_000);
  });
});

describe('handleFailure / deadLetter', () => {
  function makeNc() {
    const publish = vi.fn(async () => ({ seq: 1 }));
    const nc = { jetstream: vi.fn(() => ({ publish })) } as unknown as NatsConnection;
    return { nc, publish };
  }

  function fakeMsg(redeliveryCount: number) {
    return {
      subject: 'pets.created',
      info: { redeliveryCount },
      nak: vi.fn(),
      term: vi.fn(),
    };
  }

  it('backs off and redelivers while within the retry budget', async () => {
    const { nc, publish } = makeNc();
    const msg = fakeMsg(2);
    await handleFailure(nc, msg, '{"id":"e1"}', new Error('blip'));
    expect(msg.nak).toHaveBeenCalledWith(nakBackoffMs(2));
    expect(msg.term).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('dead-letters and term()s once the retry budget is exhausted', async () => {
    const { nc, publish } = makeNc();
    const msg = fakeMsg(MAX_DELIVER);
    await handleFailure(nc, msg, '{"id":"e1"}', new Error('still broken'));
    expect(msg.nak).not.toHaveBeenCalled();
    expect(msg.term).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
    // Published to dlq.<original-subject>.
    expect(publish.mock.calls[0][0]).toBe(`${DLQ_SUBJECT_PREFIX}pets.created`);
  });

  it('deadLetter preserves the raw payload and stamps triage headers', async () => {
    const { nc, publish } = makeNc();
    await deadLetter(nc, 'pets.created', '{"id":"e1"}', new Error('boom'));
    const [subject, data, opts] = publish.mock.calls[0];
    expect(subject).toBe('dlq.pets.created');
    expect(new TextDecoder().decode(data as Uint8Array)).toBe('{"id":"e1"}');
    const headers = (opts as { headers: { get: (k: string) => string } }).headers;
    expect(headers.get('dlq-original-subject')).toBe('pets.created');
    expect(headers.get('dlq-error')).toBe('boom');
  });
});
