# ADR 0004 — Postgres read-replica routing in `@adopt-dont-shop/db`

- Status: Accepted
- Date: 2026-06-16
- Scope: `packages/db` (`createDbClient`), the per-service `READ_DATABASE_URL`
  config convention, and the read-only call sites in read-heavy services
  (`pets`, `rescue`, `cms`)
- Related: ADS-815, ADS-1007 (file-mounted secret loader)

## Context

Postgres is a single instance today: every service connects to the same
physical database (schema-per-service). That is fine at current scale, but
read-heavy services (pet/rescue listings, CMS content) will eventually want to
offload reads to a replica so a traffic spike doesn't starve the primary of
write capacity. There is no replica yet and no routing layer that would know
what to do with one — so the discipline has to exist in code *before* the
replica is provisioned, or it never gets retrofitted cleanly.

This ADR defines the routing convention. **Replica provisioning itself is out of
scope** (managed replica in prod, logical replication self-hosted), as is
read-after-write consistency (handled case-by-case if it ever bites).

## Decision

### `createDbClient` gains an optional `readUrl`

`createDbClient` accepts an optional `readUrl` alongside the existing primary
`connectionString`. It returns a `DbClient` — the primary `Pool` augmented with
a `.read` pool:

- **`readUrl` set** → a second, independent pool is opened against the replica,
  with the same timeout defaults and schema `search_path` wiring as the primary.
  `.read` is that pool.
- **`readUrl` unset/empty** → `.read` aliases the primary pool.

`.read` is therefore *always present*. Call sites use `pool.read` for reads
unconditionally and fall back to the primary transparently in single-instance
deploys — no `if (replica)` branching anywhere.

### Config convention: `READ_DATABASE_URL` (+ `_FILE`)

Each service resolves `READ_DATABASE_URL` through the shared secret loader
(`@adopt-dont-shop/config-secrets`), which already supports the
`READ_DATABASE_URL_FILE` file-mounted-secret path (ADS-1007). It is **optional**:
absent → no replica → primary fallback. The service passes the resolved value as
`readUrl` to `createDbClient`, mirroring how `DATABASE_URL` becomes
`connectionString` today.

### Which call sites use `.read` — the convention

**Reads use `pool.read`; writes and every transaction use the primary `pool`.**
Concretely:

- Read-only RPC handlers / queries (the `List*`, `Get*`, `Search*` surface) read
  through `pool.read`.
- Any write, and anything inside `withTransaction` (`@adopt-dont-shop/events`),
  stays on the primary `pool`. Routing a transaction's reads to a replica would
  break read-your-writes within that transaction, so transactions are never
  split across pools.

We route explicitly at the call site (`pool` vs `pool.read`) rather than
inferring from a handler-name prefix: it is greppable, it keeps the read/write
decision next to the query, and it never silently mis-routes a handler whose
name doesn't match a heuristic.

## Consequences

- Backward compatible: `DbClient` is a `Pool` with one extra property, so every
  existing caller that treats the result as a `Pool` is unaffected; `.read` is
  opt-in per query.
- A real replica can be introduced later by setting `READ_DATABASE_URL` in
  staging/prod compose — no code change at the call sites that already use
  `.read`.
- Graceful shutdown in a replica deployment must end both pools (`pool.end()`
  and `pool.read.end()`); in the fallback case they are the same pool, so one
  `end()` suffices. No service wires `readUrl` yet, so this is documented for
  when the first one does.
- Out of scope here: provisioning the replica, compose changes, and
  read-after-write consistency policy.
