# Outbox Backlog (events staged, not published)

> **Audience:** on-call, shell access on the prod host, no context.
> **Last reviewed:** 2026-09-03
> **Related alerts:** none watches the outbox directly — watch the
> `events_outbox_pending` gauge on the Grafana **service-overview** dashboard. A
> climbing, non-draining value is the signal.

## Symptoms

- `events_outbox_pending` (a gauge in `packages/events/src/outbox.ts`) rises and
  does not fall back toward 0.
- Downstream effects lag: audit records, notifications, projections trail the
  writes that should have triggered them.
- Service logs show `outbox relay tick failed`.
- Business **writes still succeed** — the outbox is transactional: rows are
  staged in the `event_outbox` table inside the same transaction as the write,
  so a backlog means "events aren't reaching JetStream yet", not "writes are
  failing".

## Background

Each service stages events into its own schema's `event_outbox` table and runs a
background relay (`startOutboxRelay`, one per service at boot) that sweeps
pending rows and publishes them to JetStream, deleting each on success. On a
publish failure the relay stamps `attempts` / `last_attempt_at` / `last_error`,
stops that batch (preserving per-subject order), and retries on the next sweep
(default every 1s). Rows are never dropped — they wait in the table until they
publish. Once a message is _on_ JetStream, poison-message handling is the
stream's DLQ, covered by [`jetstream-backlog.md`](./jetstream-backlog.md).

## Preconditions

See [`README.md`](./README.md#preconditions): prod SSH, `cd /opt/ads/production`,
`docker compose -f docker-compose.prod.yml`, `psql` via the `database` container.

## Triage in 60 seconds

1. Is NATS reachable at all? An unreachable broker backs up **every** service's
   outbox at once.

   ```bash
   docker compose -f docker-compose.prod.yml exec nats \
     wget -qO- http://localhost:8222/healthz
   ```

   Expected: `{"status":"ok"}`. If not → this is [`nats-down.md`](./nats-down.md);
   fix the broker and the relays drain on their own.

2. Which service's outbox is backed up? The gauge is per-service in Grafana. Pick
   the noisy service's schema and count its pending rows (schemas: `auth`, `pets`,
   `rescue`, `applications`, `chat`, `notifications`, `moderation`, `matching`,
   `cms`, `audit`):

   ```bash
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "SELECT count(*), max(attempts) FROM <schema>.event_outbox;"
   ```

   Expected under normal load: a low count (the relay drains sub-second). A large
   count with `max` attempts climbing means rows are repeatedly failing to
   publish.

## Diagnosis

1. Why are the rows not publishing? Read the stamped error:

   ```bash
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "SELECT outbox_id, subject, attempts, last_attempt_at, left(last_error,160) AS err
        FROM <schema>.event_outbox
       ORDER BY seq LIMIT 10;"
   ```
   - `last_error` empty, `attempts` 0, rows fresh → the relay simply hasn't swept
     yet or the service is down (check it's `Up`). NATS-connection errors point
     back to [`nats-down.md`](./nats-down.md).
   - `last_error` a NATS/connection error, `attempts` climbing → the broker or the
     network to it is the problem.
   - `last_error` a serialization/payload error on the **oldest** row → a poison
     row at the head is blocking the batch (the relay stops at the first failure,
     preserving order).

## Mitigation

1. **Broker/connection cause** → fix NATS ([`nats-down.md`](./nats-down.md)) or
   restart the affected service so it re-establishes its NATS connection:

   ```bash
   docker compose -f docker-compose.prod.yml restart service-<name>
   ```

   Expected: `events_outbox_pending` for that service falls back toward 0 as the
   relay drains the backlog.

2. **Poison row at the head** blocking everything behind it. Capture it, then —
   only with the secondary on-call's agreement, because it drops one event —
   remove it so the batch can advance:

   ```bash
   # Capture first.
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "SELECT * FROM <schema>.event_outbox ORDER BY seq LIMIT 1;" \
     > /tmp/outbox-poison-$(date +%s).txt
   # DESTRUCTIVE: drops that single staged event permanently.
   docker compose -f docker-compose.prod.yml exec -T database \
     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
     "DELETE FROM <schema>.event_outbox WHERE outbox_id = '<outbox_id>';"
   ```

   Then fix the handler/payload bug so it doesn't recur, and reconstruct the
   dropped effect from the source row if it mattered.

## Verify

- `events_outbox_pending` returns to ~0 and stays there on the Grafana dashboard.
- `SELECT count(*) FROM <schema>.event_outbox;` is back to a low steady-state.
- Downstream effects catch up (audit rows appear, notifications send).

## Rollback

Restarting a service is idempotent. The poison-row `DELETE` (step 2) is **not**
reversible — that's why it's captured first and gated on the secondary's
agreement.

## Escalate

If the backlog spans every service (broker-wide) and NATS won't recover, or you
are about to delete staged events, DM the secondary on-call. Hand over the
per-service pending counts and the `last_error` sample.

## Related

- [`nats-down.md`](./nats-down.md) — the usual root cause (broker unreachable).
- [`jetstream-backlog.md`](./jetstream-backlog.md) — the _downstream_ half: once
  events are on the stream but a consumer can't process them (DLQ).
