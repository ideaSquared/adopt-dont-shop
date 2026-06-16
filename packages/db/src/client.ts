import { Pool, type PoolConfig } from 'pg';

export type DbClientOptions = PoolConfig & {
  // Postgres schema this service owns. Every connection's search_path is set
  // to `<schema>, public` so unqualified table refs resolve service-locally
  // while PostGIS types/operators (installed into `public` by the postgis
  // Docker image) remain resolvable. CAD lesson from PR #48 — without
  // `public` on the path, `geography(Point,4326)` and `<->` blow up.
  schema: string;
};

// Unresponsive Postgres must fail fast — these defaults apply unless the
// caller explicitly overrides them.
const TIMEOUT_DEFAULTS = {
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000,
  query_timeout: 30_000,
} satisfies PoolConfig;

// `schema` is interpolated into SQL (the search_path SET). It's a
// service-owned constant, not user input, but validate it as a plain SQL
// identifier so a typo or a malformed value fails fast at construction
// rather than producing a broken connection (or, in theory, injecting).
const SAFE_SCHEMA = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function createDbClient(opts: DbClientOptions): Pool {
  const { schema, ...config } = opts;
  if (!SAFE_SCHEMA.test(schema)) {
    throw new Error(`createDbClient: invalid schema name "${schema}" (must match ${SAFE_SCHEMA})`);
  }
  const pool = new Pool({ ...TIMEOUT_DEFAULTS, ...config });

  pool.on('connect', client => {
    // A connection that fails to set its search_path would silently resolve
    // unqualified table refs to `public` (wrong rows / "relation does not
    // exist") — surface the failure instead of swallowing it: via the pool's
    // own error channel when a listener is attached, else stderr.
    client.query(`SET search_path TO "${schema}", public`).catch((err: unknown) => {
      if (pool.listenerCount('error') > 0) {
        pool.emit('error', err as Error, client);
      } else {
        console.error(`db: failed to set search_path for schema "${schema}":`, err);
      }
    });
  });

  return pool;
}
