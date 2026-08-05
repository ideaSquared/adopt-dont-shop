# ADR 0008 — Pre-deploy migration strategy: gated runner, concurrent indexes, expand/contract (ADS-1044)

- Status: Proposed
- Date: 2026-08-05
- Scope: `Dockerfile.service` entrypoint, `.github/workflows/deploy.yml` + `rollback.yml`, every service's `src/migrations/*` and migration discipline

## Context

Schema migrations run **in-band on container start, once per replica**. The
production runtime image's entrypoint (`Dockerfile.service:157`) is:

```dockerfile
CMD ["sh", "-c", "if [ -f dist/db/migrate.js ]; then node dist/db/migrate.js; fi && pnpm run start"]
```

so every service container migrates its own schema before it starts serving.
(The dev stage at `Dockerfile.service:93` and `deploy.yml`'s comment describe
the same thing as `pnpm run --if-present db:migrate` — the ticket quoted that
form; the runtime image runs the compiled `dist/db/migrate.js`, but the effect
is identical.) Services are declared `restart: always` in
`docker-compose.prod.yml`, and `deploy.yml` brings the new images up with a
plain `docker compose … up -d` (`services/gateway` and each service migrate
themselves — there is no separate migrate sidecar to wait on) and then health-
checks with `scripts/wait-for-services.sh`. There is **no gated, pre-deploy
migration step**: migration and rollout are the same action.

Separately, **no migration in the repo builds an index concurrently or outside
a transaction** — a grep for `CONCURRENTLY`, `noTransaction`, and
`disableTransaction` across `services/*/src/migrations/` returns zero hits. The
early table-creation migrations build their indexes as part of `CREATE TABLE`
(empty table, cheap). But several later migrations add indexes to tables that
are already populated and hot in production, with a plain `CREATE INDEX`:

- `services/pets/src/migrations/007_pets_list_keyset_index.ts:18` —
  `pgm.createIndex('pets', …)` for the public browse keyset.
- `services/audit/src/migrations/006_add_aggregate_keyset_index.ts:12` — raw
  `CREATE INDEX audit_events_aggregate_keyset_idx …` on the append-only audit
  log.
- `services/matching/src/migrations/004_swipe_actions_user_pet_recency_idx.ts:24`
  — `pgm.createIndex('swipe_actions', …)` on the append-only swipe history.
- `services/notifications/src/migrations/009_device_token_global_unique.ts:42` —
  a **unique** `CREATE INDEX` on `device_tokens`, preceded in the _same
  migration/transaction_ by a bulk `UPDATE` that soft-deletes duplicate rows.

A plain `CREATE INDEX` takes a `SHARE` lock on the table for the whole build,
which **blocks every write** (INSERT/UPDATE/DELETE) to that table until the
index finishes; reads are unaffected. On a large, hot table the build can take
long enough to matter. Because this runs on container start, the write outage
happens **automatically during every deploy that ships such a migration**, on
whichever replica boots first. If the build (plus service start-up) overruns the
services' 60s healthcheck `start_period` (`docker-compose.prod.yml:100-104`),
the container is marked unhealthy under `restart: always` and can crash-loop —
each restart re-attempting the same long lock.

Finally, rollback is image-only. `.github/workflows/rollback.yml` re-pulls the
previous image SHA and runs `docker compose … up -d` (see the pull loop and
`up -d` in `rollback.yml`), but **never down-migrates the database**. Once a
deploy has forward-migrated the schema, rolling the images back to the prior SHA
leaves the new schema in place — so any migration must be safe for the _old_
code to run against, or rollback is not actually a recovery path.

This lands directly on top of ADS-1045 (multi-replica gateway/services rollout,
proposed as a sibling ADR): the moment there is more than one replica of a
service, "migrate on boot" means N replicas racing to run the same migrations,
and a lock-holding index build blocks writes for the whole fleet, not one box.

## Options considered

**Option A — keep migrate-on-boot, only make index builds concurrent.**
Convert the offending index migrations to `CREATE INDEX CONCURRENTLY` inside a
`pgm.noTransaction()` migration (node-pg-migrate 8.x supports both — `createIndex`
takes a `concurrently: true` option and `pgm` exposes `noTransaction()`). This
removes the write-blocking `SHARE` lock (`CONCURRENTLY` takes the weaker
`SHARE UPDATE EXCLUSIVE`, which lets writes continue).
_Tradeoff:_ smallest change, and it kills the write-outage directly. But it does
_not_ fix the structural problems — migrations still run per replica on boot
(so under ADS-1045 multiple replicas race the same DDL), a slow `CONCURRENTLY`
build can still overrun `start_period` because the service won't start serving
until migrate returns, and forward-only rollback is untouched. `CONCURRENTLY`
also cannot run in a transaction, and it can leave an **INVALID** index behind
on failure that a crash-looping boot would keep retrying.

**Option B — a discrete, health-gated pre-deploy migration job (one runner).**
Move migrations out of the per-replica boot path and run them exactly once,
before the new service replicas are cut over, from a single runner in the deploy
workflow. Services start with migrations disabled. Combined with Option A's
concurrent index builds.
_Tradeoff:_ fixes the "N replicas racing" and the "index build gates
`start_period`" problems (the migrate step is no longer on the container's
health path), and gives one obvious place to observe/fail a migration. Costs a
new step in `deploy.yml` and a way to disable on-boot migration. It still relies
on the author to write backward-compatible migrations — a gated runner run
_before_ old replicas are gone actively requires expand/contract to be correct.

**Option C — Option B plus expand/contract as policy, enforced by a CI lint.**
Everything in B, and additionally adopt **expand/contract** (a.k.a.
parallel-change) as a documented rule — every migration must leave the schema
readable and writable by the _currently deployed_ code, so old and new coexist
during rollout and image rollback stays a real recovery path — and add a small
CI lint that flags a non-concurrent / in-transaction `CREATE INDEX` on a table
that a prior migration already created (i.e. a populated table), so the class of
bug in this ticket can't silently reappear.
_Tradeoff:_ most work and introduces a lint to maintain, but it's the only
option that closes the loop: the runtime fix (B), the immediate index fix (A),
_and_ the discipline that keeps both from regressing. It composes cleanly with
ADS-1045 because expand/contract is exactly the property multi-replica,
start-first rollouts require.

## Decision

**Adopt Option C.** The evidence is that this is three coupled defects, not one:
the _mechanism_ (migrate-on-boot, per replica, on the health path), the _content_
(non-concurrent index builds on hot tables), and the _absence of a rule_ that
would have caught either (no expand/contract requirement, no lint). Fixing only
the index builds (Option A) leaves the mechanism that turns any future slow or
locking migration into a deploy-time outage, and does nothing for the
multi-replica direction of ADS-1045. Fixing only the mechanism (Option B) still
ships INVALID-index and lock risks until every author remembers `CONCURRENTLY`.

Concretely, the recommendation is:

1. **Decouple migrations from per-replica boot.** Run them once, from a single
   health-gated pre-deploy step in `deploy.yml`, before the new replicas are cut
   over. Service containers stop migrating on boot.
2. **Require `CREATE INDEX CONCURRENTLY` in a `noTransaction` migration** for any
   index added to an already-populated table. Convert the four migrations named
   above (splitting `notifications/009`'s data-fix from its index build, since
   `CONCURRENTLY` can't share a transaction with the dedupe `UPDATE`).
3. **Adopt expand/contract as policy** so old and new code coexist during
   rollout and image rollback remains valid without a DB down-migration.
4. **Add a migration lint** to CI that flags a non-concurrent index build on a
   populated table, so the regression can't reappear silently.

`Status: Proposed` — this ADR is the proposal; nothing below is applied.

## Implementation sketch

_Described, not applied._ Illustrative only.

**1. Concurrent index build (e.g. `pets/007`).** Today:

```typescript
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.createIndex('pets', [...KEYSET_COLUMNS], { name: 'pets_created_at_pet_id_keyset_idx' });
};
```

Proposed — opt the migration out of the transaction and build concurrently:

```typescript
export const up = async (pgm: MigrationBuilder): Promise<void> => {
  pgm.noTransaction(); // CONCURRENTLY cannot run inside a transaction
  pgm.createIndex('pets', [...KEYSET_COLUMNS], {
    name: 'pets_created_at_pet_id_keyset_idx',
    concurrently: true,
    ifNotExists: true, // only no-ops an already-succeeded re-run; a FAILED build's
    // INVALID leftover is dropped-and-recreated by the runner (see Risks)
  });
};
```

The same shape applies to `audit/006`, `matching/004`, and the index half of
`notifications/009`. `notifications/009` additionally needs its bulk `UPDATE`
dedupe kept transactional, so it splits into two migrations: one transactional
data-fix, then a `noTransaction` migration that builds the unique index
`CONCURRENTLY`.

**2. Pre-deploy migration runner (in `deploy.yml`, before cutover).** Replace
"every replica migrates itself on boot" with one run, then start services with
on-boot migration disabled — e.g. a build-arg / env flag consumed by the
entrypoint so `CMD` becomes `pnpm run start` only in production, and a discrete
step runs the compiled migrator once per service:

```yaml
# before `docker compose … up -d`
- name: Migrate (once, gated)
  run: |
    for svc in auth pets applications rescue chat notifications \
               moderation matching cms audit; do
      docker compose -f "$COMPOSE_FILE" run --rm \
        -e RUN_MIGRATIONS=1 "service-$svc" node dist/db/migrate.js
    done
  # fail the deploy here if any migrator exits non-zero — cutover never starts
```

Only after this step succeeds does the existing `up -d` + `wait-for-services.sh`
cutover run. The index builds are now off the container health path, so a slow
`CONCURRENTLY` build can no longer overrun `start_period`.

**3. Expand/contract checklist (docs + PR template).** A column/table change
ships across deploys, never in one:

- **Expand:** add the new column/table/index, backward-compatible, nullable or
  defaulted; deploy. Old code ignores it, new code may write it.
- **Migrate data / dual-write** if needed; deploy code that reads the new shape.
- **Contract:** only once no running code depends on the old shape, drop it in a
  _later_ deploy. Never drop-and-recreate in the same migration that new code
  needs.

**4. Migration lint (sketch).** A no-dependency `scripts/check-*.mjs` in the
existing house style that parses `services/*/src/migrations/*.ts` and fails when
a migration adds an index to a table it did not itself create (proxy for
"populated") without `concurrently: true` + `noTransaction()`:

```
for each migration file:
  createdTables = tables introduced via createTable in THIS file
  for each createIndex / `CREATE INDEX` (not `CONCURRENTLY`) on table T:
    if T not in createdTables and file does not call pgm.noTransaction():
      fail: "index on populated table T must be CONCURRENTLY in a noTransaction migration"
```

## Risks & rollout

- **INVALID indexes on failure.** A `CONCURRENTLY` build that fails (or is
  interrupted) leaves an INVALID index _of the same name_ that Postgres will not
  use and will not auto-clean. Retry-safety comes from the gated runner
  detecting this (query `pg_index.indisvalid`), `DROP INDEX`-ing the leftover,
  and only then recreating. Note `ifNotExists` does **not** make a failed
  `CONCURRENTLY` build re-run-safe: on retry it sees the same index name, no-ops,
  and the invalid index is never rebuilt — it only correctly covers the
  already-_succeeded_ re-run (a full re-apply of a migration that completed). So
  the drop-invalid-first step is load-bearing; `ifNotExists` is not a substitute
  for it. This risk is _worse_ under migrate-on-boot (a crash-loop retries
  forever), which is another reason to move to the gated runner.
- **Migration/runtime ordering during rollout.** With a pre-cutover runner the
  new schema exists _before_ new code is live, so the currently-running (old)
  code sees it first. This is only safe under expand/contract — the discipline
  isn't optional once migrations lead the rollout. A contract-phase change
  shipped too early breaks old replicas mid-deploy.
- **Composition with start-first / multi-replica deploys (ADS-1045).** A single
  gated runner is what makes start-first, multi-replica rollout safe: without
  it, each new replica races the same DDL on boot. With expand/contract, a
  start-first deploy keeps old and new replicas serving simultaneously against
  one schema, which is the whole point.
- **Forward-only rollback stays forward-only.** This ADR does _not_ add DB
  down-migration to `rollback.yml`; it makes forward-only _safe_ by requiring
  every migration to be backward-compatible so image rollback still works.
  Whether to additionally support down-migration is left open below.
- **Bootstrap / fresh environments.** Removing on-boot migration means a brand-
  new environment (and local `docker compose` up) needs the migrate step to run
  too — the runner has to be part of both the deploy path and any first-boot
  path, or a fresh DB starts unmigrated.

## Open questions for the maintainer

1. **Where should the gated runner live** — a step inside `deploy.yml` running
   `docker compose run --rm … node dist/db/migrate.js` per service, or a
   dedicated one-shot "migrate" container/job that the compose stack depends on?
   The former is least new infrastructure; the latter is reusable outside CI.
2. **Enforce expand/contract by policy or by tooling?** Is a documented rule
   plus PR-template checklist enough, or do we want the migration lint (and, if
   so, is "index on a table not created in the same file" an acceptable proxy
   for "populated table", or do we need an explicit annotation)?
3. **Forward-only, or add DB down-migration to rollback?** Do we accept
   forward-only + backward-compatible migrations as the contract (image rollback
   only), or invest in reversible down-migrations wired into `rollback.yml` for
   true schema rollback?
4. **How do we disable on-boot migration without regressing local/dev?** A
   build-arg, a runtime env flag read by the entrypoint, or a separate prod-only
   `CMD` — and how does that interact with the dev stage and fresh-DB bootstrap?
5. **What's the acceptable write-latency budget during a concurrent build?**
   `CONCURRENTLY` still does two table scans and takes `SHARE UPDATE EXCLUSIVE`
   (blocking other DDL and `VACUUM`, not writes) — do we need a maintenance
   window or off-peak gating for the largest tables (`audit_events`,
   `swipe_actions`) regardless?
