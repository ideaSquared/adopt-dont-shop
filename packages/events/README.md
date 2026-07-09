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
  { subject: 'pets.created', durable: 'notification-workers', onError: logger.warn },
  async (payload, { id }) => {
    // De-dupe on the event id — every handler should be idempotent.
    if (await alreadyProcessed(id)) return;
    await sendWelcomeNotification(payload.petId);
    await markProcessed(id);
  },
);
```

The `durable` name is REQUIRED — it's the JetStream consumer identity.
Two replicas that share a durable name load-share the subject's messages
(the classic queue-group semantics); replicas that must each see every
message (e.g. the gateway WS fan-out) use DISTINCT durable names. See
`SubscribeOptions` in `src/subscribe.ts` for the full option surface,
including the `deliverNew` flag for realtime consumers that must not
replay backlog on reconnect.

Errors thrown from the handler are reported via `onError` and the loop
keeps draining. Malformed JSON is also a clean skip. Unknown id / wrong
state / concurrency failures (the CAD list) are caller-side concerns —
the handler should treat them as skip-not-throw.

## Other exports

Beyond `publish` / `subscribe`, this package also exposes:

- `ensureStream`, `DOMAIN_STREAM`, `DOMAIN_SUBJECTS` — the shared
  `DOMAIN_EVENTS` JetStream topology helpers.
- `claimEvent` + `CONSUMER_REGISTRY` — the idempotent-consumer helper
  (dedup by event id) used by every subscriber.
- `GDPR_ERASURE_REQUESTED`, `GDPR_ERASURE_COMPLETED`,
  `EXPECTED_GDPR_SERVICES`, `registerGdprSubscriber` — the GDPR erasure
  saga primitives coordinated by service.audit.
- `redactAuditPayload` — payload-side redaction for audit publishes.

## Not here

- **Connection management.** Callers own the `NatsConnection` lifecycle
  (`connect()` / `drain()`). The helpers expect a live connection.
