# Redis Outage

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none watches Redis directly — it surfaces through
> `HighErrorRate` (`warning`, `infra/prometheus/rules/high-error-rate.yml`) on
> auth / rate-limited routes. Treat as effectively `critical` once auth or
> rate-limit-dependent flows start failing.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`docker compose -f docker-compose.prod.yml`. `$REDIS_PASSWORD` is set in the host
`.env`.

## Symptoms

- `docker compose ps` shows the `redis` container `unhealthy` or
  `exited`.
- Auth `/login`, `/register` either rate-limit oddly or fail to
  enforce limits across replicas (the gateway's `@fastify/rate-limit`
  plugin uses Redis as its store; on Redis failure `skipOnError:true`
  falls through in-memory **per-replica**, so coordinated limits are
  lost across replicas).
- Cache-fronted endpoints stay up but slow down — read-through caches
  fall through to the loader on any Redis failure.

## What still works vs. what doesn't

| Subsystem              | Behaviour without Redis                                  |
| ---------------------- | -------------------------------------------------------- |
| Cache helpers          | Fall through to the loader. Slower but correct.          |
| Gateway rate-limiters  | **Degraded** — per-replica in-memory, shared state lost. |
| Async / scheduled jobs | Down. Enqueues fail; in-flight jobs stall.               |

The cache fallthrough is safe; the rate-limiter and any Redis-backed
job system are not. Plan to enable maintenance mode for write-heavy
flows if the outage runs long.

## Triage in 60 seconds

```bash
# 1. Confirm Redis itself, not the network in between.
docker compose -f docker-compose.prod.yml exec -T redis \
  redis-cli -a "$REDIS_PASSWORD" ping
# Expect: PONG

# 2. Container state + last 100 log lines
docker compose -f docker-compose.prod.yml ps redis
docker compose -f docker-compose.prod.yml logs --tail=100 --no-color redis

# 3. From the gateway's perspective (proves DNS + creds work).
docker compose -f docker-compose.prod.yml exec -T service-gateway \
  sh -c 'getent hosts redis && redis-cli -h redis -a "$REDIS_PASSWORD" ping'
```

## Diagnosis

Match the symptom:

- `redis-cli ping` fails, container `unhealthy` → Redis crashed or
  OOMed. Check `docker compose logs redis` for `OOM`, `MISCONF`,
  `Background save terminated`.
- `redis-cli ping` works from inside the redis container but the
  gateway can't reach it → network / `REDIS_URL` / `REDIS_PASSWORD`
  mismatch. Re-check the gateway's Redis env in
  `docker-compose.prod.yml`.
- Disk full inside the redis container (`MISCONF`) → AOF write
  failed. Free space on the host or grow the `redis_data` volume.

## Mitigation

1. **Restart Redis** (fastest, usually enough):

   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   # Wait for healthcheck to pass (~10s)
   docker compose -f docker-compose.prod.yml ps redis
   ```

   The gateway's Redis client is configured with lazy reconnect, so
   no gateway restart is needed.

2. **If restart fails** — check the AOF / RDB on the `redis_data`
   volume. If corrupt, **DESTRUCTIVE** — accept data loss by wiping the volume:

   ```bash
   # DESTRUCTIVE: deletes the redis_data volume. Only when the persistence
   # file is corrupt and a plain restart won't recover.
   docker compose -f docker-compose.prod.yml stop redis
   # Confirm the exact volume name first (project prefix varies):
   #   docker volume ls | grep redis_data
   docker volume rm "$(docker volume ls -q | grep redis_data)"
   docker compose -f docker-compose.prod.yml up -d redis
   ```

   Expected: a fresh `redis` container comes up healthy within ~10s.
   Cost: rate-limit windows reset and namespace version stamps reset (full
   cache miss for ~minutes). Acceptable in an outage; the caches are read-through
   so no source-of-truth data is lost.

3. **If Redis is down for >5 min** — flip
   `APPLICATION_SETTINGS.maintenance_mode = true` to shed write
   traffic that depends on auth rate-limiting. See
   [`maintenance-mode.md`](./maintenance-mode.md).

4. **Confirm dependents recover** — once Redis is back, hit a
   rate-limited route (e.g. `POST /api/v1/auth/login` with bad creds)
   and verify the limiter responds without 5xx.

## Verify

- `redis-cli ping` returns `PONG` and the container is healthy.
- A test login round-trip succeeds (auth → rate-limiter writes work).
- Error rate in Grafana returns to baseline.

## Escalate

If Redis won't come back after a restart and a volume wipe (step 2), or the
host is out of disk (Redis `MISCONF` from a failed AOF write), DM the secondary
on-call — a wipe is data-loss-bearing and a host-disk problem is its own
incident (see [`postgres-disk-full.md`](./postgres-disk-full.md) for the
host-disk angle). While Redis is down, keep write-heavy flows shed via
[`maintenance-mode.md`](./maintenance-mode.md).

## Capture

```bash
docker compose -f docker-compose.prod.yml logs --since 1h --no-color \
  redis service-gateway > /tmp/redis-incident-$(date +%s).log
```

File the Linear follow-up. If this is the second Redis outage in a
quarter, raise it at on-call handoff — persistence settings or
host-resource limits likely need revisiting.
