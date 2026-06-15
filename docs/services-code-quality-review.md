# Services Code-Quality Review

Deep audit of all 11 backend microservices in `services/*`, covering four
dimensions — **security & authz**, **correctness & data**, **testing**, and
**maintainability** — against the repo conventions (`service-bootstrap`,
`events` publish-after-commit, `authz`, `config-secrets`, audit discipline)
and `.claude/CLAUDE.md`.

Each service was audited in isolation; genuine findings were fixed in place
with tests, and larger structural items were deferred to the backlog below.
Because the service test suites mock `pg`, every database-facing fix was
independently verified against the actual migration schema and the `HEAD`
source (not just by a green test run).

## Executive summary

| Service | Headline fixes | Result |
|---|---|---|
| auth | Login user-enumeration timing oracle; JWT algorithm pinning (HS256) | ✅ green |
| applications | GDPR erasure hit non-existent columns/table → would throw at runtime | ✅ green |
| notifications | GDPR `email_queue` not erased (PII); invitee email logged; unsafe casts | ✅ green |
| pets | Orphan-pet authz hole (any permission-holder could mutate) | ✅ green |
| rescue | Rescue rejection persisted with no failure reason | ✅ green |
| moderation | Duplicate auto-reports on event redelivery (no idempotency arbiter) | ✅ green |
| gateway | Internal 5xx error details leaked to clients | ✅ green |
| chat | GDPR erasure left soft-deleted message PII; participants delete would throw | ✅ green |
| matching | endSession guard simplified; GDPR erasure had no tests | ✅ green |
| cms | Event idempotency keys collided → publish/unpublish silently dropped | ✅ green |
| audit | No changes — service audited and found sound | ✅ green |

**Verification:** `pnpm exec turbo lint type-check test --filter='./services/*'`
→ 42/42 tasks pass (lint + type-check + test for all 11 services).

**No shared-package bugs were found** — `service-bootstrap`, `events`,
`authz`, `db`, `config-secrets`, `proto`, and `observability` all behaved as
their consumers rely on.

## Cross-cutting themes

1. **GDPR erasure was the highest-risk area.** Three services had erasure
   defects that mocked tests could not catch: `applications` and `chat`
   referenced columns/tables that don't exist (runtime throw → erasure
   fails), and `notifications` + `chat` left PII behind (queued emails,
   already-soft-deleted messages). All fixed.
2. **Event idempotency-key discipline.** `moderation` lacked an `ON CONFLICT`
   arbiter (duplicate auto-reports on JetStream redelivery) and `cms` reused
   one dedup key across publish/unpublish/archive (broker dropped
   transitions). Both fixed; a few non-deterministic *update* event ids are
   deferred (low impact).
3. **Authz scope edges.** `pets` orphan records bypassed rescue scope;
   `gateway` leaked internal error detail. Fixed. A couple of
   defense-in-depth / super_admin-consistency items are deferred for product
   sign-off.

## Per-service detail

### auth
- **Fixed (Medium, security):** unknown-email login now runs a dummy bcrypt
  compare so response latency no longer reveals registered emails.
- **Fixed (Medium, security):** JWT signing pinned to HS256 on sign *and*
  verify (rejects algorithm-substitution); tests added.
- **Deferred:** unify `refresh_tokens` revocation columns (`revoked_at` vs
  `is_revoked`) so logout/rotation reflect in ListSessions and RevokeSession
  blocks refresh (ADS-801 — cross-handler contract); login lockout policy
  (`locked_until`) — intentionally a later auth-policy module.

### applications
- **Fixed (High, GDPR/correctness):** erasure UPDATE referenced non-existent
  `answers`/`references` columns and a non-existent `applications.documents`
  table — a real erase would throw. Now scrubs the JSONB `documents` blob the
  projector writes (`{answers, references}`) and deletes from
  `application_documents`. Guarded `removeDocument` against empty id.

### notifications
- **Fixed (High, GDPR):** erasure now hard-deletes the user's `email_queue`
  rows (recipient address + rendered body are PII).
- **Fixed (Medium, security):** stopped logging the invitee email on
  `rescue.staffInvited`.
- **Fixed (Medium, maintainability):** removed unsafe `Promise` type
  assertions in the email worker and scheduler.

### pets
- **Fixed (High, authz):** `deletePet`/`updatePet` gated orphan pets (no
  `rescue_id`) via `requirePermission(..., undefined)`, which skips the scope
  check and admits any permission-holder — contradicting the documented
  "super_admin only" intent. Introduced `isPermittedRescueMutation` to gate
  the orphan case on the `super_admin` role; test added.
- **Deferred:** `pets.updated` event id embeds `Date.now()` (non-deterministic
  idempotency key) — switch to a version key if its consumer needs dedupe.

### rescue
- **Fixed (Medium, correctness):** `verifyRescue` accepted a `→ rejected`
  transition with no `failureReason`, persisting NULL and losing the audit
  record; now rejected with `INVALID_ARGUMENT` before any write.
- **Fixed (Low, testing):** added cross-rescue `endFosterPlacement` denial test.
- **Deferred:** deterministic event ids for `rescue.updated`/`statusChanged`
  (needs `version` surfaced); invitation dedupe policy; `is_verified`
  consistency between the self vs explicit-`rescueId` list paths.

### moderation
- **Fixed (High, correctness):** `fileReport` had no `ON CONFLICT`, so
  JetStream redelivery minted duplicate auto-reports. Added migration 009
  (partial unique index scoped to the SYSTEM reporter) and an `ON CONFLICT`
  targeting it; human reports unaffected. Removed two redundant casts.
- **Deferred:** content-scanner uses substring match, not `\b` word
  boundaries (documented seed scanner to be replaced); `ADMIN_DASHBOARD`
  placeholder permission pending a `MODERATION_*` namespace in lib.types.

### gateway
- **Fixed (High, security):** `handleGrpcError` forwarded upstream gRPC
  `details`/`message` on 5xx, leaking stack/DB/connection-string fragments to
  clients. Now returns a generic message for 5xx while preserving 4xx
  validation text; leakage-path tests added.
- **Deferred:** body-supplied `userId`/`adopterId` forwarding to downstream
  (defense-in-depth — the BFF delegates authz to downstream services via the
  signed principal token; gateway-side equality enforcement would be a
  cross-service contract change). Recommend confirming downstream enforces
  principal-subject equality.

### chat
- **Fixed (High, GDPR):** message scrub was guarded by `deleted_at IS NULL`,
  so a user's own previously soft-deleted messages kept their content (PII).
  Now scrubs every authored message idempotently (`content <> '[erased]'`,
  `COALESCE(deleted_at, now())`).
- **Fixed (High, GDPR):** `chat_participants` were deleted by a non-existent
  `user_id` column (actual column `participant_id`) — would throw. Corrected.
- **Added:** 11 tests (participant gating, permission-denied, message length,
  reaction idempotency, GDPR).
- **Deferred:** `openChat` inserts a null-UUID `rescue_id` placeholder
  (TODO) — rescue-scoped search can't match gRPC-created chats until the
  gateway translator resolves the real `rescue_id` (cross-service).

### matching
- **Fixed (Low, maintainability):** simplified a convoluted `endSession`
  ownership guard (dead `!hasPermission(...) === false` term) to the flat,
  fail-closed shape `recordSwipe` uses; behaviour-preserving
  (`ensureSwipePermission` runs first).
- **Fixed (Medium, testing):** added GDPR erasure tests (previously none).
- **Deferred:** re-swipe idempotency — `swipe_actions` has no unique
  constraint / `ON CONFLICT`, so re-swiping double-counts; needs a migration
  plus a product decision (append-only log vs dedupe). Schema-prefix
  consistency in `gdpr/erase.ts` / `profile-stats-handlers.ts` if
  `MATCHING_SCHEMA` is overridden.

### audit
- **No changes.** The append-only store was verified genuinely immutable
  (row-level `BEFORE UPDATE OR DELETE` trigger), inserts idempotent
  (`ON CONFLICT (event_id) DO NOTHING`), keyset cursor stable, GDPR sweep
  reconciliation sound. Candidates were intentional design or speculative
  hardening; per CLAUDE.md (no gold-plating) nothing was changed.
- **Deferred:** route `reports-handlers` authz through `requirePermission`
  for super_admin-bypass consistency; decide whether
  `getGdprErasureRequest` should return `NOT_FOUND` (vs `PERMISSION_DENIED`)
  to a non-admin non-owner to avoid an existence-leak. Both need product
  sign-off (they change access semantics / test contracts).

### cms
- **Fixed (High, correctness):** every `publish()` used the bare aggregate id
  as the JetStream dedup key, so publish/unpublish/archive of the same
  content shared one key and the broker dropped all but the first within the
  dedup window. Keys now namespaced by event type (with a timestamp suffix
  for repeatable update/restore, matching pets/rescue).
- **Fixed (Medium, maintainability):** removed 6 unsafe row-cast assertions by
  typing the query generic.
- **Added:** 9 tests (anonymous published-only reads, admin permission
  gating, slug collision/validation). 40 → 49.
- **Deferred:** CMS publish/unpublish/archive has no transition validation or
  transition log (contrast `pets`); needs product input on legal transitions.

## Deferred backlog (needs product/architecture decision)

| Service | Item | Why deferred |
|---|---|---|
| auth | Unify `refresh_tokens` revocation model (ADS-801) | Cross-handler contract change |
| auth | Login lockout (`locked_until`) | Later auth-policy module |
| pets / rescue / cms | Deterministic ids for `*.updated`/`statusChanged` events | Needs version surfaced; low impact |
| rescue | Invitation dedupe; `is_verified` list consistency | Product policy |
| gateway | Gateway-side principal==subject enforcement | BFF delegates authz downstream |
| chat | Real `rescue_id` on `openChat` | Needs proto field / gateway translator |
| matching | Re-swipe idempotency | Migration + append-vs-dedupe decision |
| moderation | `MODERATION_*` permission namespace; regex content scanner | Cross-package; scanner to be replaced |
| audit | reports-handlers super_admin consistency; GDPR existence-leak | Changes access semantics |
| cms | Publish/archive transition state machine | Product intent for legal transitions |

## Second pass

A follow-up sweep (each service re-audited independently) surfaced **five
new genuine defects** not covered by the first pass — all fixed in place
with tests.

| Service | New fix | Severity |
|---|---|---|
| gateway | `PUBLIC_PATH_PREFIXES` used `/api/auth/*` but the auth routes are registered at `/api/v1/auth/*`, so the check never matched. A public auth route hit WITH an expired bearer token (e.g. a token client's stale access token on a `refresh-token` call) 401'd before the handler → session-refresh lockout. Corrected the prefixes; fixed the test that shared the typo. | High |
| moderation | `getSupportTicket` returned moderator-only internal notes (`is_internal`) to a non-admin ticket owner — the post side already blocks non-admins, so the read was an info leak. Non-admins now get `is_internal = false` only. | High |
| moderation | `fileReport` re-published `moderation.reportFiled` on every JetStream redelivery with a fresh event id (defeating broker dedup) and a throwaway `reportId` not matching the persisted row. `RETURNING (xmax = 0)` now skips the publish on the `ON CONFLICT` no-op and keys the event by the persisted `report_id`. | High |
| rescue | `listFosterPlacements` with no `rescue_id` fell back to an unscoped `hasPermission` check and a query with no `rescue_id` predicate, so any `rescue_staff` with `foster.read` could list across all rescues. Non-super_admins now pinned to their own verified rescue (mirrors `listStaffMembers`). | High |
| chat | `isParticipantOrAdmin` checks only membership, so `sendMessage`/`react` still mutated chats the read side excludes as soft-deleted or non-active. Added `ensureChatWritable` to block new content on `deleted`/`locked`/`archived` chats (reads + reaction-removal stay allowed). | Medium |
| notifications | `createNotification` published only `{ notificationId, userId, type, channel }`, but the push worker renders the device notification from the event payload — so every push had the default title and an empty body. Payload now carries `title`/`message`/`dataJson`. | High |

**Independently fixed on `main` (not duplicated here):** the applications
GDPR event-stream redaction was the same defect this pass found, but `main`
landed a more correct version (it bypasses the `application_events`
append-only trigger via the `applications.allow_event_mutation` GUC, which
a plain `UPDATE` cannot) — so this pass defers to it. `main` also closed
several first-pass deferred items: auth login throttle (progressive
soft-lock), matching anonymous-session swipe erasure, rescue email-keyed
pending-invitation erasure, and moderation `reporter_id` nullability.

### Deferred from the second pass (need product/architecture decision)

| Service | Item | Why deferred |
|---|---|---|
| auth | `resetPassword`/`changePassword` don't revoke existing sessions | Overlaps the deferred ADS-801 revocation-model rework |
| auth | `RevokeSession` sets `is_revoked` but refresh checks `revoked_at` → a revoked session can still refresh | Confirmed live impact of the already-deferred ADS-801 split |
| notifications | No reaper for orphaned `sending` email rows after a crash; provider-success-then-DB-failure can double-send | Needs a stale-claim timeout + a provider idempotency token |
| matching | `getMatchProfile`/`upsertMatchProfile` have no permission gate (self-scoped, not IDOR) | Adding a gate changes access semantics |
| moderation | `SYSTEM_USER_ID` string-interpolated into the `ON CONFLICT … WHERE` predicate | Safe today (hard-coded constant; index predicates can't be parameterised) — latent smell only |

## Deferred backlog — resolved (follow-up PR, per product decision)

After review of the deferred items, the following were actioned:

| Service | Resolution | Decision |
|---|---|---|
| auth | The ADS-801 revocation-column split was already unified on `main` (refresh + ListSessions both honour `revoked_at` AND `is_revoked`). Added the remaining piece: **password reset and change now revoke all of the user's refresh tokens** inside the password-update transaction. Access tokens are short-lived JWTs that can't be refreshed once the session is gone. | Full fix |
| matching | `getMatchProfile`/`upsertMatchProfile` now **gate on `pets.read`** (matching the sibling swipe handlers). | Gate on pets.read |
| matching | Re-swipes are kept as an **append-only log, deduplicated at read time**: `getSessionStats` now collapses to the latest action per pet (DISTINCT ON), matching the user-level stats which already did so. No schema change. | Append-only log |
| notifications | The stale-`sending` reaper was already on `main` (`claimDueEmails` reclaims orphaned rows). Added the second half: the Resend provider now sends a **stable `Idempotency-Key`** (row `idempotency_key`, falling back to the immutable `email_id`) so a retry after a post-send bookkeeping failure can't double-deliver. | Both |

Login lockout and rescue invitation dedupe (also on the original deferred list)
were independently resolved on `main` (login throttle + invitation pending
unique index).
