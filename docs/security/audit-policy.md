# Dependency audit policy

> Tracked in [ADS-903](https://linear.app/ideasquared/issue/ADS-903).

## Severity levels

| Severity | Behaviour |
|----------|-----------|
| **critical / high** | **Blocks the job.** The `Audit all workspaces — gate (high+)` step in `.github/workflows/security.yml` runs `pnpm audit --audit-level high` and fails CI until the vulnerability is resolved. |
| **moderate** | Advisory only. Appears in the job summary; does not block merges. |
| **low** | Advisory only. Appears in the job summary; does not block merges. |

## Where to see audit output

Every CI run writes a formatted audit report to the **GitHub Actions job summary** (the `Audit all workspaces — advisory summary` step). Open the workflow run, expand the `Dependency Audit` job, and click the "Summary" tab — no log drill-down required.

## Outdated dependencies

`pnpm outdated -r` runs on every PR and push to `main`/`develop`. Output is written to the job summary of the `Quality / Dependency Check` job. Outdated packages are **never blocking** — they are surfaced for awareness and addressed by Renovate PRs.

## Responding to a blocking vulnerability

1. Check whether a patched version is available: `pnpm audit --audit-level high`.
2. If a patch exists, update the affected package (Renovate will typically raise this automatically; you can also run `pnpm up <package>`).
3. If no patch exists yet, evaluate whether the vulnerable code path is reachable in this project. If not reachable, add a temporary `pnpm.auditConfig.ignoreCves` entry in `package.json` with a comment referencing the CVE and a review date.
4. Never permanently suppress a high/critical CVE without a tracked issue and a deadline.

## Scheduled scans

`security.yml` also runs on a weekly schedule (`0 6 * * 1`, Mondays at 06:00 UTC) to catch newly disclosed CVEs between PRs.
