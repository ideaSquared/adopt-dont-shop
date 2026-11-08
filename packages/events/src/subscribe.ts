import {
  AckPolicy,
  DeliverPolicy,
  headers,
  type ConsumerMessages,
  type JsMsg,
  type NatsConnection,
} from 'nats';

import { recordDeadLetter } from './dead-letter-metrics.js';
import type { OutboxLogger } from './outbox.js';
import { DLQ_SUBJECT_PREFIX, DOMAIN_STREAM } from './stream.js';

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
  // Structured logger for the startup retry (warn per retry, error when the
  // budget is exhausted). Falls back to a JSON line on stderr so a retry is
  // never silent even where the caller passes none.
  logger?: OutboxLogger;
  // Retry budget for the JetStream setup (see DEFAULT_SETUP_RETRY).
  setupRetry?: Partial<SubscribeSetupRetry>;
  // Called when the setup still fails after the whole retry budget. The
  // default (defaultSetupFailure) rethrows, which surfaces as an unhandled
  // rejection that installProcessErrorHandlers turns into a loud, non-zero
  // exit: a subscriber that silently never subscribed (a GDPR erasure
  // subscriber especially) must not go unnoticed. A custom callback must make
  // the failure just as loud (e.g. exit the process).
  onSetupFailure?: (
    err: unknown,
    ctx: { subject: string; durable: string; attempts: number }
  ) => void;
};

export type SubscribeSetupRetry = {
  // Total attempts, including the first.
  attempts: number;
  // Delay before the second attempt; doubles each time up to maxDelayMs.
  baseDelayMs: number;
  maxDelayMs: number;
  // JetStream API timeout (nats.js defaults to 5s, too tight while NATS is
  // CPU-starved during a busy boot).
  jetstreamTimeoutMs: number;
};

export const DEFAULT_SETUP_RETRY: SubscribeSetupRetry = {
  attempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
  jetstreamTimeoutMs: 15_000,
};

// Delay before retrying after the given 1-based failed attempt: exponential
// from baseDelayMs, capped at maxDelayMs. Exported for unit testing.
export const setupRetryDelayMs = (
  attempt: number,
  retry: Pick<SubscribeSetupRetry, 'baseDelayMs' | 'maxDelayMs'> = DEFAULT_SETUP_RETRY
): number => Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** Math.max(0, attempt - 1));

// The default for an exhausted retry budget: rethrow, so the failure is an
// unhandled rejection and the process exits non-zero.
export const defaultSetupFailure = (err: unknown): void => {
  throw err;
};

// Programming errors will not fix themselves on a retry; everything else
// (NatsError TIMEOUT, 503, no responders, connection closed, JetStream API
// errors while another service is still creating the stream) is treated as
// possibly transient and retried.
const isNonTransient = (err: unknown): boolean =>
  err instanceof TypeError ||
  err instanceof RangeError ||
  err instanceof SyntaxError ||
  err instanceof ReferenceError;

const stderrLogger: OutboxLogger = {
  warn: (message, meta) =>
    process.stderr.write(`${JSON.stringify({ level: 'warn', message, ...(meta as object) })}\n`),
  error: (message, meta) =>
    process.stderr.write(`${JSON.stringify({ level: 'error', message, ...(meta as object) })}\n`),
};

const describeError = (
  err: unknown
): { errorName?: string; errorCode?: unknown; errorMessage?: string } => ({
  errorName: (err as { name?: string } | null)?.name,
  errorCode: (err as { code?: unknown } | null)?.code,
  errorMessage: err instanceof Error ? err.message : undefined,
});

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

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
  // Settles once the durable consumer is established (after any retries), or
  // rejects when setup is abandoned. Callers may ignore it and keep their
  // fire-and-forget shape.
  ready: Promise<void>;
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
  const retry: SubscribeSetupRetry = { ...DEFAULT_SETUP_RETRY, ...opts.setupRetry };
  const log = opts.logger ?? stderrLogger;
  const onSetupFailure = opts.onSetupFailure ?? defaultSetupFailure;

  // One attempt at everything that talks to JetStream.
  const connectConsumer = async (): Promise<ConsumerMessages | undefined> => {
    const jsm = await nc.jetstreamManager({ timeout: retry.jetstreamTimeoutMs });
    // Create-or-reuse the durable consumer. Idempotent: a consumer that
    // already exists (from a previous boot) is reused with its saved
    // position, so the backlog accumulated while this subscriber was down is
    // delivered now.
    //
    // NOTE: JetStream does NOT apply a changed deliver_policy / filter_subject
    // to an already-existing durable on re-add - those are fixed at creation.
    // Changing them in code requires deleting and recreating the consumer (a
    // deliberate ops step), so a flipped `deliverNew` won't take effect on an
    // existing durable until it's recreated.
    await jsm.consumers.add(DOMAIN_STREAM, {
      durable_name: opts.durable,
      filter_subject: opts.subject,
      ack_policy: AckPolicy.Explicit,
      deliver_policy: opts.deliverNew ? DeliverPolicy.New : DeliverPolicy.All,
      // Cap redeliveries - after MAX_DELIVER attempts handleFailure() dead-
      // letters the message instead of retrying forever (backstop for the
      // app-level term() in case a crash skips it).
      max_deliver: MAX_DELIVER,
    });

    const js = nc.jetstream({ timeout: retry.jetstreamTimeoutMs });
    const consumer = await js.consumers.get(DOMAIN_STREAM, opts.durable);
    if (closed) {
      return undefined;
    }
    return consumer.consume();
  };

  // Bounded retry with exponential backoff. Every retry is logged at warn;
  // an exhausted budget (or a non-transient error) is rethrown to the caller.
  const establish = async (): Promise<ConsumerMessages | undefined> => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await connectConsumer();
      } catch (err) {
        if (closed) {
          return undefined;
        }
        const meta = {
          subject: opts.subject,
          durable: opts.durable,
          attempt,
          maxAttempts: retry.attempts,
          ...describeError(err),
        };
        if (isNonTransient(err) || attempt >= retry.attempts) {
          log.error?.('JetStream subscribe setup failed; giving up', {
            ...meta,
            attempts: attempt,
          });
          throw Object.assign(err instanceof Error ? err : new Error(String(err)), {
            setupAttempts: attempt,
          });
        }
        const delayMs = setupRetryDelayMs(attempt, retry);
        log.warn?.('JetStream subscribe setup failed; retrying', { ...meta, retryInMs: delayMs });
        await sleep(delayMs);
        if (closed) {
          return undefined;
        }
      }
    }
  };

  const ready = (async () => {
    messages = await establish();
  })();

  // Consume loop. A setup failure goes to onSetupFailure; its default rethrows
  // here, in a promise nobody awaits, so it surfaces as an unhandled rejection
  // and installProcessErrorHandlers exits the process (loud, never swallowed).
  void ready.then(
    async () => {
      if (!messages) {
        return;
      }
      const decoder = new TextDecoder();
      for await (const msg of messages) {
        await dispatch<T>(nc, msg, decoder, opts, handler);
      }
    },
    err => {
      onSetupFailure(err, {
        subject: opts.subject,
        durable: opts.durable,
        attempts: (err as { setupAttempts?: number }).setupAttempts ?? retry.attempts,
      });
    }
  );

  return {
    drain: async () => {
      closed = true;
      await messages?.close();
    },
    ready,
  };
}

async function dispatch<T>(
  nc: NatsConnection,
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
    // Handler failed — could be transient (DB blip) so back off + redeliver;
    // a persistently-failing message is dead-lettered once it exhausts the
    // retry budget. Handlers are idempotent on the event id, so a redelivery
    // of an event that half-succeeded is a clean skip on the next attempt.
    opts.onError?.(err, { subject: msg.subject, raw });
    await handleFailure(nc, msg, raw, err);
  }
}

// Exponential redelivery backoff in milliseconds, keyed on the 1-based
// redelivery attempt and capped. Exported for unit testing the curve.
const NAK_BASE_DELAY_MS = 1_000;
const NAK_MAX_DELAY_MS = 30_000;

export function nakBackoffMs(attempt: number): number {
  return Math.min(NAK_MAX_DELAY_MS, NAK_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
}

// After this many delivery attempts a persistently-failing (but parseable)
// message is dead-lettered rather than retried forever.
export const MAX_DELIVER = 7;

// A handler failure either backs off for redelivery, or — once the retry
// budget is exhausted — parks the message in the dead-letter stream and
// term()s it so the consumer stops looping. Exported for unit testing.
export async function handleFailure(
  nc: NatsConnection,
  msg: Pick<JsMsg, 'subject' | 'nak' | 'term'> & {
    info?: { redeliveryCount?: number };
    redelivered?: boolean;
  },
  raw: string,
  err: unknown
): Promise<void> {
  const attempt = msg.info?.redeliveryCount ?? (msg.redelivered ? 2 : 1);
  if (attempt >= MAX_DELIVER) {
    await deadLetter(nc, msg.subject, raw, err);
    msg.term();
    return;
  }
  msg.nak(nakBackoffMs(attempt));
}

// Publish a failed message to the dead-letter stream on
// `dlq.<original-subject>`, preserving the raw payload and stamping the
// original subject + error message for triage. Exported for unit testing.
export async function deadLetter(
  nc: NatsConnection,
  originalSubject: string,
  raw: string,
  err: unknown
): Promise<void> {
  const h = headers();
  h.set('dlq-original-subject', originalSubject);
  h.set('dlq-error', err instanceof Error ? err.message : String(err));
  await nc
    .jetstream()
    .publish(`${DLQ_SUBJECT_PREFIX}${originalSubject}`, new TextEncoder().encode(raw), {
      headers: h,
    });
  // Meter the dead-letter on the shared registry so /metrics exposes
  // events_dead_letter_total{subject}. Counted after the park succeeds.
  recordDeadLetter(originalSubject);
}
