# GDPR Erasure Saga Incident

**Page severity:** `critical` — `GdprSagaFailed` or `GdprSagaTimedOut` (see
[`infra/prometheus/rules/gdpr-saga.yml`](../../infra/prometheus/rules/gdpr-saga.yml)).
An unfulfilled erasure request is a legal obligation, not a best-effort job.

## Background

A user erasure ("right to be forgotten") is a **distributed saga** coordinated
by `services/audit`:

1. The gateway publishes `gdpr.erasureRequested` (correlationId, userId,
   reason) when a user requests erasure
   (`/api/v1/users/me/erasure-request`).
2. Every domain service binds a durable consumer `gdpr-<service>` and erases
   that user's rows **in a transaction**, then publishes
   `gdpr.erasureCompleted` (service, recordsErased, optional error) after
   commit.
3. `services/audit` tracks the saga in `audit.gdpr_erasure_requests`
   (one row per `correlation_id`), merging each completion into a `completions`
   JSONB blob. It stamps `completed_at` only once **every** service in
   `EXPECTED_SERVICES` acks without error; an errored ack stamps `failed_at`.
   See
   [`services/audit/src/nats/gdpr-subscribers.ts`](../../services/audit/src/nats/gdpr-subscribers.ts).
4. A sweep scheduler
   ([`gdpr-sweep.ts`](../../services/audit/src/nats/gdpr-sweep.ts)) runs
   periodically and:
   - **Times out** sagas older than `GDPR_SAGA_DEADLINE_MS` (default **30 min**)
     that still have services which never acked → stamps `timed_out_at`, logs
     the missing services at error level.
   - **Retries** sagas with `failed_at` set and `retry_count < GDPR_SAGA_MAX_RETRIES`
     (default **3**) by re-publishing `gdpr.erasureRequested` with the same
     `correlationId` but a distinct msgID. Erasure handlers are idempotent, so a
     re-run is a clean no-op for already-erased rows.

The `gdpr_sagas{state=…}` gauge
([`gdpr-metrics.ts`](../../services/audit/src/nats/gdpr-metrics.ts)) exposes
the count in each state (`in_progress` / `completed` / `failed` / `timed_out`)
and is what the alerts watch.

The expected services (must all ack):

```
auth, notifications, pets, chat, applications, matching, moderation, cms, rescue
```

## Symptoms

- `GdprSagaFailed` — `gdpr_sagas{state="failed"} > 0`: a service acked with an
  error.
- `GdprSagaTimedOut` — `gdpr_sagas{state="timed_out"} > 0`: a service never
  acked within 30 min.
- `GdprErasureRequestedNotCompleted` — a saga sat `in_progress` past the
  deadline + sweep margin.

## Triage in 60 seconds

Find the stuck saga(s) and which service(s) are at fault:

```bash
# Failed or timed-out sagas, with the per-service completion blob.
docker compose -f docker-compose.prod.yml exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "
  select correlation_id, user_id, requested_at, failed_at, timed_out_at,
         retry_count, jsonb_pretty(completions) as completions
  from audit.gdpr_erasure_requests
  where completed_at is null
    and (failed_at is not null or timed_out_at is not null)
  order by requested_at;"
```

- A service **present in `completions` with an `error`** → that service's
  erasure handler threw. (failed)
- A service **absent from `completions`** → that service never acked. (timed
  out — the sweep logs the missing list)

Then read the culprit service's log:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 --no-color service-<name> \
  | grep -i "gdpr\|erasure\|<correlation_id>"
```

## Diagnosis

- **Service down / consumer not bound** → the `gdpr-<service>` durable isn't
  consuming. The event is safe in `DOMAIN_EVENTS` (7-day retention); the saga
  just can't complete until the service is back. See
  [`jetstream-backlog.md`](./jetstream-backlog.md).
- **Handler error (failed)** → the erasure transaction threw (FK constraint,
  DB error, a bug). The `completions[service].error` string and the service log
  have the detail.
- **Retries exhausted** → `retry_count >= 3` and still `failed_at`: the sweep
  has stopped auto-retrying and is waiting for you.

## Mitigation

1. **Fix the culprit service** — restart if it was down, roll back if a bad
   deploy broke the erasure handler:
   ```bash
   docker compose -f docker-compose.prod.yml restart service-<name>
   ```
   Once healthy, the durable consumer reprocesses the redelivered request (or
   the sweep re-publishes on its next tick), and the service acks. The saga
   advances on its own.

2. **Force a re-run** if you've fixed the cause but don't want to wait for the
   sweep — re-publish `gdpr.erasureRequested` with the same correlationId and a
   fresh msgID. Idempotent handlers make this safe:
   ```bash
   nats pub gdpr.erasureRequested \
     '{"correlationId":"<id>","userId":"<uid>","reason":"manual re-run","requestedAt":"'"$(date -u +%FT%TZ)"'"}' \
     -H Nats-Msg-Id:"<id>:manual:$(date +%s)"
   ```

3. **If a service genuinely has nothing to erase** but errored on a transient
   issue, the re-run will record a clean completion (0 rows) and unblock the
   saga.

4. **Never** mark a saga complete by hand-editing `audit.gdpr_erasure_requests`
   to satisfy an alert. The row is the legal record — only let it flip to
   `completed` because every service actually acked.

## Verify

```bash
docker compose -f docker-compose.prod.yml exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "
  select correlation_id, completed_at, failed_at, timed_out_at
  from audit.gdpr_erasure_requests where correlation_id = '<id>';"
```

- `completed_at` is stamped (all 9 expected services acked without error).
- `gdpr_sagas{state="failed"}` and `{state="timed_out"}` return to 0; the
  alerts resolve.

## Capture

```bash
docker compose -f docker-compose.prod.yml exec -T database psql -U "$POSTGRES_USER" "$POSTGRES_DB" -c "
  select * from audit.gdpr_erasure_requests where correlation_id = '<id>';" \
  > /tmp/gdpr-incident-$(date +%s).txt
```

File the Linear follow-up. Because this is a compliance event, record the
resolution date and confirm the erasure actually completed for the data
subject. If a handler bug caused it, add a test reproducing the failing erasure
before closing.

## Related

- [`docs/slo.md`](../slo.md) — GDPR saga correctness SLO.
- [`docs/GDPR-ROPA.md`](../GDPR-ROPA.md) — record of processing activities.
- [`jetstream-backlog.md`](./jetstream-backlog.md) — when the cause is a stalled
  consumer rather than a handler error.
