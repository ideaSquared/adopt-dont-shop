import { Pool, type PoolConfig } from 'pg';

export type DbClientOptions = PoolConfig & {
  // Postgres schema this service owns. Every connection's search_path is set
  // to `<schema>, public` so unqualified table refs resolve service-locally
  // while PostGIS types/operators (installed into `public` by the postgis
  // Docker image) remain resolvable. CAD lesson from PR #48 — without
  // `public` on the path, `geography(Point,4326)` and `<->` blow up.
  schema: string;

  // Optional read-replica connection string (ADS-815). When set, a second,
  // read-only pool is opened against it and exposed as `.read`; read-only
  // queries can be routed there to take load off the primary. When unset,
  // `.read` aliases the primary pool, so call sites use `.read` unconditionally
  // and transparently fall back to the primary in single-instance deploys.
  //
  // Wire it from the per-service config convention READ_DATABASE_URL (and
  // READ_DATABASE_URL_FILE for the file-mounted secret path). The convention
  // for which call sites use `.read`: read-only RPCs / queries use `pool.read`;
  // every write and every transaction (withTransaction) stays on `pool`
  // (the primary). See docs/adr/0004-postgres-read-replica-routing.md.
  readUrl?: string;
};

// A primary pool with a `read` pool for read-only routing. `read` is always
// present — it aliases the primary when no replica is configured — so call
// sites never branch on whether a replica exists.
export type DbClient = Pool & { read: Pool };

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

// Build a single pool with the schema search_path wiring applied on connect.
function buildPool(schema: string, config: PoolConfig): Pool {
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

export function createDbClient(opts: DbClientOptions): DbClient {
  const { schema, readUrl, ...config } = opts;
  if (!SAFE_SCHEMA.test(schema)) {
    throw new Error(`createDbClient: invalid schema name "${schema}" (must match ${SAFE_SCHEMA})`);
  }

  const primary = buildPool(schema, config);

  // No replica configured → `.read` falls back to the primary so read-only
  // call sites work unchanged in single-instance deploys.
  if (readUrl === undefined || readUrl === '') {
    return Object.assign(primary, { read: primary });
  }

  // A replica IS configured: open a read-only pool against it. It inherits the
  // same timeout defaults and search_path wiring, but only the connection
  // string differs — credentials/host come from readUrl, never the primary's.
  const read = buildPool(schema, { ...config, connectionString: readUrl });
  return Object.assign(primary, { read });
}
