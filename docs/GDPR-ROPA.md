# Record of Processing Activities (GDPR Art. 30)

**Controller:** Adopt Don't Shop
**Last reviewed:** 2026-05-08
**Next review due:** 2027-05-08 (annually, or on any new processing activity)
**Owner:** Engineering — see `CODEOWNERS`

This document is the controller-side record required by Article 30(1) of the
UK GDPR / EU GDPR. It must be reviewed at least annually and whenever a new
processing activity is added (new feature touching personal data, new third
party, new lawful basis).

The user-facing privacy notice is `docs/legal/privacy.md` (the text the gateway
serves to users). `docs/PRIVACY.md` is the engineering data inventory, not a
user-facing notice. If you change a field's purpose / retention here, update
both companions.

---

## 1. Account management

|                         |                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                 | Create and authenticate user accounts; deliver core service                                                                                                          |
| Lawful basis            | Art. 6(1)(b) — performance of a contract                                                                                                                             |
| Categories of subjects  | Adopters, rescue staff, admins, moderators                                                                                                                           |
| Categories of data      | Name, email, hashed password, phone, date of birth, address, profile image, IP, device tokens                                                                        |
| Source tables           | `users`, `refresh_tokens`, `revoked_tokens`, `device_tokens`                                                                                                         |
| Recipients              | None outside the controller (no data sharing for this purpose)                                                                                                       |
| International transfers | None                                                                                                                                                                 |
| Retention               | Active life of account + 30 days post-deactivation. Anonymisation on erasure request (`gdpr.service.anonymizeUser`). Audit / log retention covered separately below. |
| Security measures       | bcrypt password hashing; 2FA secrets encrypted at rest; refresh tokens hashed; row-level RBAC; field-level masking via `lib.permissions`                             |

## 2. Adoption applications

|                         |                                                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                 | Process applications for pet adoption on behalf of rescues                                                                                                                        |
| Lawful basis            | Art. 6(1)(b) (adopter↔rescue contract) and Art. 6(1)(f) (legitimate interest of the rescue in evaluating suitability)                                                             |
| Categories of subjects  | Adopters and the references they nominate                                                                                                                                         |
| Categories of data      | Application answers (free-text and structured), home circumstances, references' name + contact, status transitions                                                                |
| Source tables           | `applications`, `application_answers`, `application_references`, `application_status_transitions`, `application_timeline`, `home_visits`                                          |
| Recipients              | The rescue the application is submitted to                                                                                                                                        |
| International transfers | None                                                                                                                                                                              |
| Retention               | 6 years post-decision (UK statute of limitations for contractual claims). Status transitions retained for the same period. References notified of contact at point of nomination. |
| Security measures       | RBAC scoped to rescue; references' contact details masked from non-rescue users via `field_permissions`                                                                           |

## 3. Messaging between adopters and rescues

|                         |                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                 | Direct communication between adopter and rescue staff                                                                                                                                                                      |
| Lawful basis            | Art. 6(1)(b)                                                                                                                                                                                                               |
| Categories of subjects  | Adopters, rescue staff                                                                                                                                                                                                     |
| Categories of data      | Message content (free text, attachments), delivery / read state                                                                                                                                                            |
| Source tables           | `chats`, `chat_participants`, `messages`, `message_reactions`, `message_reads`, `file_uploads`                                                                                                                             |
| Recipients              | Other participants in the chat thread                                                                                                                                                                                      |
| International transfers | None                                                                                                                                                                                                                       |
| Retention               | Lifetime of the related application + 6 years (tied to the application above). On erasure: message bodies replaced with tombstone (`[message removed at user request]`), participant rows preserved for thread continuity. |
| Security measures       | Participant-only read access; content moderation via the moderation service (`services/moderation`)                                                                                                                        |

## 4. Support tickets

|                         |                                                      |
| ----------------------- | ---------------------------------------------------- |
| Purpose                 | Respond to user-reported issues                      |
| Lawful basis            | Art. 6(1)(b) and Art. 6(1)(f)                        |
| Categories of subjects  | Reporters and any users named in a ticket            |
| Categories of data      | Free-text descriptions, screenshots, ticket metadata |
| Source tables           | `support_tickets`, `support_ticket_responses`        |
| Recipients              | Internal support / moderation staff                  |
| International transfers | None                                                 |
| Retention               | 2 years from ticket close                            |
| Security measures       | RBAC; only assigned agent + the user can read        |

## 5. Content moderation and trust & safety

|                         |                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                 | Investigate user reports and enforce platform rules                                                                                                        |
| Lawful basis            | Art. 6(1)(f) — legitimate interest in safe service                                                                                                         |
| Categories of subjects  | Reported users, reporters, witnesses                                                                                                                       |
| Categories of data      | Report content, evidence (screenshots, message snapshots), moderator actions, sanctions                                                                    |
| Source tables           | `reports`, `report_status_transitions`, `moderator_actions`, `moderation_evidence`, `user_sanctions`                                                       |
| Recipients              | Moderation team; law enforcement on lawful request                                                                                                         |
| International transfers | None                                                                                                                                                       |
| Retention               | 7 years (regulatory / dispute window). Survives erasure of the reported user — `created_by` / target columns become NULL but the case record is preserved. |
| Security measures       | Restricted to MODERATOR/ADMIN; immutable `moderation_evidence` rows                                                                                        |

## 6. Marketing communications

|                         |                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Purpose                 | Adoption suggestions, newsletters, transactional-adjacent emails                                                        |
| Lawful basis            | Art. 6(1)(a) — consent (Art. 7)                                                                                         |
| Categories of subjects  | Adopters who have opted in                                                                                              |
| Categories of data      | Email, name, preference flags, send history                                                                             |
| Source tables           | `email_preferences`, `user_consents` (purpose `marketing_email`), `email_queue`, `notifications`                        |
| Recipients              | Email service provider (see Sub-processors)                                                                             |
| International transfers | Per provider — see Sub-processors                                                                                       |
| Retention               | Until consent is withdrawn. Withdrawal takes effect on next batch (≤24h). Consent history retained for 7 years (audit). |
| Security measures       | Append-only `user_consents` log; one-click unsubscribe token per email                                                  |

## 7. Analytics and product improvement

|                         |                                                                      |
| ----------------------- | -------------------------------------------------------------------- |
| Purpose                 | Aggregate usage analytics; product KPIs                              |
| Lawful basis            | Art. 6(1)(a) — consent for non-essential analytics                   |
| Categories of subjects  | All users who have granted consent                                   |
| Categories of data      | Page views, swipe actions, feature usage, coarse location            |
| Source tables           | `swipe_actions`, `swipe_sessions`, `audit_logs` (read-only roll-ups) |
| Recipients              | Internal analytics only                                              |
| International transfers | None                                                                 |
| Retention               | Raw events 13 months; aggregates indefinite                          |
| Security measures       | Pseudonymised at query time where reports leave the platform         |

## 8. Audit and security logging

|                         |                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Purpose                 | Detect abuse, prove compliance, debug incidents                                                                                |
| Lawful basis            | Art. 6(1)(c) — legal obligation; Art. 6(1)(f) — legitimate interest                                                            |
| Categories of subjects  | All users (passive)                                                                                                            |
| Categories of data      | User ID (FK), action, IP, user-agent, request metadata. **Never raw PII payloads** — log field names + record IDs, not values. |
| Source tables           | `audit_logs`, `revoked_tokens`, `ip_rules`                                                                                     |
| Recipients              | Internal security team                                                                                                         |
| International transfers | None                                                                                                                           |
| Retention               | 2 years rolling. Survives user erasure (FK is `constraints: false` for this reason).                                           |
| Security measures       | Append-only; admin-only read access; IP addresses hashed after 90 days (TODO)                                                  |

## 9. Consent records

|                    |                                                                                   |
| ------------------ | --------------------------------------------------------------------------------- |
| Purpose            | Demonstrate compliance with Art. 7 (consent)                                      |
| Lawful basis       | Art. 6(1)(c) — legal obligation to keep these records                             |
| Categories of data | User ID, purpose, granted/withdrawn, policy version, source, IP at time of action |
| Source tables      | `user_consents`                                                                   |
| Retention          | 7 years from last activity                                                        |
| Security measures  | Append-only (no UPDATE / DELETE allowed in service code)                          |

---

## Data-subject rights — implementation map

Corrected 2026-09-07 (ADS-1320) — this table previously cited six monolith-era endpoints
(`/api/v1/gdpr/me/*`) that do not exist in the current gateway + microservices architecture.
The rows below are the real surfaces, verified against `services/gateway/src/routes/`.

| Right (Article)          | Implementation                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access (15)              | `GET /api/v1/users/me/export` (`routes/users-export.ts`, ADS-1320) — self-service JSON export of the caller's own auth-owned data (profile + privacy preferences), rate-limited to 5/hour. Broader export (any user, admin-only) at `GET /api/v1/privacy/admin/users/:userId/export` (`routes/privacy.ts`) requires `admin.data.export`.                                                                                                                      |
| Rectification (16)       | `PUT /api/v1/users/profile` and per-domain update endpoints                                                                                                                                                                                                                                                                                                                                                                                                   |
| Erasure (17)             | Self-service: `POST /api/v1/users/me/erasure-request` (`routes/gdpr.ts`) — step-up re-authenticated, rate-limited to 5/hour, publishes a `gdpr.erasureRequested` saga that every service holding the subject's data consumes and acks; status via `GET /api/v1/users/me/erasure-request/{correlationId}`. Admin-scheduled deletion (auth-owned data only, 30-day grace) at `POST /api/v1/privacy/admin/users/:userId/delete-request` requires `users.delete`. |
| Restriction (18)         | Account deactivation (part of the admin deletion grace period above; no separate standalone restriction endpoint)                                                                                                                                                                                                                                                                                                                                             |
| Portability (20)         | Same endpoint as Access — JSON output is machine-readable                                                                                                                                                                                                                                                                                                                                                                                                     |
| Objection (21)           | Consent routes: `POST /api/v1/privacy/consent` and `POST /api/v1/privacy/cookies-consent` (`routes/consent.ts`) — withdraw analytics consent by posting `analyticsConsent: false`                                                                                                                                                                                                                                                                             |
| Automated decisions (22) | Not applicable — no fully automated decisions affecting users                                                                                                                                                                                                                                                                                                                                                                                                 |

## Sub-processors

Required fields per processor: name, purpose, location, transfer mechanism
(SCCs / adequacy), DPA link. Derived from the active provider wiring in
`services/notifications/src/config.ts`, `packages/storage/src`,
`packages/lib.observability/src/sentry.ts`, and — as of 2026-09-07 (ADS-1320)
— the frontend wiring in `apps/client/src/contexts/StatsigContext.tsx`
(this list previously omitted every browser-side processor). Re-verify this
section whenever a provider changes, on either side.

- **Email delivery:** Resend (transactional email API). `services/notifications`
  selects the provider via `EMAIL_PROVIDER`; production permits only `resend`
  (`console` and `ethereal` are dev/test-only sinks and are refused at boot in
  production — ADS-549). The `resend` provider config
  (`services/notifications/src/config.ts`) takes only `RESEND_API_KEY` /
  `DEFAULT_FROM_EMAIL` — there is no region/location parameter, so Resend's
  data-processing location cannot be derived from this codebase.
  - Location: _To be confirmed by DPO / vendor-contracts owner — [ADS-992]_.
    Resend, Inc. is a US-incorporated vendor; the specific data-processing
    region(s) must come from their DPA/sub-processor list, not this repo.
  - Transfer mechanism (SCCs / adequacy): _To be confirmed by DPO / vendor-contracts
    owner — [ADS-992]_.
  - DPA link: _To be confirmed by DPO / vendor-contracts owner — [ADS-992]_.

  The `SMTP_HOST`, `SENDGRID_API_KEY`, and AWS SES variables in
  `.env.example` are reserved for a possible future provider switch and are
  **not** wired into any code path today — they are not sub-processors.

- **SMS delivery:** Not implemented. `lib.validation` accepts an
  `SMS_PROVIDER=console|twilio` value for forward compatibility, but no SMS
  sending code exists anywhere in the codebase (no Twilio client, no SMS
  channel adapter in `services/notifications`). No SMS-related personal data
  is processed today; this entry must be populated with a real sub-processor
  before SMS is enabled in production.
- **File storage:** AWS S3 via `@adopt-dont-shop/storage`'s `S3StorageProvider`,
  optionally fronted by an Amazon CloudFront distribution
  (`CLOUDFRONT_DOMAIN`). Selected with `STORAGE_PROVIDER=s3` (`S3_BUCKET_NAME`,
  `S3_REGION`).
  - Location: the example/default value shipped in `.env.example` and
    `docs/env-reference.md` is `S3_REGION=us-east-1` (US East, N. Virginia).
    That is a config default, not a confirmed production value — this repo
    has no record of the region/account actually configured for the live
    bucket. _Actual deployed bucket region and AWS account to be confirmed by
    Infrastructure/DevOps — [ADS-992]_.
  - Transfer mechanism (SCCs / adequacy): AWS incorporates its GDPR Data
    Processing Addendum — which itself incorporates the EU Standard
    Contractual Clauses / UK International Data Transfer Addendum for
    transfers outside the UK/EEA — into the AWS Customer Agreement by
    default for all customers; this is a standing AWS policy, not something
    negotiated per-customer. _Confirmation that this addendum is in effect
    for our AWS account (and the acceptance record) to be supplied by DPO /
    vendor-contracts owner — [ADS-992]_.
  - DPA link: _To be confirmed by DPO / vendor-contracts owner — [ADS-992]_.
    AWS publishes its standard DPA via the AWS GDPR Center; the owner should
    record the specific accepted version/link here rather than have this
    doc infer one.

  Local disk storage (`STORAGE_PROVIDER=local`, the dev/test default)
  involves no third-party sub-processor.

- **Push notifications:** Firebase Cloud Messaging (`services/notifications/src/push/providers/fcm.ts`).
  Configured with `FCM_SERVICE_ACCOUNT_JSON` / `FCM_PROJECT_ID`. Sends device push tokens and
  notification payloads.
  - Location / transfer mechanism / DPA link: _To be confirmed by DPO / vendor-contracts
    owner — [ADS-992]_. Operated by Google; the Google Cloud DPA covers Firebase, but the
    specific processing region and accepted transfer safeguard are not derivable from this repo.

- **Error monitoring:** GlitchTip, a **self-hosted**, Sentry-compatible tool
  (`packages/lib.observability/src/sentry.ts` uses the `@sentry/*` SDKs pointed at our own
  GlitchTip instance via `SENTRY_DSN` — see `docker-compose.glitchtip.yml`). Not a third-party
  recipient: the deployed instance runs on our own infrastructure, so there is no international
  transfer. Note this corrects an earlier version of this document (and of `docs/PRIVACY.md`)
  that named the vendor "Sentry" — the SaaS Sentry.io is not used.
  - `event.user.email` / `username` / `ip_address` are stripped before any event is sent
    (`redactSentryUser`).

- **Feature flags, product analytics, and session replay:** Statsig
  (`apps/client/src/contexts/StatsigContext.tsx`, `STATSIG_SERVER_SECRET_KEY` server-side).
  Every session sends an opaque `userID` plus non-PII `custom` fields (`app`, `userType`,
  `rescueId`, `isAuthenticated`) for flag evaluation. Session replay and autocapture
  (`@statsig/session-replay`, `@statsig/web-analytics`) — which can capture identifiable
  behavioural/session data — are loaded **only after** the user grants analytics consent
  (`hasAnalyticsConsent()`); until then no behavioural data leaves the browser.
  - Location / transfer mechanism / DPA link: _To be confirmed by DPO / vendor-contracts
    owner — [ADS-992]_. Statsig, Inc. is a US-incorporated vendor.

## Review log

| Date       | Reviewer    | Notes                                                                                                                                                                                                                                                                                             |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-08 | Engineering | Initial ROPA created alongside `lib.gdpr` service                                                                                                                                                                                                                                                 |
| 2026-09-07 | Engineering | ADS-1320: replaced six non-existent monolith `/api/v1/gdpr/me/*` endpoints in the data-subject rights map with the real gateway routes (including the new self-service `GET /api/v1/users/me/export`); added the two browser-side sub-processors (GlitchTip, Statsig) that were missing entirely. |
