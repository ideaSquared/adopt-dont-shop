# Privacy and Data Retention

Internal reference for engineers and ops. Not a user-facing legal notice.
Last updated: 2026-09-07 (ADS-1320 / ADS-1326 — processor table and self-service rights
corrected against the running code).

## Which privacy document?

| Document                      | Audience         | Purpose                                                                                             |
| ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| `docs/legal/privacy.md`       | End users        | The published privacy notice — the exact text the gateway serves at `GET /api/v1/legal/privacy`.    |
| `docs/PRIVACY.md` (this file) | Engineers / ops  | Data inventory: which fields exist in code, where, and how long they are retained. Not user-facing. |
| `docs/GDPR-ROPA.md`           | DPO / compliance | Record of Processing Activities (UK/EU GDPR Art. 30) — purposes, lawful bases, subjects.            |

---

## 1. What we collect

Walk through the actual models defined across the backend services (`services/*/src`). Every field listed below exists in code today.

### User (`users` table)

| Field                                                                | Category    | Source               |
| -------------------------------------------------------------------- | ----------- | -------------------- |
| `first_name`, `last_name`                                            | identity    | user-provided        |
| `email`                                                              | contact     | user-provided        |
| `password` (bcrypt hash)                                             | identity    | user-provided        |
| `phone_number`                                                       | contact     | user-provided        |
| `date_of_birth`                                                      | identity    | user-provided        |
| `address_line_1`, `address_line_2`, `city`, `country`, `postal_code` | location    | user-provided        |
| `location` (PostGIS POINT)                                           | location    | derived from address |
| `profile_image_url`                                                  | identity    | user-provided        |
| `bio`                                                                | identity    | user-provided        |
| `two_factor_secret` (AES-256 encrypted at rest)                      | sensitive   | user-provided        |
| `backup_codes` (bcrypt-hashed array)                                 | sensitive   | automatic/derived    |
| `verification_token` (SHA-256 hashed)                                | sensitive   | automatic            |
| `reset_token` (SHA-256 hashed)                                       | sensitive   | automatic            |
| `login_attempts`, `locked_until`                                     | behavioural | automatic            |
| `last_login_at`                                                      | behavioural | automatic            |
| `terms_accepted_at`, `privacy_policy_accepted_at`                    | behavioural | automatic            |
| `timezone`, `language`                                               | device      | user-provided        |
| `application_defaults` (JSONB)                                       | identity    | user-provided        |
| `profile_completion_status` (JSONB)                                  | behavioural | derived              |

### Address (`addresses` table)

| Field                                                          | Category    | Source        |
| -------------------------------------------------------------- | ----------- | ------------- |
| `line_1`, `line_2`, `city`, `region`, `postal_code`, `country` | location    | user-provided |
| `owner_type`, `owner_id`                                       | identity    | automatic     |
| `label`                                                        | identity    | user-provided |
| `is_primary`                                                   | behavioural | user-provided |

Note: `Address` is a first-class entity (plan 5.5.11). Users and rescues also carry inline address columns on their own rows as a parallel path during migration; both sets of fields are live.

### Pet (`pets` table)

| Field                               | Category           | Source        |
| ----------------------------------- | ------------------ | ------------- |
| `name`                              | identity           | user-provided |
| `location` (PostGIS POINT)          | location/sensitive | user-provided |
| `birth_date`                        | identity           | user-provided |
| `microchip_id`                      | sensitive          | user-provided |
| `surrender_reason`                  | sensitive          | user-provided |
| `medical_notes`, `behavioral_notes` | sensitive          | user-provided |
| `special_needs_description`         | sensitive          | user-provided |

The `location` column records the pet's physical location. When a rescue enters a pet's current postcode, this gets geocoded to a coordinate. Treat as sensitive — it can identify a foster carer's home address.

### Application (`applications` table)

| Field                                                      | Category    | Source              |
| ---------------------------------------------------------- | ----------- | ------------------- |
| `documents` (JSONB array: fileName, fileUrl, documentType) | sensitive   | user-provided       |
| `interview_notes`, `home_visit_notes`                      | sensitive   | rescue staff        |
| `rejection_reason`, `withdrawal_reason`                    | sensitive   | rescue staff / user |
| `notes`                                                    | sensitive   | rescue staff        |
| `score`                                                    | behavioural | derived             |

### ApplicationAnswer (`application_answers` table)

| Field                                  | Category  | Source        |
| -------------------------------------- | --------- | ------------- |
| `question_key`, `answer_value` (JSONB) | sensitive | user-provided |

Answers to adoption questionnaires. Can include living situation, employment, experience with animals, references. Treat all answer data as sensitive.

### ApplicationReference (`application_references` table)

| Field                                   | Category  | Source        |
| --------------------------------------- | --------- | ------------- |
| `name`, `phone`, `email`                | contact   | user-provided |
| `relationship`                          | identity  | user-provided |
| `notes`, `contacted_at`, `contacted_by` | sensitive | rescue staff  |

Third-party contact data collected about people who did not directly consent to being in this system.

### Message (`messages` table)

| Field                                                | Category  | Source        |
| ---------------------------------------------------- | --------- | ------------- |
| `content` (TEXT, up to 10,000 chars)                 | sensitive | user-provided |
| `attachments` (JSONB: filename, mimeType, url, size) | sensitive | user-provided |
| `sender_id`, `chat_id`                               | identity  | automatic     |

### SwipeAction (`swipe_actions` table)

| Field                                                 | Category    | Source                                           |
| ----------------------------------------------------- | ----------- | ------------------------------------------------ |
| `pet_id`, `action` (like/pass/super_like/info)        | behavioural | automatic                                        |
| `timestamp`                                           | behavioural | automatic                                        |
| `response_time` (ms)                                  | behavioural | automatic                                        |
| `device_type`                                         | device      | automatic                                        |
| `coordinates` (JSONB: x, y screen coords)             | behavioural | automatic                                        |
| `gesture_data` (JSONB: distance, velocity, direction) | behavioural | automatic                                        |
| `user_id`                                             | identity    | automatic (optional; anonymous sessions allowed) |

### AuditLog (`audit_logs` table)

| Field                                       | Category        | Source    |
| ------------------------------------------- | --------------- | --------- |
| `user` (user_id soft reference)             | identity        | automatic |
| `user_email_snapshot` (email at write time) | contact         | automatic |
| `ip_address`                                | device/location | automatic |
| `user_agent`                                | device          | automatic |
| `action`, `metadata` (JSONB)                | behavioural     | automatic |
| `service`, `category`, `level`, `status`    | behavioural     | automatic |

### HomeVisit (`home_visits` table)

| Field                                     | Category  | Source       |
| ----------------------------------------- | --------- | ------------ |
| `scheduled_date`, `scheduled_time`        | sensitive | rescue staff |
| `notes`, `outcome_notes`                  | sensitive | rescue staff |
| `assigned_staff` (FK to users)            | identity  | rescue staff |
| `outcome` (approved/rejected/conditional) | sensitive | rescue staff |
| `reschedule_reason`, `cancelled_reason`   | sensitive | rescue staff |

A home visit record ties to an application, which ties to a specific adopter's address. Combined with the visit date and assigned staff, this is highly personal.

### DeviceToken (`device_tokens` table)

| Field                                        | Category    | Source    |
| -------------------------------------------- | ----------- | --------- |
| `device_token` (push token, up to 500 chars) | device      | automatic |
| `platform` (ios/android/web)                 | device      | automatic |
| `app_version`                                | device      | automatic |
| `device_info` (JSONB)                        | device      | automatic |
| `last_used_at`                               | behavioural | automatic |

### RefreshToken (`refresh_tokens` table)

| Field                      | Category    | Source    |
| -------------------------- | ----------- | --------- |
| `token_id`, `family_id`    | sensitive   | automatic |
| `expires_at`, `is_revoked` | behavioural | automatic |
| `replaced_by_token_id`     | sensitive   | automatic |

Token family chaining is used to detect theft (token rotation + family tracking). The token value itself is not stored; `token_id` is the UUID PK used to identify a token family.

### EmailQueue (`email_queue` table)

| Field                                                                       | Category           | Source                  |
| --------------------------------------------------------------------------- | ------------------ | ----------------------- |
| `to_email`, `to_name`                                                       | contact            | automatic/user-provided |
| `subject`, `html_content`, `text_content`                                   | sensitive          | automatic               |
| `template_data` (JSONB)                                                     | sensitive          | automatic               |
| `tracking` (JSONB: opens with IP + user_agent, clicks with IP + user_agent) | behavioural/device | automatic               |

The `tracking` column records IP addresses and user agents from email opens and clicks. This is device/location data collected indirectly via pixel tracking.

### Notification (`notifications` table)

| Field                                      | Category    | Source    |
| ------------------------------------------ | ----------- | --------- |
| `title`, `message`                         | sensitive   | automatic |
| `type`, `channel`                          | behavioural | automatic |
| `read_at`, `clicked_at`                    | behavioural | automatic |
| `related_entity_type`, `related_entity_id` | behavioural | automatic |

### IdempotencyKey (`idempotency_keys` table)

| Field                              | Category    | Source    |
| ---------------------------------- | ----------- | --------- |
| `key_hash` (SHA-256 of client key) | sensitive   | automatic |
| `endpoint`, `response_body`        | behavioural | automatic |
| `user_id`                          | identity    | automatic |

Short-lived scratch (24h TTL). Exists to prevent duplicate submissions on flaky networks.

---

## 2. Why we collect it

One line per category.

| Category    | Purpose                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------- |
| identity    | Identify users, build profiles, match adopters to pets                                               |
| contact     | Send transactional email, phone verification, reference follow-up                                    |
| behavioural | Personalise recommendations, track application progress, audit changes                               |
| device      | Deliver push notifications, detect suspicious sessions                                               |
| location    | Match adopters to nearby pets, validate home visit geography                                         |
| sensitive   | Enable adoption process (medical/behavioural pet data, two-factor auth, background reference checks) |

---

## 3. Who sees it

### By role

| Role                       | Access                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Adopter                    | Their own profile, applications, messages, notifications, swipe history                                             |
| Rescue staff (StaffMember) | Applications + messages from adopters who applied to their rescue; pet records for their rescue; home visit records |
| Admin                      | Everything                                                                                                          |
| Moderator                  | Reports, reported entities (users, rescues, pets, messages), moderation actions                                     |

Rescue staff do not see adopter data across rescues. The `rescue_id` column on `Application`, `Chat`, and `Pet` enforces this at the service layer. Row-level security (plan 5.5.12) is documented as a future enforcement layer.

### Third-party processors

| Processor                                             | Data shared                                                                                                                                                                                                                                                                     | Where configured                                                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email provider (Resend)                               | `to_email`, `to_name`, `subject`, HTML/text content                                                                                                                                                                                                                             | `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL` (`services/notifications/src/email/providers/resend.ts`); production permits only `EMAIL_PROVIDER=resend` |
| File storage (AWS S3)                                 | Uploaded documents and pet photos (via `@adopt-dont-shop/storage`'s `S3StorageProvider`)                                                                                                                                                                                        | `S3_BUCKET_NAME`, `S3_REGION`, `STORAGE_PROVIDER=s3` (`packages/storage`)                                                                        |
| Push notification provider (Firebase Cloud Messaging) | Device tokens, notification payloads                                                                                                                                                                                                                                            | `FCM_SERVICE_ACCOUNT_JSON`, `FCM_PROJECT_ID` (`services/notifications/src/push/providers/fcm.ts`)                                                |
| Database host (Postgres)                              | All data                                                                                                                                                                                                                                                                        | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` in `.env`                                                                          |
| Error monitoring (GlitchTip, self-hosted)             | Stack traces, request metadata; `event.user.email`/`username`/`ip_address` are stripped before send (`redactSentryUser`, `packages/lib.observability/src/sentry.ts`)                                                                                                            | `SENTRY_DSN` — the `@sentry/*` SDK talks to our own self-hosted GlitchTip instance (`docker-compose.glitchtip.yml`), not the Sentry SaaS         |
| Feature flags + product analytics (Statsig)           | Opaque `userID` + non-PII `custom` fields (`app`, `userType`, `rescueId`, `isAuthenticated`) for every session; session replay and autocapture (behavioural/session data) load **only after** the user grants analytics consent (`apps/client/src/contexts/StatsigContext.tsx`) | `VITE_STATSIG_CLIENT_KEY` (frontend), `STATSIG_SERVER_SECRET_KEY` (backend flag evaluation)                                                      |

Corrected 2026-09-07 (ADS-1326) — this table previously named SendGrid/SMTP, an unconfigured push
provider, and "Sentry" with "no PII by default" for Statsig; none of that matches the running
code (see `docs/legal/cookies.md` §5, which already had the GlitchTip / session-replay facts
right).

---

## 4. How long we keep it (retention matrix)

Status key: **Implemented** = automated enforcement exists in code today. **Documented, no enforcement** = policy decided, no automated job or migration yet. **Manual cleanup** = retention depends on someone running a query.

| Entity                                            | Trigger                                    | Retention period                               | What happens after                                                                                                                                                 | Status                                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User (active)                                     | While account active                       | Indefinite                                     | On verified deletion request: anonymise within 30 days (see section 5)                                                                                             | Documented, no enforcement                                                                                                                                                 |
| User (deleted/soft-deleted)                       | Account deletion or `deleted_at` set       | 30 days                                        | Full anonymisation: replace name/email/phone with opaque placeholders, clear twoFactorSecret, backupCodes, resetToken                                              | Documented, no enforcement                                                                                                                                                 |
| AuditLog                                          | Record creation                            | 7 years                                        | Hard delete rows older than 7 years                                                                                                                                | Documented, no enforcement                                                                                                                                                 |
| Message                                           | User deletes account or chat is deleted    | Until parent chat or user is deleted           | Cascade delete via `ON DELETE CASCADE` on `chat_id` and `sender_id`                                                                                                | Implemented (cascade)                                                                                                                                                      |
| SwipeAction                                       | Record creation (`timestamp`)              | 24 months rolling                              | Hard delete per-action rows. An aggregate `user_pet_preferences` row (pet_type x size x age_group x like/pass counts) is retained indefinitely for recommendations | Documented, no enforcement. Table comment references plan 4.2 partitioning, but no `PARTITION BY` DDL exists in any migration yet.                                         |
| Notification (read)                               | `read_at` is set                           | 90 days from `read_at`                         | Hard delete (no soft-delete on Notification)                                                                                                                       | Documented, no enforcement                                                                                                                                                 |
| EmailQueue (sent)                                 | `sent_at` is set                           | 1 year from `sent_at`                          | Hard delete. Model comment says "sent rows get hard-archived by the retention job" — that job does not exist yet                                                   | Documented, no enforcement                                                                                                                                                 |
| RefreshToken (expired or revoked)                 | `expires_at` passed or `is_revoked = true` | 30 days                                        | Hard delete via cleanup job                                                                                                                                        | Documented, no enforcement                                                                                                                                                 |
| IdempotencyKey                                    | `expires_at` (set to creation + 24h)       | 24 hours                                       | Hard delete via cleanup job. `expires_at` index exists. No job implemented                                                                                         | Documented, no enforcement                                                                                                                                                 |
| ApplicationTimeline / ApplicationStatusTransition | Record creation                            | Indefinite                                     | These are append-only audit trails; intentionally kept forever                                                                                                     | Implemented (no TTL; by design)                                                                                                                                            |
| HomeVisit                                         | `completed_at` date                        | 5 years post-completion                        | Hard delete                                                                                                                                                        | Documented, no enforcement                                                                                                                                                 |
| Report / ModeratorAction                          | Record creation                            | 7 years                                        | Hard delete                                                                                                                                                        | Documented, no enforcement                                                                                                                                                 |
| DeviceToken                                       | `last_used_at`                             | 90 days idle (last_used_at older than 90 days) | Soft-delete (`paranoid: true`), then hard delete after further grace period                                                                                        | Partially implemented: model sets `expires_at` on `beforeValidate` (iOS: 30 days, other: 90 days) and marks status as EXPIRED on `beforeSave`. No job deletes expired rows |

### Honest state summary

None of the time-based retention periods have an automated background job wired up. The `expires_at` columns exist and are indexed, which means a future cleanup job has a clear path. Until that job exists, expired rows accumulate. This is the most important gap to close before any data subject deletion request arrives.

---

## 5. User rights

Updated 2026-09-07 (ADS-1320): export and erasure both now have a self-service path in the
product. Everything else in this section (correction) still goes through the admin.

### Export / portability (Art. 15/20)

Self-service: `GET /api/v1/users/me/export` (`services/gateway/src/routes/users-export.ts`),
surfaced as "Download my data" on the client app's Profile → Settings tab
(`apps/client/src/pages/ProfilePage.tsx`). It calls the same `AuthService.ExportUserData` RPC
the admin Privacy Tools page uses (`services/gateway/src/routes/privacy.ts`), always scoped to
the caller's own `userId`, rate-limited to 5 requests/hour per user. Scope today is auth-owned
data only (profile + privacy preferences) — applications, messages, and swipe history are not
yet included in the export bundle; that cross-service aggregation is still future work. Every
export (self-service or admin) publishes an `auth.actionTaken` audit event.

Admins can still export any user's data at `GET /api/v1/privacy/admin/users/:userId/export`
(requires `admin.data.export`).

### Deletion (right to erasure, Art. 17)

Self-service: in-app `Account Settings → Delete account`, or directly
`POST /api/v1/users/me/erasure-request` (step-up re-auth; rate-limited to 5/hour) — see
`docs/legal/privacy.md` §4/§5 for the user-facing description of the saga this publishes across
every service that holds the subject's data.

Admins can additionally schedule deletion for another account at
`POST /api/v1/privacy/admin/users/:userId/delete-request` (requires `users.delete`) — an
auth-scoped deactivate-then-grace-period path, distinct from the cross-service erasure saga above.

### Correction

Users can update their own profile via the UI. For fields not exposed in the UI, admin applies a
direct update.

---

## 6. Third-party processors

| Processor                                      | Purpose                                                                                              | Personal data involved                                                                              | Configuration                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| PostgreSQL host                                | Primary data store for all application data                                                          | All PII                                                                                             | `DB_*` env vars                                                                   |
| Resend                                         | Transactional and notification email delivery                                                        | `to_email`, `to_name`, email content                                                                | `RESEND_API_KEY`, `DEFAULT_FROM_EMAIL`, `EMAIL_PROVIDER=resend` (production-only) |
| AWS S3                                         | File storage for adoption documents and pet photos, plus DB/upload backups (`scripts/snapshot-*.sh`) | File names, file content (documents may contain PII)                                                | `S3_BUCKET_NAME`, `S3_REGION`, `BACKUP_BUCKET`, `AWS_REGION`                      |
| Firebase Cloud Messaging (FCM)                 | Deliver push notifications to mobile devices                                                         | Device tokens, notification payloads                                                                | `FCM_SERVICE_ACCOUNT_JSON`, `FCM_PROJECT_ID`                                      |
| GlitchTip (self-hosted, Sentry-compatible SDK) | Error tracking and diagnostics                                                                       | Stack traces, request context; user email/username/IP are redacted before send (`redactSentryUser`) | `SENTRY_DSN` (points at our own GlitchTip instance, not the Sentry SaaS)          |
| Statsig                                        | Feature flags, product analytics, and — only after analytics consent — session replay/autocapture    | Opaque `userID` + non-PII `custom` fields always; behavioural/session data once consent is granted  | `VITE_STATSIG_CLIENT_KEY` (frontend), `STATSIG_SERVER_SECRET_KEY` (backend)       |

For processors not listed here: if you add a new integration that receives any of the field categories from section 1, update this table before merging. (Corrected 2026-09-07, ADS-1326 — see `docs/legal/cookies.md` §5 for the user-facing version of the GlitchTip/Statsig facts.)

---

## 7. Subject-access flow

Superseded 2026-09-07 (ADS-1320) by the self-service routes described in section 5 — see there
for the real export and erasure flows. The `scripts/export-user-data.ts` /
`scripts/anonymize-user.ts` admin-script flow this section used to describe never shipped;
retention periods in section 4 remain the open gap (no automated background purge job existed
for either application drafts or the email queue until ADS-1320 — see section 4's Status
column, which is being updated service-by-service as those jobs land).
