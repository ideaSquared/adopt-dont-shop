# Backend Troubleshooting

Symptom → diagnostics → solution for the backend stack (gateway + gRPC services + Postgres +
NATS). Each section gives numbered diagnostic commands with the output to expect. For deep dives
see the [runbooks](../runbooks/README.md); for the observability surface see
[`../observability/tracing.md`](../observability/tracing.md).

## General debugging

Logs are structured JSON on stdout (shipped to Loki in deployed environments); there is no
`app.log` file. Raise verbosity with `LOG_LEVEL`:

```bash
LOG_LEVEL=debug pnpm dev
```

Follow a single container's logs:

```bash
docker compose logs -f service-auth
```

## Health diagnostics

The gateway exposes one liveness probe, `/health/simple`, on port 4000. There is no aggregated
`/health` or `/health/ready` route.

```bash
curl http://localhost:4000/health/simple
# Expected: {"status":"ok","service":"service.gateway","environment":"development"}
```

Each backing service exposes its own `/health/simple` on its container port (5001–5010, bound to
127.0.0.1). Check one service, or the whole fleet's container state:

```bash
docker compose exec service-pets curl -fsS http://localhost:5002/health/simple
docker compose ps          # STATUS column should read "healthy" for every service
```

## Database: connection problems

Symptoms: `ECONNREFUSED`, "Connection refused", connection timeouts.

Diagnostics:

```bash
# 1. Is Postgres reachable?
pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"
# Expected: "<host>:<port> - accepting connections"

# 2. Is the container healthy?
docker compose ps database
# Expected: STATUS "healthy"

# 3. Are the env vars what you think they are?
echo "$DB_HOST $DB_PORT $DB_NAME"
```

Solutions:

1. Container not up: `pnpm dev:services` (or `pnpm docker:dev:detach`) to start Postgres + Redis.
2. Wrong host: native `pnpm dev` needs `DB_HOST=localhost` / `REDIS_HOST=localhost` in `.env`
   (`.env.example` uses the Docker hostnames `database` / `redis`).
3. The pool is not env-tunable. Connection/timeout defaults live in `TIMEOUT_DEFAULTS`
   (`packages/db/src/client.ts`); change them there, not via env.

## Database: migration problems

Symptoms: migration fails with a SQL error, "table already exists", "column does not exist".

Diagnostics:

```bash
# 1. What has each service applied? Every service owns a pgmigrations table in its own schema.
psql -c "SELECT name, run_on FROM auth.pgmigrations ORDER BY id DESC LIMIT 10;"
#   repeat for pets.pgmigrations, applications.pgmigrations, …

# 2. Inspect the live schema
psql -c "\dn+"                # list schemas
psql -c "\dt+ auth.*"         # tables in a schema
```

Solutions:

1. There is no `db:migrate:undo` — the shared runner (`packages/db/src/migrate.ts`) only runs
   forward (`direction: 'up'` is hardcoded). Recover by writing a corrective forward migration;
   see [`../runbooks/migration-failure.md`](../runbooks/migration-failure.md).
2. Dev-only hard reset (wipes all data): `pnpm docker:reset` then `pnpm docker:dev:detach` —
   each service re-runs its own migrations on boot.

## Database: slow queries

Diagnostics:

```sql
-- Active connections
SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle';

-- Slowest statements (pg_stat_statements must be enabled)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Plan for a suspect query
EXPLAIN ANALYZE SELECT * FROM pets WHERE type = 'DOG';
```

Solution: add the missing index in a new migration in the owning service (never edit a shipped
one) — see [`writing-migrations.md`](./writing-migrations.md).

## gRPC UNAVAILABLE / circuit breaker open at the gateway

Symptom: a route returns HTTP 503 with `{"error":"service_unavailable"}`. The gateway maps gRPC
`UNAVAILABLE` → 503 (`services/gateway/src/middleware/grpc-error.ts`). This means a downstream
service is down, or the gateway's per-service circuit breaker has opened
(`services/gateway/src/grpc-clients/resilience.ts`): after repeated failures within
`GRPC_CIRCUIT_WINDOW_MS` (default 30 000 ms) the breaker opens and rejects calls immediately with
an `UNAVAILABLE`-coded error until a cooldown lets one half-open probe through.

Diagnostics:

```bash
# 1. Which downstream is failing? 503 means "a service", not "the gateway".
docker compose ps
# Expected: the culprit shows STATUS other than "healthy" (restarting / unhealthy).

# 2. Read the breaker state metric (0=closed, 1=half-open, 2=open).
curl -s http://localhost:4000/metrics | grep grpc_circuit_state
# Expected healthy: grpc_circuit_state{service="pets"} 0

# 3. Read the failing service's own logs for the root cause.
docker compose logs --tail=100 service-pets
```

Solutions:

1. If the service is down/unhealthy, restart it (`docker compose restart service-pets`) and
   confirm its `/health/simple` returns ok; the breaker closes on the next successful probe.
2. If the service is healthy but the breaker is stuck open (gauge `2`), it half-opens
   automatically after the cooldown — the next request is the probe. A persistent open state is
   a real downstream fault; fix that, do not bypass the breaker.

## NATS JetStream: stuck consumer / dead-letter queue

Symptom: events stop being processed, or a message redelivers forever. A parseable-but-failing
message is `nak()`'d with exponential backoff up to `MAX_DELIVER = 7`
(`packages/events/src/subscribe.ts`); after the 7th attempt it is parked in the dead-letter
stream `DOMAIN_EVENTS_DLQ` (subjects `dlq.>`, 14-day retention;
`packages/events/src/stream.ts`) and `term()`'d.

Diagnostics (from a container with the `nats` CLI, or `docker compose exec nats ...`):

```bash
# 1. Consumer health: are messages piling up unacked?
nats consumer info DOMAIN_EVENTS <durable-name>
# Expected healthy: "Unprocessed Messages: 0" and a low "Redelivered" count.

# 2. Anything dead-lettered?
nats stream info DOMAIN_EVENTS_DLQ
# Expected healthy: "Messages: 0". A non-zero count = messages that exhausted MAX_DELIVER.

# 3. Inspect a dead-lettered message without consuming it.
nats stream view DOMAIN_EVENTS_DLQ

# 4. Read the consuming service's logs for the handler error that caused the failure.
docker compose logs --tail=100 service-audit
```

Solutions:

1. Fix the handler bug that made the message fail, redeploy the consumer, then replay from the
   DLQ if the side effect is still needed.
2. Footgun: a durable consumer's `deliver_policy` / `filter_subject` are fixed at creation.
   Changing them in code has no effect on an existing durable — delete and recreate it
   (`nats consumer rm DOMAIN_EVENTS <durable-name>`, then restart the service to re-add it), or
   use a new durable name. See `packages/events/README.md`.

## Migration advisory-lock contention

Symptom: a service crashes on boot with "Another migration is already running". When several
services boot against the same Postgres at once, they race for the database-wide advisory lock
node-pg-migrate takes around `pgmigrations`.

Diagnostics:

```bash
# 1. Confirm the message in the crashing service's logs.
docker compose logs service-pets | grep -i "another migration"

# 2. Check whether a lock is genuinely held right now.
psql -c "SELECT pid, granted FROM pg_locks WHERE locktype = 'advisory';"
# Expected once boots settle: no un-granted rows.
```

Solution: the shared runner already retries this with linear backoff (`maxRetries = 12`,
`retryBackoffMs * attempt`; `packages/db/src/migrate.ts`), so transient contention resolves on
its own — losers queue and succeed. A migration that stays stuck past the retry budget is a real
failure (a long-running or crashed migration holding the lock); see
[`writing-migrations.md`](./writing-migrations.md#4-failure-recovery-advisory-locks-partial-applies).

## Email not sending

```bash
# Follow the notifications service and look for the provider init line.
docker compose logs -f service-notifications

# Inspect the queue for failed rows.
psql -c "SELECT id, status, error FROM notifications.email_queue WHERE status = 'failed';"
```

Providers are `console` / `ethereal` (dev) and `resend` (prod), selected by `EMAIL_PROVIDER`;
`resend` requires `RESEND_API_KEY` and `DEFAULT_FROM_EMAIL` or the service refuses to boot.
There is no SMTP/SendGrid/nodemailer path.

## File upload failures

The local storage provider writes under the owning service's `uploads/` directory. The size cap
is `MAX_FILE_SIZE` (`services/gateway/src/config.ts`, default 10 MB), enforced via
`@fastify/multipart`; storage goes through `@adopt-dont-shop/storage`.

```bash
docker compose exec service-pets ls -la uploads/
# Expected: directory exists and is writable by the container's non-root user.
```

Wipe local upload state with `pnpm docker:reset`.

## Docker: container problems

```bash
# 1. Status and recent exits
docker compose ps -a

# 2. Why did it exit?
docker compose logs --tail=100 service-auth

# 3. Port already in use? (gateway is 4000; services are 5001–5010)
sudo lsof -ti:4000
```

Solutions:

1. Free the port (`sudo kill -9 $(lsof -ti:4000)`) or change the published port in `.env`.
2. After a lockfile change, rebuild the shared dev image: `pnpm docker:dev:build` (the baked
   `node_modules` is re-exposed to every container; the host's is never used inside one).

## Common commands

```bash
pnpm docker:dev:detach                              # start the full stack (background)
pnpm docker:down                                    # stop
pnpm docker:reset                                   # stop + wipe volumes (incl. DB)
docker compose logs -f service-<name>               # follow one service
docker compose exec service-auth pnpm db:migrate    # migrate one service by hand
pnpm db:seed                                         # re-seed dev data
```
