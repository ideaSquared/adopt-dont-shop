# Privacy and Data Retention

Internal reference for engineers and ops. Not a user-facing legal notice.
Last updated: 2026-04-27 (plan 6.2 + 5.2).

---

## 1. What we collect

Walk through the actual models in `service.backend/src/models/`. Every field listed below exists in code today.

### User (`users` table)

| Field | Category | Source |
|---|---|---|
| `first_name`, `last_name` | identity | user-provided |
| `email` | contact | user-provided |
| `password` (bcrypt hash) | identity | user-provided |
| `phone_number` | contact | user-provided |
| `date_of_birth` | identity | user-provided |
| `address_line_1`, `address_line_2`, `city`, `country`, `postal_code` | location | user-provided |
| `location` (PostGIS POINT) | location | derived from address |
| `profile_image_url` | identity | user-provided |
| `bio` | identity | user-provided |
| `two_factor_secret` (AES-256 encrypted at rest) | sensitive | user-provided |
| `backup_codes` (bcrypt-hashed array) | sensitive | automatic/derived |
| `verification_token` (SHA-256 hashed) | sensitive | automatic |
| `reset_token` (SHA-256 hashed) | sensitive | automatic |
| `login_attempts`, `locked_until` | behavioural | automatic |
| `last_login_at` | behavioural | automatic |
| `terms_accepted_at`, `privacy_policy_accepted_at` | behavioural | automatic |
| `timezone`, `language` | device | user-provided |
| `application_defaults` (JSONB) | identity | user-provided |
| `profile_completion_status` (JSONB) | behavioural | derived |

### Address (`addresses` table)

| Field | Category | Source |
|---|---|---|
| `line_1`, `line_2`, `city`, `region`, `postal_code`, `country` | location | user-provided |
| `owner_type`, `owner_id` | identity | automatic |
| `label` | identity | user-provided |
| `is_primary` | behavioural | user-provided |

Note: `Address` is a first-class entity (plan 5.5.11). Users and rescues also carry inline address columns on their own rows as a parallel path during migration; both sets of fields are live.

### Pet (`pets` table)

| Field | Category | Source |
|---|---|---|
| `name` | identity | user-provided |
| `location` (PostGIS POINT) | location/sensitive | user-provided |
| `birth_date` | identity | user-provided |
| `microchip_id` | sensitive | user-provided |
| `surrender_reason` | sensitive | user-provided |
| `medical_notes`, `behavioral_notes` | sensitive | user-provided |
| `special_needs_description` | sensitive | user-provided |

The `location` column records the pet's physical location. When a rescue enters a pet's current postcode, this gets geocoded to a coordinate. Treat as sensitive — it can identify a foster carer's home address.

### Application (`applications` table)

| Field | Category | Source |
|---|---|---|
| `documents` (JSONB array: fileName, fileUrl, documentType) | sensitive | user-provided |
| `interview_notes`, `home_visit_notes` | sensitive | rescue staff |
| `rejection_reason`, `withdrawal_reason` | sensitive | rescue staff / user |
| `notes` | sensitive | rescue staff |
| `score` | behavioural | derived |

### ApplicationAnswer (`application_answers` table)

| Field | Category | Source |
|---|---|---|
| `question_key`, `answer_value` (JSONB) | sensitive | user-provided |

Answers to adoption questionnaires. Can include living situation, employment, experience with animals, references. Treat all answer data as sensitive.

### ApplicationReference (`application_references` table)

| Field | Category | Source |
|---|---|---|
| `name`, `phone`, `email` | contact | user-provided |
| `relationship` | identity | user-provided |
| `notes`, `contacted_at`, `contacted_by` | sensitive | rescue staff |

Third-party contact data collected about people who did not directly consent to being in this system.

### Message (`messages` table)

| Field | Category | Source |
|---|---|---|
| `content` (TEXT, up to 10,000 chars) | sensitive | user-provided |
| `attachments` (JSONB: filename, mimeType, url, size) | sensitive | user-provided |
| `sender_id`, `chat_id` | identity | automatic |

### SwipeAction (`swipe_actions` table)

| Field | Category | Source |
|---|---|---|
| `pet_id`, `action` (like/pass/super_like/info) | behavioural | automatic |
| `timestamp` | behavioural | automatic |
| `response_time` (ms) | behavioural | automatic |
| `device_type` | device | automatic |
| `coordinates` (JSONB: x, y screen coords) | behavioural | automatic |
| `gesture_data` (JSONB: distance, velocity, direction) | behavioural | automatic |
| `user_id` | identity | automatic (optional; anonymous sessions allowed) |

### AuditLog (`audit_logs` table)

| Field | Category | Source |
|---|---|---|
| `user` (user_id soft reference) | identity | automatic |
| `user_email_snapshot` (email at write time) | contact | automatic |
| `ip_address` | device/location | automatic |
| `user_agent` | device | automatic |
| `action`, `metadata` (JSONB) | behavioural | automatic |
| `service`, `category`, `level`, `status` | behavioural | automatic |

### HomeVisit (`home_visits` table)

| Field | Category | Source |
|---|---|---|
| `scheduled_date`, `scheduled_time` | sensitive | rescue staff |
| `notes`, `outcome_notes` | sensitive | rescue staff |
| `assigned_staff` (FK to users) | identity | rescue staff |
| `outcome` (approved/rejected/conditional) | sensitive | rescue staff |
| `reschedule_reason`, `cancelled_reason` | sensitive | rescue staff |

A home visit record ties to an application, which ties to a specific adopter's address. Combined with the visit date and assigned staff, this is highly personal.

### DeviceToken (`device_tokens` table)

| Field | Category | Source |
|---|---|---|
| `device_token` (push token, up to 500 chars) | device | automatic |
| `platform` (ios/android/web) | device | automatic |
| `app_version` | device | automatic |
| `device_info` (JSONB) | device | automatic |
| `last_used_at` | behavioural | automatic |

### RefreshToken (`refresh_tokens` table)

| Field | Category | Source |
|---|---|---|
| `token_id`, `family_id` | sensitive | automatic |
| `expires_at`, `is_revoked` | behavioural | automatic |
| `replaced_by_token_id` | sensitive | automatic |

Token family chaining is used to detect theft (token rotation + family tracking). The token value itself is not stored; `token_id` is the UUID PK used to identify a token family.

### EmailQueue (`email_queue` table)

| Field | Category | Source |
|---|---|---|
| `to_email`, `to_name` | contact | automatic/user-provided |
| `subject`, `html_content`, `text_content` | sensitive | automatic |
| `template_data` (JSONB) | sensitive | automatic |
| `tracking` (JSONB: opens with IP + user_agent, clicks with IP + user_agent) | behavioural/device | automatic |

The `tracking` column records IP addresses and user agents from email opens and clicks. This is device/location data collected indirectly via pixel tracking.

### Notification (`notifications` table)

| Field | Category | Source |
|---|---|---|
| `title`, `message` | sensitive | automatic |
| `type`, `channel` | behavioural | automatic |
| `read_at`, `clicked_at` | behavioural | automatic |
| `related_entity_type`, `related_entity_id` | behavioural | automatic |

### IdempotencyKey (`idempotency_keys` table)

| Field | Category | Source |
|---|---|---|
| `key_hash` (SHA-256 of client key) | sensitive | automatic |
| `endpoint`, `response_body` | behavioural | automatic |
| `user_id` | identity | automatic |

Short-lived scratch (24h TTL). Exists to prevent duplicate submissions on flaky networks.

---

## 2. Why we collect it

One line per category.

| Category | Purpose |
|---|---|
| identity | Identify users, build profiles, match adopters to pets |
| contact | Send transactional email, phone verification, reference follow-up |
| behavioural | Personalise recommendations, track application progress, audit changes |
| device | Deliver push notifications, detect suspicious sessions |
| location | Match adopters to nearby pets, validate home visit geography |
| sensitive | Enable adoption process (medical/behavioural pet data, two-factor auth, background reference checks) |

---

## 3. Who sees it

### By role

| Role | Access |
|---|---|
| Adopter | Their own profile, applications, messages, notifications, swipe history |
| Rescue staff (StaffMember) | Applications + messages from adopters who applied to their rescue; pet records for their rescue; home visit records |
| Admin | Everything |
| Moderator | Reports, reported entities (users, rescues, pets, messages), moderation actions |

Rescue staff do not see adopter data across rescues. The `rescue_id` column on `Application`, `Chat`, and `Pet` enforces this at the service layer. Row-level security (plan 5.5.12) is documented as a future enforcement layer.

### Third-party processors

| Processor | Data shared | Where configured |
|---|---|---|
| Email provider (SendGrid via SMTP) | `to_email`, `to_name`, `subject`, HTML/text content, attachments | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` in `.env` |
| File storage (AWS S3) | Uploaded documents and pet photos (via FileUpload model, stored at `file_url`) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` in `.env` |
| Push notification provider | Device tokens (`device_token`), notification payloads | Not yet configured. Code stubs reference FCM/APNS as future targets; no env vars present |
| Database host (Postgres) | All data | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` in `.env` |
| Error monitoring (Sentry) | Stack traces, request metadata (may include user IDs, emails if logged) | `SENTRY_DSN` in `.env` |
| Feature flags (Statsig) | No PII by default; event names only | `STATSIG_SERVER_SECRET_KEY` in `.env` |

The email provider is configured as SendGrid in `.env.example` (`smtp.sendgrid.net`). Any other SMTP-compatible provider can be dropped in by changing `EMAIL_HOST`.

---

## 4. How long we keep it (retention matrix)

Status key: **Implemented** = automated enforcement exists in code today. **Documented, no enforcement** = policy decided, no automated job or migration yet. **Manual cleanup** = retention depends on someone running a query.

| Entity | Trigger | Retention period | What happens after | Status |
|---|---|---|---|---|
| User (active) | While account active | Indefinite | On verified deletion request: anonymise within 30 days (see section 5) | Documented, no enforcement |
| User (deleted/soft-deleted) | Account deletion or `deleted_at` set | 30 days | Full anonymisation: replace name/email/phone with opaque placeholders, clear twoFactorSecret, backupCodes, resetToken | Documented, no enforcement |
| AuditLog | Record creation | 7 years | Hard delete rows older than 7 years | Documented, no enforcement |
| Message | User deletes account or chat is deleted | Until parent chat or user is deleted | Cascade delete via `ON DELETE CASCADE` on `chat_id` and `sender_id` | Implemented (cascade) |
| SwipeAction | Record creation (`timestamp`) | 24 months rolling | Hard delete per-action rows. An aggregate `user_pet_preferences` row (pet_type x size x age_group x like/pass counts) is retained indefinitely for recommendations | Documented, no enforcement. Table comment references plan 4.2 partitioning, but no `PARTITION BY` DDL exists in any migration yet. |
| Notification (read) | `read_at` is set | 90 days from `read_at` | Hard delete (no soft-delete on Notification) | Documented, no enforcement |
| EmailQueue (sent) | `sent_at` is set | 1 year from `sent_at` | Hard delete. Model comment says "sent rows get hard-archived by the retention job" — that job does not exist yet | Documented, no enforcement |
| RefreshToken (expired or revoked) | `expires_at` passed or `is_revoked = true` | 30 days | Hard delete via cleanup job | Documented, no enforcement |
| IdempotencyKey | `expires_at` (set to creation + 24h) | 24 hours | Hard delete via cleanup job. `expires_at` index exists. No job implemented | Documented, no enforcement |
| ApplicationTimeline / ApplicationStatusTransition | Record creation | Indefinite | These are append-only audit trails; intentionally kept forever | Implemented (no TTL; by design) |
| HomeVisit | `completed_at` date | 5 years post-completion | Hard delete | Documented, no enforcement |
| Report / ModeratorAction | Record creation | 7 years | Hard delete | Documented, no enforcement |
| DeviceToken | `last_used_at` | 90 days idle (last_used_at older than 90 days) | Soft-delete (`paranoid: true`), then hard delete after further grace period | Partially implemented: model sets `expires_at` on `beforeValidate` (iOS: 30 days, other: 90 days) and marks status as EXPIRED on `beforeSave`. No job deletes expired rows |

### Honest state summary

None of the time-based retention periods have an automated background job wired up. The `expires_at` columns exist and are indexed, which means a future cleanup job has a clear path. Until that job exists, expired rows accumulate. This is the most important gap to close before any data subject deletion request arrives.

---

## 5. User rights

Currently no self-service portal. To exercise any of these rights, users email the platform admin.

### Export (subject access request)

The intended flow is: admin receives request, verifies identity, runs `scripts/export-user-data.ts` for the relevant `userId`.

That script does not exist yet. Future work: build it to collect User, Application, ApplicationAnswer, ApplicationReference, Message, Notification, SwipeAction, AuditLog (where `user` = userId), and DeviceToken rows for the subject, zip them as JSON, and return a download link.

### Deletion (right to erasure)

Admin receives request, verifies identity, runs `scripts/anonymize-user.ts` for the relevant `userId`.

That script does not exist yet. The intended operation: replace `first_name`, `last_name`, `email`, `phone_number`, `date_of_birth`, `address_*`, `bio`, `profile_image_url` with opaque placeholders; clear `two_factor_secret`, `backup_codes`, `reset_token`, `verification_token`; set `status = deactivated`; set `deleted_at`; revoke all active refresh tokens and device tokens. AuditLog rows referencing the user are kept (legal retention) but the `user_email_snapshot` column will preserve the pre-anonymisation email for the audit trail.

### Correction

Users can update their own profile via the UI. For fields not exposed in the UI, admin applies a direct update.

Both scripts are future work. As of 2026-04-27, neither `scripts/export-user-data.ts` nor `scripts/anonymize-user.ts` exists in the repository.

---

## 6. Third-party processors

| Processor | Purpose | Personal data involved | Configuration |
|---|---|---|---|
| PostgreSQL host | Primary data store for all application data | All PII | `DB_*` env vars |
| SendGrid (SMTP-compatible) | Transactional and notification email delivery | `to_email`, `to_name`, email content, tracking pixels | `EMAIL_HOST=smtp.sendgrid.net`, `EMAIL_USER`, `EMAIL_PASS` |
| AWS S3 | File storage for adoption documents and pet photos | File names, file content (documents may contain PII) | `AWS_*` env vars |
| Push notification provider (FCM/APNS) | Deliver push notifications to mobile devices | Device tokens, notification payloads | Not yet configured; code references FCM/APNS as placeholder |
| Sentry | Error tracking and diagnostics | Stack traces, request context (may include user IDs or emails embedded in logged errors) | `SENTRY_DSN` |
| Statsig | Feature flag evaluation | No PII sent by default (event names only; server-side evaluation) | `STATSIG_SERVER_SECRET_KEY` |

For processors not listed here: if you add a new integration that receives any of the field categories from section 1, update this table before merging.

---

## 7. Subject-access flow (intended, not yet implemented)

### Export flow

1. User emails admin with subject access request. Admin verifies identity against `users.email`.
2. Admin runs: `npx ts-node scripts/export-user-data.ts --userId <uuid>`
3. Script collects all rows referencing that `userId` across: `users`, `addresses`, `applications`, `application_answers`, `application_references`, `messages`, `notifications`, `swipe_actions`, `audit_logs` (where `user = userId`), `device_tokens`, `refresh_tokens`, `email_queue`.
4. Output: a JSON archive delivered to the user's verified email address.

**Status: future work.** Script does not exist.

### Deletion flow

1. User submits deletion request. Admin verifies identity.
2. Admin runs: `npx ts-node scripts/anonymize-user.ts --userId <uuid>`
3. Script: anonymises PII fields on `users`, revokes all `refresh_tokens` and `device_tokens` for the user, cancels pending `notifications` and `email_queue` entries. Does not delete `audit_logs` (legal retention). Does not delete `application` rows (rescue needs them for their own retention obligations). Does not delete `messages` (chat participant; the other party's data is also in that thread — separate policy decision needed).
4. Admin confirms operation completed and notifies user within 30 days of request.

**Status: future work.** Script does not exist. Retention periods in section 4 are also not enforced automatically. Both gaps should be addressed before the platform reaches production scale.
