import {
  AckPolicy,
  DeliverPolicy,
  type ConsumerMessages,
  type JsMsg,
  type NatsConnection,
} from 'nats';

import { DOMAIN_STREAM } from './stream.js';

export type SubscribeOptions = {
  // NATS subject pattern (e.g. `pets.unit.statusChanged`). Wildcards (`*`,
  // `>`) are supported — callers pass whatever subject string makes sense
  // for their consumer. Becomes the durable consumer's `filter_subject`.
  subject: string;
  // Durable consumer name. REQUIRED under JetStream — it's how the broker
  // remembers a subscriber's position so an event that arrived while the
  // subscriber was down is redelivered on reconnect (the at-least-once
  // guarantee). Two replicas binding the SAME durable load-share the
  // subject's messages (the old `queue` semantics); replicas that must each
  // see every message (fan-out, e.g. gateway WS) use DISTINCT durable names.
  durable: string;
  // Called for every error raised inside a message handler. The consume
  // loop continues regardless — CAD lesson #4: one bad message must never
  // tear down the drain. The message is nak()'d for redelivery.
  onError?: (err: unknown, ctx: { subject: string; raw: string }) => void;
  // When true, the consumer only receives events published AFTER it's
  // created (deliver_policy = New) rather than replaying the stream backlog.
  // Use for realtime fan-out (e.g. gateway WebSocket pings) where a replica
  // that was down should NOT replay stale realtime events on reconnect — a
  // missed live ping is fine, a flood of hours-old pings on boot is not.
  // Such callers pair this with a per-replica-unique durable name so each
  // replica gets its own copy. Defaults to false (replay backlog), which is
  // the durable at-least-once behaviour every business subscriber wants.
  deliverNew?: boolean;
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

// A handle for unwinding a JetStream subscription. Mirrors the subset of the
// old core-NATS Subscription surface that callers actually use (`drain()` on
// shutdown). Draining stops the consume loop; the durable consumer itself
// persists on the server so the next boot resumes where this one left off.
export type SubscriptionHandle = {
  drain: () => Promise<void>;
};

// subscribe binds a durable JetStream pull consumer and drives it with
// CAD-style poison-pill protection. Compared to the old core-NATS version it
// adds at-least-once delivery: the consumer's position is tracked server-side,
// so a subscriber that was offline when an event fired receives it on
// reconnect rather than missing it forever.
//
// Discipline (unchanged from the core version, now with explicit ack):
//
//   * Each message handler runs in its own try/catch. A handler exception
//     does NOT crash the loop; it's reported via `onError` and the message is
//     nak()'d so JetStream redelivers it later (transient failures recover).
//   * A malformed (non-JSON) message is a clean skip — reported via onError
//     and term()'d so the broker stops redelivering a payload that will never
//     parse (poison pill), rather than looping on it forever.
//   * Handlers are expected to be idempotent on the event id (surfaced in
//     `meta`) — redelivery is now a normal, expected event, not an edge case.
//
// Returns synchronously so call sites keep their `subs.push(subscribe(...))`
// shape; the consumer is created in a fire-and-forget async task, matching
// the existing for-await IIFE pattern.
export function subscribe<T = unknown>(
  nc: NatsConnection,
  opts: SubscribeOptions,
  handler: MessageHandler<T>
): SubscriptionHandle {
  let messages: ConsumerMessages | undefined;
  let closed = false;

  void (async () => {
    const jsm = await nc.jetstreamManager();
    // Create-or-reuse the durable consumer. Idempotent: a consumer that
    // already exists (from a previous boot) is reused with its saved
    // position, so the backlog accumulated while this subscriber was down is
    // delivered now.
    await jsm.consumers.add(DOMAIN_STREAM, {
      durable_name: opts.durable,
      filter_subject: opts.subject,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: opts.deliverNew ? DeliverPolicy.New : DeliverPolicy.All,
    });

    const js = nc.jetstream();
    const consumer = await js.consumers.get(DOMAIN_STREAM, opts.durable);
    if (closed) {
      return;
    }
    messages = await consumer.consume();
    const decoder = new TextDecoder();
    for await (const msg of messages) {
      await dispatch<T>(msg, decoder, opts, handler);
    }
  })();

  return {
    drain: async () => {
      closed = true;
      await messages?.close();
    },
  };
}

async function dispatch<T>(
  msg: JsMsg,
  decoder: TextDecoder,
  opts: SubscribeOptions,
  handler: MessageHandler<T>
): Promise<void> {
  const raw = decoder.decode(msg.data);
  let envelope: EventEnvelope<T>;
  try {
    envelope = JSON.parse(raw) as EventEnvelope<T>;
  } catch (err) {
    // Unparseable payload — a poison pill. Report and term() so the broker
    // stops redelivering a message that will never succeed. CAD lesson #4.
    opts.onError?.(err, { subject: msg.subject, raw });
    msg.term();
    return;
  }

  try {
    const occurredAt = envelope.occurredAt ? new Date(envelope.occurredAt) : undefined;
    await handler(envelope.payload, { subject: msg.subject, id: envelope.id, occurredAt });
    msg.ack();
  } catch (err) {
    // Handler failed — could be transient (DB blip) so nak() for redelivery.
    // Handlers are idempotent on the event id, so a redelivery of an event
    // that actually half-succeeded is a clean skip on the next attempt.
    //
    // Back off redelivery (exponential on the redelivery count, capped) so a
    // persistently-failing but PARSEABLE message can't hot-loop the consumer
    // — only JSON-parse failures term() immediately. The first retry is still
    // fast (covers a transient blip); repeated failures slow down.
    // (A hard max_deliver + dead-letter subject is a separate, deliberate
    // decision — see the events review notes.)
    opts.onError?.(err, { subject: msg.subject, raw });
    const info = (msg as { info?: { redeliveryCount?: number } }).info;
    const attempt = info?.redeliveryCount ?? (msg.redelivered ? 2 : 1);
    msg.nak(nakBackoffMs(attempt));
  }
}

// Exponential redelivery backoff in milliseconds, keyed on the 1-based
// redelivery attempt and capped. Exported for unit testing the curve.
const NAK_BASE_DELAY_MS = 1_000;
const NAK_MAX_DELAY_MS = 30_000;

export function nakBackoffMs(attempt: number): number {
  return Math.min(NAK_MAX_DELAY_MS, NAK_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
}
