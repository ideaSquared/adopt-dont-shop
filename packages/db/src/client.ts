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

// Default per-service pool ceiling (ADS-1042). node-pg's own default is 10;
// with 10 DB-owning services that pins the cluster to 10 × 10 = 100 connections
// at saturation — exactly Postgres's default `max_connections=100` — so scaling
// any service to a second replica guarantees `FATAL: too many clients`.
//
// Budget: Σ(DB-owning services) × max × replicas + reserved < max_connections.
// With 10 services, max=8, and `max_connections` raised to 200 (see the compose
// Postgres `command:` entries and docs/operations/connection-budget.md):
//   baseline (1 replica each): 10 × 8 × 1 = 80
//   all services at 2 replicas: 10 × 8 × 2 = 160
//   + ~20 reserved (backups + migrations + admin/psql + superuser_reserved) = 180
//   180 < 200 → every service can scale to 2 replicas with headroom to spare.
// Override per service with DB_POOL_MAX, or per call site with `max` in options.
const DEFAULT_POOL_MAX = 8;

// Resolve the pool ceiling with precedence: an explicit `max` in the caller's
// options wins, then the per-service `DB_POOL_MAX` env var, then the default.
// A malformed `DB_POOL_MAX` (non-integer or ≤ 0) is ignored in favour of the
// default rather than silently shrinking the pool to something unusable.
function resolvePoolMax(configMax: number | undefined): number {
  if (configMax !== undefined) {
    return configMax;
  }
  const fromEnv = Number(process.env.DB_POOL_MAX);
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  return DEFAULT_POOL_MAX;
}

// `schema` is interpolated into SQL (the search_path SET). It's a
// service-owned constant, not user input, but validate it as a plain SQL
// identifier so a typo or a malformed value fails fast at construction
// rather than producing a broken connection (or, in theory, injecting).
const SAFE_SCHEMA = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Build a single pool with the schema search_path wiring applied on connect.
function buildPool(schema: string, config: PoolConfig): Pool {
  const pool = new Pool({ ...TIMEOUT_DEFAULTS, ...config });

  // pg emits 'error' on an *idle* pooled client whenever its backend
  // connection drops — Postgres failover/restart/idle-reap or a brief network
  // partition, all routine in production. With NO listener, Node re-throws it
  // as an unhandled 'error' and the process terminates → crash-loop under
  // `restart: always`, with no logged cause. A persistent listener keeps the
  // process alive and surfaces it; the query/transaction paths still observe
  // their own failures through the returned promise. Logged to stderr (not a
  // logger) because this low-level package can't assume one is configured —
  // same reason as the search_path fallback below.
  pool.on('error', (err: Error) => {
    console.error(`db: pool error (schema "${schema}"):`, err);
  });

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

  // Resolve the pool ceiling once and apply it to both pools so the read
  // replica shares the same per-service budget (ADS-1042).
  const pooled = { ...config, max: resolvePoolMax(config.max) };

  const primary = buildPool(schema, pooled);

  // No replica configured → `.read` falls back to the primary so read-only
  // call sites work unchanged in single-instance deploys.
  if (readUrl === undefined || readUrl === '') {
    return Object.assign(primary, { read: primary });
  }

  // A replica IS configured: open a read-only pool against it. It inherits the
  // same timeout defaults, pool ceiling, and search_path wiring, but only the
  // connection string differs — credentials/host come from readUrl, never the
  // primary's.
  const read = buildPool(schema, { ...pooled, connectionString: readUrl });
  return Object.assign(primary, { read });
}
