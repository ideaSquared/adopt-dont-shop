# Restore Drill Log

The append-only record of quarterly disaster-recovery restore drills. Each drill
proves the full restore path end-to-end against **staging** and captures the
measured RTO, so the backup policy stays honest. Cadence and rationale live in
[snapshot-policy.md](./snapshot-policy.md); the step-by-step drill procedure is
[the quarterly restore drill in db-backup-runbook.md](../db-backup-runbook.md#quarterly-restore-drill-staging).

## Log

Append a row after every drill (newest at the bottom). The RTO column is the
restore wall-clock time — compare it to the **2h** RTO target in the
[db-backup-runbook](../db-backup-runbook.md).

| Date                                                                 | Snapshot S3 key | Environment | Wall-clock RTO | Errors | Operator |
| -------------------------------------------------------------------- | --------------- | ----------- | -------------- | ------ | -------- |
| _No drills recorded yet — first due by end of 2026-Q4 (2026-12-31)._ |                 | staging     |                |        |          |

## How to add a row

1. Run the [quarterly restore drill](../db-backup-runbook.md#quarterly-restore-drill-staging)
   against staging.
2. Fill one row above with: the date, the production snapshot S3 key you
   restored, the environment (`staging`), the measured restore wall-clock time
   (your RTO), any errors + how you remediated them, and your name.
3. A drill that fails to complete cleanly is itself the highest-priority finding
   — record it, then fix the failure before the next scheduled migration.
