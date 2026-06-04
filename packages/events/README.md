# @adopt-dont-shop/events

NATS publish-after-commit + idempotent-subscriber helpers for backend
microservices. Encodes two CAD-lesson disciplines that pay off most:

## Publish after commit

Domain events go on NATS **only after** the Postgres transaction commits.
No phantom events on rollback, ever.

```ts
import { withTransaction } from '@adopt-dont-shop/events';

await withTransaction({ pool, nats }, async ({ client, publish }) => {
  await client.query('INSERT INTO pets (...) VALUES (...) RETURNING id', [...]);
  publish({
    type: 'pets.created',
    id: 'pet-created-' + petId,  // event id is what subscribers dedupe on
    payload: { petId, status: 'available' },
  });
});
```

If the `INSERT` throws, `publish(...)` was a no-op — no event reaches NATS.
If `COMMIT` throws, same — staged events stay buffered and die with the
client. Subscribers see only events from transactions that actually
committed (CAD's PR #29 / #35 codified pattern).

## Idempotent subscribers

Every consumer wraps its handler in poison-pill protection: one bad
message can never tear down the subscription loop (CAD lesson #4).

```ts
import { subscribe } from '@adopt-dont-shop/events';

subscribe<{ petId: string }>(
  nats,
  { subject: 'pets.created', queue: 'notification-workers', onError: logger.warn },
  async (payload, { id }) => {
    // De-dupe on the event id — every handler should be idempotent.
    if (await alreadyProcessed(id)) return;
    await sendWelcomeNotification(payload.petId);
    await markProcessed(id);
  },
);
```

Errors thrown from the handler are reported via `onError` and the loop
keeps draining. Malformed JSON is also a clean skip. Unknown id / wrong
state / concurrency failures (the CAD list) are caller-side concerns —
the handler should treat them as skip-not-throw.

## What's NOT here yet

- **Durable consumers / replay-on-reconnect.** Current helpers use core
  NATS (best-effort delivery). When a service ships JetStream durable
  consumers, the API adds an `opts.durable` flag and the subscribe loop
  switches to `JetStreamClient.consume(...)`. CAD's Phase 5+ backlog
  item; not yet a blocker.
- **Connection management.** Callers own the `NatsConnection` lifecycle
  (`connect()` / `drain()`). The helpers expect a live connection.
