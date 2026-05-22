# Database Pool Exhaustion

**Page severity:** `critical` if it causes `HighFiveHundredRate`;
otherwise `warning` (`P95LatencyHigh`).

## Symptoms

- p95 latency climbs across many unrelated routes simultaneously.
- Errors in backend logs include
  `SequelizeConnectionAcquireTimeoutError`, `pool is draining`, or
  `acquire timeout`.
- `process_cpu_*` looks fine; the bottleneck isn't CPU.
- Postgres `pg_stat_activity` shows many `idle in transaction` or
  long-running queries.
- 5xx may rise once the `DB_POOL_ACQUIRE_MS` timeout (default 30s) is
  hit — see `service.backend/src/sequelize.ts`.

## Pool config (current defaults)

From `service.backend/src/sequelize.ts:40-51`:

| Env var                              | Default | Meaning                                   |
| ------------------------------------ | ------- | ----------------------------------------- |
| `DB_POOL_MAX`                        | `20`    | Max concurrent connections per replica    |
| `DB_POOL_MIN`                        | `2`     | Min idle connections held                 |
| `DB_POOL_ACQUIRE_MS`                 | `30000` | How long a request waits for a connection |
| `DB_POOL_IDLE_MS`                    | `10000` | Idle connection eviction                  |
| `DB_STATEMENT_TIMEOUT_MS`            | `30000` | Per-query ceiling                         |
| `DB_LOCK_TIMEOUT_MS`                 | `10000` | Lock-wait ceiling                         |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS`  | `60000` | Kills idle-in-tx sessions                 |

Effective settings are logged at boot:
`[db] pool max=20 min=2 acquireMs=30000 ...`

## Triage in 60 seconds

```bash
# 1. Confirm pool-acquire errors are firing (not generic DB errors).
docker compose -f docker-compose.prod.yml logs --since 15m service-backend \
  | grep -iE 'acquire timeout|pool is draining|connectionacquire'

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

| Signal in `pg_stat_activity`                            | Cause                                |
| ------------------------------------------------------- | ------------------------------------ |
| Many `idle in transaction` rows, `age` > 1m             | A handler is leaking a transaction   |
| One query holding for minutes, others queued behind it  | Missing index / runaway report query |
| `active` count == `DB_POOL_MAX * replicas`              | Traffic genuinely exceeds capacity   |
| Many sessions holding the same table-level lock         | Migration / VACUUM FULL in flight    |

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

2. **Bump the pool** (temporary; requires backend restart):
   ```bash
   # Edit .env on the prod host
   DB_POOL_MAX=40
   docker compose -f docker-compose.prod.yml up -d service-backend
   ```
   Do **not** exceed the Postgres `max_connections` ceiling
   (typically 100 on a small managed instance) — leaving headroom for
   `service-backend-migrate`, `psql`, and the operator is mandatory.

3. **Disable a hot endpoint** — if a known feature is driving the
   load (e.g. a search endpoint hitting a missing index), flip its
   feature gate. The `ALLOW_BULK_OPERATIONS` gate in
   `lib.feature-flags/src/types/index.ts` can be turned off to drop
   bulk write traffic.

4. **If still failing** — declare maintenance mode per
   [`maintenance-mode.md`](./maintenance-mode.md) and call DB on-call.

## Verify

- `pg_stat_activity` count returns to baseline (`active` <
  `DB_POOL_MAX`).
- p95 latency drops below 500ms; `P95LatencyHigh` resolves.
- No new `acquire timeout` lines in the last 5 min of logs.

## Capture

```bash
# Snapshot the long-running queries before you kill them.
docker compose -f docker-compose.prod.yml exec -T database \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "SELECT * FROM pg_stat_activity WHERE datname=current_database() AND state <> 'idle';" \
  > /tmp/pgstat-$(date +%s).txt

# Pool config + boot env that was in effect
docker compose -f docker-compose.prod.yml logs service-backend \
  | grep '\[db\] pool' | tail -1
```

The query snapshot is gone the moment you `pg_terminate_backend` —
capture it first, then mitigate.
