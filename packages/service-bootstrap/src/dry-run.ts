// gRPC dry runs. When a call carries `x-dry-run: 1`, the shared adapter runs
// the handler against per-call "dry" deps: Postgres writes happen inside one
// transaction that is ALWAYS rolled back, and NATS publishes go nowhere.
//
// Only Postgres and NATS are contained. Every other dependency on `deps`
// (Redis, email, S3, other gRPC services, ...) is passed through unchanged and
// its side effects are NOT rolled back. That is why service.ops only
// dry-runs RPCs its registry marks `rollback`.

import type { JetStreamClient, NatsConnection } from 'nats';
import type { Pool, PoolClient, QueryResult } from 'pg';

export const DRY_RUN_HEADER = 'x-dry-run';
export const DRY_RUN_APPLIED_HEADER = 'x-dry-run-applied';

type Statement = 'begin' | 'commit' | 'rollback' | 'other';

const BEGIN_RE = /^\s*(BEGIN|START\s+TRANSACTION)\b[^;]*;?\s*$/i;
const COMMIT_RE = /^\s*(COMMIT|END)\s*;?\s*$/i;
const ROLLBACK_RE = /^\s*ROLLBACK\s*;?\s*$/i;

const EMPTY_RESULT: QueryResult = { rows: [], rowCount: 0, command: '', oid: 0, fields: [] };

const classify = (sql: string): Statement => {
  if (BEGIN_RE.test(sql)) {
    return 'begin';
  }
  if (COMMIT_RE.test(sql)) {
    return 'commit';
  }
  if (ROLLBACK_RE.test(sql)) {
    return 'rollback';
  }
  return 'other';
};

const sqlText = (arg: unknown): string | null => {
  if (typeof arg === 'string') {
    return arg;
  }
  const text = (arg as { text?: unknown } | null)?.text;
  return typeof text === 'string' ? text : null;
};

// Bind functions to their target so they work when read through a Proxy.
const passThrough = <T extends object>(target: T, prop: string | symbol): unknown => {
  const value: unknown = Reflect.get(target, prop, target);
  return typeof value === 'function' ? value.bind(target) : value;
};

// Wrap the one real client: BEGIN / COMMIT / ROLLBACK issued by handler code
// (e.g. `withTransaction`) become savepoint statements on the outer
// transaction, and release() is a no-op. `savepoints` is the open-savepoint
// stack shared by every wrapper of this call.
const wrapClient = (client: PoolClient, savepoints: string[], nextId: () => number): PoolClient =>
  new Proxy(client, {
    get(target, prop) {
      if (prop === 'release') {
        return () => undefined;
      }
      if (prop !== 'query') {
        return passThrough(target, prop);
      }
      return (...args: unknown[]): Promise<unknown> => {
        const kind = classify(sqlText(args[0]) ?? '');
        if (kind === 'other') {
          return (target.query as (...a: unknown[]) => Promise<unknown>)(...args);
        }
        if (kind === 'begin') {
          const name = `dry_run_${nextId()}`;
          savepoints.push(name);
          return target.query(`SAVEPOINT ${name}`);
        }
        // COMMIT / ROLLBACK with no open savepoint must never reach the real
        // transaction: it would end the outer one early.
        const name = savepoints.pop();
        if (name === undefined) {
          return Promise.resolve(EMPTY_RESULT);
        }
        return target.query(
          kind === 'commit' ? `RELEASE SAVEPOINT ${name}` : `ROLLBACK TO SAVEPOINT ${name}`
        );
      };
    },
  });

// A top-level `pool.query` outside any transaction is autocommitted in a real
// run, so one failing statement never affects the next. Inside the single
// dry-run transaction a failure would abort everything after it, so each
// top-level query gets its own savepoint and is rolled back to it on error.
// Queries are serialised so concurrent calls cannot interleave savepoints.
const makeIsolatedQuery = (client: PoolClient, wrapped: PoolClient, nextId: () => number) => {
  let queue: Promise<unknown> = Promise.resolve();
  const runIsolated = async (args: unknown[]): Promise<unknown> => {
    const name = `dry_run_stmt_${nextId()}`;
    await client.query(`SAVEPOINT ${name}`);
    try {
      const result = await (client.query as (...a: unknown[]) => Promise<unknown>)(...args);
      await client.query(`RELEASE SAVEPOINT ${name}`);
      return result;
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
      await client.query(`RELEASE SAVEPOINT ${name}`);
      throw err;
    }
  };
  return (...args: unknown[]): Promise<unknown> => {
    // Transaction-control statements keep their savepoint translation.
    const run =
      classify(sqlText(args[0]) ?? '') === 'other'
        ? () => runIsolated(args)
        : () => (wrapped.query as (...a: unknown[]) => Promise<unknown>)(...args);
    const result = queue.then(run);
    queue = result.catch(() => undefined);
    return result;
  };
};

// A pool look-alike bound to the single outer transaction. `.read` is the same
// facade, so replica-routed reads see the transaction's own writes.
const makeDryPool = (pool: Pool, client: PoolClient): Pool => {
  const savepoints: string[] = [];
  let counter = 0;
  const nextId = (): number => (counter += 1);
  const wrapped = wrapClient(client, savepoints, nextId);
  const isolatedQuery = makeIsolatedQuery(client, wrapped, nextId);
  const facade: Pool = new Proxy(pool, {
    get(target, prop) {
      if (prop === 'query') {
        return isolatedQuery;
      }
      if (prop === 'connect') {
        return () => Promise.resolve(wrapped);
      }
      if (prop === 'read') {
        return facade;
      }
      return passThrough(target, prop);
    },
  });
  return facade;
};

// No-op NATS: resolves like a healthy connection, publishes nothing. `request`
// rejects because there is no honest reply to fabricate.
const makeDryNats = (): NatsConnection => {
  const jetstream: Pick<JetStreamClient, 'publish'> = {
    publish: () => Promise.resolve({ stream: 'dry-run', seq: 0, duplicate: false, domain: '' }),
  };
  const stub: Pick<NatsConnection, 'publish' | 'request' | 'jetstream'> = {
    publish: () => undefined,
    request: () => Promise.reject(new Error('NATS request is unavailable in a dry run')),
    jetstream: () => jetstream as JetStreamClient,
  };
  // Assertion: only the methods withTransaction/outbox and handlers call are
  // stubbed; a full NatsConnection has dozens more nobody uses on this path.
  return stub as NatsConnection;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isPool = (value: unknown): value is Pool =>
  isObject(value) && typeof value.connect === 'function' && typeof value.query === 'function';

// Run `run` with dry-run deps. The shared `deps` is never mutated. The outer
// transaction is rolled back and the real client released on success AND error.
export async function runWithDryRunDeps<Deps, R>(
  deps: Deps,
  run: (dryDeps: Deps) => Promise<R>
): Promise<R> {
  if (!isObject(deps)) {
    return run(deps);
  }
  const natsOverride = 'nats' in deps ? { nats: makeDryNats() } : {};
  if (!isPool(deps.pool)) {
    // Assertion: only `nats` is replaced, so the object keeps the shape of Deps.
    return run({ ...deps, ...natsOverride } as Deps);
  }
  const client = await deps.pool.connect();
  try {
    await client.query('BEGIN');
    // Assertion: pool and nats are replaced by structurally compatible stand-ins.
    return await run({ ...deps, ...natsOverride, pool: makeDryPool(deps.pool, client) } as Deps);
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The handler's error (if any) is the one that matters.
    }
    client.release();
  }
}
