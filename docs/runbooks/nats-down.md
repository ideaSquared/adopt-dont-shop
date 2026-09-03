# NATS / JetStream Broker Down

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** no rule watches the broker directly. It surfaces as
> `ServiceDown` (`critical`, `infra/prometheus/rules/service-down.yml`) if
> services crash-loop on it, and as event-delivery lag
> ([`outbox-backlog.md`](./outbox-backlog.md), [`jetstream-backlog.md`](./jetstream-backlog.md)).

## Symptoms

- The `nats` container (`ads_prod_nats`) is `unhealthy`, `restarting`, or
  `exited` in `docker compose ps`.
- Services log connection errors to `nats://nats:4222`; the outbox relay logs
  `outbox relay tick failed`.
- `events_outbox_pending` climbs (events stage to the DB but can't publish).
- Every domain service `depends_on: nats: condition: service_healthy`, so a
  service **recreated** while NATS is unhealthy will not start.

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`docker compose -f docker-compose.prod.yml`.

## Triage in 60 seconds

1. Is NATS actually down, or just a consumer lagging?

   ```bash
   docker compose -f docker-compose.prod.yml ps nats
   ```

   Expected: `Up (healthy)`. If `Up (healthy)` but events lag → this is not your
   runbook; go to [`jetstream-backlog.md`](./jetstream-backlog.md). If
   `restarting`/`exited`/`unhealthy` → continue.

2. Ask NATS directly:

   ```bash
   docker compose -f docker-compose.prod.yml exec nats \
     wget -qO- http://localhost:8222/healthz
   ```

   Expected: `{"status":"ok"}`. A non-response / connection refused means the
   server process is down inside the container.

## Diagnosis

1. Why did it stop?

   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=100 --no-color nats
   ```

   Expected: JetStream startup lines, no fatal error. Look for `disk`,
   `permission`, `corrupt`, or an OOM kill (memory limit is 512m — see the
   `deploy.resources.limits` in `docker-compose.prod.yml`).

2. Is the host out of disk? JetStream uses file storage on the `nats_data`
   volume (`-sd /data`).

   ```bash
   df -h /var/lib/docker
   ```

   Expected: comfortable free space. If near 100% → this is really
   [`postgres-disk-full.md`](./postgres-disk-full.md)'s host-disk problem; free
   space first.

## Mitigation

1. **Restart NATS** (fastest, usually enough):

   ```bash
   docker compose -f docker-compose.prod.yml restart nats
   docker compose -f docker-compose.prod.yml ps nats
   ```

   Expected: `Up (healthy)` within ~10s. The durable consumers rebind and the
   outbox relay drains `events_outbox_pending` on its next sweep — no service
   restart needed for events to flow again.

2. **Services that were recreated while NATS was down won't have started.** Once
   NATS is healthy, bring the stack to desired state:

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

   Expected: any stuck service transitions to `Up (healthy)`.

3. **If NATS won't start because its store is corrupt** — the JetStream file
   store on `nats_data` is damaged. **DESTRUCTIVE:** wiping it drops any events
   still only on the bus (not yet consumed). The transactional outbox will
   re-publish rows still in `event_outbox`, but messages already delivered-and-
   pending on a consumer are lost. Only with the secondary on-call's agreement:

   ```bash
   # DESTRUCTIVE — deletes the JetStream store.
   docker compose -f docker-compose.prod.yml stop nats
   docker volume rm "$(docker volume ls -q | grep nats_data)"
   docker compose -f docker-compose.prod.yml up -d nats
   ```

## Verify

- `docker compose -f docker-compose.prod.yml exec nats wget -qO- http://localhost:8222/healthz`
  returns `{"status":"ok"}`.
- `docker compose -f docker-compose.prod.yml ps` shows every service `Up (healthy)`.
- `events_outbox_pending` on the Grafana dashboard trends back to ~0 (the relay
  drained the queue).

## Rollback

A restart is idempotent. The volume wipe (step 3) is **not** reversible — that's
why it's gated on the secondary's agreement and a known outbox backlog to
replay.

## Escalate

If NATS won't stay healthy after a restart, or you're weighing the store wipe,
DM the secondary on-call. A wipe loses in-flight events; treat it as a
data-affecting decision. Hand over the `nats` logs and the
`events_outbox_pending` value.

## Capture

```bash
docker compose -f docker-compose.prod.yml logs --since 1h --no-color nats \
  > /tmp/nats-incident-$(date +%s).log
```

## Related

- [`outbox-backlog.md`](./outbox-backlog.md) — events stuck in the DB outbox.
- [`jetstream-backlog.md`](./jetstream-backlog.md) — broker up, a consumer lagging.
- [`postgres-disk-full.md`](./postgres-disk-full.md) — when the root cause is host disk.
