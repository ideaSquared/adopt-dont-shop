import { runner, type RunnerOption } from 'node-pg-migrate';

export type MigrationOptions = {
  databaseUrl: string;
  // Postgres schema this service owns. node-pg-migrate creates it if missing.
  schema: string;
  // Absolute path to the migrations directory. Use a path that resolves
  // identically in dev (tsx) and prod (bundled) — see CAD lesson on tsup
  // `entry:` remap to `dist/migrations/<name>.js`.
  migrationsDir: string;
  // Max retry attempts on the database-wide advisory-lock contention error
  // that node-pg-migrate raises when multiple services boot together.
  maxRetries?: number;
  // Linear backoff base (ms). Attempt N waits `retryBackoffMs * N`.
  retryBackoffMs?: number;
};

// node-pg-migrate raises this message when another instance holds the
// database-wide advisory lock around `pgmigrations`. We don't get a typed
// error class, so substring match is the only signal available.
const ADVISORY_LOCK_MESSAGE = 'Another migration is already running';

export async function runMigrations(opts: MigrationOptions): Promise<void> {
  const { databaseUrl, schema, migrationsDir, maxRetries = 12, retryBackoffMs = 250 } = opts;

  const runnerOpts: RunnerOption = {
    databaseUrl,
    schema,
    // CAD lesson #1: without this the runner tries to create the
    // bookkeeping table inside a schema that doesn't yet exist.
    createSchema: true,
    dir: migrationsDir,
    migrationsTable: 'pgmigrations',
    direction: 'up',
    // CAD lesson #3: directory scan picks up `.js.map` sidecars and tries
    // to `import()` them — dies with ERR_UNKNOWN_FILE_EXTENSION. Also skips
    // dotfiles.
    ignorePattern: '(\\..*|.*\\.map)',
    log: () => {
      /* silent — callers wrap in their own observability layer */
    },
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await runner(runnerOpts);
      return;
    } catch (err) {
      lastError = err;
      // CAD lesson #9: with N services migrating against the same physical
      // Postgres, simultaneous boots race for the advisory lock — losers
      // crash on startup. Retry-with-linear-backoff queues them.
      const msg = (err as Error | null)?.message ?? '';
      if (!msg.includes(ADVISORY_LOCK_MESSAGE)) {
        throw err;
      }
      if (attempt === maxRetries) {
        break;
      }
      await sleep(retryBackoffMs * attempt);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
