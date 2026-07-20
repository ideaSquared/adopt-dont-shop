# CI/CD Workflows

This directory contains GitHub Actions workflows for the Adopt Don't Shop platform, following industry-standard practices for modern web applications.

## Workflow Files

| File                       | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ci.yml`                   | Main CI pipeline: workspace drift, change detection, backend / frontend / library tests, Playwright E2E. |
| `onboarding-smoke.yml`     | Nightly + manual: exercises the documented `pnpm setup` onboarding path on a clean checkout (ADS-951).  |
| `quality.yml`              | Code quality, formatting, type checking, dependency health.                                             |
| `security.yml`             | Dependency audit and weekly security scans.                                                             |
| `codeql.yml`               | GitHub CodeQL static analysis for JavaScript / TypeScript (ADS-498).                                    |
| `docker.yml`               | Builds the gateway / service and per-app Docker images, then tests the docker-compose stack.            |
| `lib-test-guard.yml`       | Fails when any `lib.*` package has zero test files (ADS-186 / ADS-328 safety net).                      |
| `schema-equivalence.yml`   | Bootstraps DB-A (migrate) and DB-B (sync), diffs normalised `pg_dump` to detect schema drift.            |
| `deploy.yml`               | Manual deploy to staging or production via GHCR + SSH.                                                  |
| `rollback.yml`             | Manual rollback to a previously published GHCR image SHA.                                               |
| `release.yml`              | Builds and pushes production Docker images (gateway + 10 services + 3 apps) to Docker Hub on tag pushes (`v*`) and successful CI runs to `main`. |
| `release-please.yml`       | Generates release PRs, version tags, and GitHub Releases with changelogs from conventional commits.     |
| `storybook.yml`            | Builds and deploys `lib.components` Storybook to GitHub Pages.                                          |
| `labeler.yml`              | Auto-labels pull requests using `.github/labeler.yml` rules.                                            |
| `sync-labels.yml`          | Syncs `.github/labels.yml` to the repository's label set on changes to `main`.                          |

## Workflow Overview

### 🔄 **CI Workflow** (`ci.yml`)

**Purpose**: Main continuous integration pipeline that runs on every push and pull request.

**What it does**:

- ✅ Tests backend with PostgreSQL database
- ✅ Tests all frontend applications in parallel
- ✅ Runs linting and builds for all projects
- ✅ Runs Playwright E2E against the full docker-compose stack
- ✅ Ensures code quality before merging

**E2E strategy**:

E2E is **opt-in on pull requests** — the full docker-stack build plus Playwright
run is too slow to pay on every push during development. The `test-e2e` job runs
the full Playwright suite when:

- **Push to main**: the integration gate before `deploy.yml`.
- **PR labelled `run-e2e`**: opt in when the branch is ready. Adding the label
  re-triggers CI (the `pull_request: labeled` event), so no extra push is needed.
- **Manual dispatch** (`workflow_dispatch`).

On any other PR `test-e2e` is **skipped**, which the `ci-required` aggregator
treats as success — so E2E never blocks an in-progress PR. Unit/integration
coverage still runs on every PR via `test-services`, `test-frontend`, and
`test-libs`. Tag a test with `@smoke` and run `pnpm test:e2e:smoke` locally for a
quick critical-path subset.

**Triggers**: Push/PR to `main` or `develop` branches

---

### 🔒 **Security Workflow** (`security.yml`)

**Purpose**: Automated security scanning and dependency auditing.

**What it does**:

- 🔍 Runs npm audit on all projects
- 🛡️ CodeQL static analysis for security vulnerabilities
- 📦 Dependency review on pull requests
- 📅 Weekly scheduled security scans

**Triggers**: Push/PR to main branches, weekly schedule, manual dispatch

---

### 🐳 **Docker Workflow** (`docker.yml`)

**Purpose**: Container build validation and pre-deploy production-image gate.

**What it does**:

- 🏗️ Builds development images (PR + push)
- 🚀 Builds production images + runs Trivy vulnerability scan (push to main/develop only)
- 💾 Uses GitHub Actions cache for faster builds

**Triggers**:

- **Pull request**: only on changes to Dockerfiles, `docker-compose*.yml`, or `.dockerignore`. Source-only PRs are validated by `ci.yml` (`test-frontend`/`test-services` run native `pnpm build`, and `test-e2e` brings the dev stack up via `docker compose up --build`).
- **Push to main/develop**: triggers on the broader source path set so a regression that only manifests inside a container is caught before deploy. Production images and the Trivy scan run only on this branch — `deploy.yml` is the consumer.

**Note**: the previous `test-compose` job (a container `/health` probe) was removed; `ci.yml`'s `test-e2e` brings up the full stack and is a strict superset of that signal.

---

### 🚀 **Release Workflow** (`release.yml`)

**Purpose**: Build and publish production Docker images.

**What it does**:

- 🐳 Builds and pushes the gateway + 10 gRPC service images (`service-gateway`, `service-auth`, …) to Docker Hub (`paragonjenko/adoptdontshop`)
- 🐳 Builds and pushes per-app frontend images (`app.client`, `app.admin`, `app.rescue`) to Docker Hub
- 🏷️ Tags images with semver (when triggered by a `v*` tag), branch name, and commit SHA

GitHub Releases themselves are produced by `release-please.yml` from conventional commits — `release.yml` only handles image publishing. Deploys are driven separately by `deploy.yml`.

**Triggers**: Tags starting with `v*`, completion of a successful CI run on `main`, manual dispatch.

---

### ✨ **Quality Workflow** (`quality.yml`)

**Purpose**: Code quality, formatting, and type checking.

**What it does**:

- 🔍 TypeScript type checking
- 💅 Code formatting validation
- 📏 ESLint code quality checks
- 📦 Dependency health monitoring
- 🏗️ Build verification

**Triggers**: Push/PR to main branches

---

## Composite actions used by `ci.yml` (ADS-953)

`ci.yml`'s test jobs repeated the same checkout → setup-workspace → restore
lib-dist → run-turbo-filter preamble. That's now centralised in
`.github/actions/`, one edit point per contract change:

| Action | Used by | Purpose |
| ------ | ------- | ------- |
| `setup-workspace` | `checkout-and-setup`, `e2e-suite` | Install Node + pnpm (Corepack), cache the pnpm store, install workspace deps. |
| `checkout-and-setup` | `build-libs`, `run-package-tests`, `test-contracts` | Checkout + `setup-workspace`, plus an optional restore of the `packages/lib.*/dist` cache populated by `build-libs`. |
| `run-package-tests` | `test-frontend`, `test-libs`, `test-services` | `checkout-and-setup` + lint/test(:coverage)/type-check via Turbo (and, for frontend apps, a `pnpm build` step), then uploads the junit results. |
| `e2e-suite` | `test-e2e` | The full Playwright E2E body: image build, stack boot, suite run, teardown. |
| `dev-auth-guard` | `dev-auth-guard` | Scans production source for ungated dev-auth bypass patterns. |

These are composite actions, not `workflow_call` reusable workflows: a job
that calls a reusable workflow gets its status-check name prefixed with the
caller job's name (`<caller> / <callee>`), which would silently rename every
check in this file. Composite actions splice their steps into the *same*
job, so job names, `needs:`, and `if:` gating are unchanged — required for
`ci-required` and the branch-protection checks in this repo to keep working
across the refactor.

## Workflow Features

### 🚀 **Performance Optimizations**

- **Concurrency Control**: Cancels old runs when new commits are pushed
- **Matrix Builds**: Parallel execution for multiple projects
- **Lib dist caching (ADS-390)**: The `build-libs` job caches compiled `lib.*/dist` artifacts across runs via `actions/cache@v5.0.5` (pinned by SHA in `ci.yml`). On a cache hit the build step is skipped entirely; on a miss the libs are compiled and the cache is saved for the next run. Within a single run, the compiled artifacts are shared to consumer jobs (`test-services`, `test-frontend`, `test-libs`, `test-contracts`) via `upload-artifact`/`download-artifact`, eliminating redundant builds across the matrix. `test-e2e` builds its own images via `docker compose up --build` and does not consume the artifact.
- **pnpm store caching**: the `setup-workspace` composite action installs pnpm via Corepack and caches the pnpm store (keyed on `pnpm-lock.yaml`) between runs
- **Docker layer caching**: BuildKit layer cache in `docker.yml` for image rebuilds
- **Path Filters**: Only runs when relevant files change

### 🔒 **Security Best Practices**

- **Minimal Permissions**: Each job has only required permissions
- **Secret Management**: Secure handling of credentials
- **Dependency Scanning**: Automated vulnerability detection
- **Code Analysis**: Static security analysis with CodeQL

### 📊 **Monitoring & Reporting**

- **Clear Job Names**: Easy identification of failing steps
- **Detailed Logging**: Comprehensive output for debugging
- **Failure Handling**: Graceful error handling and cleanup
- **Status Checks**: Required checks for branch protection

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

| Check                                       | Source workflow            | Why required                                                                                                       |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `CI Required`                               | `ci.yml`                   | Aggregates workspace-drift, build-libs, backend/frontend/library tests (with coverage gates), dev-auth-guard, E2E. |
| `Verify every lib.* package has tests`      | `lib-test-guard.yml`       | Deterministic script; always runs; prevents `--passWithNoTests` regressions (ADS-186 / ADS-328).                   |
| `Schema Equivalence (migrate vs sync)`      | `schema-equivalence.yml`   | Deterministic pg_dump diff; path-filtered to migrations/models. Required to block schema drift on relevant PRs.    |

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
- `Quality` (dependency check) — advisory only (`continue-on-error: true`).
- `Security` (npm audit) — fails on new external CVEs unrelated to the PR.
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
job lives in a *separate* workflow file (as `lib-test-guard` and
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

### Manual Deployment

```bash
# Trigger manual deployment
gh workflow run release.yml -f environment=staging
```

### Creating a Release

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# This triggers automatic release creation
```

---

## Monitoring

### Workflow Status

- 📊 **Actions Tab**: View all workflow runs
- 📧 **Notifications**: Configure email/Slack notifications
- 🔍 **Logs**: Detailed execution logs for debugging

### Performance Metrics

- ⏱️ **Build Times**: Monitor workflow execution duration
- 💾 **Cache Hit Rates**: Track caching effectiveness
- 📈 **Success Rates**: Monitor workflow reliability

---

## Troubleshooting

### Common Issues

**Tests Failing**:

- Check test logs in the Actions tab
- Ensure all dependencies are properly installed
- Verify environment variables are set correctly

**Docker Build Issues**:

- Check Dockerfile syntax
- Ensure all required files are included in build context
- Verify base image availability

**Security Scan Failures**:

- Review npm audit output
- Update vulnerable dependencies
- Check CodeQL findings in Security tab

### Getting Help

- 📖 Check workflow logs for detailed error messages
- 🐛 Review failed steps and their output
- 💬 Create an issue with workflow run URL for support

---

_This workflow structure follows GitHub's recommended practices and industry standards for CI/CD pipelines._

---

## Action pinning policy (ADS-539)

Every `uses:` entry in this directory MUST reference a 40-character commit
SHA, not a floating tag like `@v4`. A human-readable comment with the
release version goes next to the SHA so the line is greppable:

```yaml
- uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd  # v6.0.2
```

### Why

GitHub Actions tags are mutable. A malicious force-push to a third-party
tag — or upstream account compromise (tj-actions/changed-files, 2025) —
immediately exfiltrates every secret available to the job. SHA pinning
makes the action contents tamper-evident and surfaces upstream changes
through Dependabot rather than via silent re-resolution at run time.

### Highest-risk actions

These actions see production secrets and must be reviewed especially
carefully on every bump:

| Action                          | Where used        | Secrets exposed |
| ------------------------------- | ----------------- | --------------- |
| `appleboy/ssh-action`           | `deploy.yml`, `rollback.yml` | `HETZNER_SSH_KEY`, `HETZNER_HOST` |
| `docker/login-action`           | `deploy.yml`, `docker.yml`    | `GHCR_TOKEN`     |
| `github/codeql-action/*`        | `codeql.yml`, `docker.yml`    | `GITHUB_TOKEN` (security-events: write) |
| `dorny/paths-filter`            | `ci.yml`                       | `GITHUB_TOKEN`   |

### Updating an action

1. Open the Dependabot PR for the action bump.
2. Verify the proposed SHA matches the tag on
   `https://github.com/<owner>/<repo>/releases/tag/v<version>`.
3. If the action is on the highest-risk table above, also read the
   release notes for any new entry-point/permission surface.
4. Merge.

### Adding a new action

Look up the SHA from the release page, then write:

```yaml
- uses: owner/repo@<full-40-char-SHA>  # v<x.y.z>
```

Never copy a `@vN` reference from a Stack Overflow snippet without
resolving to a SHA first.
