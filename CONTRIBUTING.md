# Contributing to Adopt Don't Shop

Thanks for contributing! This guide covers everything you need to open a good PR.

## Getting started

Follow the Quick Start in [README.md](./README.md#quick-start) to get the stack running locally. This repo uses pnpm, provided via Corepack — run `corepack enable` once and the version pinned by `package.json` `"packageManager"` is used automatically.

### Onboarding health

`.github/workflows/onboarding-smoke.yml` runs nightly (and on manual dispatch) to catch regressions in the onboarding path above before a new contributor hits them: it checks out a clean copy of the repo (no restored caches) and runs the bootstrap script non-interactively, asserting `.env` gets created, secrets get generated, and `pnpm validate:env` passes. It does not boot the docker dev stack — see the workflow file's header comment for the scope rationale (ADS-951).

## Where does my code go?

This monorepo has four workspace families. New code belongs in exactly one of them — use this decision tree to pick:

1. **Cross-service contract / DTO** (a type shared between a service and an app, or between two services) → **`packages/lib.types`**. Zero-dependency shared types and constants live here so every consumer agrees on the same shape.
2. **Reusable React UI primitive** (a button, input, layout, or any other presentational component) → **`packages/lib.components`**. Styled with vanilla-extract; consumed by `app.client` / `app.admin` / `app.rescue`. Browse the existing catalogue on [Storybook](https://ideasquared.github.io/adopt-dont-shop/) before adding a new one — see [packages/lib.components/README.md](./packages/lib.components/README.md#component-library--storybook). New components under `src/components/ui/` should ship a `*.stories.tsx` alongside the `*.tsx` / `*.test.tsx` — `pnpm run check:stories` reports stories coverage for that directory (nightly job summary in `.github/workflows/storybook.yml`), and a persisted floor in `stories-coverage-threshold.json` only ever ratchets upward.
3. **Runtime helper shared across workspaces** (no UI) — pick by who consumes it:
   - Consumed by the **React apps** (HTTP client, hooks, formatters, domain services) → **`packages/lib.<domain>`** (e.g. `lib.api`, `lib.auth`, `lib.utils`). These are the frontend-consumable libraries.
   - Consumed only by the **services** (gRPC stubs, event schemas, DB access, infra plumbing) → **`packages/<shared>`** (e.g. `proto`, `events`, `authz`, `db`, `storage`, `observability`). These are service-only and are **not** imported by any `app.*`.
4. **Service-specific business logic** (logic that belongs to one domain service and is not shared) → **`services/<svc>/src`** (e.g. `services/pets`, `services/applications`). Follow the Controllers → Services → Models layering in [.claude/CLAUDE.md](./.claude/CLAUDE.md).

The key distinction is **`lib.*` vs `packages/<shared>`**: both live under `packages/`, but `lib.*` packages are frontend-consumable (imported by the apps) while the bare `packages/*` packages (`proto`, `events`, `authz`, `db`, `storage`, `observability`, …) are service-only. When in doubt, prefer the narrowest home — promote code to a shared package only once a second consumer actually needs it.

Before making a breaking change to a `lib.*` package's public API, **check its consumer list** (`docs/libraries/<lib>-consumers.md`, linked from that package's README's "Consumers" section) — it's auto-generated from the workspace `package.json` files by `scripts/generate-dependency-docs.mjs`, so it always reflects who actually imports the package.

See the [README Project Structure](./README.md#project-structure) for the full tree and [docs/infrastructure/MICROSERVICES-STANDARDS.md](./docs/infrastructure/MICROSERVICES-STANDARDS.md) for service boundaries and gRPC/NATS ownership.

### New package READMEs

Every new `apps/*`, `services/*`, or `packages/*` package needs a README
following the canonical template for its family:
[app](./docs/templates/README.app.md), [service](./docs/templates/README.service.md),
[lib](./docs/templates/README.lib.md). `pnpm check:readmes` reports (warn-only
today) any workspace README missing one of the template's required sections.

## Development workflow

### Branch naming

```
<owner>/<ticket>-<short-slug>
# e.g. paragonjenko/ads-123-add-rescue-search
```

### Commits

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add rescue search endpoint
fix: correct date format in profile
refactor: extract validation logic
test: add edge cases for registration
docs: update API reference
```

A Husky `commit-msg` hook runs [commitlint](https://commitlint.js.org/) with `@commitlint/config-conventional` to enforce this locally — non-conforming messages will be rejected before the commit is created. In an emergency you can bypass the hook with `git commit --no-verify`, but the CI commit-message check will still fail the PR.

A `.gitmessage` template at the repo root prefills `git commit` with the conventional-commit format and a list of allowed types/scopes. `pnpm setup` wires it in automatically via `git config commit.template .gitmessage`; if you skipped setup, run that command yourself to enable it.

### TDD loop

This project follows strict Test-Driven Development — **no new behaviour without a test first**:

1. **Red** — write a failing test that describes the desired behaviour
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up while keeping tests green

### Test DOM environment

All tests run on **jsdom**. Do not switch test environments per package or
re-introduce `happy-dom` — the workspace consistency check (ADS-764) will
fail CI if it reappears.

## Before opening a PR

CI runs **ten** checks across `.github/workflows/ci.yml`, `lib-test-guard.yml`, `security.yml` and `quality.yml`. The four-command list previously documented here only covered a subset, so PRs that passed locally could still fail CI. Run the relevant tiers below before pushing.

The PR description includes a short "Before requesting review" checklist (see [`.github/pull_request_template.md`](./.github/pull_request_template.md)) that mirrors the most-failed CI checks — tick it off before requesting review.

### One-shot preflight (recommended before pushing)

Two aggregated scripts run the CI-equivalent checks for you:

```bash
pnpm ci:local:quick   # fast preflight (~30s): format + lint + type-check
pnpm ci:local         # full preflight (~3-5min): format + lint + type-check + test + lib-test guard + workspace drift
```

`ci:local` covers everything in the fast and slow tiers below except E2E and the backend coverage thresholds — run those separately when relevant.

**Coverage parity.** Root `pnpm test` (and `ci:local`) run plain `turbo run test` — they skip the coverage thresholds. CI's `test-frontend`, `test-libs`, and `test-services` jobs run `test:coverage` and enforce the thresholds declared in `vitest.shared.config.ts`, so a PR that's green on `pnpm test` locally can still fail CI on coverage. To match the CI gate locally, run coverage the same way CI does:

```bash
pnpm exec turbo run test:coverage                 # every package, with thresholds
pnpm exec turbo run test:coverage --filter='@adopt-dont-shop/lib.api'   # scope to what you changed
```

#### Pre-commit hook (lint-staged)

`.husky/pre-commit` runs [`.lintstagedrc.mjs`](./.lintstagedrc.mjs): Prettier formats the exact staged files, and ESLint runs via `pnpm exec turbo run lint --filter="...[HEAD]"` (ADS-905) — scoped to only the workspace packages your commit touches, using each package's own `eslint.config.js` (matching CI) rather than a single shared root config. A commit that only touches one package only lints that package.

#### Pre-push hook (ADS-732 / ADS-905)

`.husky/pre-push` will run `ci:local:quick` automatically before every `git push`. The hook file itself defaults to off so a fresh `git clone` (without running `pnpm setup`) never surprises anyone — but `pnpm setup`'s interactive prompt defaults to **yes**, so answering with a bare Enter during onboarding enables it. Recommended for at least your first month. You can also toggle it manually once per checkout:

```bash
pnpm hooks:enable    # creates .husky/.prepush-enabled (gitignored)
pnpm hooks:disable   # removes the marker
pnpm hooks:status    # show whether the hook is currently enabled
```

One-off run without enabling: `ADS_PREPUSH=1 git push`. Emergency bypass when the hook is enabled: `git push --no-verify` (the same flag works for the existing pre-commit / commit-msg hooks). The hook is always skipped under `CI=true`.

### Fast feedback (run every time, ~30s)

These are the quickest signals and cover lint, unit tests, type-check and formatting across every workspace:

```bash
pnpm lint
pnpm test
pnpm type-check
pnpm format:check
```

### Slow but matches CI (run before pushing the final commit)

These checks are enforced by CI but are **not** covered by the fast tier above:

```bash
# Service tests (lint + test + type-check across all services/*)
pnpm exec turbo run lint test type-check --filter='@adopt-dont-shop/service.*'

# Catches new lib.* packages without tests
node scripts/check-lib-tests.mjs

# Catches high-severity vulnerabilities across all workspaces
pnpm audit --audit-level high

# Playwright E2E suite — run if you touched anything user-facing or auth (~5 min).
# Requires the Docker stack running (pnpm docker:dev:detach).
# In CI this is opt-in on PRs: add the `run-e2e` label to run it there too
# (see "CI behaviour" under E2E Testing below).
pnpm test:e2e
```

> Service coverage thresholds are enforced inside each `services/*` package's `vitest.config.ts`. The `test-services` CI job runs lint, test, and type-check for every `service.*` package.

### Full CI matrix (for reference)

The required checks that gate merge (all feed into the `ci-required` aggregator job in `ci.yml`):

1. **Verify Workspace ↔ Filesystem Alignment** (`ci.yml` → `workspace-drift`) — catches a `lib.*` added to `package.json` workspaces with no matching directory (or vice-versa).
2. **Build Libraries** (`ci.yml` → `build-libs`) — compiles every `lib.*` package; downstream jobs depend on the artifact.
3. **Frontend Tests (app.client / app.admin / app.rescue)** (`ci.yml` → `test-frontend` matrix, ×3) — lint + test + type-check + build per app.
4. **Library Tests** (`ci.yml` → `test-libs`) — lint, test and type-check across every `lib.*`.
5. **Service Tests** (`ci.yml` → `test-services`) — lint + test + type-check across every `services/*` package. Added in ADS-822 so zero-test services no longer merge green.
6. **Dev-Auth Guard** (`ci.yml` → `dev-auth-guard`) — production bundle scan ensuring dev-auth bypass code is properly gated (ADS-676).
7. **E2E Tests (Playwright)** (`ci.yml` → `test-e2e`) — full Docker stack + browser suite. **Opt-in on PRs:** runs on `main` pushes and `workflow_dispatch`, or on a PR carrying the **`run-e2e`** label; otherwise skipped (treated as success). When it runs, a failure blocks the PR. Reworked for the post-monolith gateway stack in ADS-792.

Additional checks that run but are not part of `ci-required`:

- **Verify every lib.\* package has tests** (`lib-test-guard.yml`) — runs `scripts/check-lib-tests.mjs`.
- **Dependency Audit** (`security.yml`) — `pnpm audit --audit-level high`.
- **Dependency Check** (`quality.yml`) — `pnpm list -r --depth=0` for duplicates.

The Quality workflow's `pnpm outdated -r` step is informational (`continue-on-error: true`) and does not block merge.

If you skip the slow tier locally, expect CI feedback within ~10 minutes — just be ready to fix and push again. PRs that fail any of the seven `ci-required` checks above will not be merged.

## Code style

Full guidelines are in [.claude/CLAUDE.md](./.claude/CLAUDE.md). Key rules:

- TypeScript strict mode — no `any`, no type assertions without justification
- Schema-first types: define a [Zod](https://zod.dev/) schema, then `z.infer<>` the type
- Immutable data; pure functions; no nested if/else (use early returns)
- Functional components only in React; no class components

### Editor configuration

A repo-root `.editorconfig` enforces 2-space indent, LF line endings, UTF-8, final newline, and trimmed trailing whitespace — matching Prettier so format-only diffs don't show up in code review. VSCode picks this up out of the box (see `.vscode/extensions.json`). For other editors, install the EditorConfig plugin:

- **WebStorm / IntelliJ**: bundled, no install needed
- **Vim**: [editorconfig-vim](https://github.com/editorconfig/editorconfig-vim)
- **Neovim**: [editorconfig.nvim](https://github.com/gpanders/editorconfig.nvim) (or built-in since 0.9)
- **Sublime Text**: [EditorConfig](https://github.com/sindresorhus/editorconfig-sublime)
- **Zed / Helix**: built-in support

## Test requirements

Every package uses **Vitest** (`vitest run`). The React apps and `lib.components` add React Testing Library on top. Use the `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` scripts defined in each package.

Tests must cover **behaviour**, not implementation. 100% coverage is expected but tests must always be grounded in business requirements, not internal structure.

### Test layout

Pick the layout that matches the package, and keep new tests inside `src/`:

- **React libs / apps** (`app.*`, `lib.components`, anything exporting `.tsx`): co-locate next to the source — `Button.tsx` + `Button.test.tsx`.
- **Services and non-UI libs** (`services/*`, `lib.api`, `lib.utils`, …): tests co-located next to the source in `src/` (e.g. `src/grpc/handlers.ts` → `src/grpc/handlers.test.ts`).
- **Top-level `__tests__/` outside `src/` is disallowed** — the shared Vitest `include` glob only picks up files under `src/`, so anything else is silently skipped. `scripts/check-workspace-consistency.mjs` enforces this.

This is a forward-looking rule (ADS-737); we are not bulk-moving existing tests. If you touch a file that lives in an old location, move it as part of that change.

### Coverage thresholds

Since ADS-708, CI runs `test:coverage` (not plain `test`) across `lib.*` and `app.*` and enforces the thresholds declared in `vitest.shared.config.ts`. The baseline is **0%** so existing PRs are not blocked — the infrastructure is in place so individual packages can ratchet upward incrementally (tracked in ADS-717). To raise the bar for a single package, override the inherited thresholds in that package's `vitest.config.ts`:

```typescript
import { mergeConfig } from 'vitest/config';
import shared from '../vitest.shared.config';

export default mergeConfig(shared, {
  test: {
    coverage: {
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
```

#### Automated ratchet (ADS-796)

The shared-config baseline is raised automatically by a ratchet instead of being
edited by hand. `scripts/ratchet-coverage.mjs` reads a v8 coverage summary
(`coverage/coverage-summary.json`, emitted by the vitest `json-summary` reporter)
and persists the new floor to `coverage-thresholds.json` at the repo root:

```bash
# raise the persisted baseline towards measured coverage (minus a 1% margin)
pnpm run ratchet:coverage

# preview without writing the file
pnpm run ratchet:coverage -- --dry-run
```

The rule is one-directional and pure (unit-tested via `pnpm run test:scripts`):
a threshold is **never lowered**, and is only raised when measured coverage
clears the current floor by more than the safety margin. `vitest.shared.config.ts`
reads `coverage-thresholds.json` when present and falls back to the historic 0%
baseline when it is absent — so committing a populated file is what moves the
floor off 0%.

**Rollout:** the file is intentionally absent today (baseline stays 0%, CI
unchanged). To switch it on, run coverage with the `json-summary` reporter, run
`pnpm run ratchet:coverage`, and commit the generated `coverage-thresholds.json`.
A scheduled/`main` CI job can then re-run the ratchet and open a follow-up PR.

**Exemptions:** a package that cannot meet the shared floor sets a lower
`thresholds` block in its own `vitest.config.ts` with a comment linking the
tracking ticket. The override always wins over the shared baseline.

## Reporting bugs / proposing features

Use the issue templates in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/):

- [Bug report](./.github/ISSUE_TEMPLATE/bug_report.yml)
- [Feature request](./.github/ISSUE_TEMPLATE/feature_request.yml)

## Reviewing & code ownership

Code ownership is defined in [`.github/CODEOWNERS`](./.github/CODEOWNERS). All PRs require at least one approved review before merge.

## Dependency updates

[Renovate](./renovate.json) is the single source of truth for dependency PRs (npm workspace, GitHub Actions, Docker image digests) — there is no separate Dependabot config (ADS-891). Don't re-add `.github/dependabot.yml`; adjust grouping/scheduling in `renovate.json` instead.

## E2E Testing

End-to-end tests live in `e2e/` and run against the full Docker Compose stack. Playwright is used for all browser automation.

### Running E2E tests locally

You need the full stack running first (`pnpm docker:dev` or `pnpm docker:dev:detach`). Then:

```bash
# Run the full suite (headless)
pnpm test:e2e

# Interactive UI mode — pick individual tests, see live browser, time-travel debug
pnpm test:e2e:ui

# Step-by-step debugger (opens browser + Playwright Inspector)
pnpm test:e2e:debug

# Headed mode — runs tests in a visible browser window
pnpm test:e2e:headed

# Open the last HTML report
pnpm test:e2e:report
```

### Debugging a flaky or failing test

1. Identify the failing spec from the Playwright HTML report (`pnpm test:e2e:report`) or the CI artifact `e2e-playwright-report`.
2. Run it in headed mode to watch what the browser does:
   ```bash
   pnpm exec playwright test --headed tests/client/my-test.spec.ts
   ```
3. Use `test:e2e:debug` to pause at each action with the Playwright Inspector.
4. Check `e2e/test-results/` for screenshots and videos captured on failure (`screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`).
5. Traces are captured on the first retry (`trace: 'on-first-retry'`). Open a trace with:
   ```bash
   pnpm exec playwright show-trace e2e/test-results/<test-dir>/trace.zip
   ```

### CI behaviour

- **E2E is opt-in on PRs.** The `test-e2e` job only runs automatically on pushes to `main` and via manual `workflow_dispatch`. On a pull request it is skipped (which `ci-required` treats as success) **unless** you add the **`run-e2e`** label — adding it re-triggers CI and runs the full Playwright suite. Add the label once your branch is ready (especially for user-facing, auth, or cross-app changes); leaving it off keeps in-progress PRs fast. See the `test-e2e` job in `.github/workflows/ci.yml`.
- Playwright runs with `retries: 2` in CI. A test must fail 3 times in a row before it counts as a failure.
- Flaky retry counts are printed in the "Report E2E retry counts" CI step.
- When E2E does run (labelled PR or `main` push) it is a blocking signal — a failure fails the PR check. The suite was reworked for the post-monolith gateway stack in ADS-792 (see the `ci-required` aggregator in `.github/workflows/ci.yml`).

### Selector guidelines

- Prefer `data-testid` attributes and ARIA role queries over CSS selectors.
- Use `getByRole`, `getByLabel`, `getByTestId` in that order of preference.
- Add deterministic waits (`waitForURL`, `waitForSelector`, `expect(locator).toBeVisible()`) instead of arbitrary `page.waitForTimeout` calls.
