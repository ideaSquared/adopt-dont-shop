# Email-delivery webhook replay protection

> Tracked in [ADS-734](https://linear.app/ideasquared/issue/ADS-734).
> Status: **Partial** — timestamp window tightened; per-event idempotency
> still to be built. This document is the architecture note for the
> follow-up work.

## Current state

`service.backend/src/middleware/webhook-signature.ts` verifies provider
signatures (SendGrid ECDSA, Postmark HMAC, SES shared-secret, generic
HMAC) and rejects requests whose timestamp is outside the tolerated skew.
Since ADS-734 that window is **120 seconds** by default (was 5 minutes),
overridable via `EMAIL_WEBHOOK_TIMESTAMP_SKEW_MS`.

## Threat model

An attacker who captures a single signed payload — via a misbehaving log
shipper, a leaked debug capture, or transient network visibility — can
replay it for as long as the signature timestamp remains within tolerance.
The 120 s window narrows that to seconds of practical exposure but does
not eliminate it.

Highest-impact replay path: a captured **`bounced`** event replayed N
times causes `EmailPreference.recordBounce()` to fire N times. If
`recordBounce()` ever auto-suppresses mail after K bounces (it currently
does not, but is plausibly added), an attacker can silently suppress a
target user's transactional mail (password reset, security alerts).
Lower-impact: replaying `opened` / `clicked` inflates analytics.

## Proposed dedup design

Add per-event idempotency in the middleware (after signature verification,
before `next()`) keyed on `(provider, externalEventId)`:

| Provider | Event-ID source |
| --- | --- |
| SendGrid | `sg_event_id` field on each event in the array body |
| Postmark | `MessageID` + `RecordType` |
| AWS SES via SNS | `Mail.messageId` + `Type` (`Bounce`/`Complaint`/`Delivery`) |
| Generic | `t` (timestamp) + SHA-256(rawBody) |

Two implementation options:

1. **`WebhookEventSeen` Sequelize model** — table `webhook_events_seen`
   with columns `(provider, external_event_id, processed_at)`, UNIQUE on
   `(provider, external_event_id)`. Insert inside the request; on
   `SequelizeUniqueConstraintError` return 200 (no-op). Reap rows older
   than `EMAIL_WEBHOOK_TIMESTAMP_SKEW_MS * 2` via a daily cron.
2. **Redis `SET … NX EX`** — `SET webhook:{provider}:{eventId} 1 NX EX
   600` (TTL = 2× skew). Reject if the SET returns null. Cheaper, no
   migration; pairs well with the existing rate-limit Redis usage.

Option 2 is the recommended starting point because the backend already
depends on Redis at runtime. Fall back to option 1 if a future audit
requires durable evidence of which events were ever processed.

## Tests required for the follow-up

- Posting the same SendGrid bounce payload twice within 60 s results in
  `EmailPreference.recordBounce` being called exactly once.
- Posting a payload with `timestamp` older than the configured skew
  returns 401 (covered today).
- Cross-provider isolation: the same `eventId` from SendGrid and a
  generic test webhook are stored as two distinct rows / keys.

## What this PR did

- Reduced replay window from 300 s to 120 s (configurable via
  `EMAIL_WEBHOOK_TIMESTAMP_SKEW_MS`).
- Wrote this architecture note so the dedup follow-up has a clear plan.

## What this PR did NOT do

- No `WebhookEventSeen` model / migration.
- No Redis dedup wiring.
- No new integration test for replay (only the timestamp-window test is
  updated).
