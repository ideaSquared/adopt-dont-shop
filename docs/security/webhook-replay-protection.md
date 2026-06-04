# Email-delivery webhook replay protection

> Tracked in [ADS-734](https://linear.app/ideasquared/issue/ADS-734).
> Status: **Implemented** — timestamp window tightened AND per-event
> idempotency table now live.

## Current state

`service.backend/src/middleware/webhook-signature.ts` verifies provider
signatures (SendGrid ECDSA, Postmark HMAC, SES shared-secret, generic
HMAC) and rejects requests whose timestamp is outside the tolerated skew.
Since ADS-734 that window is **120 seconds** by default (was 5 minutes),
overridable via `EMAIL_WEBHOOK_TIMESTAMP_SKEW_MS`.

Inside that 120 s window, per-event idempotency is enforced via the
`webhook_event_ids` table — see "Implementation" below.

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

## Implementation

Per-event idempotency is enforced before any side effects run. Each
inbound webhook produces a `(provider, event_id)` pair; the first time
we see it we record a row, every subsequent attempt collides on the
composite primary key.

**Files:**

| Layer | Path |
| --- | --- |
| Migration | `service.backend/src/migrations/12-create-webhook-event-ids.ts` |
| Model | `service.backend/src/models/WebhookEventId.ts` |
| Service | `service.backend/src/services/email/webhook-idempotency.service.ts` |
| Wiring | `service.backend/src/controllers/email.controller.ts` (`handleDeliveryWebhook`) |
| Cleanup | `service.backend/src/jobs/webhook-events-purge.job.ts` |

**Table shape:**

```
webhook_event_ids (
  provider     VARCHAR(32)  NOT NULL,
  event_id     VARCHAR(255) NOT NULL,
  received_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, event_id)
);
CREATE INDEX webhook_event_ids_received_at_idx ON webhook_event_ids (received_at);
```

The composite primary key gives uniqueness across providers without a
separate constraint and powers the dedup INSERT.

**Event-id derivation:** the controller receives the normalised body
that `email.validation.deliveryWebhook` enforces (`messageId`, `status`,
…). The dedup key is `${messageId}.${status}` — a `delivered` and a
later `opened` event for the same message must NOT collide. The
provider tag comes from `EMAIL_WEBHOOK_PROVIDER`.

**Failure mode on duplicate:** `assertNotReplayed(provider, eventId)`
catches `SequelizeUniqueConstraintError` and throws `WebhookReplayError`,
which the controller maps to `HTTP 200 { deduplicated: true }`. We
intentionally do not return a 4xx — providers retry on 4xx, and a
duplicate-replay is by definition not a client error.

**Provider event-id sources** (for future provider-specific extractors,
should the normalised handler ever be replaced with provider-shaped
payloads):

| Provider | Event-ID source |
| --- | --- |
| SendGrid | `sg_event_id` on each event in the array body |
| Postmark | `MessageID` + `RecordType` |
| AWS SES via SNS | `Mail.messageId` + `Type` (`Bounce`/`Complaint`/`Delivery`) |
| Generic | `t` (timestamp) + SHA-256(rawBody) |

**Cleanup:** `jobs/webhook-events-purge.job.ts` deletes rows older than
7 days, scheduled daily via BullMQ on the shared `reports` queue. Cron:
`45 4 * * *` UTC, overridable via `WEBHOOK_EVENTS_PURGE_CRON`. The job
no-ops if Redis is unavailable, mirroring the other system purges
(retention, revoked-tokens).

## Tests

Per-event idempotency behaviour is covered by:

- `service.backend/src/__tests__/services/webhook-idempotency.service.test.ts`
  — service-level: new event inserts a row, replay throws
  `WebhookReplayError`, same event_id across providers is two rows.
- `service.backend/src/__tests__/routes/email-webhook-idempotency.routes.test.ts`
  — route-level: replay returns `200 { deduplicated: true }` and does
  NOT re-invoke `emailService.handleDeliveryWebhook`; different
  `status` for the same `messageId` is a distinct event.
- `service.backend/src/__tests__/jobs/webhook-events-purge.test.ts`
  — purge job deletes rows older than the 7-day cutoff.

Existing timestamp-window coverage remains in
`__tests__/middleware/webhook-signature.middleware.test.ts`.
