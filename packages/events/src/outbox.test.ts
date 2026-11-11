import type { NatsConnection } from 'nats';
import type { Pool, PoolClient } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMetricsRegistry, __resetMetricsForTest } from '@adopt-dont-shop/observability';

import {
  flushInline,
  insertOutboxRecords,
  MAX_OUTBOX_ATTEMPTS,
  QUARANTINE_MARKER,
  relayOutboxOnce,
  startOutboxRelay,
  toOutboxRecord,
  __resetOutboxMetricsForTest,
  type OutboxRecord,
} from './outbox.js';

function decodeBody(body: unknown): Record<string, unknown> {
  const s = body instanceof Uint8Array ? new TextDecoder().decode(body) : String(body);
  return JSON.parse(s) as Record<string, unknown>;
}

const record = (over: Partial<OutboxRecord> = {}): OutboxRecord => ({
  outboxId: 'ob-1',
  eventId: 'evt-1',
  subject: 'pets.created',
  payload: { petId: 'p1' },
  occurredAt: new Date('2026-01-15T10:30:00Z'),
  ...over,
});

// A pg pool/client double whose `query` is scripted by matching on the SQL
// keyword. Each test supplies what the claim `SELECT ... FOR UPDATE` returns;
// BEGIN/COMMIT/DELETE/UPDATE all fall through to an empty result.
function makePool(claimRows: Record<string, unknown>[]) {
  const query = vi.fn(async (sql: string, _params?: unknown[]) => {
    if (sql.includes('FOR UPDATE SKIP LOCKED')) {
      return { rows: claimRows };
    }
    if (sql.includes('SELECT count(*)')) {
      return { rows: [{ count: String(claimRows.length) }] };
    }
    return { rows: [] };
  });
  const client = { query, release: vi.fn() };
  const pool = { connect: vi.fn(async () => client), query };
  return {
    pool: pool as unknown as Pool,
    client: client as unknown as PoolClient,
    query,
    clientMock: client,
  };
}

function makeNats() {
  const jsPublish = vi
    .fn()
    .mockResolvedValue({ stream: 'DOMAIN_EVENTS', seq: 1, duplicate: false });
  const nats = { jetstream: vi.fn().mockReturnValue({ publish: jsPublish }) };
  return { nats: nats as unknown as NatsConnection, jsPublish };
}

describe('toOutboxRecord', () => {
  it('carries the event type as subject and the id as eventId', () => {
    const rec = toOutboxRecord({ type: 'pets.created', id: 'evt-9', payload: { a: 1 } });
    expect(rec.subject).toBe('pets.created');
    expect(rec.eventId).toBe('evt-9');
    expect(rec.payload).toEqual({ a: 1 });
    expect(typeof rec.outboxId).toBe('string');
  });

  it('defaults a missing event id to null (opt-out of dedup)', () => {
    const rec = toOutboxRecord({ type: 'pets.created', payload: {} });
    expect(rec.eventId).toBeNull();
  });
});

describe('insertOutboxRecords', () => {
  it('inserts every staged record in one multi-row statement', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await insertOutboxRecords({ query }, [
      record({ outboxId: 'ob-1', subject: 'a.x' }),
      record({ outboxId: 'ob-2', subject: 'b.y' }),
    ]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('INSERT INTO event_outbox');
    // 2 rows × 5 columns = 10 bound params.
    expect(params).toHaveLength(10);
    expect(params).toContain('ob-1');
    expect(params).toContain('ob-2');
  });

  it('is a no-op for an empty batch', async () => {
    const query = vi.fn();
    await insertOutboxRecords({ query }, []);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('relayOutboxOnce', () => {
  beforeEach(() => {
    __resetMetricsForTest();
    __resetOutboxMetricsForTest();
  });

  it('publishes each claimed row to its subject and deletes it on ack', async () => {
    const { pool, query } = makePool([
      {
        outbox_id: 'ob-1',
        event_id: 'evt-1',
        subject: 'pets.created',
        payload: { petId: 'p1' },
        occurred_at: new Date('2026-01-15T10:30:00Z'),
      },
    ]);
    const { nats, jsPublish } = makeNats();

    const published = await relayOutboxOnce({ pool, nats }, 100);

    expect(published).toBe(1);
    expect(jsPublish).toHaveBeenCalledTimes(1);
    expect(jsPublish.mock.calls[0][0]).toBe('pets.created');
    expect(decodeBody(jsPublish.mock.calls[0][1])).toMatchObject({ id: 'evt-1' });
    expect(jsPublish.mock.calls[0][2]).toMatchObject({ msgID: 'evt-1' });
    // The row is removed once published (self-cleaning queue).
    const deleted = query.mock.calls.some(
      ([sql, params]) => String(sql).includes('DELETE FROM event_outbox') && params?.[0] === 'ob-1'
    );
    expect(deleted).toBe(true);
  });

  it('returns 0 and never touches JetStream when nothing is pending', async () => {
    const { pool } = makePool([]);
    const { nats, jsPublish } = makeNats();

    const published = await relayOutboxOnce({ pool, nats }, 100);

    expect(published).toBe(0);
    expect(jsPublish).not.toHaveBeenCalled();
  });

  it('leaves the row and stamps last_error when a publish fails', async () => {
    const { pool, query } = makePool([
      {
        outbox_id: 'ob-1',
        event_id: 'evt-1',
        subject: 'pets.created',
        payload: {},
        occurred_at: new Date(),
      },
    ]);
    const nats = {
      jetstream: vi.fn().mockReturnValue({
        publish: vi.fn().mockRejectedValue(new Error('no stream ack')),
      }),
    } as unknown as NatsConnection;

    const published = await relayOutboxOnce({ pool, nats }, 100);

    expect(published).toBe(0);
    // No DELETE — the row survives for the next sweep...
    const deleted = query.mock.calls.some(([sql]) => String(sql).includes('DELETE'));
    expect(deleted).toBe(false);
    // ...and the failure is recorded on the row.
    const stamped = query.mock.calls.some(
      ([sql, params]) => String(sql).includes('last_error') && params?.[1] === 'no stream ack'
    );
    expect(stamped).toBe(true);
  });

  describe('poison rows', () => {
    const row = (id: string, attempts = 0) => ({
      outbox_id: id,
      event_id: id,
      subject: `s.${id}`,
      payload: {},
      occurred_at: new Date(),
      attempts,
    });
    const natsFailingFor = (...badSubjects: string[]) =>
      ({
        jetstream: vi.fn().mockReturnValue({
          publish: vi.fn(async (subject: string) => {
            if (badSubjects.includes(subject)) {
              throw new Error('payload too large');
            }
            return { seq: 1 };
          }),
        }),
      }) as unknown as NatsConnection;
    const attemptIncrements = (query: ReturnType<typeof makePool>['query']) =>
      Object.fromEntries(
        query.mock.calls
          .filter(([sql]) => String(sql).includes('SET attempts'))
          .map(([, params]) => [params?.[0], params?.[2]])
      );

    it('publishes later rows past a row that cannot publish', async () => {
      const { pool, query } = makePool([row('bad'), row('ok1'), row('ok2')]);

      const published = await relayOutboxOnce({ pool, nats: natsFailingFor('s.bad') }, 100);

      expect(published).toBe(2);
      const deleted = query.mock.calls
        .filter(([sql]) => String(sql).includes('DELETE'))
        .map(([, params]) => params?.[0]);
      expect(deleted).toEqual(['ok1', 'ok2']);
      // The poison row is attributable (others published), so its attempt counts.
      expect(attemptIncrements(query)).toEqual({ bad: 1 });
    });

    it('does not count attempts when nothing publishes (a NATS outage must not quarantine rows)', async () => {
      const { pool, query } = makePool([row('a'), row('b')]);

      await relayOutboxOnce({ pool, nats: natsFailingFor('s.a', 's.b') }, 100);

      expect(attemptIncrements(query)).toEqual({ a: 0, b: 0 });
    });

    it('stops the sweep after several consecutive failures instead of hammering a dead NATS', async () => {
      const rows = Array.from({ length: 20 }, (_, i) => row(`r${i}`));
      const { pool } = makePool(rows);
      const nats = natsFailingFor(...rows.map(r => r.subject));

      await relayOutboxOnce({ pool, nats }, 100);

      const publish = (nats.jetstream() as unknown as { publish: ReturnType<typeof vi.fn> })
        .publish;
      expect(publish.mock.calls.length).toBeLessThan(20);
    });

    const stampedErrors = (query: ReturnType<typeof makePool>['query']) =>
      Object.fromEntries(
        query.mock.calls
          .filter(([sql]) => String(sql).includes('SET attempts'))
          .map(([, params]) => [params?.[0], String(params?.[1])])
      );

    it('excludes quarantined rows by their marker, never by the raw attempts count', async () => {
      const { pool, query } = makePool([]);
      const { nats } = makeNats();

      await relayOutboxOnce({ pool, nats }, 100);

      const [sql, params] = query.mock.calls.find(([s]) =>
        String(s).includes('FOR UPDATE SKIP LOCKED')
      ) as [string, unknown[]];
      expect(sql).not.toContain('attempts <');
      expect(sql).toContain('last_error');
      expect(params[1]).toBe(QUARANTINE_MARKER);
    });

    it('delivers a legacy row whose attempts piled up before quarantine existed', async () => {
      // Before quarantine, every failure (including NATS outages) bumped attempts.
      const { pool, query } = makePool([row('legacy', MAX_OUTBOX_ATTEMPTS + 15)]);
      const { nats, jsPublish } = makeNats();

      const published = await relayOutboxOnce({ pool, nats }, 100);

      expect(published).toBe(1);
      expect(jsPublish).toHaveBeenCalledWith('s.legacy', expect.anything(), expect.anything());
      const deleted = query.mock.calls
        .filter(([sql]) => String(sql).includes('DELETE'))
        .map(([, params]) => params?.[0]);
      expect(deleted).toEqual(['legacy']);
    });

    it('sends a legacy row that fails attributably through the normal quarantine path', async () => {
      const { pool, query } = makePool([row('legacy', MAX_OUTBOX_ATTEMPTS + 15), row('ok')]);
      const logger = { warn: vi.fn(), error: vi.fn() };

      await relayOutboxOnce({ pool, nats: natsFailingFor('s.legacy'), logger }, 100);

      expect(stampedErrors(query).legacy).toBe(`${QUARANTINE_MARKER}payload too large`);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('quarantined'),
        expect.objectContaining({ subject: 's.legacy' })
      );
      const text = await getMetricsRegistry().metrics();
      expect(text).toContain('events_outbox_quarantined_total 1');
    });

    it('marks the row that reaches the cap and leaves earlier failures unmarked', async () => {
      const { pool, query } = makePool([
        row('last', MAX_OUTBOX_ATTEMPTS - 1),
        row('early', 2),
        row('ok'),
      ]);

      await relayOutboxOnce({ pool, nats: natsFailingFor('s.last', 's.early') }, 100);

      expect(stampedErrors(query)).toEqual({
        last: `${QUARANTINE_MARKER}payload too large`,
        early: 'payload too large',
      });
    });

    it('never marks a row during an outage, even one a single attempt from the cap', async () => {
      const { pool, query } = makePool([row('a', MAX_OUTBOX_ATTEMPTS - 1)]);
      const logger = { warn: vi.fn(), error: vi.fn() };

      await relayOutboxOnce({ pool, nats: natsFailingFor('s.a'), logger }, 100);

      expect(stampedErrors(query)).toEqual({ a: 'payload too large' });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('skips a marked row while later rows keep flowing', async () => {
      // Stateful double: the claim honours the marker parameter like the SQL does.
      const table = [
        { ...row('poison', MAX_OUTBOX_ATTEMPTS), last_error: `${QUARANTINE_MARKER}too big` },
        row('ok1'),
        row('ok2'),
      ].map(r => ({ last_error: null as string | null, ...r }));
      const query = vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('FOR UPDATE SKIP LOCKED')) {
          const marker = String(params?.[1]);
          return { rows: table.filter(r => !r.last_error?.startsWith(marker)) };
        }
        if (sql.includes('DELETE')) {
          const i = table.findIndex(r => r.outbox_id === params?.[0]);
          table.splice(i, 1);
        }
        return { rows: [] };
      });
      const client = { query, release: vi.fn() };
      const pool = { connect: vi.fn(async () => client), query } as unknown as Pool;
      const { nats, jsPublish } = makeNats();

      const published = await relayOutboxOnce({ pool, nats }, 100);

      expect(published).toBe(2);
      expect(jsPublish.mock.calls.map(([subject]) => subject)).toEqual(['s.ok1', 's.ok2']);
      expect(table.map(r => r.outbox_id)).toEqual(['poison']);
    });

    it('quarantines a row on its final attempt: logs at error and counts it', async () => {
      const { pool } = makePool([row('bad', MAX_OUTBOX_ATTEMPTS - 1), row('ok')]);
      const logger = { warn: vi.fn(), error: vi.fn() };

      await relayOutboxOnce({ pool, nats: natsFailingFor('s.bad'), logger }, 100);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('quarantined'),
        expect.objectContaining({ subject: 's.bad', attempts: MAX_OUTBOX_ATTEMPTS })
      );
      const text = await getMetricsRegistry().metrics();
      expect(text).toContain('events_outbox_quarantined_total 1');
    });
  });

  it('counts successes and failures on the shared metrics registry', async () => {
    const { pool } = makePool([
      { outbox_id: 'ob-1', event_id: 'e1', subject: 's.a', payload: {}, occurred_at: new Date() },
    ]);
    const { nats } = makeNats();

    await relayOutboxOnce({ pool, nats }, 100);

    const text = await getMetricsRegistry().metrics();
    expect(text).toContain('events_outbox_published_total 1');
  });
});

describe('flushInline', () => {
  beforeEach(() => {
    __resetMetricsForTest();
    __resetOutboxMetricsForTest();
  });

  it('publishes then deletes each record on the given client', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const { nats, jsPublish } = makeNats();

    await flushInline(nats, { query }, [
      record({ outboxId: 'ob-1' }),
      record({ outboxId: 'ob-2' }),
    ]);

    expect(jsPublish).toHaveBeenCalledTimes(2);
    const deletes = query.mock.calls.filter(([sql]) => String(sql).includes('DELETE'));
    expect(deletes).toHaveLength(2);
  });

  it('stops on the first publish failure, leaving remaining rows for the relay', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const publish = vi
      .fn()
      .mockResolvedValueOnce({ seq: 1 })
      .mockRejectedValueOnce(new Error('boom'));
    const nats = { jetstream: vi.fn().mockReturnValue({ publish }) } as unknown as NatsConnection;

    await flushInline(nats, { query }, [
      record({ outboxId: 'ob-1' }),
      record({ outboxId: 'ob-2' }),
    ]);

    // First published + deleted; second attempted then abandoned (no delete).
    expect(publish).toHaveBeenCalledTimes(2);
    const deletes = query.mock.calls.filter(([sql]) => String(sql).includes('DELETE'));
    expect(deletes).toHaveLength(1);
    expect(deletes[0][1][0]).toBe('ob-1');
  });

  it('never throws on a publish failure (the outbox row is the durability guarantee)', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const nats = {
      jetstream: vi.fn().mockReturnValue({ publish: vi.fn().mockRejectedValue(new Error('x')) }),
    } as unknown as NatsConnection;

    await expect(flushInline(nats, { query }, [record()])).resolves.toBeUndefined();
  });

  it('counts an inline publish failure on the shared failure metric', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const nats = {
      jetstream: vi.fn().mockReturnValue({ publish: vi.fn().mockRejectedValue(new Error('x')) }),
    } as unknown as NatsConnection;

    await flushInline(nats, { query }, [record()]);

    const text = await getMetricsRegistry().metrics();
    expect(text).toContain('events_outbox_publish_failures_total 1');
  });
});

describe('startOutboxRelay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetMetricsForTest();
    __resetOutboxMetricsForTest();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sweeps the outbox on each interval and stops when stopped', async () => {
    const { pool, query } = makePool([
      { outbox_id: 'ob-1', event_id: 'e1', subject: 's.a', payload: {}, occurred_at: new Date() },
    ]);
    const { nats, jsPublish } = makeNats();

    const handle = startOutboxRelay({ pool, nats }, { intervalMs: 100 });

    await vi.advanceTimersByTimeAsync(100);
    expect(jsPublish).toHaveBeenCalledTimes(1);

    handle.stop();
    jsPublish.mockClear();
    await vi.advanceTimersByTimeAsync(300);
    expect(jsPublish).not.toHaveBeenCalled();
    // sanity: the claim query did run while active.
    expect(query).toHaveBeenCalled();
  });
});
