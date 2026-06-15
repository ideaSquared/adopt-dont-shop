import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { startPushWorker } from './worker.js';

import type { PushProvider } from './types.js';

// --- Harness --------------------------------------------------------

type DeliveredMessage = { id?: string; payload: unknown };

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setImmediate(r));
  }
};

const makePool = (opts: { claimRowCount?: number; prefs?: Record<string, unknown> } = {}) => {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes('user_notification_prefs')) {
      return { rows: opts.prefs ? [opts.prefs] : [] };
    }
    if (sql.includes('processed_events')) {
      return { rowCount: opts.claimRowCount ?? 1, rows: [] };
    }
    if (sql.includes('device_tokens')) {
      return { rows: [{ token_id: 't1', device_token: 'tok-1', platform: 'ios' }] };
    }
    return { rows: [] };
  });
  return { query, asPool: { query } as unknown as Pool };
};

const includesSql = (query: ReturnType<typeof vi.fn>, fragment: string): boolean =>
  query.mock.calls.some(c => String(c[0]).includes(fragment));

const makeProvider = () => {
  const send = vi.fn(async () => ({ success: true, messageId: 'm1' }));
  return { provider: { send, getName: () => 'console' } as unknown as PushProvider, send };
};

const logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
} as unknown as Parameters<typeof startPushWorker>[0]['logger'];

function makeNats(messages: DeliveredMessage[]): NatsConnection {
  const encoder = new TextEncoder();
  const jsm = {
    consumers: { add: vi.fn(async (_s: string, cfg: unknown) => cfg) },
  };
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
                    id: m.id,
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

const pushEvent = (overrides: Record<string, unknown> = {}) => ({
  notificationId: 'n-1',
  userId: 'usr-1',
  type: 'message_received',
  channel: 'push',
  title: 'New message',
  message: 'hi',
  dataJson: '{}',
  ...overrides,
});

// --- Tests ----------------------------------------------------------

describe('push worker dedup', () => {
  it('claims the event then fans out to device tokens on first delivery', async () => {
    const { asPool, query } = makePool({ claimRowCount: 1 });
    const { provider, send } = makeProvider();
    const nats = makeNats([{ id: 'notifications.created.n-1', payload: pushEvent() }]);

    startPushWorker({ pool: asPool, nats, provider, logger });
    await flush();

    expect(includesSql(query, 'processed_events')).toBe(true);
    expect(includesSql(query, 'device_tokens')).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not fan out on a redelivery (claim loses the ON CONFLICT race)', async () => {
    const { asPool, query } = makePool({ claimRowCount: 0 });
    const { provider, send } = makeProvider();
    const nats = makeNats([{ id: 'notifications.created.n-1', payload: pushEvent() }]);

    startPushWorker({ pool: asPool, nats, provider, logger });
    await flush();

    expect(includesSql(query, 'processed_events')).toBe(true);
    // Claim failed → never reaches the device-token lookup or provider send.
    expect(includesSql(query, 'device_tokens')).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('suppresses the push (and does not claim) when push is disabled in prefs', async () => {
    const { asPool, query } = makePool({
      prefs: {
        email_enabled: true,
        push_enabled: false,
        sms_enabled: false,
        application_updates: true,
        pet_matches: true,
        rescue_updates: true,
        chat_messages: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        timezone: 'UTC',
      },
    });
    const { provider, send } = makeProvider();
    const nats = makeNats([{ id: 'notifications.created.n-1', payload: pushEvent() }]);

    startPushWorker({ pool: asPool, nats, provider, logger });
    await flush();

    expect(includesSql(query, 'user_notification_prefs')).toBe(true);
    expect(includesSql(query, 'processed_events')).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores non-push notifications without loading prefs or claiming', async () => {
    const { asPool, query } = makePool({ claimRowCount: 1 });
    const { provider, send } = makeProvider();
    const nats = makeNats([
      { id: 'notifications.created.n-2', payload: pushEvent({ channel: 'in_app' }) },
    ]);

    startPushWorker({ pool: asPool, nats, provider, logger });
    await flush();

    expect(query).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
