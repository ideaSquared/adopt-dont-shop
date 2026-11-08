// Real-Postgres tests for the ops store: migrations apply, the SQL in
// pg-store.ts is correct, plans are single-use, and the access log is
// hash-chained and append-only. Skipped unless DATABASE_URL is set — see
// docs/testing.md.

import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { makeNatsDouble, withTestDatabase } from '@adopt-dont-shop/test-utils';
import { describe, expect, it } from 'vitest';

import { verifyChain, type AccessLogEntry, type ChainedEntry } from './access-chain.js';
import { createPgStore } from './pg-store.js';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const NOW = new Date('2026-11-08T12:00:00.000Z');
const LATER = new Date('2026-11-08T12:05:00.000Z');

const withStore = <T>(
  fn: (ctx: {
    store: ReturnType<typeof createPgStore>;
    pool: Parameters<Parameters<typeof withTestDatabase>[1]>[0];
    published: ReturnType<typeof makeNatsDouble>['published'];
  }) => Promise<T>
): Promise<T> =>
  withTestDatabase({ schemaPrefix: 'ops_store', migrationsDir: MIGRATIONS_DIR }, async pool => {
    const nats = makeNatsDouble();
    return fn({ store: createPgStore(pool, nats.connection), pool, published: nats.published });
  });

const entry = (operatorId: string, over: Partial<AccessLogEntry> = {}): AccessLogEntry => ({
  at: NOW.toISOString(),
  operatorId,
  rpc: 'pets.Get',
  kind: 'read',
  mode: 'run',
  outcome: 'ok',
  errorCode: null,
  planId: null,
  unlockId: null,
  revealedFields: [],
  requestHash: null,
  ...over,
});

describe.skipIf(!process.env.DATABASE_URL)('ops store (real Postgres)', () => {
  it('upserts an operator by login and finds a live session by token hash', async () => {
    await withStore(async ({ store }) => {
      const first = await store.upsertOperator({ login: 'octocat', githubId: 1, name: null }, NOW);
      const again = await store.upsertOperator(
        { login: 'octocat', githubId: 1, name: 'Mona' },
        LATER
      );
      expect(again.operatorId).toBe(first.operatorId);

      await store.createSession(
        { operatorId: first.operatorId, tokenHash: 'h'.repeat(64), expiresAt: LATER },
        NOW
      );
      const session = await store.findSession('h'.repeat(64), NOW);
      expect(session?.operator.login).toBe('octocat');

      expect(await store.findSession('h'.repeat(64), LATER)).toBeNull();
    });
  });

  it('lets a plan be consumed exactly once', async () => {
    await withStore(async ({ store }) => {
      const op = await store.upsertOperator({ login: 'dev', githubId: null, name: null }, NOW);
      const planId = randomUUID();
      await store.createPlan(
        {
          planId,
          operatorId: op.operatorId,
          rpc: 'pets.UpdateStatus',
          requestHash: 'r'.repeat(64),
          expiresAt: LATER,
        },
        NOW
      );

      const results = await Promise.all([
        store.markPlanUsed(planId, NOW),
        store.markPlanUsed(planId, NOW),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
      expect((await store.findPlan(planId))?.usedAt).not.toBeNull();
    });
  });

  it('records an unlock with its audit event and lists it until revoked', async () => {
    await withStore(async ({ store, published }) => {
      const op = await store.upsertOperator({ login: 'dev', githubId: null, name: null }, NOW);
      const unlockId = randomUUID();
      await store.createUnlock(
        {
          unlockId,
          operatorId: op.operatorId,
          subjectType: 'user',
          subjectId: randomUUID(),
          reason: 'Investigating failed adoption',
          ticket: 'ADS-1502',
          createdAt: NOW,
          expiresAt: LATER,
        },
        {
          id: `ops.actionTaken.${randomUUID()}`,
          type: 'ops.actionTaken',
          payload: { eventId: randomUUID() },
        }
      );
      expect(published).toEqual([expect.objectContaining({ subject: 'ops.actionTaken' })]);
      expect(await store.listActiveUnlocks(op.operatorId, NOW)).toHaveLength(1);

      expect(await store.revokeUnlock(op.operatorId, unlockId, NOW)).toBe(true);
      expect(await store.listActiveUnlocks(op.operatorId, NOW)).toHaveLength(0);
    });
  });

  it('hash-chains concurrent access-log appends and refuses edits', async () => {
    await withStore(async ({ store, pool }) => {
      const op = await store.upsertOperator({ login: 'dev', githubId: null, name: null }, NOW);
      await Promise.all(
        ['pets.Get', 'pets.List', 'audit.Query', 'rescue.Get'].map(rpc =>
          store.appendAccessLog(entry(op.operatorId, { rpc }), [])
        )
      );

      const { rows } = await pool.query<{
        at: Date;
        operator_id: string;
        rpc: string;
        kind: 'read' | 'write';
        mode: 'run' | 'preview' | 'execute';
        outcome: 'ok' | 'error';
        error_code: string | null;
        plan_id: string | null;
        unlock_id: string | null;
        revealed_fields: string[];
        request_hash: string | null;
        prev_hash: string;
        hash: string;
      }>('SELECT * FROM access_log ORDER BY id');
      const chain: ChainedEntry[] = rows.map(r => ({
        at: r.at.toISOString(),
        operatorId: r.operator_id,
        rpc: r.rpc,
        kind: r.kind,
        mode: r.mode,
        outcome: r.outcome,
        errorCode: r.error_code,
        planId: r.plan_id,
        unlockId: r.unlock_id,
        revealedFields: r.revealed_fields,
        requestHash: r.request_hash,
        prevHash: r.prev_hash,
        hash: r.hash,
      }));
      expect(chain).toHaveLength(4);
      expect(verifyChain(chain)).toBe(true);

      await expect(pool.query(`UPDATE access_log SET rpc = 'x'`)).rejects.toThrow(/append-only/);
      await expect(pool.query('DELETE FROM access_log')).rejects.toThrow(/append-only/);

      const history = await store.listHistory(op.operatorId, 10);
      expect(history).toHaveLength(4);
    });
  });
});
