// JetStream stream topology for the domain-event bus.
//
// We run a SINGLE stream — DOMAIN_EVENTS — that captures every domain
// subject (`<service>.<entity>.<verb>`, e.g. `pets.unit.statusChanged`,
// `gdpr.erasureRequested`, `chat.messageCreated`) via an explicit list of
// `<prefix>.>` filters, one per service domain:
//
//   * A bare token wildcard (`*.>`) is NOT usable here: `*` matches `$JS`
//     and `$SYS` too, so the stream would overlap JetStream's own API
//     namespace and the server rejects it at creation time (err 10052,
//     "subjects that overlap with jetstream api require no-ack to be
//     true") — crashing every service at boot.
//   * A single stream means one retention/storage policy to reason about
//     and no risk of a subject falling through the cracks between several
//     prefix-keyed streams (the GDPR-correctness failure mode we're
//     fixing — an event with nowhere durable to land).
//   * Durable consumers each filter the stream down to their own subject,
//     so the single stream costs us nothing on the read side.
//
// Adding a new service domain? Add its prefix to DOMAIN_SUBJECTS (and the
// coverage test in stream.test.ts). An unused prefix costs nothing; a
// missing one means that domain's events have no durable stream.

import {
  type JetStreamManager,
  type NatsConnection,
  RetentionPolicy,
  type StreamConfig,
  StorageType,
} from 'nats';

// The one stream every service publishes to and consumes from.
export const DOMAIN_STREAM = 'DOMAIN_EVENTS';

// Dead-letter stream + subject prefix. A message that exhausts its consumer
// redelivery budget (subscribe.ts MAX_DELIVER) is republished here on
// `dlq.<original-subject>` for triage rather than being dropped or looped.
export const DLQ_STREAM = 'DOMAIN_EVENTS_DLQ';
export const DLQ_SUBJECT_PREFIX = 'dlq.';

// One `<prefix>.>` filter per service domain (plus the cross-service gdpr
// saga subjects). Explicit on purpose — see the header comment.
export const DOMAIN_SUBJECTS = [
  'auth.>',
  'pets.>',
  'rescue.>',
  'applications.>',
  'chat.>',
  'notifications.>',
  'moderation.>',
  'matching.>',
  'cms.>',
  'audit.>',
  'gdpr.>',
] as const;

// Union type of every valid DOMAIN_SUBJECTS entry. Used by the consumer
// registry to ensure each entry maps to a real declared subject.
export type DomainSubject = (typeof DOMAIN_SUBJECTS)[number];

// ensureStream creates-or-updates the DOMAIN_EVENTS stream. Idempotent:
// safe to call on every service boot. The first service to boot creates
// it; subsequent boots (and other services) reconcile it to the same
// config, which is a no-op on the server when nothing changed.
//
// Retention is `limits` (the JetStream default) with a 7-day max age and
// file storage — events survive a broker restart, and a consumer that was
// offline for less than 7 days still gets every message it missed. The
// duplicate window (2 minutes) lets js.publish() de-dupe by Nats-Msg-Id
// when the same event id is published twice within the window.
export async function ensureStream(nc: NatsConnection): Promise<void> {
  const jsm = await nc.jetstreamManager();

  await addOrUpdateStream(jsm, {
    name: DOMAIN_STREAM,
    subjects: [...DOMAIN_SUBJECTS],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
    duplicate_window: 2 * 60 * 1_000_000_000, // 2 minutes in nanoseconds
  });

  // Dead-letter stream — messages that exhausted their redelivery budget land
  // here on `dlq.<original-subject>`. Retained longer than the main stream so
  // there's time to triage. Subjects don't overlap DOMAIN_SUBJECTS.
  await addOrUpdateStream(jsm, {
    name: DLQ_STREAM,
    subjects: [`${DLQ_SUBJECT_PREFIX}>`],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    max_age: 14 * 24 * 60 * 60 * 1_000_000_000, // 14 days in nanoseconds
  });
}

// add-or-update a stream: `streams.add` throws when the stream already exists
// (from a prior boot), so fall through to an update rather than crashing.
async function addOrUpdateStream(
  jsm: JetStreamManager,
  config: Partial<StreamConfig> & { name: string }
): Promise<void> {
  try {
    await jsm.streams.add(config);
  } catch (err) {
    if (isStreamAlreadyExists(err)) {
      await jsm.streams.update(config.name, config);
      return;
    }
    throw err;
  }
}

function isStreamAlreadyExists(err: unknown): boolean {
  // NATS surfaces this as an ApiError (err_code 10058), but the message is
  // the stable signal across versions.
  const message = err instanceof Error ? err.message : String(err);
  return /already in use|stream name already|already exists/i.test(message);
}
