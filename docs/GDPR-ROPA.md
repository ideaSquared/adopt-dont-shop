# Record of Processing Activities (GDPR Art. 30)

**Controller:** Adopt Don't Shop
**Last reviewed:** 2026-05-08
**Owner:** Engineering — see `CODEOWNERS`

This document is the controller-side record required by Article 30(1) of the
UK GDPR / EU GDPR. It must be reviewed at least annually and whenever a new
processing activity is added (new feature touching personal data, new third
party, new lawful basis).

The companion user-facing notice lives in `docs/PRIVACY.md`. If you change a
field's purpose / retention here, update PRIVACY.md too.

---

## 1. Account management

| | |
|---|---|
| Purpose | Create and authenticate user accounts; deliver core service |
| Lawful basis | Art. 6(1)(b) — performance of a contract |
| Categories of subjects | Adopters, rescue staff, admins, moderators |
| Categories of data | Name, email, hashed password, phone, date of birth, address, profile image, IP, device tokens |
| Source tables | `users`, `refresh_tokens`, `revoked_tokens`, `device_tokens` |
| Recipients | None outside the controller (no data sharing for this purpose) |
| International transfers | None |
| Retention | Active life of account + 30 days post-deactivation. Anonymisation on erasure request (`gdpr.service.anonymizeUser`). Audit / log retention covered separately below. |
| Security measures | bcrypt password hashing; 2FA secrets encrypted at rest; refresh tokens hashed; row-level RBAC; field-level masking via `lib.permissions` |

## 2. Adoption applications

| | |
|---|---|
| Purpose | Process applications for pet adoption on behalf of rescues |
| Lawful basis | Art. 6(1)(b) (adopter↔rescue contract) and Art. 6(1)(f) (legitimate interest of the rescue in evaluating suitability) |
| Categories of subjects | Adopters and the references they nominate |
| Categories of data | Application answers (free-text and structured), home circumstances, references' name + contact, status transitions |
| Source tables | `applications`, `application_answers`, `application_references`, `application_status_transitions`, `application_timeline`, `home_visits` |
| Recipients | The rescue the application is submitted to |
| International transfers | None |
| Retention | 6 years post-decision (UK statute of limitations for contractual claims). Status transitions retained for the same period. References notified of contact at point of nomination. |
| Security measures | RBAC scoped to rescue; references' contact details masked from non-rescue users via `field_permissions` |

## 3. Messaging between adopters and rescues

| | |
|---|---|
| Purpose | Direct communication between adopter and rescue staff |
| Lawful basis | Art. 6(1)(b) |
| Categories of subjects | Adopters, rescue staff |
| Categories of data | Message content (free text, attachments), delivery / read state |
| Source tables | `chats`, `chat_participants`, `messages`, `message_reactions`, `message_reads`, `file_uploads` |
| Recipients | Other participants in the chat thread |
| International transfers | None |
| Retention | Lifetime of the related application + 6 years (tied to the application above). On erasure: message bodies replaced with tombstone (`[message removed at user request]`), participant rows preserved for thread continuity. |
| Security measures | Participant-only read access; content moderation via `service.backend/services/content-moderation.service` |

## 4. Support tickets

| | |
|---|---|
| Purpose | Respond to user-reported issues |
| Lawful basis | Art. 6(1)(b) and Art. 6(1)(f) |
| Categories of subjects | Reporters and any users named in a ticket |
| Categories of data | Free-text descriptions, screenshots, ticket metadata |
| Source tables | `support_tickets`, `support_ticket_responses` |
| Recipients | Internal support / moderation staff |
| International transfers | None |
| Retention | 2 years from ticket close |
| Security measures | RBAC; only assigned agent + the user can read |

## 5. Content moderation and trust & safety

| | |
|---|---|
| Purpose | Investigate user reports and enforce platform rules |
| Lawful basis | Art. 6(1)(f) — legitimate interest in safe service |
| Categories of subjects | Reported users, reporters, witnesses |
| Categories of data | Report content, evidence (screenshots, message snapshots), moderator actions, sanctions |
| Source tables | `reports`, `report_status_transitions`, `moderator_actions`, `moderation_evidence`, `user_sanctions` |
| Recipients | Moderation team; law enforcement on lawful request |
| International transfers | None |
| Retention | 7 years (regulatory / dispute window). Survives erasure of the reported user — `created_by` / target columns become NULL but the case record is preserved. |
| Security measures | Restricted to MODERATOR/ADMIN; immutable `moderation_evidence` rows |

## 6. Marketing communications

| | |
|---|---|
| Purpose | Adoption suggestions, newsletters, transactional-adjacent emails |
| Lawful basis | Art. 6(1)(a) — consent (Art. 7) |
| Categories of subjects | Adopters who have opted in |
| Categories of data | Email, name, preference flags, send history |
| Source tables | `email_preferences`, `user_consents` (purpose `marketing_email`), `email_queue`, `notifications` |
| Recipients | Email service provider (see Sub-processors) |
| International transfers | Per provider — see Sub-processors |
| Retention | Until consent is withdrawn. Withdrawal takes effect on next batch (≤24h). Consent history retained for 7 years (audit). |
| Security measures | Append-only `user_consents` log; one-click unsubscribe token per email |

## 7. Analytics and product improvement

| | |
|---|---|
| Purpose | Aggregate usage analytics; product KPIs |
| Lawful basis | Art. 6(1)(a) — consent for non-essential analytics |
| Categories of subjects | All users who have granted consent |
| Categories of data | Page views, swipe actions, feature usage, coarse location |
| Source tables | `swipe_actions`, `swipe_sessions`, `audit_logs` (read-only roll-ups) |
| Recipients | Internal analytics only |
| International transfers | None |
| Retention | Raw events 13 months; aggregates indefinite |
| Security measures | Pseudonymised at query time where reports leave the platform |

## 8. Audit and security logging

| | |
|---|---|
| Purpose | Detect abuse, prove compliance, debug incidents |
| Lawful basis | Art. 6(1)(c) — legal obligation; Art. 6(1)(f) — legitimate interest |
| Categories of subjects | All users (passive) |
| Categories of data | User ID (FK), action, IP, user-agent, request metadata. **Never raw PII payloads** — log field names + record IDs, not values. |
| Source tables | `audit_logs`, `revoked_tokens`, `ip_rules` |
| Recipients | Internal security team |
| International transfers | None |
| Retention | 2 years rolling. Survives user erasure (FK is `constraints: false` for this reason). |
| Security measures | Append-only; admin-only read access; IP addresses hashed after 90 days (TODO) |

## 9. Consent records

| | |
|---|---|
| Purpose | Demonstrate compliance with Art. 7 (consent) |
| Lawful basis | Art. 6(1)(c) — legal obligation to keep these records |
| Categories of data | User ID, purpose, granted/withdrawn, policy version, source, IP at time of action |
| Source tables | `user_consents` |
| Retention | 7 years from last activity |
| Security measures | Append-only (no UPDATE / DELETE allowed in service code) |

---

## Data-subject rights — implementation map

| Right (Article) | Implementation |
|---|---|
| Access (15) | `GET /api/v1/gdpr/me/export` — JSON dump of all user-linked records |
| Rectification (16) | `PUT /api/v1/users/profile` and per-domain endpoints |
| Erasure (17) | `POST /api/v1/gdpr/me/erase` → `gdpr.service.anonymizeUser`. Soft-deletes the User row, tombstones identifiers, drops tokens / favourites / pending notifications, scrubs message bodies. Records subject to retention (applications, audit, moderation) are kept with the user row tombstoned. |
| Restriction (18) | Account deactivation via `users.service.deactivateUser` |
| Portability (20) | Same endpoint as Access — JSON output is machine-readable |
| Objection (21) | Withdraw consent via `POST /api/v1/gdpr/me/consents` with `granted: false` |
| Automated decisions (22) | Not applicable — no fully automated decisions affecting users |

## Sub-processors

To be filled in as integrations are added. Required fields per processor:
name, purpose, location, transfer mechanism (SCCs / adequacy), DPA link.

- **Email delivery:** _TBD — populate when provider is finalised_
- **SMS delivery:** _TBD_
- **File storage:** _TBD_

## Review log

| Date | Reviewer | Notes |
|---|---|---|
| 2026-05-08 | Engineering | Initial ROPA created alongside `lib.gdpr` service |
