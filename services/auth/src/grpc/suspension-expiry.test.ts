import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isSuspensionExpired,
  liftExpiredSuspensions,
  liftSuspensionIfExpired,
} from './suspension-expiry.js';
import type { HandlerDeps } from './handlers.js';

const NOW = new Date('2026-06-10T12:00:00.000Z');

function makeMocks() {
  const script: Array<{ rows: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      const op = sql.trim().split(/\s+/)[0].toUpperCase();
      if (op === 'BEGIN' || op === 'COMMIT' || op === 'ROLLBACK' || sql.includes('event_outbox')) {
        return { rows: [] };
      }
      const next = script.shift();
      if (!next) {
        throw new Error(`client.query unscripted: ${sql.slice(0, 80)}`);
      }
      return next;
    }),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn() };
  const publish = vi.fn();
  const nats = { publish, jetstream: () => ({ publish }) };
  const deps = {
    pool: pool as unknown as Pool,
    nats: nats as unknown as NatsConnection,
  } as unknown as HandlerDeps;
  return { deps, client, publish, script };
}

type Mocks = ReturnType<typeof makeMocks>;

const businessSql = (mocks: Mocks): string[] =>
  (mocks.client.query.mock.calls as Array<[string]>)
    .map(([sql]) => sql)
    .filter(sql => !/^\s*(BEGIN|COMMIT|ROLLBACK)/i.test(sql) && !sql.includes('event_outbox'));

const events = (mocks: Mocks) =>
  mocks.publish.mock.calls.map(([subject, data]) => ({
    subject: subject as string,
    envelope: JSON.parse(new TextDecoder().decode(data as Uint8Array)).payload as {
      action: string;
      aggregateId: string;
      actorUserId?: string;
      outcome: string;
      payload: Record<string, unknown>;
    },
  }));

const userRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'usr-1',
  email: 'jane@example.com',
  status: 'suspended',
  user_type: 'adopter',
  suspended_until: new Date('2026-06-10T11:00:00.000Z'),
  ...overrides,
});

describe('isSuspensionExpired', () => {
  it('is true once the end time has passed', () => {
    expect(isSuspensionExpired(new Date('2026-06-10T11:59:59.999Z'), NOW)).toBe(true);
  });

  it('is true when the suspension expires exactly now (the boundary lifts)', () => {
    expect(isSuspensionExpired(new Date(NOW), NOW)).toBe(true);
  });

  it('is false while the end time is still in the future', () => {
    expect(isSuspensionExpired(new Date('2026-06-10T12:00:00.001Z'), NOW)).toBe(false);
  });

  it('is false for an indefinite suspension (no end time)', () => {
    expect(isSuspensionExpired(null, NOW)).toBe(false);
    expect(isSuspensionExpired(undefined, NOW)).toBe(false);
  });
});

describe('liftExpiredSuspensions', () => {
  let mocks: Mocks;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('reactivates users whose suspension has ended and records one audited event each, with no human actor', async () => {
    mocks.script.push({
      rows: [
        { user_id: 'usr-1', suspended_until: new Date('2026-06-10T11:00:00.000Z') },
        { user_id: 'usr-2', suspended_until: new Date('2026-06-10T12:00:00.000Z') },
      ],
    });

    const result = await liftExpiredSuspensions(mocks.deps, { now: NOW, batchSize: 100 });

    expect(result).toEqual({ liftedCount: 2 });
    const published = events(mocks);
    expect(published.map(e => e.subject)).toEqual(['auth.actionTaken', 'auth.actionTaken']);
    expect(published.map(e => e.envelope.aggregateId)).toEqual(['usr-1', 'usr-2']);
    for (const { envelope } of published) {
      expect(envelope).toMatchObject({ action: 'lift_suspension', outcome: 'success' });
      expect(envelope.actorUserId).toBeUndefined();
      expect(envelope.payload).toMatchObject({
        before: { status: 'suspended' },
        after: { status: 'active' },
        trigger: 'suspension_expired',
      });
    }
    expect(published[1].envelope.payload.suspendedUntil).toBe('2026-06-10T12:00:00.000Z');
  });

  it('only touches timed suspensions that have ended, locking rows so replicas never lift the same user twice', async () => {
    mocks.script.push({ rows: [] });

    await liftExpiredSuspensions(mocks.deps, { now: NOW, batchSize: 50 });

    const [sql] = businessSql(mocks);
    expect(sql).toContain("status = 'suspended'");
    // Indefinite suspensions have no end time and must never match.
    expect(sql).toContain('suspended_until IS NOT NULL');
    // Inclusive: expiring exactly now is lifted.
    expect(sql).toContain('suspended_until <= $1');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('deleted_at IS NULL');
    const [params] = (mocks.client.query.mock.calls as Array<[string, unknown[]?]>)
      .filter(([q]) => q.includes('suspended_until <= $1'))
      .map(([, p]) => p as unknown[]);
    expect(params[0]).toEqual(NOW);
    expect(params[1]).toBe(50);
  });

  it('clears suspended_until and bumps the version when lifting', async () => {
    mocks.script.push({ rows: [] });

    await liftExpiredSuspensions(mocks.deps, { now: NOW });

    const [sql] = businessSql(mocks);
    expect(sql).toContain("SET status = 'active'");
    expect(sql).toContain('suspended_until = NULL');
    expect(sql).toContain('version = version + 1');
  });

  it('publishes nothing and reports zero when no suspension has ended', async () => {
    mocks.script.push({ rows: [] });

    const result = await liftExpiredSuspensions(mocks.deps, { now: NOW });

    expect(result).toEqual({ liftedCount: 0 });
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('keeps going while batches come back full, and stops on the first short batch', async () => {
    mocks.script.push({ rows: [{ user_id: 'usr-1', suspended_until: NOW }] });
    mocks.script.push({ rows: [{ user_id: 'usr-2', suspended_until: NOW }] });
    mocks.script.push({ rows: [] });

    const result = await liftExpiredSuspensions(mocks.deps, { now: NOW, batchSize: 1 });

    expect(result).toEqual({ liftedCount: 2 });
    expect(businessSql(mocks)).toHaveLength(3);
  });
});

describe('liftSuspensionIfExpired', () => {
  let mocks: Mocks;
  beforeEach(() => {
    mocks = makeMocks();
  });
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('does nothing, and runs no query, for a suspension that has not ended', async () => {
    const result = await liftSuspensionIfExpired(
      mocks.deps,
      userRow({ suspended_until: new Date('2026-06-10T12:00:01.000Z') }) as never,
      NOW
    );

    expect(result).toBeUndefined();
    expect(mocks.client.query).not.toHaveBeenCalled();
  });

  it('does nothing for an indefinite suspension', async () => {
    const result = await liftSuspensionIfExpired(
      mocks.deps,
      userRow({ suspended_until: null }) as never,
      NOW
    );

    expect(result).toBeUndefined();
    expect(mocks.client.query).not.toHaveBeenCalled();
  });

  it('does nothing for a user who is not suspended', async () => {
    const result = await liftSuspensionIfExpired(
      mocks.deps,
      userRow({ status: 'active', suspended_until: new Date('2026-06-10T11:00:00.000Z') }) as never,
      NOW
    );

    expect(result).toBeUndefined();
    expect(mocks.client.query).not.toHaveBeenCalled();
  });

  it('lifts an ended suspension under a row lock, records one audited event, and returns the active row', async () => {
    mocks.script.push({ rows: [userRow()] }); // locked re-read
    mocks.script.push({ rows: [userRow({ status: 'active', suspended_until: null })] }); // UPDATE

    const result = await liftSuspensionIfExpired(mocks.deps, userRow() as never, NOW);

    expect(result).toMatchObject({ user_id: 'usr-1', status: 'active' });
    expect(businessSql(mocks)[0]).toContain('FOR UPDATE');
    const published = events(mocks);
    expect(published).toHaveLength(1);
    expect(published[0].envelope).toMatchObject({
      action: 'lift_suspension',
      aggregateId: 'usr-1',
      outcome: 'success',
    });
    expect(published[0].envelope.actorUserId).toBeUndefined();
    expect(published[0].envelope.payload).toMatchObject({ trigger: 'login_after_expiry' });
  });

  it('does not lift or publish again when another replica already lifted it', async () => {
    mocks.script.push({ rows: [userRow({ status: 'active', suspended_until: null })] });

    const result = await liftSuspensionIfExpired(mocks.deps, userRow() as never, NOW);

    expect(result).toMatchObject({ status: 'active' });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(businessSql(mocks)).toHaveLength(1);
  });

  it('leaves the suspension in place if it was extended after the first read', async () => {
    mocks.script.push({
      rows: [userRow({ suspended_until: new Date('2026-07-01T00:00:00.000Z') })],
    });

    const result = await liftSuspensionIfExpired(mocks.deps, userRow() as never, NOW);

    expect(result).toBeUndefined();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
