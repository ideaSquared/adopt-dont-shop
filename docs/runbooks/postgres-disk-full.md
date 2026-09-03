# Postgres Disk Full

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none — there is **no** disk-space alert on the single host.
> It surfaces as `ServiceDown` / `HighGrpcErrorRate` when writes start failing.
> This is a known gap; treat any `No space left on device` in logs as this
> runbook.

## Symptoms

- Postgres (`ads_prod_db`) logs `could not extend file`, `No space left on
device`, or `PANIC: could not write to file`.
- Writes across every schema-owning service fail; reads may still work until the
  WAL can't flush.
- `docker compose ps database` may show it `unhealthy` or `restarting`.
- Everything shares one host and one Docker data root, so a full disk takes
  Redis, NATS, and image pulls down with it.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`docker compose -f docker-compose.prod.yml`, `psql` via the `database` container.
Postgres stores data on the `postgres_data` volume mounted at
`/var/lib/postgresql/data` (Docker `local` driver → under `/var/lib/docker`).

## Triage in 60 seconds

1. Confirm it's disk, and where:

   ```bash
   df -h /var/lib/docker /
   ```

   Expected: free space on both. A filesystem at 100% (or ~95%+ — Postgres needs
   headroom for WAL) is your problem.

2. What's eating it?

   ```bash
   docker system df
   sudo du -xh --max-depth=1 /var/lib/docker/volumes 2>/dev/null | sort -h | tail
   ```

   Expected: `postgres_data` is the largest volume. Dangling images / build
   cache / old container logs are common secondary culprits.

## Diagnosis

| Signal                                                      | Cause                                                       | Where to reclaim                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Docker image/build cache large in `docker system df`        | Old image layers from past deploys                          | `docker image prune` (safe)                                       |
| Container log files huge under `/var/lib/docker/containers` | Log rotation not keeping up                                 | Logging is `json-file` capped in compose; check a runaway service |
| `postgres_data` growth dominated by WAL (`pg_wal`)          | Replication slot / archiving stalled, or a huge transaction | psql: check `pg_stat_archiver`, WAL size                          |
| `postgres_data` growth in table data                        | Genuine data growth / bloat                                 | `VACUUM`; capacity plan                                           |

## Mitigation

Reclaim space in least-destructive order. Get out of the red zone first, then
find the root cause.

1. **Prune dangling Docker images and build cache** (safe — never touches
   running containers or named volumes):

   ```bash
   docker image prune -f
   docker builder prune -f
   ```

   Expected: `df -h` shows space freed. Often enough on its own, because past
   deploys leave old image layers.

2. **Truncate oversized container logs** if one service is log-flooding. Confirm
   the culprit, then let compose recreate it with a fresh log:

   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=1 <service>   # confirm noise
   docker compose -f docker-compose.prod.yml up -d --force-recreate <service>
   ```

3. **Reclaim table bloat** once Postgres can run again (a `VACUUM` needs some
   free space itself, so do steps 1–2 first):

   ```bash
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "VACUUM (VERBOSE);"
   ```

   Do **not** reach for `VACUUM FULL` under pressure — it needs a full extra copy
   of the table's worth of disk and takes an exclusive lock.

4. **If the disk is still full**, growing the host volume is the real fix.
   On this Hetzner host that means resizing the attached volume / filesystem —
   **verify on host** (the exact device and resize command depend on the volume
   layout) and escalate; do not guess at `resize2fs` targets blind.

## Verify

- `df -h /var/lib/docker` shows healthy free space (aim for >20% free).
- `docker compose -f docker-compose.prod.yml ps database` shows `Up (healthy)`.
- A test write succeeds:
  ```bash
  docker compose -f docker-compose.prod.yml exec -T database \
    psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;"
  ```
  Expected: `1`.

## Rollback

Image/log/VACUUM reclamation is not reversible and not meant to be. The only
risky step is host volume resize — do that with the host provider's snapshot
taken first.

## Escalate

If pruning does not buy meaningful headroom, or the fix is a volume/host resize,
DM the secondary on-call immediately — a full disk on the single host is a
whole-stack outage, not just a DB one. Confirm the nightly S3 backup
([`../db-backup-runbook.md`](../db-backup-runbook.md)) is current before any
resize work.

## Capture

```bash
df -h > /tmp/disk-incident-$(date +%s).txt
docker system df -v >> /tmp/disk-incident-$(date +%s).txt
docker compose -f docker-compose.prod.yml logs --since 1h --no-color database \
  >> /tmp/disk-incident-$(date +%s).txt
```

## Related

- [`../db-backup-runbook.md`](../db-backup-runbook.md) — backups / restore if the
  volume is unrecoverable.
- [`nats-down.md`](./nats-down.md), [`redis-outage.md`](./redis-outage.md) — other
  subsystems a full disk knocks over.
