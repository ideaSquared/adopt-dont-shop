# ADR 0007 — Postgres backups, PITR & restore verification (ADS-1043)

- Status: Partially implemented (2026-08-28). Phase 1 restore verification
  shipped (ADS-1240, `.github/workflows/backup-restore-drill.yml`). Outstanding:
  pgBackRest WAL/PITR, enforced S3 retention/Object Lock.
- Date: 2026-08-05
- Scope: `scripts/snapshot-postgres.sh`, `.github/workflows/backup.yml`,
  `docs/operations/snapshot-policy.md`, production S3 backup bucket — the
  Postgres backup, retention, and restore-verification pipeline
- Linear: ADS-1043
- Supersedes / Superseded by: —

## Context

Production Postgres is protected by a single logical dump. `.github/workflows/backup.yml:17`
runs `scripts/snapshot-postgres.sh` on a `cron: '0 2 * * *'` schedule (daily at
02:00 UTC), and the script takes one `pg_dump --serializable-deferrable`
(`scripts/snapshot-postgres.sh:33`), gzips it, and uploads it to S3. There is no
WAL archiving and no continuous archiving of any kind, so the recovery point is
whatever the last nightly dump captured — an RPO of **up to ~24 hours**. The
`snapshot-policy.md` doc already acknowledges this: "Daily at 02:00 UTC, hourly
WAL is out of scope (see ADS-443 for streaming replication / PITR design)"
(`docs/operations/snapshot-policy.md:33`).

Three gaps make the current posture weaker than "daily logical dump" already
implies:

1. **Restore is never proven.** The only restorability signal in the pipeline is
   a size check — `if [[ "$DUMP_BYTES" -lt 1024 ]]` (`scripts/snapshot-postgres.sh:37`)
   fails the run when the dump is suspiciously small. A dump that is large but
   corrupt, truncated mid-stream, or missing objects passes. Nothing ever loads
   a backup back into a database, so we have no evidence any snapshot is
   restorable until the day we need one.

2. **Retention enforcement is unverified and immutability is absent.** The upload
   sets `--metadata "Class=tier1,Retention=30d"` (`scripts/snapshot-postgres.sh:46`),
   which is S3 **user-metadata** — a descriptive tag, not a lifecycle rule and not
   Object Lock; the policy doc itself notes lifecycle rules "cannot filter by
   user-metadata, so the metadata is descriptive only"
   (`docs/operations/snapshot-policy.md:27`). The docs then disagree on whether
   real enforcement exists behind that tag: `db-backup-runbook.md:52,58` asserts
   the S3 bucket's lifecycle rule sets the 30-day off-site retention "**not** the
   script", yet `snapshot-policy.md:27-28` treats that same lifecycle pruning as
   something that "must be configured on the `postgres/` prefix" (aspirational).
   Crucially, there is **no lifecycle, versioning, or Object Lock configuration
   anywhere in the repository** to verify either claim. So retention enforcement is
   unverified — a doc-vs-reality gap — and immutability is definitively absent:
   nothing in the repo prevents a snapshot from being deleted or overwritten (by an
   attacker or an errant `aws s3 rm`), and Object Lock would require bucket
   versioning that no committed config enables.

3. **The drill log the policy mandates is missing — and the docs disagree on its
   cadence.** `snapshot-policy.md:84` requires a restore drill and says "Track
   outcomes in `docs/operations/restore-drills.md`". That file **does not exist**
   in the repository — there is no evidence any restore drill has ever been
   recorded. The two docs also disagree on how often to drill:
   `snapshot-policy.md:83` mandates a **monthly** drill, while
   `db-backup-runbook.md:54,199` mandates a **quarterly** one — a mismatch Phase 1
   must reconcile when it stands the log up. A restore runbook exists
   (`docs/operations/restore.md`) but, per point 1, its happy path has never been
   exercised end-to-end in an automated or logged way.

Net: backups are logical-only, unverified, retention is unenforced, and there is
no PITR. This ADR proposes the target design; it makes no code or config change.

### Relationship to ADS-443

`snapshot-policy.md:33` defers PITR / streaming replication to **ADS-443**. The
fix direction for ADS-1043 (restore-provability, retention enforcement) partly
overlaps ADS-443 (WAL archiving → PITR), because the same backup tool naturally
provides both. This ADR treats the two as one workstream: the restore-verification
and retention pieces (ADS-1043) can ship independently and first, and the
WAL/PITR piece is the same pgBackRest adoption ADS-443 describes. If this ADR is
accepted, ADS-443 becomes the implementation ticket for the PITR phase rather than
a separate "out of scope" design — the maintainer should confirm which ticket
owns which phase (see Open questions).

## Options considered

### Option A — Keep `pg_dump`, add automated restore verification only

Leave the nightly logical dump as-is, but add a CI job that pulls the latest
dump, restores it into a throwaway Postgres, and asserts row counts / a schema
diff. Add an S3 lifecycle rule + Object Lock and start the drill log.

- **Pro:** Smallest change; no new backup tooling or WAL storage; directly closes
  the "restore never proven" and "retention unverified / not immutable" gaps that
  are the core of ADS-1043.
- **Con:** Does nothing for RPO — still up to ~24h of data loss on a failure at
  01:59 UTC. Logical restore RTO on a large DB is slow (single-threaded replay of
  a SQL stream). PITR remains impossible.

### Option B — Adopt pgBackRest (WAL archiving + base backups → PITR)

Replace/augment the dump with pgBackRest: periodic base backups plus continuous
WAL archiving to S3, giving point-in-time recovery. Keep an automated
restore-verification job on top, plus lifecycle + Object Lock.

- **Pro:** RPO drops from ~24h to the WAL archive interval (minutes). Supports
  PITR to any point in the retention window. Parallel restore, incremental/
  differential backups, built-in `pgbackrest verify`, first-class S3 + retention
  support. Self-hosted-friendly (we run Postgres in a container on Hetzner per
  `backup.yml`).
- **Con:** New operational surface (a `pgbackrest` sidecar/cron, `archive_command`
  on the primary, a repo bucket). WAL storage grows continuously and needs
  monitoring. Requires `archive_mode = on` and a Postgres restart to enable.

### Option C — Adopt wal-g

Same PITR shape as B (base backups + WAL push to S3) via wal-g instead of
pgBackRest.

- **Pro:** Similar PITR capability; single Go binary, simple config; strong S3
  support.
- **Con:** Thinner operational tooling than pgBackRest (less mature `verify`,
  weaker built-in retention/differential story); smaller institutional knowledge.
  No decisive advantage over B for our footprint.

### Option D — Migrate to managed Postgres with built-in PITR

Move production Postgres off the self-hosted container to a managed provider
(RDS, Cloud SQL, Crunchy, etc.) and rely on the provider's automated backups +
PITR.

- **Pro:** PITR, retention, and restore tooling become the provider's problem;
  least backup code to own long-term.
- **Con:** Large infra/cost change well beyond ADS-1043's scope; the stack is
  currently self-hosted on Hetzner with PostGIS. Migration is its own project and
  does not close today's gap on the current DB in a reasonable timeframe. Still
  warrants an independent restore-verification drill regardless of provider
  claims.

## Decision

**Adopt Option B (pgBackRest) as the target, delivered in phases, with Option A's
restore-verification job shipped first.**

Rationale:

- The two most urgent, cheapest-to-fix findings in ADS-1043 are "restore never
  proven" and "retention unverified / not immutable". Both are addressable
  **without** changing the backup tool, so an automated restore-verification CI job + S3 lifecycle/Object
  Lock + a drill log should land first (Phase 1) and immediately raise
  confidence.
- The remaining finding — ~24h RPO and no PITR — genuinely needs continuous WAL
  archiving. pgBackRest is preferred over wal-g (Option C) for its mature
  `verify`, retention (`repo-retention-full` / `-diff`), and parallelism, and
  over managed Postgres (Option D) because it fits the current self-hosted
  Hetzner + container + PostGIS setup and can be delivered incrementally rather
  than as a migration project.
- This aligns ADS-1043 and ADS-443: Phase 1 satisfies ADS-1043's core; Phase 2
  (pgBackRest WAL/PITR) is the ADS-443 design, now with a concrete tool choice.

Explicitly out of scope for this ADR: choosing managed vs self-hosted long-term
(Option D remains a valid future direction, tracked separately if pursued).

## Implementation sketch

_Described, not applied. Nothing below is committed by this PR._

### Phase 1 — restore verification, retention enforcement, drill log (ADS-1043 core)

**1. Automated restore-verification CI job.** A scheduled workflow that, after
the nightly snapshot, restores the latest dump into a disposable Postgres and
asserts it loaded. Outline:

```yaml
# .github/workflows/backup-verify.yml (illustrative)
name: Backup verify
on:
  schedule:
    - cron: '30 3 * * *' # after the 02:00 snapshot has uploaded
  workflow_dispatch: {}
jobs:
  restore-latest:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_PASSWORD: verify }
        ports: ['5432:5432']
    steps:
      - name: Fetch newest dump from S3
        run: |
          KEY="$(aws s3 ls "s3://$BACKUP_BUCKET/postgres/" --recursive \
            | sort | tail -n1 | awk '{print $4}')"
          aws s3 cp "s3://$BACKUP_BUCKET/$KEY" dump.sql.gz
      - name: Restore into throwaway DB
        run: gunzip -c dump.sql.gz | psql "$VERIFY_DSN"
      - name: Assert schema + row counts
        run: |
          # fail if core tables are absent or empty
          psql "$VERIFY_DSN" -v ON_ERROR_STOP=1 -c \
            "SELECT count(*) FROM auth.users;" # ...per-schema sentinels
          # optional: diff information_schema against a checked-in baseline
```

The assertion step is the point: it proves the dump **restores** and lands a
non-empty, schema-correct database — replacing the `-lt 1024` byte heuristic at
`scripts/snapshot-postgres.sh:37` as the real restorability signal. A failed run
pages whoever owns backups.

**2. S3 lifecycle + Object Lock + versioning.** Replace the cosmetic
`Retention=30d` metadata (`scripts/snapshot-postgres.sh:46`) with enforced
controls on the `postgres/` prefix:

```json
// S3 lifecycle rule (illustrative) — actually prunes at 30d
{
  "Rules": [
    {
      "ID": "postgres-snapshots-30d",
      "Filter": { "Prefix": "postgres/" },
      "Status": "Enabled",
      "Expiration": { "Days": 30 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
    }
  ]
}
```

Object Lock (compliance or governance mode) requires **bucket versioning
enabled** and must be set at/near bucket creation; new snapshot objects then
carry a retention date that blocks deletion/overwrite for the window:

```
# bucket: versioning + default Object Lock retention
Versioning:        Enabled
ObjectLockEnabled: true
DefaultRetention:  { Mode: GOVERNANCE, Days: 30 }   # or COMPLIANCE if immutable
```

The metadata tag can stay as a human-readable label, but retention is now
enforced by the lifecycle rule + lock, not implied by a string.

**3. Restore-drill log.** Create the file the policy already references
(`docs/operations/snapshot-policy.md:84`), `docs/operations/restore-drills.md`,
as a running table (date, operator, backup key restored, target env, row-count /
schema-diff result, RTO observed, notes). The Phase 1 CI job can append or a
scheduled manual drill can, but the log must exist and be linked from the docs
index. Standing the log up also forces reconciling the monthly
(`snapshot-policy.md:83`) vs quarterly (`db-backup-runbook.md:54,199`) cadence
mismatch — pick one cadence and correct whichever doc is wrong.

### Phase 2 — pgBackRest WAL archiving + base backups → PITR (ADS-443)

On the primary, enable archiving and point it at pgBackRest:

```ini
# postgresql.conf (illustrative)
archive_mode = on
archive_command = 'pgbackrest --stanza=prod archive-push %p'
```

```ini
# /etc/pgbackrest/pgbackrest.conf (illustrative)
[global]
repo1-type = s3
repo1-s3-bucket = adopt-dont-shop-prod-backups
repo1-s3-region = eu-west-2
repo1-path = /pgbackrest
repo1-retention-full = 4          # keep N full backups
repo1-retention-diff = 14
repo1-cipher-type = aes-256-cbc

[prod]
pg1-path = /var/lib/postgresql/data
```

Base backups via cron (e.g. weekly full + daily diff), continuous WAL push via
`archive_command`. Restore/PITR then becomes
`pgbackrest --stanza=prod --type=time --target="..." restore`, and the Phase 1
verification job can additionally run `pgbackrest verify` and periodically
exercise a real PITR restore to a throwaway instance.

## Risks & rollout

- **Phased rollout.** Phase 1 is additive and low-risk — a new verify workflow, a
  bucket lifecycle/lock change, and a docs file. It touches no write path on the
  primary and can ship and prove value before Phase 2. Phase 2 changes primary
  Postgres config (`archive_mode = on` needs a restart) and should land in a
  maintenance window after rehearsal on staging.
- **WAL storage growth.** Continuous WAL archiving grows the repo bucket
  unboundedly without retention; `repo-retention-*` plus lifecycle rules must be
  set from day one, and archive volume/latency monitored (a stuck
  `archive_command` can back up WAL on the primary and eventually stall writes).
- **Object Lock is hard to undo.** COMPLIANCE mode cannot be shortened or removed
  even by root for the retention window — pick GOVERNANCE unless true immutability
  is required, and choose the window deliberately (Open questions).
- **Cost.** Object Lock + versioning retain more objects (each snapshot version
  kept for the window) and WAL archiving adds continuous PUTs and storage — a
  real but modest S3 bill increase that should be estimated before enabling.
- **Testing the restore path is the whole point.** The verify job must fail loudly
  and be watched; a green-but-not-actually-asserting job would recreate today's
  false confidence. Assertions should check real row counts / schema, not just
  "psql exited 0".

## Open questions for the maintainer

1. **Managed vs self-hosted Postgres?** Is a managed provider with built-in PITR
   (Option D) on the roadmap, or do we commit to self-hosted + pgBackRest? This
   decides whether Phase 2 is worth building.
2. **Target RPO and RTO?** What data-loss window is acceptable (drives whether ~24h
   is tolerable short-term and the WAL push interval), and what restore time must
   we meet (drives base-backup cadence and parallelism)?
3. **Object Lock retention window and mode?** How many days, and GOVERNANCE
   (overridable by privileged roles) vs COMPLIANCE (truly immutable)? This is
   effectively irreversible for the chosen window.
4. **Ticket ownership between ADS-1043 and ADS-443.** Does ADS-1043 own Phase 1
   (verify + retention + drills) and ADS-443 own Phase 2 (pgBackRest PITR), or
   should they be merged? `snapshot-policy.md:33` currently frames PITR as
   ADS-443's job.
5. **Who owns restore drills going forward** — and should the monthly drill be
   fully automated by the Phase 1 CI job, or remain a human-run exercise that the
   log records?
