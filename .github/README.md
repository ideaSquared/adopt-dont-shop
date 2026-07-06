# CI/CD Overview

## Workflow Files

See [workflows/README.md](./workflows/README.md) for the full reference. The high-level picture:

| File | Purpose |
|---|---|
| `ci.yml` | Main CI: workspace drift, change detection, backend / frontend / library tests, Playwright E2E |
| `quality.yml` | Dependency freshness check across all workspaces |
| `security.yml` | `pnpm audit` vulnerability scan across all workspaces |
| `codeql.yml` | CodeQL static analysis for JavaScript / TypeScript |
| `docker.yml` | Build validation for backend and per-app Docker images |
| `lib-test-guard.yml` | Fails when any `lib.*` package has zero test files |
| `schema-equivalence.yml` | Diffs migrated vs synced schemas to detect drift |
| `deploy.yml` | Manual deploy to staging or production via GHCR + SSH |
| `rollback.yml` | Manual rollback to a previously published image SHA |
| `release.yml` | Builds and pushes Docker images on tag / push to `main` |
| `release-please.yml` | Generates release PRs, tags, and GitHub Releases from conventional commits |
| `storybook.yml` | Builds and deploys `lib.components` Storybook |
| `labeler.yml` | Auto-labels pull requests |
| `sync-labels.yml` | Syncs `.github/labels.yml` to repository labels |

## Lib Build Artifact Caching (ADS-390)

`ci.yml` uses a dedicated `build-libs` job that compiles all `lib.*/dist` outputs once, then uploads them as a single `lib-dist` artifact via `actions/upload-artifact@v7`. Downstream jobs (`test-services`, `test-frontend`, `test-libs`, `test-contracts`) use `actions/download-artifact@v8` to retrieve the pre-built artifacts instead of rebuilding.

This eliminates the ~4x redundant `pnpm build:libs` calls that previously occurred across parallel jobs (~10 minutes of duplicated work per run).

**Turbo remote cache** is also wired via `TURBO_TOKEN` / `TURBO_TEAM` secrets. Run `pnpm exec turbo run build:libs --summarize` locally or inspect the "Show Turbo build summary" CI step to verify cache hits.

Cold-cache behaviour: if the `build-libs` job fails or is skipped, downstream jobs that need artifacts will also fail — this is intentional, as it prevents false-green test runs against stale dist files.

## Security Audit Coverage (ADS-387)

`security.yml` and `quality.yml` previously used a hardcoded 5-package matrix. They now run a single workspace-level command at the repo root:

```
pnpm audit --audit-level high
```

This covers all workspace packages via the deduplicated `pnpm-lock.yaml`.

## E2E Gate (ADS-386 / ADS-419)

The `test-e2e` job in `ci.yml` is opt-in per PR — it runs on push to `main`, on `workflow_dispatch`, or when the PR carries the `run-e2e` label (see the `if:` gate around `.github/workflows/ci.yml:440`). When it runs, a failure fails the PR check; when it is skipped (unlabelled PRs) the `ci-required` aggregator treats the skip as success so E2E never blocks in-progress work. See [`workflows/README.md`](./workflows/README.md#-continuous-integration-workflow-ciyml) for the full policy.

Playwright is configured with `retries: 2` in CI (see `e2e/playwright.config.ts`). Flaky-retry counts are surfaced in the "Report E2E retry counts" step after each run.
