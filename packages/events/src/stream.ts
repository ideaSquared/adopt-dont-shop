// JetStream stream topology for the domain-event bus.
//
// We run a SINGLE stream — DOMAIN_EVENTS — that captures every domain
// subject (`<service>.<entity>.<verb>`, e.g. `pets.unit.statusChanged`,
// `gdpr.erasureRequested`, `chat.messageCreated`). One stream over the
// wildcard `*.>` is the cleanest choice here:
//
//   * Every subject in this system is exactly `<prefix>.<...>` with a
//     single-token service prefix, so `*.>` matches all of them and
//     nothing leaks in from outside the convention.
//   * A single stream means one retention/storage policy to reason about
//     and no risk of a subject falling through the cracks between several
//     prefix-keyed streams (the GDPR-correctness failure mode we're
//     fixing — an event with nowhere durable to land).
//   * Durable consumers each filter the stream down to their own subject,
//     so the single stream costs us nothing on the read side.
//
// If a future subject needs a different retention policy (e.g. a
// high-volume analytics firehose we don't want to keep for 7 days), split
// it into its own stream then — until then, one stream is simplest.

import { type NatsConnection, RetentionPolicy, StorageType } from 'nats';

// The one stream every service publishes to and consumes from.
export const DOMAIN_STREAM = 'DOMAIN_EVENTS';

// Wildcard capturing every `<service>.<...>` subject.
export const DOMAIN_SUBJECTS = ['*.>'] as const;

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
  const config = {
    name: DOMAIN_STREAM,
    subjects: [...DOMAIN_SUBJECTS],
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
    max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
    duplicate_window: 2 * 60 * 1_000_000_000, // 2 minutes in nanoseconds
  };

  try {
    await jsm.streams.add(config);
  } catch (err) {
    // Already exists — reconcile to the desired config. `streams.add`
    // throws when the stream exists, so we fall through to an update
    // rather than crashing the boot.
    if (isStreamAlreadyExists(err)) {
      await jsm.streams.update(DOMAIN_STREAM, config);
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
