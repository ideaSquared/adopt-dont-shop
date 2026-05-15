# Per-Model Baseline Rebaseline — Design Proposal

Status: **DRAFT — design only**, no migration code is being written or run as part of this PR.
Owner: TBD (see "Decision needed").
Tracks the follow-up hinted at in `service.backend/src/migrations/00-baseline.ts` line 19.

---

## 1. Current state

### 1.1 What `00-baseline.ts` actually is

The file is small — **40 lines of code**, the body of `up()` is one statement:

```ts
await sequelize.sync();
```

It is "monolithic" not in line-count terms but in **schema-coverage** terms: that single `sync()` call creates **60 tables** (every model registered via `service.backend/src/models/index.ts`). The schema produced is whatever the model classes happen to declare *at the moment the migration runs* — not what they declared when the migration was written.

Tables created (60, derived from `tableName: '...'` in `service.backend/src/models/*.ts`):

```
addresses, application_answers, application_questions, application_references,
application_status_transitions, application_timeline, applications, audit_logs,
breeds, chat_participants, chats, cms_content, cms_navigation_menus,
device_tokens, email_preferences, email_queue, email_template_versions,
email_templates, field_permissions, file_uploads, home_visit_status_transitions,
home_visits, idempotency_keys, invitations, ip_rules, message_reactions,
message_reads, messages, moderation_evidence, moderator_actions, notifications,
permissions, pet_media, pet_status_transitions, pets, ratings, refresh_tokens,
report_shares, report_status_transitions, report_templates, reports,
rescue_settings, rescues, revoked_tokens, role_permissions, roles, saved_reports,
scheduled_reports, staff_members, support_ticket_responses, support_tickets,
swipe_actions, swipe_sessions, user_application_prefs, user_consents,
user_favorites, user_notification_prefs, user_privacy_prefs, user_roles,
user_sanctions, users
```

### 1.2 Why this is a problem

The file's own header (lines 16–20) names the issue. The concrete failure modes:

1. **Drift between baseline and post-baseline migrations.** Migrations 01–16 use explicit `queryInterface.createTable / addColumn / addIndex` calls. They were written assuming a particular baseline shape. When the baseline is `sync()` against today's models, the *baseline shape moves with the models*. A column added to a model after migration 02 was written ends up in the baseline — and migration 02's `addColumn` may then race against it (or be a no-op, or fail).
2. **Non-deterministic schema across DBs.** Two databases bootstrapped from the same `00-baseline` at different points in git history get different schemas, even though `SequelizeMeta` says the same migration ran. There is no checksum on the produced DDL.
3. **No reviewable diff.** A model edit silently changes the produced baseline schema. The PR diff shows a model edit; reviewers cannot see "this also changes what fresh DBs look like."
4. **Existing tests sidestep the baseline.** `service.backend/src/__tests__/migrations/{existing-migrations-round-trip,forward-fix-migrations}.test.ts` both use `sequelize.sync({ force: true })` instead of running `00-baseline.up`, then exercise migrations 01+ against that. That works because `sync()` is what `00-baseline` does — but it means we have *no test coverage of the baseline migration itself*, only of the post-baseline migrations.
5. **`down()` is `dropAllTables()`** (guarded out of production). A surgical rollback of the baseline is impossible — it's all-or-nothing.

### 1.3 What the post-baseline migrations look like (style reference)

Migrations 01–16 follow a stable convention:

- Default-export an object with `up(queryInterface)` and `down(queryInterface)`, OR named `export async function up/down`. (Mixed in the codebase — both forms are accepted by sequelize-cli.)
- Use `queryInterface.createTable / addColumn / addIndex / removeIndex / removeColumn / dropTable`.
- Multi-step DDL is wrapped in `runInTransaction` from `_helpers.ts`.
- Index ops on hot tables use `createIndexConcurrently` (outside the transaction — Postgres requires this).
- Down migrations drop in reverse order, including dependent ENUM types via `dropEnumTypeIfExists`.
- Header comment cites the audit ticket (e.g. `ADS-444`).

---

## 2. Proposed split

### 2.1 Naming convention

Keep `00-baseline.ts` as the **historical artefact** so DBs that have already run it stay valid. Introduce a sibling family numbered `00a`, `00b`, … `00z` (or `000`, `001`, …) so that:

- They sort *between* `00-baseline.ts` and `01-create-revoked-tokens.ts` in sequelize-cli's lexicographic ordering.
- Each is a single `createTable` (plus its FK-free indexes) for one model.
- Cross-table FKs are added in a final `00-baseline-999-foreign-keys.ts` so per-model files are independently reorderable without dependency cycles.

Example naming (proposal — exact prefix to be confirmed by maintainer):

```
00-baseline.ts                          (UNCHANGED — kept for SequelizeMeta history)
00a-baseline-users.ts
00b-baseline-rescues.ts
00c-baseline-rescue-settings.ts
00d-baseline-staff-members.ts
00e-baseline-pets.ts
00f-baseline-pet-media.ts
00g-baseline-breeds.ts
00h-baseline-applications.ts
00i-baseline-application-answers.ts
00j-baseline-application-questions.ts
... (one file per model, ~60 files total)
00-baseline-999-foreign-keys.ts           (cross-table FKs + composite indexes)
01-create-revoked-tokens.ts             (UNCHANGED — already covered by 00a-... if we keep it; see §2.3)
```

### 2.2 Table-to-file inventory (rough grouping)

Group by domain so a reviewer can map a model PR to the right baseline file:

| Domain               | Tables                                                                                                                                                    | Suggested files               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Identity & auth      | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`, `revoked_tokens`, `ip_rules`, `field_permissions`, `staff_members`, `invitations` | `00a–00k`                     |
| Rescue org           | `rescues`, `rescue_settings`, `addresses`, `ratings`                                                                                                      | `00l–00o`                     |
| Pets                 | `pets`, `pet_media`, `pet_status_transitions`, `breeds`                                                                                                   | `00p–00s`                     |
| Applications         | `applications`, `application_answers`, `application_questions`, `application_references`, `application_status_transitions`, `application_timeline`, `user_application_prefs`, `home_visits`, `home_visit_status_transitions` | `00t–00ab`                    |
| Communications       | `chats`, `chat_participants`, `messages`, `message_reactions`, `message_reads`, `file_uploads`, `notifications`, `device_tokens`                          | `00ac–00aj`                   |
| Email pipeline       | `email_templates`, `email_template_versions`, `email_queue`, `email_preferences`                                                                          | `00ak–00an`                   |
| Moderation & reports | `reports`, `report_status_transitions`, `report_templates`, `report_shares`, `saved_reports`, `scheduled_reports`, `moderator_actions`, `moderation_evidence`, `user_sanctions`, `support_tickets`, `support_ticket_responses` | `00ao–00ay`                   |
| Discovery            | `swipe_actions`, `swipe_sessions`, `user_favorites`                                                                                                       | `00az–00bb`                   |
| Consent & prefs      | `user_consents`, `user_notification_prefs`, `user_privacy_prefs`                                                                                          | `00bc–00be`                   |
| Platform             | `audit_logs`, `idempotency_keys`, `cms_content`, `cms_navigation_menus`                                                                                   | `00bf–00bi`                   |
| Cross-table FKs      | (no new tables, only constraints)                                                                                                                         | `00-baseline-999-foreign-keys`  |

**60 tables → ~60 per-model files + 1 FK file.** Final naming/ordering should be decided when the work is scheduled — the table above is illustrative, not prescriptive.

### 2.3 Source-of-truth for each per-model file

Two options, with tradeoffs:

| Option | How                                                                                                                                                | Pro                                                                                                | Con                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **A**  | Hand-write the `createTable` body from each model definition, freezing the column set as of the rebaseline date.                                   | Reviewable diff. Schema is now decoupled from the model — model edits will require a real migration. | Tedious; ~60 files. Risk of human error in transcription. Forces every future model edit to ship a migration. |
| **B**  | Generate by running `sequelize.sync()` in a clean DB, then dumping per-table DDL via `pg_dump --schema-only --table=...`, then translating to TS.  | Faster. Output matches what `sync()` actually produces today.                                      | Easy to ship the dump unchanged and re-introduce the same drift. Requires careful reviewer attention.        |

Recommendation: **Option A**, accepting the cost. The whole point of the rebaseline is to break the implicit coupling; Option B partially defeats it.

---

## 3. Migration of existing databases

This is the highest-risk part of the proposal. Existing prod/staging/dev DBs already ran `00-baseline` and have its row in `SequelizeMeta`. They must NOT re-run any of the new `00a..00zz` files (those would all fail with "relation already exists").

### 3.1 SequelizeMeta primer

`sequelize-cli` tracks applied migrations in a single table:

```sql
CREATE TABLE "SequelizeMeta" (
  name VARCHAR(255) NOT NULL PRIMARY KEY
);
```

Each successful `db:migrate` inserts the migration filename. `db:migrate` skips any filename already present.

Confirmed by code search: the application code does not reference `SequelizeMeta` directly anywhere in `service.backend/src` — it is entirely managed by `sequelize-cli`. Good: we can safely write to it from a one-off script without conflicting with runtime behaviour.

### 3.2 Approach: pre-seed `SequelizeMeta` on existing DBs

For any DB where `SequelizeMeta` already contains `'00-baseline.ts'` (or `.js` for prod's `dist/`), insert the filenames of all new per-model baselines so the migration runner skips them:

```sql
INSERT INTO "SequelizeMeta" (name) VALUES
  ('00a-baseline-users.ts'),
  ('00b-baseline-rescues.ts'),
  -- ... one per new file ...
  ('00-baseline-999-foreign-keys.ts')
ON CONFLICT (name) DO NOTHING;
```

This must run **before** the rebaseline PR's `db:migrate` is invoked on that DB. Two delivery options:

| Delivery                                                | Pro                                                                                                       | Con                                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Standalone script** `scripts/rebaseline-seed-meta.ts` | Explicit. Operator runs it once during the maintenance window. Easy to dry-run.                            | Requires the maintenance-window playbook to remember to run it, in the right order.                                  |
| **Bootstrap migration** `00aa-rebaseline-bootstrap.ts`  | Atomic with the rest of `db:migrate`. Cannot be forgotten.                                                | The bootstrap migration's own `up()` must check whether `00-baseline` is in `SequelizeMeta` and only INSERT the rest if so. The check itself is data-dependent and feels wrong inside a migration. Also: this migration would precede the per-model files, so if it fails half-way the DB is in a weird state. |

Recommendation: **standalone script + dry-run mode**, gated behind a confirmation flag, run by a human during the maintenance window. Capture stdout to the deployment log.

### 3.3 Dialect detection: fresh DB vs. existing DB

`SequelizeMeta` may not exist on a brand-new DB at all. Three cases to handle in the script:

1. **No `SequelizeMeta` table** → fresh DB. Do nothing; let `db:migrate` create the table and run *all* migrations including the new per-model ones (they will succeed because no tables exist).
2. **`SequelizeMeta` exists AND contains `00-baseline.ts`** → existing DB. Pre-seed the per-model rows so they are skipped.
3. **`SequelizeMeta` exists but does NOT contain `00-baseline.ts`** → unexpected state. Fail loudly. Operator must investigate before proceeding.

### 3.4 Verification step

After the migration runs on an existing DB, verify:

```sql
-- Every new per-model baseline must be marked as applied
SELECT COUNT(*) FROM "SequelizeMeta" WHERE name LIKE '00%-baseline%';
-- Expected: 1 (00-baseline) + N (per-model) + 1 (foreign-keys) = N+2
```

And run a schema-equivalence check against a freshly-bootstrapped DB at the same git SHA (e.g. `pg_dump --schema-only` of both, normalised, then `diff`). If they differ, the per-model files do not faithfully reproduce what `sync()` produced and we have a drift problem to fix before declaring success.

This check is automated as a CI gate — see [`schema-equivalence-runbook.md`](./schema-equivalence-runbook.md). It runs on every PR that touches `service.backend/src/migrations/**` or `service.backend/src/models/**`, fails on any drift, and uploads both raw + normalised `pg_dump` outputs as workflow artefacts for offline inspection.

---

## 4. Risk register

| #   | Risk                                                                                                                            | Severity | Mitigation                                                                                                                                                               | Owner             |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| R1  | **Schema drift between hand-written per-model files and current `sync()` output** — silent column type / nullability mismatches | High     | Schema-equivalence check (§3.4) gates merge. Add CI job that bootstraps both ways and `diff`s the dumped schema. Block merge on diff.                                    | Backend lead      |
| R2  | **Production downtime during `SequelizeMeta` pre-seed + migrate window**                                                        | High     | Pre-seed is INSERT-only and ms-fast. The actual `db:migrate` after pre-seed is a no-op for `00*-baseline*` rows. Schedule inside an existing maintenance window; do not invent a new outage just for this. | SRE / on-call     |
| R3  | **Rollback ambiguity** — `down()` for the new per-model files would `DROP TABLE` and erase production data                      | High     | Mirror the existing `00-baseline.down` guard: refuse to run any per-model `down()` in production. Use `assertDestructiveDownAcknowledged` from `_helpers.ts` with a per-file key. Operators rollback by restoring from backup, not by `db:migrate:undo`. | Backend lead      |
| R4  | **Partial-failure recovery mid-rebaseline-PR-deploy** — pre-seed succeeds, then `db:migrate` aborts on an unrelated migration, leaving SequelizeMeta with phantom entries for files that were never executed | Medium   | Pre-seed is *idempotent* (the rows describe DDL that already exists in the DB). A subsequent re-run of `db:migrate` will skip them — the desired outcome. Document this explicitly in the runbook. | SRE               |
| R5  | **Dev-DB vs. prod-DB skew** — long-lived dev DBs may have ad-hoc schema mods (extra columns, missing indexes) that diverge from the sync() output | Medium   | Recommend `npm run docker:reset` for dev DBs as part of the upgrade. For dev DBs that must be preserved, ship a `scripts/rebaseline-diff.ts` that prints the schema diff so the developer can decide. | Each developer    |
| R6  | **Hidden coupling — model side-effects at import time**: the current baseline imports `../models/index` to register tables. Per-model files will not. Anything that quietly relied on full-model import during `db:migrate` (associations, hooks) breaks silently. | Medium   | Audit `models/index.ts` for top-level side effects. Confirm no model-init code reaches the DB. Keep `import '../models/index'` in the FK file `00-baseline-999-foreign-keys.ts` as a belt-and-braces defence. | Backend lead      |
| R7  | **Sequelize-cli filename ordering bug** — `00aa` < `01` lexicographically, but if anyone uses `sequelize-cli` with the wrong sort order the new files run *after* `01-...`, which expects them to exist | Medium   | Verify the sort ordering with a test: list `migrations/` files in Node's `Array.prototype.sort()` order and assert `00*` precedes `01*`. Pin the sequelize-cli version in package.json. | Backend lead      |
| R8  | **Increased PR review surface** — ~60 new files in one PR, each individually trivial but collectively unreviewable                | Low      | Land per-domain (auth, rescues, pets, …) — one PR per domain group from §2.2, with the `00aa-rebaseline-bootstrap` arriving in the *last* PR so the SequelizeMeta pre-seed lists the complete set. | Backend lead      |
| R9  | **CI test pollution** — existing migration round-trip tests use `sync({ force: true })`. After the rebaseline they should arguably load the baseline migrations instead, otherwise the tests still don't cover the new files. | Low      | Out of scope for the rebaseline itself; track a follow-up to migrate the migration tests to load `00*-baseline*` files explicitly. | Backend lead      |

---

## 5. Open questions

These cannot be answered from the code alone:

1. **What is the current production database's `SequelizeMeta` content?** Specifically: is the row literally `'00-baseline.ts'` or `'00-baseline.js'` (production `.sequelizerc` switches `migrations-path` to `dist/` based on `NODE_ENV`)? The pre-seed script must use the matching extension.
2. **Are there any ad-hoc schema modifications in prod** that don't correspond to a migration? (e.g. an emergency index added by hand by an SRE.) The schema-equivalence check will surface them, but we need to know in advance whether to expect any.
3. **Who owns the migration runner in production?** Is `db:migrate` invoked by a deploy job, by a human in a release ticket, or by a Kubernetes init container? The maintenance-window plan depends on this.
4. **When is the next planned maintenance window?** The work is non-emergency and should slot into an existing window rather than create one.
5. **Is there appetite for Option A (hand-written) vs. Option B (pg_dump-derived) per §2.3?** Affects estimated effort by a factor of ~3.
6. **Are there any model classes that produce DDL Sequelize cannot represent natively?** For example, the `audit_logs` immutability trigger added in migration 11 — should the equivalent live inside the `00-baseline-audit-logs.ts` file, or stay in a separate post-baseline migration? Mixing the two confuses the "baseline = exactly what sync() produces" invariant.
7. **Do we want to take the opportunity to drop unused tables / columns?** Strong recommendation: NO. Keep the rebaseline scope to "freeze what exists today." Cleanups belong in their own migrations.

---

## 6. Decision needed

Before any rebaseline implementation work starts, a human needs to confirm:

- [ ] Go / no-go on the per-model split as described.
- [ ] Naming convention: `00a/00b/...` lexicographic prefix, OR alternative (e.g. `00-baseline-001-users.ts`)?
- [ ] Source-of-truth: hand-write (Option A) or pg_dump-derived (Option B)?
- [ ] Pre-seed delivery: standalone script (recommended) or bootstrap migration?
- [ ] Per-PR landing strategy: one big PR (~60 files) or per-domain PRs (~9 PRs)?
- [ ] Maintenance window date and operator owner.
- [ ] Whether the scope expands to migrating the existing migration tests off `sync({ force: true })` (R9) or stays out-of-scope.
- [ ] Whether any of the open questions in §5 require investigation (e.g. a dump of production `SequelizeMeta`) before sign-off.

Sign-off on these decisions unblocks the implementation PRs.
