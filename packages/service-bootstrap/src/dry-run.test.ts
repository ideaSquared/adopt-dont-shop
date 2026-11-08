import { Metadata, type ServerUnaryCall, type sendUnaryData } from '@grpc/grpc-js';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import type { Logger } from 'winston';

import { adapt, adaptUnauth, HandlerError, type HandlerDeps } from './adapter.js';
import { DRY_RUN_APPLIED_HEADER, DRY_RUN_HEADER } from './index.js';

const logger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as unknown as Logger;

const HEADERS = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'rescue_staff',
  'x-user-permissions': 'pets.read',
};

// A fake pg setup: every statement that reaches the REAL client is recorded.
const makeDb = () => {
  const statements: string[] = [];
  const client = {
    query: vi.fn(async (sql: string | { text: string }) => {
      const text = typeof sql === 'string' ? sql : sql.text;
      statements.push(text);
      if (text.includes('VIOLATES_UNIQUE')) {
        throw new Error('duplicate key value violates unique constraint');
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
  const pool = {
    query: vi.fn(async () => {
      statements.push('<direct pool query>');
      return { rows: [], rowCount: 0 };
    }),
    connect: vi.fn(async () => client),
  };
  const pool2 = Object.assign(pool, { read: pool });
  return { pool: pool2 as unknown as Pool, client, statements };
};

const makeNats = () => {
  const published: string[] = [];
  const nats = {
    publish: (subject: string) => void published.push(subject),
    jetstream: () => ({
      publish: async (subject: string) => void published.push(subject),
    }),
  } as unknown as NatsConnection;
  return { nats, published };
};

const callWith = (headers: Record<string, string>) => {
  const md = new Metadata();
  Object.entries(headers).forEach(([k, v]) => md.set(k, v));
  const sendMetadata = vi.fn();
  const call = { request: {}, metadata: md, sendMetadata } as unknown as ServerUnaryCall<
    unknown,
    unknown
  >;
  return { call, sendMetadata };
};

const settle = async () => {
  for (let i = 0; i < 5; i += 1) {
    await new Promise(r => setImmediate(r));
  }
};

const run = async (
  wrapped: ReturnType<typeof adapt>,
  headers: Record<string, string>
): Promise<{ err: unknown; res: unknown; sendMetadata: ReturnType<typeof vi.fn> }> => {
  const { call, sendMetadata } = callWith({ ...HEADERS, ...headers });
  const callback = vi.fn() as unknown as sendUnaryData<unknown>;
  wrapped(call, callback);
  await settle();
  const [err, res] = vi.mocked(callback).mock.calls[0];
  return { err, res, sendMetadata };
};

const DRY = { [DRY_RUN_HEADER]: '1' };

describe('dry-run — Postgres', () => {
  it('rolls the outer transaction back and never commits', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('INSERT INTO pets.pets VALUES (1)');
      return { ok: true };
    };
    const { res } = await run(
      adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }),
      DRY
    );

    expect(res).toEqual({ ok: true });
    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_stmt_1',
      'INSERT INTO pets.pets VALUES (1)',
      'RELEASE SAVEPOINT dry_run_stmt_1',
      'ROLLBACK',
    ]);
    expect(db.client.release).toHaveBeenCalledTimes(1);
  });

  it('works through adaptUnauth too', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('DELETE FROM pets.pets');
      return {};
    };
    await run(adaptUnauth('svc', handler, { deps: { pool: db.pool, nats }, logger }), DRY);

    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_stmt_1',
      'DELETE FROM pets.pets',
      'RELEASE SAVEPOINT dry_run_stmt_1',
      'ROLLBACK',
    ]);
  });

  it('routes pool.read into the same transaction', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await (d.pool as Pool & { read: Pool }).read.query('SELECT 1');
      return {};
    };
    await run(adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }), DRY);

    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_stmt_1',
      'SELECT 1',
      'RELEASE SAVEPOINT dry_run_stmt_1',
      'ROLLBACK',
    ]);
  });

  it('turns handler transactions into savepoints, including nested ones', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      const outer = await d.pool.connect();
      await outer.query('BEGIN');
      await outer.query('INSERT INTO a VALUES (1)');
      const inner = await d.pool.connect();
      await inner.query('begin isolation level serializable');
      await inner.query({ text: 'ROLLBACK;' });
      inner.release();
      await outer.query('COMMIT');
      outer.release();
      return {};
    };
    await run(adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }), DRY);

    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_1',
      'INSERT INTO a VALUES (1)',
      'SAVEPOINT dry_run_2',
      'ROLLBACK TO SAVEPOINT dry_run_2',
      'RELEASE SAVEPOINT dry_run_1',
      'ROLLBACK',
    ]);
    expect(db.client.release).toHaveBeenCalledTimes(1);
  });

  it('keeps the transaction usable after a failed top-level query, like autocommit would', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('INSERT VIOLATES_UNIQUE').catch(() => undefined);
      await d.pool.query('SELECT 1');
      return {};
    };
    const { err } = await run(
      adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }),
      DRY
    );

    expect(err).toBeNull();
    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_stmt_1',
      'INSERT VIOLATES_UNIQUE',
      'ROLLBACK TO SAVEPOINT dry_run_stmt_1',
      'RELEASE SAVEPOINT dry_run_stmt_1',
      'SAVEPOINT dry_run_stmt_2',
      'SELECT 1',
      'RELEASE SAVEPOINT dry_run_stmt_2',
      'ROLLBACK',
    ]);
  });

  it('serialises concurrent top-level queries so their savepoints never interleave', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await Promise.all([d.pool.query('SELECT a'), d.pool.query('SELECT b')]);
      return {};
    };
    await run(adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }), DRY);

    expect(db.statements).toEqual([
      'BEGIN',
      'SAVEPOINT dry_run_stmt_1',
      'SELECT a',
      'RELEASE SAVEPOINT dry_run_stmt_1',
      'SAVEPOINT dry_run_stmt_2',
      'SELECT b',
      'RELEASE SAVEPOINT dry_run_stmt_2',
      'ROLLBACK',
    ]);
  });

  it('never lets a stray COMMIT reach the real transaction', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('COMMIT');
      return {};
    };
    await run(adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }), DRY);

    expect(db.statements).toEqual(['BEGIN', 'ROLLBACK']);
  });

  it('still rolls back and releases the client when the handler throws', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('INSERT INTO a VALUES (1)');
      throw new HandlerError('NOT_FOUND', 'nope');
    };
    const { err } = await run(
      adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }),
      DRY
    );

    expect(err).toMatchObject({ details: 'nope' });
    expect(db.statements.at(-1)).toBe('ROLLBACK');
    expect(db.client.release).toHaveBeenCalledTimes(1);
  });

  it('keeps concurrent calls isolated and leaves the shared deps untouched', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const deps = { pool: db.pool, nats };
    const seen: Pool[] = [];
    const handler = async (d: HandlerDeps) => {
      seen.push(d.pool);
      return {};
    };
    const wrapped = adapt('svc', handler, { deps, logger });
    await Promise.all([run(wrapped, DRY), run(wrapped, DRY)]);

    expect(seen[0]).not.toBe(seen[1]);
    expect(deps.pool).toBe(db.pool);
    expect(deps.nats).toBe(nats);
  });
});

describe('dry-run — NATS and other deps', () => {
  it('publishes nothing, even through a handler-style transaction', async () => {
    const db = makeDb();
    const { nats, published } = makeNats();
    const handler = async (d: HandlerDeps) => {
      // Mirrors withTransaction: BEGIN, write, COMMIT, then inline JetStream flush.
      const client = await d.pool.connect();
      await client.query('BEGIN');
      await client.query('INSERT INTO event_outbox VALUES (1)');
      await client.query('COMMIT');
      await d.nats.jetstream().publish('pets.actionTaken');
      d.nats.publish('pets.other');
      client.release();
      return {};
    };
    const { err } = await run(
      adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }),
      DRY
    );

    expect(err).toBeNull();
    expect(published).toEqual([]);
  });

  it('honours dry-run when deps have no pool, and passes other deps through', async () => {
    const { nats, published } = makeNats();
    const redis = { tag: 'redis' };
    const handler = async (d: { nats: NatsConnection; redis: typeof redis }) => {
      d.nats.publish('x');
      return { redis: d.redis };
    };
    const { res, sendMetadata } = await run(
      adapt('svc', handler, { deps: { nats, redis }, logger }),
      DRY
    );

    expect(res).toEqual({ redis });
    expect(published).toEqual([]);
    expect(sendMetadata.mock.calls[0][0].get(DRY_RUN_APPLIED_HEADER)).toEqual(['1']);
  });
});

describe('dry-run — headers and normal calls', () => {
  it('echoes the applied header alongside x-request-id in one sendMetadata call', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async () => ({});
    const { sendMetadata } = await run(
      adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }),
      { ...DRY, 'x-request-id': 'req-9' }
    );

    expect(sendMetadata).toHaveBeenCalledTimes(1);
    const md: Metadata = sendMetadata.mock.calls[0][0];
    expect(md.get('x-request-id')).toEqual(['req-9']);
    expect(md.get(DRY_RUN_APPLIED_HEADER)).toEqual(['1']);
  });

  it('leaves normal calls untouched: real deps, no extra queries, no applied header', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const deps = { pool: db.pool, nats };
    const handler = async (d: HandlerDeps) => {
      await d.pool.query('SELECT 1');
      return { same: d.pool === db.pool };
    };
    const { res, sendMetadata } = await run(adapt('svc', handler, { deps, logger }), {});

    expect(res).toEqual({ same: true });
    expect(db.statements).toEqual(['<direct pool query>']);
    expect(db.client.query).not.toHaveBeenCalled();
    expect(sendMetadata.mock.calls[0][0].get(DRY_RUN_APPLIED_HEADER)).toEqual([]);
  });

  it('ignores x-dry-run values other than 1', async () => {
    const db = makeDb();
    const { nats } = makeNats();
    const handler = async () => ({});
    await run(adapt('svc', handler, { deps: { pool: db.pool, nats }, logger }), {
      [DRY_RUN_HEADER]: '0',
    });

    expect(db.pool.connect).not.toHaveBeenCalled();
  });
});
