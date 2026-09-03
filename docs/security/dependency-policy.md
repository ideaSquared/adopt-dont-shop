# Dependency update & vulnerability policy

How CI treats dependency risk vs. staleness, and how Renovate keeps updates
moving. Audience: anyone triaging a red dependency check or an update PR.

`Last reviewed: 2026-09-03`

Three CI surfaces watch the dependency graph. Two block merges on real risk
(one on the npm advisory data, one on the built image), and one surfaces
staleness without blocking anything.

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
> supported _bulk advisory_ endpoint directly against the versions resolved in
> `pnpm-lock.yaml` — same npm advisory data, same `high`/`critical` gate.

## Blocking: `docker.yml` (Trivy image scan)

`docker.yml` builds each service's production image on every PR and push, then
runs the Trivy scanner against it (`aquasec/trivy image --severity CRITICAL,HIGH
--exit-code 1`, ADS-833). A `CRITICAL` or `HIGH` finding in the built image
fails the job. This catches vulnerabilities in the OS base layer and any
transitive dependency that `audit-bulk.mjs` (which reads `pnpm-lock.yaml`) does
not surface.

**Sync invariant — `.trivyignore` ↔ `scripts/audit-bulk.mjs`.** Both scanners
carry an exemption list, and they must agree: an advisory that is un-actionable
in the npm-audit gate (no reachable patched version) is equally un-actionable in
the image scan. When you add or remove an exemption in one, do the same in the
other in the same PR. Both files carry a comment stating this; keep them in sync.
Today both lists are empty.

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

## Renovate

`renovate.json` configures the routine-update bot:

- Runs on the `schedule:earlyMondays` schedule with a 3-day `minimumReleaseAge`
  (skip a release that was just yanked), capped at 5 concurrent / 2 hourly PRs.
- Groups related updates into single PRs (non-major devDependencies,
  `typescript-eslint`, Vitest, the React types + `react`/`react-dom` — the last
  also updates the matching `pnpm.overrides` pins via a custom manager).
- **Automerges** minor/patch devDependency updates once CI is green; everything
  else opens a PR for human review.

Renovate handles staleness; it does not decide vulnerability policy — a CVE is
gated by the two blocking surfaces above, not by waiting for a Renovate PR.
