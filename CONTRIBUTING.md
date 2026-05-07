# Contributing to Adopt Don't Shop

See `CLAUDE.md` for the full development guidelines including TDD, TypeScript strict mode, and monorepo conventions.

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
