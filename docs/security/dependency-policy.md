# Dependency update & vulnerability policy

Two separate CI workflows watch the dependency graph. Each has a different
job: one blocks merges on real risk, the other surfaces staleness without
blocking anything.

## Blocking: `security.yml` (Dependency Audit)

`node scripts/audit-bulk.mjs` runs on every push/PR touching a workspace
package plus a weekly scheduled run. **`high` and `critical` severity
vulnerabilities fail the job** — no `continue-on-error`. A red
`security-audit` check must be resolved (patch, upgrade, or an explicit
accepted-risk note in the PR) before merge.

`low` and `moderate` findings do not fail the job. They are still written to
the run's job summary (`GITHUB_STEP_SUMMARY`) so they're visible on the
workflow run page for anyone who looks.

> **Why not `pnpm audit`?** npm retired the quick-audit endpoint `pnpm audit`
> calls (it now returns HTTP 410), so the command fails on every run
> regardless of the dependency tree. `scripts/audit-bulk.mjs` queries npm's
> supported *bulk advisory* endpoint directly against the versions resolved in
> `pnpm-lock.yaml` — same npm advisory data, same `high`/`critical` gate.

## Advisory: `quality.yml` (Dependency Check)

`pnpm outdated -r` never fails the job. Falling behind on non-security
version bumps is a maintenance cost, not an incident, and Renovate already
opens PRs for routine updates (see [CONTRIBUTING.md](../../CONTRIBUTING.md#dependency-updates)).
Its output is written to the run's job summary (`GITHUB_STEP_SUMMARY`) so
it's visible on the workflow run page without needing to expand a log —
before ADS-903 this ran with a silent `continue-on-error: true` and nobody
looked at it.

`pnpm list -r --depth 0` (duplicate-dependency check) is similarly advisory
and non-blocking.

## Why the split

Treating "outdated" and "vulnerable" as the same signal either makes CI too
noisy to trust (blocking on routine minor bumps) or too quiet to act on
(everything green regardless of a real CVE). Splitting them means:

- A red check always means something a reviewer must act on.
- Staleness is visible without being a merge gate — Renovate's automerge for
  minor/patch devDependencies (`renovate.json`) keeps most of it moving
  without human intervention anyway.
