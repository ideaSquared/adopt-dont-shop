---
name: event-driven
description: >
  Publishing and consuming domain events between the microservices, and keeping
  another service's data copied into your own schema. Apply when adding or changing
  a NATS event (its payload, producer or subscribers), when a service needs data
  owned by another service (cross-schema joins are not allowed), when a list must
  filter or search on another service's data, or when writing a JetStream
  subscriber.
---

# Event-driven integration

Services share data through **domain events** on NATS JetStream, never through
cross-schema joins or reads of another service's tables. This skill covers the
words, the publish and consume rules, and how to keep a local copy of another
service's data current. `audit-logging` covers the `*.actionTaken` forensic
events; this skill covers everything else.

## Words, so the code and reviews say the same thing

| Term                           | Meaning here                                                                                                                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain event                   | A fact that already happened in one service: `pets.updated`, `auth.userProfileChanged`. Past tense, published after commit.                                                  |
| Event notification             | An event that says _something changed_ (`{ petId }`). Consumers must call back to find out what. Avoid for data other services copy.                                         |
| Event-carried state transfer   | The event carries the current state consumers need (`{ petId, type, breed, version }`), so they never call back. The default for anything another service keeps a copy of.   |
| Denormalised copy / read model | Columns in your schema holding another service's data (e.g. `applications.pet_type`). Not a "snapshot": in an event-sourced service that word means a saved aggregate state. |
| Projection                     | Your own read model built from your own events (e.g. the applications projector). Copied fields from other services sit on it, but the projector must not clobber them.      |
| Saga                           | A multi-step, multi-service process with compensation, e.g. GDPR erasure (`packages/events/src/gdpr-saga.ts`). Not the word for copying data.                                |
| Transactional outbox           | `withTransaction` stages events in `event_outbox` inside the write's transaction; they relay to NATS only after commit, so a rolled-back write never publishes.              |

## Publishing

- Publish inside `withTransaction(deps, async ({ client, publish }) => …)` from
  `@adopt-dont-shop/events`, after the write, so the event exists only if the
  write commits. A plain `pool.query` write that must announce itself has to move
  into a transaction (see `updateAccount` in `services/auth`).
- Give the event a **deterministic id**: aggregate id plus the post-write version or
  timestamp (`pets.updated.${petId}.${version}`). JetStream dedups retries on it.
  Never use `Date.now()` or a random UUID for a state change you can key.
- **Carry state, not just ids**, whenever another service copies the data. Take the
  values from the row the write `RETURNING`s, not from the request.
- Include an **ordering key** for anything consumers copy: the row's `version`, or
  `updated_at` when there is no version column. Consumers use it to keep only the
  latest change.
- Payload changes are **additive only**. Add optional fields freely; never rename
  or remove one a consumer reads. Old and new replicas run side by side during a
  deploy, so consumers must also cope with events that lack the new field.
- A new subject prefix also needs `DOMAIN_SUBJECTS` in `packages/events/src/stream.ts`
  and an entry in `consumer-registry.ts`; the registry test fails without it.

## Consuming

Use `subscribe()` from `@adopt-dont-shop/events`. The handler receives the
**payload**, not the envelope. Copy the shape of
`services/applications/src/nats/pet-updates.ts`:

1. **Parse defensively.** The payload is `unknown`. Check each field you need and
   return early (do nothing) when it is missing or malformed. That covers an
   older producer that predates a field: ignore its event rather than clearing data.
2. **Keep the effect in a pure, exported function** (`applyPetUpdate(pool, payload)`)
   and register it from a thin `register…Subscriber` wrapper. Test the function
   directly.
3. **Durable name:** `<service>-<subject with dots as dashes>`, e.g.
   `applications-pets-updated`. One durable per consumer and subject.
4. **Register it in `consumer-registry.ts`** under the subject's prefix, start it in
   the service's `index.ts`, and `drain()` it in the shutdown teardown.
5. **Document it** in the service README's NATS section.

### Idempotency and ordering

Delivery is **at least once** (ADR 0003): any event can arrive twice, and a
redelivery can arrive after a newer event.

- An effect that writes values from the event (an `UPDATE … SET col = $value`) is
  naturally idempotent, so it needs no dedup table.
- An effect with side effects (a notification row, an email, an auto-report) must
  dedupe with `claimEvent(conn, consumer, eventId)` and a `processed_events` table.
- When copying state, **latest wins**: store the ordering key next to the copy and
  guard the write, so an older event can't overwrite a newer one:

  ```sql
  UPDATE applications SET pet_type = $1, pet_breed = $2, pet_version = $4
   WHERE pet_id = $3 AND (pet_version IS NULL OR pet_version < $4)
  ```

## Keeping a copy of another service's data

Typical trigger: a list must filter, search or sort on a field another service
owns, and doing it on the page in the browser misses later pages. The copy needs
three parts:

1. **Columns** in a new, expand-only migration (nullable, plus the ordering-key
   column), with an index if you filter on it. Backfill in SQL only from data
   already in your schema.
2. **Seed on create** from data you already fetch (e.g. StartDraft already calls
   `pets.getPet`), and **follow changes** with an event subscriber, as above.
3. **Backfill job** for rows that predate the columns or that the events missed:
   a scheduled job (`@adopt-dont-shop/scheduler`) that pages by primary key, so rows
   it can't fill don't loop forever, and calls the owner with a system principal.
   Example: `services/applications/src/jobs/application-pet-search-fields.ts`.

Also:

- If your own projector upserts the same row, it must **not overwrite** copied
  columns. Leave them out of `ON CONFLICT DO UPDATE`, or keep them only until the
  copy has synced (`CASE WHEN applicant_synced_at IS NULL THEN EXCLUDED.x ELSE x END`).
- **Copied PII must be erased.** Add every copied personal field (names, emails)
  to the service's GDPR erase function, with a test.
- Escape user input in `ILIKE` filters with the service's local
  `escapeLikePattern` helper.

## Contracts: the consumer's type is a promise the producer must keep

Each consumer declares the payload it expects (`services/*/src/nats/event-types.ts`).
Nothing checks it against the producer except tests. Mismatches have shipped
silently, with consumers reading fields the event never carried. When you add or
change an event:

- Grep every consumer of the subject and compare the fields it reads with the
  producer's `publish({ … payload })`.
- Add a producer test asserting the payload carries the fields consumers read.
  Decode the published envelope and assert on `payload`.
- Prefer a Pact message contract (ADR 0005) for the pair. Today only GDPR erasure
  has one (`services/notifications/test/contracts/`).

## Checklist

- [ ] Published inside `withTransaction`, with a deterministic id
- [ ] Payload carries the state consumers copy, plus an ordering key
- [ ] Payload change is additive; consumers tolerate the field being absent
- [ ] Every consumer's expected fields checked against the producer, with a test
- [ ] Subscriber parses defensively, is idempotent, and applies latest-wins when copying
- [ ] Durable named `<service>-<subject>`, registered in `consumer-registry.ts`,
      started in `index.ts`, drained on shutdown, listed in the README
- [ ] Copied data: expand-only migration, seed on create, event follow, backfill job
- [ ] Projector doesn't overwrite copied columns
- [ ] Copied PII is cleared by the GDPR erase function

## Common mistakes

- Consumer type and producer payload disagree (`senderId` vs `senderUserId`), so
  the consumer silently does nothing. Test the producer's payload.
- Event notification (`{ petId }`) used where consumers needed the data, so they
  call back on every event, or never get it.
- `pool.query` write with no event, so a change other services rely on goes
  unannounced (auth's account edits did this).
- Copy updated as events arrive with no ordering guard, so a redelivered old event wins.
- Copied names and emails left behind by GDPR erasure.
- Calling a copied column a "snapshot" in an event-sourced service.

Canonical sources: [`packages/events/README.md`](../../../packages/events/README.md),
[ADR 0003](../../../docs/adr/0003-idempotent-event-consumers.md),
[ADR 0005](../../../docs/adr/0005-pact-contract-tests.md).
