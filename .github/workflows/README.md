# CI/CD Workflows

This directory contains GitHub Actions workflows for the Adopt Don't Shop platform, following industry-standard practices for modern web applications.

## Workflow Files

| File                       | Purpose                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `ci.yml`                   | Main CI pipeline: workspace drift, change detection, backend / frontend / library tests, Playwright E2E. |
| `quality.yml`              | Code quality, formatting, type checking, dependency health.                                             |
| `security.yml`             | Dependency audit and weekly security scans.                                                             |
| `codeql.yml`               | GitHub CodeQL static analysis for JavaScript / TypeScript (ADS-498).                                    |
| `docker.yml`               | Builds backend and per-app Docker images, then tests the docker-compose stack.                          |
| `lib-test-guard.yml`       | Fails when any `lib.*` package has zero test files (ADS-186 / ADS-328 safety net).                      |
| `schema-equivalence.yml`   | Bootstraps DB-A (migrate) and DB-B (sync), diffs normalised `pg_dump` to detect schema drift.            |
| `deploy.yml`               | Manual deploy to staging or production via GHCR + SSH.                                                  |
| `rollback.yml`             | Manual rollback to a previously published GHCR image SHA.                                               |
| `release.yml`              | Creates GitHub releases on tags and pushes images on successful CI runs to `main`.                      |
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

- **Pull request**: runs `--grep @smoke` (2 critical journeys: adopter registration + full adoption journey). ~3-5 min of test runtime on top of the stack-up step.
- **Push to main/develop**: runs the full Playwright suite as the integration gate before `deploy.yml`.

Tag a test with `@smoke` in its title to add it to the PR set. Keep the smoke set small — its job is to catch obvious integration breaks, not to be a coverage proxy. Unit/integration coverage lives in `test-backend`, `test-frontend`, and `test-libs`.

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

- **Pull request**: only on changes to Dockerfiles, `docker-compose*.yml`, or `.dockerignore`. Source-only PRs are validated by `ci.yml` (`test-frontend`/`test-backend` run native `npm run build`, and `test-e2e` brings the dev stack up via `docker compose up --build`).
- **Push to main/develop**: triggers on the broader source path set so a regression that only manifests inside a container is caught before deploy. Production images and the Trivy scan run only on this branch — `deploy.yml` is the consumer.

**Note**: the previous `test-compose` job (backend-container `/health` probe) was removed; `ci.yml`'s `test-e2e` brings up the full stack and is a strict superset of that signal.

---

### 🚀 **Release Workflow** (`release.yml`)

**Purpose**: Automated releases and deployment pipeline.

**What it does**:

- 📝 Creates GitHub releases from tags
- 🐳 Builds and pushes Docker images to registry
- 🚀 Deploys to staging/production environments
- 🏷️ Supports semantic versioning

**Triggers**: Tags starting with `v*`, pushes to `main`, manual dispatch

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

## Workflow Features

### 🚀 **Performance Optimizations**

- **Concurrency Control**: Cancels old runs when new commits are pushed
- **Matrix Builds**: Parallel execution for multiple projects
- **Lib dist caching (ADS-390)**: The `build-libs` job caches compiled `lib.*/dist` artifacts across runs via `actions/cache@v4`. On a cache hit the build step is skipped entirely; on a miss the libs are compiled and the cache is saved for the next run. Within a single run, the compiled artifacts are shared to consumer jobs (`test-backend`, `test-frontend`, `test-libs`, `test-e2e`) via `upload-artifact`/`download-artifact`, eliminating redundant builds across the matrix.
- **npm dependency caching**: `actions/setup-node` with `cache: 'npm'` restores `~/.npm` between runs
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

For the release workflow to function fully, add these secrets to your repository:

```bash
# Docker Hub (optional - for image publishing)
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-password

# Deployment (when ready)
DEPLOY_HOST=your-server-hostname
DEPLOY_USER=deployment-user
DEPLOY_SSH_KEY=your-private-ssh-key
```

### Branch Protection

Recommended branch protection rules for `main`:

- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Required status checks (names taken directly from the workflow files):
  - `Verify Workspace ↔ Filesystem Alignment` (from `ci.yml`)
  - `Detect Changes` (from `ci.yml`)
  - `Backend Tests` (from `ci.yml`, gated by path filter)
  - `Frontend Tests (app.client)` (from `ci.yml`, gated by path filter)
  - `Frontend Tests (app.admin)` (from `ci.yml`, gated by path filter)
  - `Frontend Tests (app.rescue)` (from `ci.yml`, gated by path filter)
  - `Library Tests` (from `ci.yml`, gated by path filter)
  - `E2E Tests (Playwright)` (from `ci.yml`, ADS-419 blocking signal)
  - `Verify every lib.* package has tests` (from `lib-test-guard.yml`)

---

## Usage Examples

### Running Tests Locally

```bash
# Everything (Turbo-filtered)
npm run test
npm run lint
npm run type-check

# One package only
npx turbo test --filter=@adopt-dont-shop/service-backend
npx turbo test --filter=@adopt-dont-shop/app.admin
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
