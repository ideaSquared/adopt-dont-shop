# Database Pool Exhaustion

**Page severity:** `critical` if it causes `HighFiveHundredRate`;
otherwise `warning` (`P95LatencyHigh`).

## Symptoms

- p95 latency climbs across routes owned by the affected service
  (each service has its own pg pool, so exhaustion is per-service).
- Errors in the affected service's logs include `pool is draining`
  or `Error: timeout exceeded when trying to connect` (pg-pool).
- `process_cpu_*` looks fine; the bottleneck isn't CPU.
- Postgres `pg_stat_activity` shows many `idle in transaction` or
  long-running queries.
- 5xx may rise once the pool's connection-timeout (default 30s) is
  hit — see the service's database connection config.

## Pool config (current defaults)

Timeouts live in `TIMEOUT_DEFAULTS` in
[`packages/db/src/client.ts`](../../packages/db/src/client.ts) and are **not
env-tunable**. The pool `max` (ADS-1042) has an explicit budgeted default and
**is** env-tunable per service via `DB_POOL_MAX` — see
[`docs/operations/connection-budget.md`](../operations/connection-budget.md):

| Setting                   | Default  | Meaning                                                      |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `connectionTimeoutMillis` | `10_000` | How long a request waits for a connection from the pool.     |
| `idleTimeoutMillis`       | `30_000` | Idle-connection eviction.                                    |
| `statement_timeout`       | `30_000` | Postgres session `statement_timeout` — per-query ceiling.    |
| `query_timeout`           | `30_000` | Client-side query timeout applied by node-postgres.          |
| `max`                     | `8`      | `DEFAULT_POOL_MAX`; override per service with `DB_POOL_MAX`. |

`packages/db/src/client.ts` does not emit a `[db] pool …` log line at
boot; there is no boot-time report of the effective values.

## Triage in 60 seconds

```bash
# 1. Confirm pool-acquire errors are firing (not generic DB errors).
#    Identify the noisy service via `docker compose ps`, then:
docker compose -f docker-compose.prod.yml logs --since 15m service-<name> \
  | grep -iE 'acquire timeout|pool is draining|timeout exceeded when trying to connect'

# 2. How many sessions are open on the DB right now?
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT state, count(*) FROM pg_stat_activity WHERE datname=current_database() GROUP BY state;"

# 3. Top long-running queries.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT pid, state, now()-query_start AS age, left(query, 100) AS q
   FROM pg_stat_activity
   WHERE datname=current_database() AND state <> 'idle'
   ORDER BY age DESC LIMIT 10;"
```

## Diagnosis

| Signal in `pg_stat_activity`                           | Cause                                |
| ------------------------------------------------------ | ------------------------------------ |
| Many `idle in transaction` rows, `age` > 1m            | A handler is leaking a transaction   |
| One query holding for minutes, others queued behind it | Missing index / runaway report query |
| `active` count == `pool max × replicas × services`     | Traffic genuinely exceeds capacity   |
| Many sessions holding the same table-level lock        | Migration / VACUUM FULL in flight    |

Cross-check with the Grafana **Request volume** panel. If volume is
flat but the pool is saturated, a slow query is the cause. If volume
is up and tracking the saturation, capacity is the cause.

## Mitigation

1. **Kill the offending query** (if one query is the obvious cause):

   ```bash
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "SELECT pg_terminate_backend(<pid>);"
   ```

   Watch the `state` distribution drop back to mostly `idle`.

2. **Bump the pool** — the pool `max` (default `8`) is env-tunable per
   service via `DB_POOL_MAX`. Raise it for the affected service and
   redeploy that service (no code change needed). Do **not** exceed the
   Postgres `max_connections` ceiling (tuned to `200` in
   `docker-compose.{prod,staging}.yml`). Every schema-owning service
   holds up to `max` connections; budget across all of them (auth, pets,
   rescue, applications, chat, notifications, moderation, matching, cms,
   audit) and leave headroom for backups, migrations, `psql` + the
   operator — the full formula is in
   [`docs/operations/connection-budget.md`](../operations/connection-budget.md).
   A targeted `pg_terminate_backend` or a feature-flag flip is usually a
   faster first response than a redeploy.

3. **Disable a hot endpoint** — if a known feature is driving the
   load (e.g. a search endpoint hitting a missing index), flip its
   feature gate. The `ALLOW_BULK_OPERATIONS` gate in
   `lib.feature-flags/src/types/index.ts` can be turned off to drop
   bulk write traffic.

4. **If still failing** — declare maintenance mode per
   [`maintenance-mode.md`](./maintenance-mode.md) and call DB on-call.

## Verify

- `pg_stat_activity` `active` count returns to baseline (well below
  each service's pool max).
- p95 latency drops below 500ms; `P95LatencyHigh` resolves.
- No new `acquire timeout` / `pool is draining` /
  `timeout exceeded when trying to connect` lines in the last 5 min of logs.

## Capture

```bash
# Snapshot the long-running queries before you kill them.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT * FROM pg_stat_activity WHERE datname=current_database() AND state <> 'idle';" \
  > /tmp/pgstat-$(date +%s).txt
```

The query snapshot is gone the moment you `pg_terminate_backend` —
capture it first, then mitigate.
