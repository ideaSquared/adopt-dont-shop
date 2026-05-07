# CI/CD Overview

## Workflow Files

| File | Purpose |
|---|---|
| `ci.yml` | Main CI: lint, test, build for all packages + E2E |
| `quality.yml` | Dependency freshness check across all workspaces |
| `security.yml` | `npm audit` vulnerability scan across all workspaces |

## Lib Build Artifact Caching (ADS-390)

`ci.yml` uses a dedicated `build-libs` job that compiles all `lib.*/dist` outputs once, then uploads them as a single `lib-dist` artifact via `actions/upload-artifact@v7`. Downstream jobs (`test-backend`, `test-frontend`, `test-libs`) use `actions/download-artifact@v7` to retrieve the pre-built artifacts instead of rebuilding.

This eliminates the ~4x redundant `npm run build:libs` calls that previously occurred across parallel jobs (~10 minutes of duplicated work per run).

**Turbo remote cache** is also wired via `TURBO_TOKEN` / `TURBO_TEAM` secrets. Run `npx turbo run build:libs --summarize` locally or inspect the "Show Turbo build summary" CI step to verify cache hits.

Cold-cache behaviour: if the `build-libs` job fails or is skipped, downstream jobs that need artifacts will also fail — this is intentional, as it prevents false-green test runs against stale dist files.

## Security Audit Coverage (ADS-387)

`security.yml` and `quality.yml` previously used a hardcoded 5-package matrix. They now run a single workspace-level command at the repo root:

```
npm audit --workspaces --include-workspace-root --audit-level=high
```

This covers all 28 packages via the deduplicated `package-lock.json`.

## E2E Gate (ADS-386)

The `test-e2e` job in `ci.yml` currently runs with `continue-on-error: true`. This will be flipped to `false` (and added as a required branch-protection check) once the suite has 10 consecutive green runs on `main`. See the comment block in `ci.yml` for the exact criteria.

Playwright is configured with `retries: 2` in CI (see `e2e/playwright.config.ts`). Flaky-retry counts are surfaced in the "Report E2E retry counts" step after each run.
