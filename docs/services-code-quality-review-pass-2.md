# Services Code-Quality Review — Pass 2

A second, deeper sweep of all 11 backend services (pass 1 is merged in #1038),
plus several maintainer-approved decisions implemented. Pass 2 targeted what a
first pass misses: concurrency/transaction safety, crash recovery, query
performance & missing indexes, access-control edges, and GDPR-erasure
correctness.

As in pass 1, every database-facing fix was **independently verified against
the real migration schema and `HEAD`**, not just by a green run — the service
suites mock `pg`, so wrong column/table names and `NOT NULL` violations pass
unit tests but throw in production. Several sub-agents also misattributed their
own changes (claiming work was "pre-existing" or the "baseline was red"); every
committed diff was reviewed directly rather than trusted from the agent's
summary.

## Verification
`pnpm exec turbo lint type-check test --filter='./services/*'` → **42/42 tasks
pass** (lint + type-check + test for all 11 services). **No shared-package code
was modified** (findings there are handed off below).

## Per-service fixes (one commit each)

| Service | Pass-2 fixes |
|---|---|
| **auth** | ADS-801 resolved: split-brain token revocation (a revoked session kept minting tokens), broken rotation-family chain, privilege-persistence after deactivation; missing verify/reset token indexes (migrations 012/013). **Plus** progressive login soft-lock (decision). |
| **gateway** | Broken access control — a `rescue_staff` user could read another rescue's dashboard via `?rescueId=`; circuit breaker tripped on benign client-fault codes (NOT_FOUND/UNAUTHENTICATED). |
| **applications** | GDPR erasure left PII in the append-only **event stream** (Get/List fold it, so it resurfaced); event idempotency-key collisions (`${aggregateId}:${version}`). |
| **notifications** | Emails orphaned in `sending` by a crashed worker were never reclaimed; reclaim with retry budget/dead-letter + partial index (migration 007); quiet-hours `HH:MM:SS` boundary. |
| **pets** | Deterministic `pets.updated` event id; negative-limit → INVALID_ARGUMENT; composite keyset index (migration 007). |
| **rescue** | Invitation dedupe — re-invite refreshes the pending row via a partial unique index (migration 007) instead of duplicating (decision); deterministic event ids. |
| **matching** | `Recommend` never excluded already-swiped pets (deps unused) — now excludes dedupe-safely; stats `COUNT(*)` double-counted re-swipes (DISTINCT ON latest); GDPR missed anonymous-session swipes; composite index (migration 004). Append-only history preserved (decision). |
| **moderation** | Content scanner upgraded to word-boundary matching + per-term severity (decision); GDPR erase set `reporter_id = NULL` on a NOT NULL column → threw; made nullable (migration 010). |
| **chat** | Reaction emoji length bound → INVALID_ARGUMENT (was a Postgres 22001 surfaced as INTERNAL). |
| **cms** | Status transition state machine with `FOR UPDATE` validation (decision); GDPR erase set `author_id = NULL` on a NOT NULL column → threw; made nullable (migration 003). |
| **audit** | `completed_at` counted all completion keys, not just `EXPECTED_SERVICES`, risking premature GDPR completion; existence-leak → `NOT_FOUND` (decision); reports super_admin consistency via `requirePermission` (decision). |

## Cross-cutting themes
1. **GDPR erasure remained the highest-risk area.** Pass 2 found four more
   runtime erasure bugs mocked tests can't catch: `NOT NULL` columns set to
   `NULL` (moderation `reporter_id`, cms `author_id`) that throw and tear down
   the saga; PII left in the applications event stream; and anonymous-session
   swipes missed in matching.
2. **Token/session security depth** — the ADS-801 revocation split-brain let a
   revoked session keep minting tokens; resolved with dual-write reconciliation,
   family inheritance, an atomic rotation gate (also reuse detection), and an
   active-user re-check.
3. **Access control & crash recovery** — gateway cross-rescue read; the
   notifications email worker's stuck-`sending` gap.
4. **Performance** — added the keyset/composite indexes the hot read paths
   actually need (pets, rescue, matching).

## Handoff — follow-up PRs (cross-package; each needs a decision)

These were investigated and deliberately **not** forced into this PR: each
crosses a shared-package/proto/RBAC boundary with cross-service blast radius and
an open decision. Recommended as separate focused PRs.

### A. GDPR erasure of email-keyed rows (`packages/events` + gateway)
`GdprErasureRequestedPayload` carries only `userId`. Email-keyed rows with no
`user_id` (e.g. rescue pending invitations) therefore can't be erased — a PII
residue. **Decision:** the gateway publisher has `userId` but not the email, so
closing this means the gateway looks up the email (auth gRPC) and adds an
optional `email` to the payload — which broadcasts that PII on the NATS event.
Recommend doing it (erasure completeness outweighs the scoped PII spread), but
it's a contract + privacy call.

### B. chat `rescueId` on `openChat` (`packages/proto` + gateway + chat)
`openChat` inserts a null-UUID `rescue_id` placeholder, so rescue-scoped chat
search never matches gRPC-created chats. **Approved direction:** add `rescueId`
to `OpenChatRequest` and have the gateway populate it from the application
context. Requires `buf generate` codegen (committed output + CI freshness gate)
+ gateway wiring + chat persistence.

### C. `MODERATION_*` permission namespace (`lib.types` + authz seed + moderation)
Every moderator-only handler gates on the `ADMIN_DASHBOARD` placeholder, which
conflates "view admin dashboard" with "take moderation action" and makes a
"reporters see only their own reports" path impossible. **Decision needed:** the
exact permission set (e.g. `MODERATION_VIEW` / `MODERATION_ACT`) **and** a
seed/migration granting them to the admin/moderator roles — without the seed,
switching the gate would deny all moderators. Recommend a dedicated RBAC PR.
