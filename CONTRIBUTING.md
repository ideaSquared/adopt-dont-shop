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

### TDD loop

This project follows strict Test-Driven Development — **no new behaviour without a test first**:

1. **Red** — write a failing test that describes the desired behaviour
2. **Green** — write the minimum code to make it pass
3. **Refactor** — clean up while keeping tests green

## Before opening a PR

All four checks must pass locally before pushing:

```bash
npm run lint
npm test
npm run type-check
npm run format:check
```

The CI workflow enforces these — PRs that fail CI will not be merged.

## Code style

Full guidelines are in [.claude/CLAUDE.md](./.claude/CLAUDE.md). Key rules:

- TypeScript strict mode — no `any`, no type assertions without justification
- Schema-first types: define a [Zod](https://zod.dev/) schema, then `z.infer<>` the type
- Immutable data; pure functions; no nested if/else (use early returns)
- Functional components only in React; no class components

## Test requirements

Every package uses **Vitest** (`vitest run`). The React apps and `lib.components` add React Testing Library on top. Use the `npm test` / `npm run test:watch` / `npm run test:coverage` scripts defined in each package.

Tests must cover **behaviour**, not implementation. 100% coverage is expected but tests must always be grounded in business requirements, not internal structure.

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
- The `test-e2e` job currently has `continue-on-error: true` — failures are surfaced but do not block merge. This will be removed once the suite has 10 consecutive green runs on `main` (see ADS-386).

### Selector guidelines

- Prefer `data-testid` attributes and ARIA role queries over CSS selectors.
- Use `getByRole`, `getByLabel`, `getByTestId` in that order of preference.
- Add deterministic waits (`waitForURL`, `waitForSelector`, `expect(locator).toBeVisible()`) instead of arbitrary `page.waitForTimeout` calls.
