# Database Schema

Map of which service owns which Postgres schema and what tables live in each. This is an
orientation map, not a column reference. For the exact columns, types, and indexes of a live
table, run `\d+ <schema>.<table>` in `pnpm docker:shell:db`; the authoritative definition is the
creating migration, linked per table below.

## Schema ownership

Each service owns exactly one Postgres schema and migrates only that schema. There are no
cross-schema foreign keys: a service stores the other aggregate's UUID and enforces integrity
in application code.

| Service       | Schema          | Migrations                               |
| ------------- | --------------- | ---------------------------------------- |
| auth          | `auth`          | `services/auth/src/migrations/`          |
| pets          | `pets`          | `services/pets/src/migrations/`          |
| rescue        | `rescue`        | `services/rescue/src/migrations/`        |
| applications  | `applications`  | `services/applications/src/migrations/`  |
| chat          | `chat`          | `services/chat/src/migrations/`          |
| notifications | `notifications` | `services/notifications/src/migrations/` |
| moderation    | `moderation`    | `services/moderation/src/migrations/`    |
| matching      | `matching`      | `services/matching/src/migrations/`      |
| cms           | `cms`           | `services/cms/src/migrations/`           |
| audit         | `audit`         | `services/audit/src/migrations/`         |

The gateway owns no schema. Every connection's `search_path` is set to `<schema>, public` on
connect (`packages/db/src/client.ts`), so a service references its own tables unqualified and
still reaches shared extensions installed into `public`. Each schema also carries an
`event_outbox` table used by the transactional outbox (see
[`writing-migrations.md`](./writing-migrations.md) and the audit-logging skill).

## auth

RBAC, sessions, and privacy. Owns identity and every permission decision's source data.

| Table                | Purpose                                        | Created in                         |
| -------------------- | ---------------------------------------------- | ---------------------------------- |
| `users`              | Accounts, credentials, verification, 2FA state | `001_create_users.ts`              |
| `roles`              | Named roles                                    | `002_create_roles.ts`              |
| `permissions`        | Named permissions                              | `003_create_permissions.ts`        |
| `role_permissions`   | Role → permission grants                       | `004_create_role_permissions.ts`   |
| `user_roles`         | User → role assignments                        | `005_create_user_roles.ts`         |
| `refresh_tokens`     | Rotating refresh tokens (hashed)               | `006_create_refresh_tokens.ts`     |
| `revoked_tokens`     | Access-token revocation list                   | `007_create_revoked_tokens.ts`     |
| `user_privacy_prefs` | Per-user privacy preferences                   | `008_create_user_privacy_prefs.ts` |
| `field_permissions`  | Field-level read/write rules by role           | `009_create_field_permissions.ts`  |
| `ip_rules`           | IP allow/deny rules                            | `019_create_ip_rules.ts`           |
| `user_invitations`   | Pending account invitations                    | `020_create_user_invitations.ts`   |
| `consent_events`     | Append-only consent log                        | `031_create_consent_events.ts`     |
| `permission_grants`  | Direct (non-role) permission grants            | `032_create_permission_grants.ts`  |

Roles: `adopter | rescue_staff | admin | moderator | super_admin | support_agent`
(`001_create_users.ts`).

## pets

Pet listings, media, and status history.

| Table                    | Purpose                                        | Created in                             |
| ------------------------ | ---------------------------------------------- | -------------------------------------- |
| `breeds`                 | Breed reference list                           | `001_create_breeds.ts`                 |
| `pets`                   | Pet profiles (incl. a generated search vector) | `002_create_pets.ts`                   |
| `pet_media`              | Photos/media per pet                           | `003_create_pet_media.ts`              |
| `pet_status_transitions` | Append-only pet status log                     | `004_create_pet_status_transitions.ts` |
| `ratings`                | Pet ratings                                    | `005_create_ratings.ts`                |
| `user_favorites`         | Users' favourited pets                         | `006_create_user_favorites.ts`         |

## rescue

Rescue orgs, staff, foster placements, and events.

| Table                   | Purpose                               | Created in                            |
| ----------------------- | ------------------------------------- | ------------------------------------- |
| `rescues`               | Rescue organisations                  | `001_create_rescues.ts`               |
| `rescue_settings`       | Per-rescue configuration              | `002_create_rescue_settings.ts`       |
| `staff_members`         | Staff/volunteer memberships           | `003_create_staff_members.ts`         |
| `invitations`           | Staff invitations (hashed tokens)     | `004_create_invitations.ts`           |
| `foster_placements`     | Foster placements                     | `005_create_foster_placements.ts`     |
| `application_questions` | Rescue-specific application questions | `006_create_application_questions.ts` |
| `events`                | Rescue events                         | `009_create_events.ts`                |
| `event_attendees`       | Event RSVPs                           | `010_create_event_attendees.ts`       |

## applications

Adoption applications, home visits, and their timelines.

| Table                            | Purpose                                               | Created in                                     |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| `application_events`             | Append-only application event log (trigger-protected) | `001_create_application_events.ts`             |
| `applications`                   | Applications                                          | `002_create_applications.ts`                   |
| `application_status_transitions` | Status-change log                                     | `003_create_application_status_transitions.ts` |
| `home_visits`                    | Home-visit records                                    | `004_create_home_visits.ts`                    |
| `home_visit_status_transitions`  | Home-visit status log                                 | `005_create_home_visit_status_transitions.ts`  |
| `application_drafts`             | In-progress draft answers                             | `007_create_application_drafts.ts`             |
| `application_documents`          | Uploaded documents, answers, references (JSONB)       | `008_create_application_documents.ts`          |
| `application_preferences`        | Applicant preferences                                 | `012_create_application_preferences.ts`        |
| `application_reference_checks`   | Reference-check tracking                              | `013_create_application_reference_checks.ts`   |
| `application_timeline_notes`     | Staff timeline notes                                  | `014_create_application_timeline_notes.ts`     |

Application status: `DRAFT | SUBMITTED | APPROVED | REJECTED | WITHDRAWN` (`DRAFT` is the
default; `002_create_applications.ts`). `stage` is a backend column; the frontend
`ApplicationStage` is a separate UI presentation derived from it.

## chat

Conversations, messages, reactions, reads.

| Table               | Purpose                                        | Created in                        |
| ------------------- | ---------------------------------------------- | --------------------------------- |
| `chats`             | Conversations                                  | `001_create_chats.ts`             |
| `chat_participants` | Participants per chat                          | `002_create_chat_participants.ts` |
| `messages`          | Messages (full-text search vector via trigger) | `003_create_messages.ts`          |
| `message_reactions` | Emoji reactions                                | `005_create_message_reactions.ts` |
| `message_reads`     | Read receipts                                  | `006_create_message_reads.ts`     |

## notifications

In-app/email notifications, templates, device tokens.

| Table                     | Purpose                       | Created in                              |
| ------------------------- | ----------------------------- | --------------------------------------- |
| `notifications`           | In-app notifications          | `001_create_notifications.ts`           |
| `device_tokens`           | Registered push device tokens | `002_create_device_tokens.ts`           |
| `user_notification_prefs` | Per-user channel preferences  | `003_create_user_notification_prefs.ts` |
| `email_queue`             | Outbound email queue          | `004_create_email_queue.ts`             |
| `email_templates`         | Email templates (versioned)   | `005_create_email_templates.ts`         |
| `email_preferences`       | Per-user email preferences    | `006_create_email_preferences.ts`       |
| `processed_events`        | Consumer idempotency ledger   | `008_create_processed_events.ts`        |
| `scheduled_job_runs`      | Scheduled-dispatch run log    | `010_create_scheduled_job_runs.ts`      |

## moderation

Reports, moderator actions, sanctions, support tickets.

| Table                       | Purpose                     | Created in                                |
| --------------------------- | --------------------------- | ----------------------------------------- |
| `reports`                   | User/content reports        | `001_create_reports.ts`                   |
| `report_status_transitions` | Report status log           | `002_create_report_status_transitions.ts` |
| `moderator_actions`         | Actions taken by moderators | `004_create_moderator_actions.ts`         |
| `moderation_evidence`       | Attached evidence           | `005_create_moderation_evidence.ts`       |
| `user_sanctions`            | Sanctions against users     | `006_create_user_sanctions.ts`            |
| `support_tickets`           | Support tickets             | `007_create_support_tickets.ts`           |
| `support_ticket_responses`  | Ticket responses            | `008_create_support_ticket_responses.ts`  |

## matching

Swipe-style discovery and adopter match profiles.

| Table                    | Purpose                   | Created in                             |
| ------------------------ | ------------------------- | -------------------------------------- |
| `swipe_sessions`         | Discovery sessions        | `001_create_swipe_sessions.ts`         |
| `swipe_actions`          | Per-pet swipe actions     | `002_create_swipe_actions.ts`          |
| `adopter_match_profiles` | Adopter matching profiles | `003_create_adopter_match_profiles.ts` |

## cms

Editorial content and navigation.

| Table                  | Purpose          | Created in                           |
| ---------------------- | ---------------- | ------------------------------------ |
| `cms_content`          | Content entries  | `001_create_cms_content.ts`          |
| `cms_navigation_menus` | Navigation menus | `002_create_cms_navigation_menus.ts` |

## audit

Forensic event store, GDPR erasure sagas, and saved reports.

| Table                    | Purpose                          | Created in                                  |
| ------------------------ | -------------------------------- | ------------------------------------------- |
| `audit_events`           | Append-only forensic event store | `001_create_audit_events.ts`                |
| `gdpr_erasure_requests`  | GDPR erasure saga state          | `002_create_gdpr_erasure_requests.ts`       |
| `report_templates`       | Report templates                 | `003_create_reports.ts`                     |
| `saved_reports`          | Saved report definitions         | `003_create_reports.ts`                     |
| `saved_report_schedules` | Scheduled report runs            | `008_create_report_schedules_and_shares.ts` |
| `saved_report_shares`    | Report sharing grants            | `008_create_report_schedules_and_shares.ts` |

## Conventions

- Soft deletes are a plain nullable `deleted_at`; there is no ORM filter, so every read must
  exclude soft-deleted rows explicitly in its `WHERE` clause.
- Money is stored as a minor-unit integer plus a `CHAR(3)` ISO-4217 currency column (e.g.
  `adoption_fee_minor` + `adoption_fee_currency`), never a float.
- Encryption at rest covers TOTP secrets (`auth/027_encrypt_totp_secrets.ts`) and hashed auth
  tokens (`auth/024_hash_auth_tokens.ts`, `025_hash_refresh_tokens.ts`); broader PII column
  encryption is roadmap.

## Related

- [API endpoints](./api-endpoints.md)
- [Product requirements](./product-requirements.md)
- [Implementation guide](./implementation-guide.md)
- [Writing migrations](./writing-migrations.md)
