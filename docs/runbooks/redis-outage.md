# Redis Outage

**Page severity:** `critical` (`ReadinessProbeFailing` when `redis`
probe fails for 2m)

## Symptoms

- `/api/v1/ready` returns `503` with
  `failures: [{ service: 'redis', ... }]`.
- Kubernetes / LB drops pods from rotation; effective capacity falls.
- BullMQ reports queue stops processing (the `queue` probe fails
  alongside Redis — see the gateway's health-check service).
- Auth `/login`, `/register` either rate-limit oddly or fail to
  enforce limits across replicas (the Redis-backed rate-limit
  middleware's `RedisStore` falls back to in-memory **per-replica**
  when Redis is unconfigured, but **errors out** mid-request if Redis
  was up and then dies).
- Cache-fronted endpoints stay up but slow down — the read-through
  cache helper falls through to the loader on any Redis failure.

## What still works vs. what doesn't

| Subsystem            | Behaviour without Redis                                  |
| -------------------- | -------------------------------------------------------- |
| `cached()` helper    | Falls through to loader. Slower but correct.             |
| Auth rate-limiters   | **Degraded** — per-replica only, shared state lost.      |
| BullMQ reports queue | Down. New jobs cannot be enqueued; existing jobs stall.  |
| Readiness probe      | Returns 503. LB drops pods until Redis recovers.         |

The cache fallthrough is safe; the rate-limiter and queue are not.
Plan to enable maintenance mode for write-heavy flows if the outage
runs long.

## Triage in 60 seconds

```bash
# 1. Confirm Redis itself, not the network in between.
docker compose -f docker-compose.prod.yml exec -T redis \
  redis-cli -a "$REDIS_PASSWORD" ping
# Expect: PONG

# 2. Container state + last 100 log lines
docker compose -f docker-compose.prod.yml ps redis
docker compose -f docker-compose.prod.yml logs --tail=100 --no-color redis

# 3. From the backend's perspective (proves DNS + creds work).
docker compose -f docker-compose.prod.yml exec -T service-backend \
  sh -c 'curl -sf http://localhost:5000/api/v1/health | jq .services.redis'
```

## Diagnosis

Match the symptom:

- `redis-cli ping` fails, container `unhealthy` → Redis crashed or
  OOMed. Check `docker compose logs redis` for `OOM`, `MISCONF`,
  `Background save terminated`.
- `redis-cli ping` works from inside the redis container but the
  backend probe fails → network / `REDIS_URL` / `REDIS_PASSWORD`
  mismatch. Re-check the backend's `REDIS_HOST` and `REDIS_PASSWORD`
  env in `docker-compose.prod.yml`.
- Disk full inside the redis container (`MISCONF`) → AOF write
  failed. Free space on the host or grow the `redis_data` volume.

## Mitigation

1. **Restart Redis** (fastest, usually enough):
   ```bash
   docker compose -f docker-compose.prod.yml restart redis
   # Wait for healthcheck to pass (~10s)
   docker compose -f docker-compose.prod.yml ps redis
   ```
   The backend's `ensureRedisReady()` lazy-reconnects on the next
   request, so no backend restart is needed.

2. **If restart fails** — check the AOF / RDB on the `redis_data`
   volume. If corrupt, accept data loss:
   ```bash
   docker compose -f docker-compose.prod.yml stop redis
   docker volume rm $(docker compose -f docker-compose.prod.yml \
     config --volumes | grep redis_data)
   docker compose -f docker-compose.prod.yml up -d redis
   ```
   Cost: rate-limit windows reset, in-flight BullMQ jobs lost,
   namespace version stamps reset (full cache miss for ~minutes).
   Acceptable in an outage.

3. **If Redis is down for >5 min** — flip
   `APPLICATION_SETTINGS.maintenance_mode = true` to shed write
   traffic that depends on auth rate-limiting. See
   [`maintenance-mode.md`](./maintenance-mode.md).

4. **Confirm BullMQ recovers** — once Redis is back, the queue probe
   should clear within one health-check interval:
   ```bash
   curl -sf https://${PROD_HOSTNAME}/api/v1/ready | jq
   ```

## Verify

- `/api/v1/ready` returns 200.
- `ReadinessProbeFailing` alert resolves.
- Pods rejoin LB rotation; request volume returns to baseline.

## Capture

```bash
docker compose -f docker-compose.prod.yml logs --since 1h --no-color \
  redis service-backend > /tmp/redis-incident-$(date +%s).log
```

File the Linear follow-up. If this is the second Redis outage in a
quarter, raise it at on-call handoff — persistence settings or
host-resource limits likely need revisiting.
