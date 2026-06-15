import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  startEmailChannelWorker,
  type Recipient,
  type ResolveRecipient,
} from './channel-adapter.js';

// --- Harness --------------------------------------------------------

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
};

const enabledPrefsRow = {
  email_enabled: true,
  push_enabled: true,
  sms_enabled: false,
  application_updates: true,
  pet_matches: true,
  rescue_updates: true,
  chat_messages: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
};

const makePool = (
  opts: {
    prefs?: Record<string, unknown>;
    notifRow?: { title: string; message: string } | null;
    insertError?: unknown;
  } = {}
) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('user_notification_prefs')) {
      return { rows: [opts.prefs ?? enabledPrefsRow] };
    }
    if (sql.includes('notifications.notifications')) {
      return {
        rows: opts.notifRow === null ? [] : [opts.notifRow ?? { title: 'T', message: 'M' }],
      };
    }
    if (sql.includes('email_queue')) {
      if (opts.insertError) {
        throw opts.insertError;
      }
      return { rows: [{ email_id: 'e1' }] };
    }
    return { rows: [] };
  });
  return { query, asPool: { query } as unknown as Pool };
};

const includesSql = (query: ReturnType<typeof vi.fn>, fragment: string): boolean =>
  query.mock.calls.some(c => String(c[0]).includes(fragment));

const insertParams = (query: ReturnType<typeof vi.fn>): unknown[] => {
  const call = query.mock.calls.find(c => String(c[0]).includes('INSERT INTO email_queue'));
  return (call?.[1] as unknown[]) ?? [];
};

const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Parameters<typeof startEmailChannelWorker>[0]['logger'];

function makeNats(messages: { payload: unknown }[]): NatsConnection {
  const encoder = new TextEncoder();
  const jsm = { consumers: { add: vi.fn(async (_s: string, cfg: unknown) => cfg) } };
  const js = {
    consumers: {
      get: vi.fn(async () => ({
        consume: vi.fn(async () => ({
          async *[Symbol.asyncIterator]() {
            for (const m of messages) {
              yield {
                subject: 'notifications.created',
                data: encoder.encode(
                  JSON.stringify({
                    id: 'evt',
                    occurredAt: '2026-06-01T10:00:00Z',
                    payload: m.payload,
                  })
                ),
                ack: vi.fn(),
                nak: vi.fn(),
                term: vi.fn(),
              };
            }
          },
          close: vi.fn(),
        })),
      })),
    },
  };
  return {
    jetstreamManager: vi.fn(async () => jsm),
    jetstream: vi.fn(() => js),
  } as unknown as NatsConnection;
}

const event = (overrides: Record<string, unknown> = {}) => ({
  notificationId: 'n-1',
  userId: 'usr-1',
  type: 'adoption_approved',
  channel: 'in_app',
  ...overrides,
});

const resolverTo = (
  recipient: Recipient | null
): { fn: ResolveRecipient; mock: ReturnType<typeof vi.fn> } => {
  const mock = vi.fn(async () => recipient);
  return { fn: mock, mock };
};

const start = (pool: Pool, nats: NatsConnection, resolveRecipient: ResolveRecipient) =>
  startEmailChannelWorker({
    pool,
    nats,
    logger,
    resolveRecipient,
    fromEmail: 'noreply@example.com',
    fromName: 'Test',
  });

// --- Tests ----------------------------------------------------------

describe('email channel adapter', () => {
  it('enqueues a transactional email for an email-worthy type with a deterministic idempotency key', async () => {
    const { asPool, query } = makePool({ notifRow: { title: 'Approved!', message: 'You did it' } });
    const { fn, mock } = resolverTo({ email: 'adopter@example.com', name: 'Ada Lovelace' });
    const nats = makeNats([{ payload: event() }]);

    start(asPool, nats, fn);
    await flush();

    expect(mock).toHaveBeenCalledWith('usr-1');
    const params = insertParams(query);
    expect(params).toContain('adopter@example.com');
    expect(params).toContain('Approved!');
    expect(params).toContain('notif-email:n-1');
  });

  it('ignores non-email-worthy types without loading prefs or resolving a recipient', async () => {
    const { asPool, query } = makePool();
    const { fn, mock } = resolverTo({ email: 'adopter@example.com' });
    const nats = makeNats([{ payload: event({ type: 'message_received' }) }]);

    start(asPool, nats, fn);
    await flush();

    expect(query).not.toHaveBeenCalled();
    expect(mock).not.toHaveBeenCalled();
  });

  it('does not enqueue when the user has disabled the email channel', async () => {
    const { asPool, query } = makePool({ prefs: { ...enabledPrefsRow, email_enabled: false } });
    const { fn, mock } = resolverTo({ email: 'adopter@example.com' });
    const nats = makeNats([{ payload: event() }]);

    start(asPool, nats, fn);
    await flush();

    expect(includesSql(query, 'user_notification_prefs')).toBe(true);
    expect(includesSql(query, 'email_queue')).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });

  it('skips when the recipient address cannot be resolved', async () => {
    const { asPool, query } = makePool();
    const { fn, mock } = resolverTo(null);
    const nats = makeNats([{ payload: event() }]);

    start(asPool, nats, fn);
    await flush();

    expect(mock).toHaveBeenCalledWith('usr-1');
    expect(includesSql(query, 'email_queue')).toBe(false);
  });

  it('treats a redelivery (idempotency-key unique violation) as a no-op, not an error', async () => {
    const { asPool } = makePool({
      insertError: { code: '23505', constraint: 'email_queue_idempotency_key_unique' },
    });
    const { fn } = resolverTo({ email: 'adopter@example.com' });
    const nats = makeNats([{ payload: event() }]);

    // Should resolve cleanly — the worker swallows the unique violation.
    await expect(
      (async () => {
        start(asPool, nats, fn);
        await flush();
      })()
    ).resolves.toBeUndefined();
  });
});
