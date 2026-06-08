# Contributing to Adopt Don't Shop

Thanks for contributing! This guide covers everything you need to open a good PR.

## Getting started

Follow the Quick Start in [README.md](./README.md#quick-start) to get the stack running locally.

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

A `.gitmessage` template at the repo root prefills `git commit` with the conventional-commit format and a list of allowed types/scopes. `npm run setup` wires it in automatically via `git config commit.template .gitmessage`; if you skipped setup, run that command yourself to enable it.

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

CI runs several blocking checks across `.github/workflows/ci.yml`, `lib-test-guard.yml`, and `security.yml`. The four-command list previously documented here only covered a subset, so PRs that passed locally could still fail CI. Run the relevant tiers below before pushing.

The PR description includes a short "Before requesting review" checklist (see [`.github/pull_request_template.md`](./.github/pull_request_template.md)) that mirrors the most-failed CI checks — tick it off before requesting review.

### One-shot preflight (recommended before pushing)

Two aggregated scripts run the CI-equivalent checks for you:

```bash
npm run ci:local:quick   # fast preflight (~30s): format + lint + type-check
npm run ci:local         # full preflight (~3-5min): format + lint + type-check + test + lib-test guard + workspace drift
```

`ci:local` covers everything in the fast and slow tiers below except E2E and the backend coverage thresholds — run those separately when relevant.

#### Opt-in pre-push hook (ADS-732)

`.husky/pre-push` will run `ci:local:quick` automatically before every `git push`, but is **off by default** so it doesn't surprise existing contributors. Enable it once per checkout:

```bash
npm run hooks:enable    # creates .husky/.prepush-enabled (gitignored)
npm run hooks:disable   # removes the marker
```

One-off run without enabling: `ADS_PREPUSH=1 git push`. Emergency bypass when the hook is enabled: `git push --no-verify` (the same flag works for the existing pre-commit / commit-msg hooks). The hook is always skipped under `CI=true`.

### Fast feedback (run every time, ~30s)

These are the quickest signals and cover lint, unit tests, type-check and formatting across every workspace:

```bash
npm run lint
npm test
npm run type-check
npm run format:check
```

### Slow but matches CI (run before pushing the final commit)

These checks are enforced by CI but are **not** covered by the fast tier above:

```bash
# Backend coverage thresholds (vitest.config.ts blocks below them; `npm test` alone does NOT)
npm run test:coverage --workspace=@adopt-dont-shop/service-backend

# Catches new lib.* packages without tests
node scripts/check-lib-tests.mjs

# Catches high-severity vulnerabilities across all workspaces
npm audit --workspaces --include-workspace-root --audit-level=high

# Playwright E2E suite — required if you touched anything user-facing or auth (~5 min).
# Requires the Docker stack running (npm run docker:dev:detach).
npm run test:e2e
```

> Backend coverage thresholds are enforced **separately** from `npm test`. Only `test:coverage` inside `service.backend` (or CI) will fail when coverage regresses.

### Full CI matrix (for reference)

The required-to-pass checks CI runs on every PR. All of these feed the `CI Required` aggregator in `ci.yml` (jobs that are path-filtered out report `skipped`, which the aggregator treats as success):

1. **Verify Workspace ↔ Filesystem Alignment** (`ci.yml` → `workspace-drift`) — catches a `lib.*` added to `package.json` workspaces with no matching directory (or vice-versa).
2. **Build Shared Libraries** (`ci.yml` → `build-libs`) — produces the lib `dist/` artifact downstream jobs consume.
3. **Backend Tests** (`ci.yml` → `test-backend`) — lint + `test:coverage` (with thresholds) + build.
4. **Frontend Tests (app.client / app.admin / app.rescue)** (`ci.yml` → `test-frontend` matrix, ×3) — lint + test + type-check + build per app.
5. **Library Tests** (`ci.yml` → `test-libs`) — lint, test and type-check across every `lib.*`.
6. **Verify Dev Auth is Properly Gated** (`ci.yml` → `dev-auth-guard`) — fails the PR if dev-auth bypass patterns leak outside `import.meta.env.DEV` guards (ADS-676).
7. **E2E Tests (Playwright)** (`ci.yml` → `test-e2e`) — full Docker stack + browser suite. Blocking since ADS-419.
8. **Verify every lib.\* package has tests** (`lib-test-guard.yml`) — runs `scripts/check-lib-tests.mjs`.
9. **Dependency Audit** (`security.yml`) — `npm audit --workspaces --audit-level=high`.

The Quality workflow's `dependency-check` job (outdated + duplicate dependency scan) and the `npm outdated` step run `continue-on-error: true` and do **not** block merge — they're informational.

If you skip the slow tier locally, expect CI feedback within ~10 minutes — just be ready to fix and push again. PRs that fail any of the blocking checks above will not be merged.

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

Every package uses **Vitest** (`vitest run`). The React apps and `lib.components` add React Testing Library on top. Use the `npm test` / `npm run test:watch` / `npm run test:coverage` scripts defined in each package.

Tests must cover **behaviour**, not implementation. 100% coverage is expected but tests must always be grounded in business requirements, not internal structure.

### Test layout

Pick the layout that matches the package, and keep new tests inside `src/`:

- **React libs / apps** (`app.*`, `lib.components`, anything exporting `.tsx`): co-locate next to the source — `Button.tsx` + `Button.test.tsx`.
- **Backend and non-UI libs** (`service.backend`, `lib.api`, `lib.utils`, …): tests in `src/__tests__/` mirroring the source structure (e.g. `src/services/foo.ts` → `src/__tests__/services/foo.test.ts`).
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

## Reporting bugs / proposing features

Use the issue templates in [`.github/ISSUE_TEMPLATE/`](./.github/ISSUE_TEMPLATE/):

- [Bug report](./.github/ISSUE_TEMPLATE/bug_report.yml)
- [Feature request](./.github/ISSUE_TEMPLATE/feature_request.yml)

## Reviewing & code ownership

Code ownership is defined in [`.github/CODEOWNERS`](./.github/CODEOWNERS). All PRs require at least one approved review before merge.

## E2E Testing

End-to-end tests live in `e2e/` and run against the full Docker Compose stack. Playwright is used for all browser automation.

### Running E2E tests locally

You need the full stack running first (`npm run docker:dev` or `npm run docker:dev:detach`). Then:

```bash
# Run the full suite (headless)
npm run test:e2e

# Interactive UI mode — pick individual tests, see live browser, time-travel debug
npm run test:e2e:ui

# Step-by-step debugger (opens browser + Playwright Inspector)
npm run test:e2e:debug

# Headed mode — runs tests in a visible browser window
npm run test:e2e:headed

# Open the last HTML report
npm run test:e2e:report
```

### Debugging a flaky or failing test

1. Identify the failing spec from the Playwright HTML report (`npm run test:e2e:report`) or the CI artifact `e2e-playwright-report`.
2. Run it in headed mode to watch what the browser does:
   ```bash
   npx playwright test --headed tests/client/my-test.spec.ts
   ```
3. Use `test:e2e:debug` to pause at each action with the Playwright Inspector.
4. Check `e2e/test-results/` for screenshots and videos captured on failure (`screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`).
5. Traces are captured on the first retry (`trace: 'on-first-retry'`). Open a trace with:
   ```bash
   npx playwright show-trace e2e/test-results/<test-dir>/trace.zip
   ```

### CI behaviour

- Playwright runs with `retries: 2` in CI. A test must fail 3 times in a row before it counts as a failure.
- Flaky retry counts are printed in the "Report E2E retry counts" CI step.
- The `test-e2e` job is a blocking signal — a failure fails the PR check (see ADS-419 and the comment block at `.github/workflows/ci.yml:398`).

### Selector guidelines

- Prefer `data-testid` attributes and ARIA role queries over CSS selectors.
- Use `getByRole`, `getByLabel`, `getByTestId` in that order of preference.
- Add deterministic waits (`waitForURL`, `waitForSelector`, `expect(locator).toBeVisible()`) instead of arbitrary `page.waitForTimeout` calls.
