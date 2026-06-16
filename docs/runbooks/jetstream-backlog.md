# JetStream Consumer Backlog

**Page severity:** `warning` (a durable consumer's pending count climbs and
does not drain) escalating to `critical` if user-visible (notifications stop,
the GDPR saga stalls, the read-model projections lag).

## Background

All domain events flow through a **single** JetStream stream, `DOMAIN_EVENTS`
(file storage, 7-day `max_age`, 2-minute duplicate window), defined in
[`packages/events/src/stream.ts`](../../packages/events/src/stream.ts).
Subjects are `<service>.>` per domain plus `gdpr.>`. Each subscriber binds a
**durable, explicit-ack** consumer that filters the stream to its own subject
(see [`packages/events/src/subscribe.ts`](../../packages/events/src/subscribe.ts)).

Key behaviours that shape this runbook:

- **Explicit ack.** A handler that throws `nak()`s the message with backoff
  (`nakBackoffMs`) so JetStream redelivers it.
- **Redelivery cap.** After `MAX_DELIVER = 7` attempts the message is `term()`'d
  and republished to the dead-letter stream `DOMAIN_EVENTS_DLQ` on
  `dlq.<original-subject>` (14-day retention). It is **not** dropped or looped.
- **Durable = catch-up.** A consumer offline for < 7 days gets every missed
  message when it reconnects. Offline > 7 days and the oldest messages have
  aged out of `DOMAIN_EVENTS` — permanent loss for that consumer.

## Symptoms

- A consumer's `num_pending` (un-delivered) or `num_ack_pending`
  (delivered-not-acked) grows and does not fall.
- Downstream effects: in-app/push notifications stop arriving, chat real-time
  fan-out lags, the audit GDPR saga doesn't progress, read models go stale.
- `DOMAIN_EVENTS_DLQ` message count is rising (poison messages exhausting
  redelivery).

## Triage in 60 seconds

```bash
# Stream + consumer state (run from the prod host; `nats` CLI against the
# server, or via the NATS box container if present).
nats stream info DOMAIN_EVENTS
nats consumer ls DOMAIN_EVENTS

# Per-consumer detail — look at num_pending, num_ack_pending, num_redelivered.
nats consumer info DOMAIN_EVENTS <durable-name>

# Dead-letter stream — is it growing?
nats stream info DOMAIN_EVENTS_DLQ
```

Durable names follow `gdpr-<service>` for the erasure saga and the
service-specific names registered in
[`packages/events/src/consumer-registry.ts`](../../packages/events/src/consumer-registry.ts).
If you don't have the `nats` CLI, the same numbers are visible on the NATS
monitoring port (`/jsz?consumers=true`).

## Diagnosis

Match the shape of the backlog:

- **`num_ack_pending` high, `num_redelivered` climbing** → the handler is
  failing and `nak()`-ing. The consuming service is broken (bad deploy, DB
  down, downstream gRPC call failing). Check that service's logs:
  ```bash
  docker compose -f docker-compose.prod.yml logs --tail=200 --no-color service-<name>
  ```
- **`num_pending` high, consumer has no recent delivery** → the consumer isn't
  running. The service is down or didn't re-bind its durable on restart. Check
  the service is up and its `registerSubscribers` ran (look for the subscribe
  log line at boot).
- **`DOMAIN_EVENTS_DLQ` growing** → poison messages exhausted `MAX_DELIVER`.
  The payload will never process. Triage the DLQ (below).
- **Stream near `max_age` / a consumer offline for days** → catch-up risk.
  Prioritise getting the consumer back before the 7-day window drops messages.

## Mitigation

1. **Fix the consuming service first.** The backlog is a symptom; the stream is
   doing its job (retaining + redelivering). Restart / roll back the service:
   ```bash
   docker compose -f docker-compose.prod.yml restart service-<name>
   # or, if it's a bad deploy, see deploy-rollback.md
   ```
   Once healthy, the durable consumer replays the backlog automatically. Watch
   `num_pending` fall.

2. **If a single poison message blocks a consumer** (same message redelivering,
   blocking the rest), let it exhaust `MAX_DELIVER` (it will move to the DLQ on
   its own) or, if it's urgent, `term` it manually so the consumer advances:
   ```bash
   nats consumer next DOMAIN_EVENTS <durable-name> --count 1   # inspect it
   ```
   Capture the payload before terminating — the DLQ keeps it for 14 days but
   copy it into the incident notes.

3. **Triage the DLQ** once the bleeding stops:
   ```bash
   nats stream view DOMAIN_EVENTS_DLQ            # inspect dead-lettered msgs
   ```
   For each class of dead-lettered message: fix the handler bug, then replay by
   re-publishing the original subject (the events are idempotent by design —
   erasure/notification handlers no-op on replay). Do **not** mass-replay
   blindly.

4. **If a consumer was offline > 7 days**, the oldest messages have aged out of
   `DOMAIN_EVENTS`. That data is gone from the bus — reconstruct from the
   source service's own DB (the event store / read model) rather than the
   stream. Note the gap in the incident review.

## Verify

- `num_pending` and `num_ack_pending` for the consumer trend to ~0.
- `num_redelivered` stops climbing.
- `DOMAIN_EVENTS_DLQ` stops growing.
- Downstream effects resume (notifications arrive, saga progresses).

## Capture

```bash
nats consumer info DOMAIN_EVENTS <durable-name> > /tmp/jetstream-incident-$(date +%s).txt
docker compose -f docker-compose.prod.yml logs --since 1h --no-color \
  service-<name> >> /tmp/jetstream-incident-$(date +%s).txt
```

File the Linear follow-up. If the backlog was caused by a handler bug, add a
test that reproduces the failing payload before closing.

## Related

- [`docs/slo.md`](../slo.md) — saga / consumer SLOs.
- [`gdpr-erasure-incident.md`](./gdpr-erasure-incident.md) — when the stalled
  consumer is the GDPR saga.
- [`deploy-rollback.md`](./deploy-rollback.md) — when a bad deploy broke the
  consumer.
