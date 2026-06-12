# Dependency Updates — Renovate [ADS-706]

Automated dependency updates are managed by [Renovate](https://docs.renovatebot.com/),
configured via `renovate.json` at the repo root. The config extends
`config:recommended` and runs on the `schedule:earlyMondays` schedule so PRs
land in a predictable window. Semantic-commit messages use the `chore` type
across all updates so they stay out of the release notes.

## How updates are grouped

To avoid PR fatigue across this monorepo, related packages are grouped into
single PRs:

- **`devDependencies (non-major)`** — all minor/patch dev-dep updates batched.
- **`typescript-eslint`** — `@typescript-eslint/*` packages move together.
- **`vitest`** — `vitest` and `@vitest/*` packages move together.
- **`react`** — `react`, `react-dom`, and their `@types/*` packages move together.

## Automerge & limits

Minor/patch updates to `devDependencies` automerge (squash) once CI is green;
all other updates require manual review. Renovate is capped at **5 concurrent
PRs** and **2 PRs per hour** to keep CI load predictable. `lockFileMaintenance`
runs weekly (before 6am Monday) to refresh `pnpm-lock.yaml`. GitHub Actions
are pinned to commit SHAs (`pinDigests`), and vulnerability alerts are labelled
`security` + `DevEx` with elevated priority and never automerge.

The Renovate Dependency Dashboard issue tracks pending and rate-limited
updates — check it if you expect a PR that hasn't appeared.
