import type { NatsConnection, Subscription } from 'nats';

export type SubscribeOptions = {
  // NATS subject pattern (e.g. `pets.unit.statusChanged`). Wildcards (`*`,
  // `>`) are supported by NATS — callers pass whatever subject string makes
  // sense for their consumer.
  subject: string;
  // Optional queue group. NATS will load-share messages across replicas
  // sharing the same queue name — use this for horizontally-scaled consumers.
  queue?: string;
  // Called for every error raised inside a message handler. The subscription
  // loop continues regardless — CAD lesson #4: one bad message must never
  // tear down the drain.
  onError?: (err: unknown, ctx: { subject: string; raw: string }) => void;
};

export type EventEnvelope<T> = {
  id?: string;
  occurredAt?: string;
  payload: T;
};

export type MessageHandler<T = unknown> = (
  payload: T,
  meta: { subject: string; id?: string; occurredAt?: Date }
) => Promise<void> | void;

// subscribe wraps NATS subscription with CAD-style poison-pill protection:
//
//  * Each message handler runs in its own try/catch. An exception from the
//    handler does NOT crash the for-await loop; it's reported via `onError`
//    and the next message is processed.
//  * Handlers are expected to be idempotent on the event id. The id is
//    surfaced in the `meta` argument so handlers can dedupe via their own
//    storage (e.g. a `processed_events(event_id PK)` table).
//  * JSON parse failures are also caught and reported — a malformed message
//    is a clean skip, not a crash.
//
// The returned Subscription can be `.drain()`'d for graceful shutdown.
export function subscribe<T = unknown>(
  nc: NatsConnection,
  opts: SubscribeOptions,
  handler: MessageHandler<T>
): Subscription {
  const sub = nc.subscribe(opts.subject, opts.queue ? { queue: opts.queue } : undefined);

  void (async () => {
    const decoder = new TextDecoder();
    for await (const msg of sub) {
      const raw = decoder.decode(msg.data);
      try {
        const envelope = JSON.parse(raw) as EventEnvelope<T>;
        const occurredAt = envelope.occurredAt ? new Date(envelope.occurredAt) : undefined;
        await handler(envelope.payload, { subject: msg.subject, id: envelope.id, occurredAt });
      } catch (err) {
        opts.onError?.(err, { subject: msg.subject, raw });
        // Continue the loop — CAD lesson #4.
      }
    }
  })();

  return sub;
}
