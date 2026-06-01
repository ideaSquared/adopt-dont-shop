---
name: e2e-test
description: >
  Playwright end-to-end testing patterns for the cross-app suite in /e2e. Apply
  when adding, modifying, or debugging spec files in e2e/tests/, fixtures, or
  helpers; or when the user asks about Playwright, role-based browser contexts,
  or full-stack journey tests.
---

# End-to-End Testing (Playwright)

The e2e suite lives in `/e2e/` and runs against the full stack (all three apps +
backend + Postgres). It complements per-package Vitest tests by exercising real
cross-app journeys ("rescue publishes pet → adopter sees it").

## Layout

```
e2e/
├── playwright.config.ts          # baseURLs, browser projects, timeouts
├── global-setup.ts               # builds .auth/<role>.json storage states
├── global-teardown.ts
├── fixtures/                     # shared `test` extensions
│   ├── index.ts                  # `apiAs`, `asRole`
│   ├── api.ts                    # ApiClient + loginViaApi
│   └── roles.ts                  # ROLES map → email, app URL, auth file
├── helpers/
│   └── seeds.ts                  # postWithCsrf, seed helpers
└── tests/
    ├── admin/                    # uses .auth/admin.json by default
    ├── client/
    └── rescue/
```

## Running

```bash
# From repo root (all three apps + backend must be running)
cd e2e
npm test                          # full suite
npm test -- admin/                # one app
npm test -- 2fa-enrollment        # one spec
npm run test:headed               # see the browser
npm run test:debug                # pause on failure
npm run report                    # open HTML report
```

The suite expects the full stack to be running. `docker compose up -d` first.

## The fixture system

Tests import `test` and `expect` from `../../fixtures`, NOT directly from
`@playwright/test`. The custom fixtures provide:

| Fixture | Purpose |
|---------|---------|
| `apiAs(role)` | Returns an `ApiClient` already authenticated as that role. Use for API contract tests and seed setup. |
| `asRole(role)` | Opens a fresh browser context authenticated as `role`. Use for cross-role journeys. |

```typescript
import { test, expect } from '../../fixtures';

test.describe('admin pet management', () => {
  test('admin can view all pets', async ({ apiAs, page }) => {
    const adminApi = await apiAs('admin');
    const res = await adminApi.context.get('/api/v1/pets');
    expect(res.ok()).toBe(true);

    await page.goto('/pets');
    await expect(page.getByRole('heading', { name: /pets/i })).toBeVisible();
  });
});
```

For tests in `tests/admin/`, the `page` fixture is already authenticated as
`admin` (via `storageState: AUTH_FILES.admin` in the project config). The
`apiAs`/`asRole` fixtures are for stepping outside that default.

## Roles

Defined in `fixtures/roles.ts`. Each role has:
- `email` + `password` for login
- `appUrl` — which app to navigate to
- `authFile` — the storage state path

Tests in `tests/<role>/` automatically use that role's storage state. Don't
log in manually inside a test — use the fixture.

## Selectors — by role, not by CSS

Playwright's `getByRole`, `getByLabel`, `getByText` mirror React Testing Library's
priority order. Use them for the same reason: tests survive styling changes and
exercise accessibility.

```typescript
// GOOD
await page.getByRole('button', { name: /save/i }).click();
await page.getByLabel(/email/i).fill('user@example.com');
await expect(page.getByText(/saved successfully/i)).toBeVisible();

// BAD — brittle
await page.locator('.save-btn-primary').click();
await page.locator('#email-input').fill('user@example.com');
```

Use `data-testid` only when there's no good semantic selector.

## API setup before UI assertions

Many journeys need pre-existing data (a published pet, a submitted application).
Seed via the API rather than driving the UI through setup:

```typescript
import { postWithCsrf } from '../../helpers/seeds';

test('adopter sees newly published pet', async ({ apiAs, page }) => {
  const rescueApi = await apiAs('rescue');
  const created = await postWithCsrf(rescueApi.context, '/api/v1/pets', {
    name: 'Buddy',
    species: 'dog',
    status: 'available',
  });
  const { data: pet } = await created.json();

  await page.goto('/search');
  await expect(page.getByText(pet.name)).toBeVisible();
});
```

`postWithCsrf` handles the CSRF token dance automatically — see the `api-fetch`
skill for why that matters.

## Timeouts

Defaults from `playwright.config.ts`:
- Test timeout: 60s
- `expect` timeout: 10s
- Action timeout: 10s
- Navigation timeout: 30s

Don't lower these per-test. If a test is flaky on timing, the right fix is
usually to wait for a specific UI state (`expect(...).toBeVisible()`), not a
raw `page.waitForTimeout()`.

```typescript
// BAD — fragile and slow
await page.waitForTimeout(2000);

// GOOD — waits for the actual state you care about
await expect(page.getByText(/loaded/i)).toBeVisible();
```

## Traces, screenshots, video

`playwright.config.ts` already enables:
- `trace: 'on-first-retry'` — full trace on retry
- `screenshot: 'only-on-failure'`
- `video: 'retain-on-failure'`

When a CI failure is unclear, download the artefact and open the trace viewer:
```bash
npx playwright show-trace path/to/trace.zip
```

## Best-effort assertions

Some tests guard against environmental drift (a previous run leaving state, a
flaky downstream service). The `2fa-enrollment.spec.ts` pattern shows the
acceptable approach: assert the load-bearing contract strictly, downgrade
optional round-trip steps to best-effort with a clear comment:

```typescript
// Best-effort enable + disable. If the server rejects (e.g. the
// code rolled, or some downstream step like AuditLogService.log
// fails internally), don't fail the whole test — the setup
// contract is the load-bearing assertion here.
```

Don't use this to paper over real flakes. If a test fails intermittently for a
fixable reason, fix the reason.

## Stability rules

- **Atomic tests** — each `test()` must work in isolation. No reliance on
  ordering between tests within a describe.
- **No shared mutable state** — if a test creates data, give it a unique
  identifier (`pet-${Date.now()}`) or clean up in `afterEach`.
- **No real-world dependencies** — never hit production APIs, Stripe live, real
  email providers. The local stack is the contract.
- **`fullyParallel: true`** is set — tests in the same file run sequentially but
  files run in parallel. Plan seed data accordingly.

## When NOT to write an e2e

E2E tests are expensive — slow, flaky-prone, hard to debug. Prefer:

| Pre-flight | Type |
|------------|------|
| Service business logic | Backend Vitest (`backend-test` skill) |
| Component rendering / interaction | Frontend Vitest + RTL (`frontend-test` skill) |
| API contract | Backend route test + supertest |
| Cross-app or auth-state journey | E2E |
| Real CSRF / cookie / proxy flow | E2E |

A failing e2e should usually indicate a missing cheaper test, not the only test.

## Common mistakes

- Importing `test` from `@playwright/test` instead of `../../fixtures` → loses
  the auth fixtures and CSRF helpers
- Logging in by driving the login form → slow, flaky. Use `apiAs` / role-based
  storage states
- CSS / data-testid selectors when a role/label would work
- `page.waitForTimeout()` instead of waiting on a UI state
- Test relies on a record created in a previous test → atomic test rule violated
- Hitting live external services
- Snapshotting full pages — every minor copy change breaks the test
- Forgetting to seed via API before driving UI — slow setup
- Writing an e2e for logic that a backend service test would cover
