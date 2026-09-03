# CI/CD Workflows

Reference for the GitHub Actions workflows in this directory: what each one does, which checks gate merge, and how deploys are triggered.

## Workflow Files

| File                       | Purpose                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                   | Main CI pipeline: workspace-drift and drift guards, change detection, frontend / library / package / service tests, Pact contract tests, dev-auth guard, Playwright E2E. |
| `onboarding-smoke.yml`     | Nightly, manual, and on changes to onboarding-critical files: exercises the documented `pnpm bootstrap` path on a clean checkout (ADS-951 / ADS-1110).                   |
| `quality.yml`              | Advisory dependency health — `pnpm outdated -r` and `pnpm list -r --depth 0` (both `continue-on-error`).                                                                 |
| `security.yml`             | Dependency vulnerability audit via `node scripts/audit-bulk.mjs`, plus a weekly scheduled scan.                                                                          |
| `codeql.yml`               | GitHub CodeQL static analysis for JavaScript / TypeScript (ADS-498).                                                                                                     |
| `docker.yml`               | Builds the gateway / service and per-app Docker images, then tests the docker-compose stack.                                                                             |
| `lib-test-guard.yml`       | Fails when any `lib.*` package has zero test files (ADS-186 / ADS-328 safety net).                                                                                       |
| `schema-equivalence.yml`   | Bootstraps DB-A (migrate) and DB-B (sync), diffs normalised `pg_dump` to detect schema drift.                                                                            |
| `deploy.yml`               | Manual deploy to staging or production via GHCR + SSH.                                                                                                                   |
| `rollback.yml`             | Manual rollback to a previously published GHCR image SHA.                                                                                                                |
| `release.yml`              | Builds and pushes production Docker images (gateway + 10 services + 3 apps) to Docker Hub on tag pushes (`v*`) and successful CI runs to `main`.                         |
| `release-please.yml`       | Generates release PRs, version tags, and GitHub Releases with changelogs from conventional commits.                                                                      |
| `storybook.yml`            | Builds and deploys `lib.components` Storybook to GitHub Pages.                                                                                                           |
| `labeler.yml`              | Auto-labels pull requests using `.github/labeler.yml` rules.                                                                                                             |
| `sync-labels.yml`          | Syncs `.github/labels.yml` to the repository's label set on changes to `main`.                                                                                           |
| `backup.yml`               | Nightly Postgres snapshot + uploads sync to S3 (ADS-811 / ADS-1239).                                                                                                     |
| `backup-restore-drill.yml` | Automated restore-verification drill against the latest backup (ADS-1240 / ADR 0007).                                                                                    |
| `dependency-graph.yml`     | Publishes `docs/dependency-graph.html` and the per-`lib.*` consumer docs on push to `main` (ADS-957).                                                                    |
| `docs-freshness.yml`       | Nightly docs-freshness report — broken internal links and docs untouched for 12+ months (ADS-954).                                                                       |
| `stale-overrides.yml`      | Weekly advisory report for `pnpm.overrides` pins whose upstream has moved past the pinned range (ADS-1234 / ADS-1112).                                                   |

## Workflow Overview

### CI Workflow (`ci.yml`)

Main continuous integration pipeline, runs on every push and pull request to `main` / `develop`.

The `ci-required` aggregator job fans in eleven jobs (`workspace-drift`, `commit-lint`, `changes`, `build-libs`, `test-frontend`, `test-libs`, `test-packages`, `test-services`, `test-contracts`, `dev-auth-guard`, `test-e2e`) and is the single required status check for branch protection — see [Branch Protection](#branch-protection). The per-job breakdown lives in [CONTRIBUTING.md → Full CI matrix](../../CONTRIBUTING.md#before-opening-a-pr).

**E2E strategy** (ADS-386 / ADS-419):

E2E is **opt-in on pull requests** — the full docker-stack build plus Playwright
run is too slow to pay on every push during development. The `test-e2e` job runs
the full Playwright suite when:

- **Push to main**: the integration gate before `deploy.yml`.
- **PR labelled `run-e2e`**: opt in when the branch is ready. Adding the label
  re-triggers CI (the `pull_request: labeled` event), so no extra push is needed.
- **Manual dispatch** (`workflow_dispatch`).

On any other PR `test-e2e` is **skipped**, which the `ci-required` aggregator
treats as success — so E2E never blocks an in-progress PR. A separate advisory
`test-e2e-smoke` job runs the `@smoke` critical-path subset automatically on PRs
touching app/service code (unless labelled `run-e2e`); it is not in
`ci-required`'s needs, so it never blocks merge. Run `pnpm test:e2e:smoke`
locally for the same subset.

**Coverage & timing report (ADS-947)**: after `test-frontend`/`test-libs`/`test-services` finish, the `coverage-report` job posts a single sticky comment on the PR with per-package coverage delta vs `main` (only packages whose coverage changed) and this run's job timings — see `.github/actions/coverage-report`. It's purely informational (`continue-on-error: true`, not in `ci-required`'s needs) and degrades gracefully on forks, where the default `GITHUB_TOKEN` is read-only.

### Security Workflow (`security.yml`)

A single `dependency-audit` job that runs `node scripts/audit-bulk.mjs`. `pnpm audit` itself is unusable here — it calls npm's retired quick-audit endpoint, which returns HTTP 410 on every request — so the script queries npm's supported bulk advisory endpoint against the versions in `pnpm-lock.yaml`, sends all advisories to the job summary, and fails the job on high/critical (ADS-387 / ADS-903).

CodeQL static analysis lives in a separate workflow (`codeql.yml`), not here. There is no dependency-review step in this repo.

**Triggers**: push / PR touching source or lockfiles, a weekly schedule (Monday 06:00 UTC), and manual dispatch.

### Docker Workflow (`docker.yml`)

Container build validation and pre-deploy production-image gate.

- **Pull request**: builds development images, only on changes to Dockerfiles, `docker-compose*.yml`, or `.dockerignore`. Source-only PRs are validated by `ci.yml` (`test-frontend`/`test-services` run native `pnpm build`, and `test-e2e` brings the dev stack up via `docker compose up --build`).
- **Push to main/develop**: triggers on the broader source path set so a regression that only manifests inside a container is caught before deploy. Production images and the Trivy vulnerability scan run only on this branch — `deploy.yml` is the consumer.

The previous `test-compose` job (a container `/health` probe) was removed; `ci.yml`'s `test-e2e` brings up the full stack and is a strict superset of that signal.

### Release Workflow (`release.yml`)

Builds and publishes production Docker images.

- Builds and pushes the gateway + 10 gRPC service images (`service-gateway`, `service-auth`, …) to Docker Hub (`paragonjenko/adoptdontshop`).
- Builds and pushes per-app frontend images (`app.client`, `app.admin`, `app.rescue`) to Docker Hub.
- Tags images with semver (when triggered by a `v*` tag), branch name, and commit SHA.

This workflow **publishes images only — it does not deploy.** GitHub Releases themselves are produced by `release-please.yml` from conventional commits; deploys are driven separately by `deploy.yml` (see [Deploying](#deploying)).

**Triggers**: tags starting with `v*`, completion of a successful CI run on `main` (`workflow_run`), and manual dispatch.

A `guard` job protects the `workflow_run` trigger (ADS-1013). `workflow_run` is privileged — it runs with this repo's secrets even when the triggering CI run came from a fork PR, and its `branches: [main]` filter only matches the head branch _name_ (trivially spoofable from a fork). The `guard` job additionally requires the triggering run's event to be `push` from this repository before any secret-bearing build job can run.

### Quality Workflow (`quality.yml`)

A single advisory `dependency-check` job. It runs `pnpm outdated -r` (reported to the job summary) and `pnpm list -r --depth 0` (duplicate detection), both `continue-on-error` — neither ever fails the build (ADS-387 / ADS-903). It does not run type-check, formatting, lint, or build; those live in `ci.yml`.

**Triggers**: push / PR touching source or lockfiles, and manual dispatch.

---

## Composite actions used by `ci.yml` (ADS-953)

`ci.yml`'s test jobs repeated the same checkout → setup-workspace → restore
lib-dist → run-turbo-filter preamble. That's now centralised in
`.github/actions/`, one edit point per contract change:

| Action               | Used by                                             | Purpose                                                                                                                                         |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup-workspace`    | `checkout-and-setup`, `e2e-suite`                   | Install Node + pnpm (Corepack), cache the pnpm store, install workspace deps.                                                                   |
| `checkout-and-setup` | `build-libs`, `run-package-tests`, `test-contracts` | Checkout + `setup-workspace`, plus an optional restore of the `packages/lib.*/dist` cache populated by `build-libs`.                            |
| `run-package-tests`  | `test-frontend`, `test-libs`, `test-services`       | `checkout-and-setup` + lint/test(:coverage)/type-check via Turbo (and, for frontend apps, a `pnpm build` step), then uploads the junit results. |
| `e2e-suite`          | `test-e2e`, `test-e2e-smoke`                        | The full Playwright E2E body: image build, stack boot, suite run, teardown.                                                                     |
| `dev-auth-guard`     | `dev-auth-guard`                                    | Scans production source for ungated dev-auth bypass patterns.                                                                                   |
| `coverage-report`    | `coverage-report`                                   | ADS-947: posts/updates a sticky PR comment with per-package coverage delta vs `main` and this run's job timings.                                |

These are composite actions, not `workflow_call` reusable workflows: a job
that calls a reusable workflow gets its status-check name prefixed with the
caller job's name (`<caller> / <callee>`), which would silently rename every
check in this file. Composite actions splice their steps into the _same_
job, so job names, `needs:`, and `if:` gating are unchanged — required for
`ci-required` and the branch-protection checks in this repo to keep working
across the refactor.

## Performance optimizations

- **Concurrency control**: cancels old runs when new commits are pushed.
- **Matrix builds**: parallel execution for the three frontend apps.
- **Lib dist caching (ADS-390 / ADS-909)**: the `build-libs` job caches compiled `lib.*/dist` via `actions/cache@v6.1.0` (pinned by SHA in `ci.yml`), keyed on the lib sources, manifests, tsconfig files and the root lockfile. On a cache hit the build step is skipped; on a miss the libs are compiled and the cache is saved. Downstream jobs (`test-services`, `test-frontend`, `test-libs`, `test-packages`, `test-contracts`) **restore this same cache entry** via `.github/actions/checkout-and-setup` — there is no separate upload/download-artifact step. `test-e2e` builds its own images via `docker compose up --build` and does not consume the cache.
- **pnpm store caching**: the `setup-workspace` composite action installs pnpm via Corepack and caches the pnpm store (keyed on `pnpm-lock.yaml`) between runs.
- **Docker layer caching**: BuildKit layer cache in `docker.yml` for image rebuilds.
- **Path filters**: heavy jobs only run when relevant files change.

---

## Setup Requirements

### Required Secrets

For release and deploy workflows to function fully, add these secrets to your repository:

```bash
# Docker Hub — release.yml pushes production images here
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Deploy / rollback — Hetzner host accessed over SSH; gateway + service images pulled from GHCR
HETZNER_HOST=your-server-hostname
HETZNER_SSH_KEY=your-private-ssh-key
HETZNER_HOST_FINGERPRINT=ssh-host-key-fingerprint  # computed via `ssh-keyscan -t ed25519 $HOST | ssh-keygen -lf -`
GHCR_TOKEN=read-only-personal-access-token         # scope: read:packages
```

`deploy.yml` and `rollback.yml` also pass through application secrets (`SECRET_JWT_SECRET`, `SECRET_JWT_REFRESH_SECRET`, `SECRET_SESSION_SECRET`, `SECRET_ENCRYPTION_KEY`, `SECRET_UPLOAD_SIGNING_SECRET`, `SECRET_DB_PASSWORD`, `SECRET_REDIS_PASSWORD`) — these must be configured per environment.

### Branch Protection

We use the **aggregator (merge-gate) pattern**: branch protection points at a
single `CI Required` job in `ci.yml` that fans-in to every regression-blocking
job. Renaming or adding a job under that fan-in doesn't require touching the
ruleset.

The ruleset itself lives in the repo at
`.github/rulesets/main-required-checks.json` and is imported via
**Settings → Rules → Rulesets → New ruleset → Import a ruleset**.

Three required status checks on `main`:

| Check                                  | Source workflow          | Why required                                                                                                       |
| -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `CI Required`                          | `ci.yml`                 | Aggregates workspace-drift, build-libs, backend/frontend/library tests (with coverage gates), dev-auth-guard, E2E. |
| `Verify every lib.* package has tests` | `lib-test-guard.yml`     | Deterministic script; always runs; prevents `--passWithNoTests` regressions (ADS-186 / ADS-328).                   |
| `Schema Equivalence (migrate vs sync)` | `schema-equivalence.yml` | Deterministic pg_dump diff; path-filtered to migrations/models. Required to block schema drift on relevant PRs.    |

#### Why these three (and not the others)

The set is filtered to **HIGH-accuracy, no-regression-allowed** signals:

- **Workspace drift, dev-auth-guard, lib-test-guard, schema-equivalence** —
  deterministic checks. No flake, no false positives.
- **Backend / Frontend / Library Tests** — coverage-thresholded in
  `vitest.config.ts`, so a behaviour regression fails the build directly.
- **E2E (Playwright)** — opt-in integration signal: runs on main pushes, on PRs
  labelled `run-e2e`, and on manual dispatch; skipped (treated as success) on
  other PRs so it never blocks in-progress work. Retries are set to `2` in
  `e2e/playwright.config.ts` to absorb browser/timing flake without hiding real
  breakage.

Intentionally **not** required:

- `Detect Changes` — pure metadata helper, not a regression signal.
- `E2E Smoke` — advisory `@smoke` subset; red on the PR but never blocks merge.
- `Quality` (dependency check) — advisory only (`continue-on-error: true`).
- `Security` (dependency audit) — fails on new external CVEs unrelated to the PR.
- `CodeQL` — possible false positives; runs weekly anyway for drift detection.
- `Docker` — covered by E2E's `docker compose up --build`; prod images run
  only on push to `main`/`develop` ahead of `deploy.yml`.
- `Storybook`, `Release`, `Release Please`, `Deploy`, `Rollback`, `Labeler`,
  `Sync Labels` — publishing or housekeeping; not PR gates.

#### How `CI Required` handles path-filtered jobs

The aggregator runs with `if: always()` and only fails when a needed job's
`result` is `failure` or `cancelled`. A job that is `skipped` because its
path filter didn't match is treated as success — so a PR touching only
`app.admin/` doesn't get blocked by a skipped backend job.

#### Updating the ruleset

If you add a new HIGH-accuracy regression-blocking job, the preferred path is
to add it as a `needs:` entry on `ci-required` in `ci.yml` so it rolls up into
the existing required check. Only add a new entry to the ruleset JSON if the
job lives in a _separate_ workflow file (as `lib-test-guard` and
`schema-equivalence` do).

---

## Usage Examples

### Running Tests Locally

```bash
# Everything (Turbo-filtered)
pnpm test
pnpm lint
pnpm type-check

# One package only
pnpm exec turbo test --filter=@adopt-dont-shop/service.gateway
pnpm exec turbo test --filter=@adopt-dont-shop/app.admin
```

### Deploying

`release.yml` only publishes images. Actual deploys run through `deploy.yml`, driven by the repo-root `Makefile`:

```bash
make staging                                          # deploy main to staging
make prod                                             # deploy main to production (requires GitHub environment approval)

# Or dispatch the deploy workflow directly:
gh workflow run deploy.yml -f environment=staging
```

See the [README Deployment section](../../README.md#deployment) and `docs/operations/deploy.md` for the full operator runbook.

### Creating a Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This triggers automatic release creation
```

---

## Action pinning policy (ADS-539)

Every `uses:` entry in this directory MUST reference a 40-character commit
SHA, not a floating tag like `@v4`. A human-readable comment with the
release version goes next to the SHA so the line is greppable:

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
```

### Why

GitHub Actions tags are mutable. A malicious force-push to a third-party
tag — or upstream account compromise (tj-actions/changed-files, 2025) —
immediately exfiltrates every secret available to the job. SHA pinning
makes the action contents tamper-evident and surfaces upstream changes
through Renovate rather than via silent re-resolution at run time.

### Highest-risk actions

These actions see production secrets and must be reviewed especially
carefully on every bump:

| Action                   | Where used                   | Secrets exposed                         |
| ------------------------ | ---------------------------- | --------------------------------------- |
| `appleboy/ssh-action`    | `deploy.yml`, `rollback.yml` | `HETZNER_SSH_KEY`, `HETZNER_HOST`       |
| `docker/login-action`    | `deploy.yml`, `docker.yml`   | `GHCR_TOKEN`                            |
| `github/codeql-action/*` | `codeql.yml`, `docker.yml`   | `GITHUB_TOKEN` (security-events: write) |
| `dorny/paths-filter`     | `ci.yml`                     | `GITHUB_TOKEN`                          |

### Updating an action

Dependency PRs are raised by [Renovate](../../renovate.json) — this repo has no
Dependabot config (ADS-891). To review an action bump:

1. Open the Renovate PR for the action bump.
2. Verify the proposed SHA matches the tag on
   `https://github.com/<owner>/<repo>/releases/tag/v<version>`.
3. If the action is on the highest-risk table above, also read the
   release notes for any new entry-point/permission surface.
4. Merge.

### Adding a new action

Look up the SHA from the release page, then write:

```yaml
- uses: owner/repo@<full-40-char-SHA> # v<x.y.z>
```

Never copy a `@vN` reference from a Stack Overflow snippet without
resolving to a SHA first.
