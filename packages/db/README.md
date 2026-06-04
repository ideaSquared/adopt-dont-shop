# @adopt-dont-shop/db

Postgres client + migration runner for backend microservices.

Bakes in the four CAD-lesson fixes so every service that adds Postgres
gets the working setup from day one:

1. **`createSchema: true`** (CAD lesson #1) — the runner creates its
   `pgmigrations` bookkeeping table inside the service schema; without
   this, services crash-loop on first boot with
   `schema "<x>" does not exist`.
2. **Output-path discipline** (CAD lesson #2) — callers must point
   `migrationsDir` at a path that resolves identically in dev (`tsx`)
   and prod (bundled). The CAD fix was a `tsup` `entry:` remap to
   `dist/migrations/<name>.js`; mirror that in any service that bundles.
3. **`ignorePattern: '(\\..*|.*\\.map)'`** (CAD lesson #3) — without
   this the runner's directory scan picks up `.js.map` sidecars and
   tries to `import()` them, dying with `ERR_UNKNOWN_FILE_EXTENSION`.
4. **Retry-with-linear-backoff** (CAD lesson #9) — `node-pg-migrate`
   takes a database-wide advisory lock around `pgmigrations`. When N
   services boot together, losers throw
   _"Another migration is already running"_ and crash. The runner
   doesn't expose a wait-for-lock option, so we retry up to 12 attempts
   with a 250 ms × attempt backoff.

Plus the schema/public `search_path` for PostGIS compatibility
(CAD lesson from PR #48 — without `public` on the path, `geography`
types and the `<->` KNN operator are invisible).

## Usage

```ts
import { createDbClient, runMigrations } from '@adopt-dont-shop/db';

// On boot:
await runMigrations({
  databaseUrl: process.env.DATABASE_URL!,
  schema: 'pets',
  migrationsDir: new URL('./migrations/', import.meta.url).pathname,
});

// In handlers:
const db = createDbClient({
  connectionString: process.env.DATABASE_URL,
  schema: 'pets',
});
const result = await db.query('SELECT id FROM pets WHERE status = $1', ['available']);
```

`search_path` is set automatically on every new connection — unqualified
table refs resolve service-locally; PostGIS types stay reachable in `public`.
