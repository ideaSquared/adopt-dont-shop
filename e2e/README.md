# @adopt-dont-shop/e2e

Behaviour-focused end-to-end tests for the adopt-dont-shop monorepo, driven by [Playwright](https://playwright.dev/).

The suite exercises real user journeys across the three React apps (`app.client`, `app.rescue`, `app.admin`) and the `service.backend` API. Tests assert on **user-observable outcomes** (visible text, route changes, API responses) rather than on component internals — those concerns are covered by the per-package Vitest suites.

## Layout

```
e2e/
├── playwright.config.ts          # projects per app + storageState wiring
├── global-setup.ts               # waits for the stack, then UI-logs in once per role
├── global-teardown.ts
├── fixtures/
│   ├── api.ts                    # APIRequestContext helpers (login, role tokens)
│   ├── index.ts                  # `test` extended with `apiAs` and `asRole`
│   └── roles.ts                  # seeded role credentials (DevPassword123!)
├── helpers/
│   ├── application.ts            # fillApplicationForm, submitApplication, ...
│   ├── auth.ts                   # loginViaUI, logoutViaUI
│   ├── factories.ts              # uniqueEmail/petName/text — collision-proof data
│   ├── pet.ts                    # gotoDiscover, searchForPet, openFirstPet, ...
│   └── selectors.ts              # data-testid constants (used as a fallback only)
└── tests/
    ├── client/                   # adopter journeys (app.client :3000)
    ├── rescue/                   # rescue staff journeys (app.rescue :3002)
    └── admin/                    # platform admin journeys (app.admin :3001)
```

## Selector strategy

Specs prefer Playwright's semantic locators in this order:

1. `getByRole(...)` / `getByLabel(...)` / `getByPlaceholder(...)` — accessible-by-construction.
2. `getByText(...)` — when copy is the user-visible signal (status badges, confirmations).
3. `data-testid` (via `helpers/selectors.ts`) — last resort, only when semantics aren't enough.

This keeps tests resilient to markup changes and surfaces accessibility regressions automatically.

## Authentication

`global-setup.ts` performs a real UI login once per role and saves session state to:

- `e2e/.auth/adopter.json` — `john.smith@gmail.com`
- `e2e/.auth/rescue.json` — `rescue.manager@pawsrescue.dev`
- `e2e/.auth/admin.json` — `superadmin@adoptdontshop.dev`

All seeded users use the password `DevPassword123!` from `service.backend/src/seeders/04-users.ts`.

Each project (`client`, `rescue`, `admin`) reuses its role's storageState. Specs that need to test login/registration itself live in the `*-anon` projects with no storageState. Cross-app journeys use the `asRole(...)` fixture to spin up a second authenticated context for a different role.

## Running locally

```bash
# One-time
npm install
npm run test:e2e:install         # downloads chromium

# Bring up the stack
npm run docker:dev:detach
npm run db:reset                 # migrate + seed

# Run the suite
npm run test:e2e
npm run test:e2e -- --project=client
npm run test:e2e -- tests/client/adoption-application.spec.ts
npm run test:e2e:ui              # interactive
npm run test:e2e:debug           # PWDEBUG inspector
npm run test:e2e:report          # open the HTML report

# Skip global health-check / auth setup (e.g. when stack is already up)
E2E_SKIP_HEALTH=1 E2E_SKIP_AUTH=1 npm run test:e2e
```

## Environment overrides

| Variable | Purpose | Default |
| --- | --- | --- |
| `E2E_API_URL` | service.backend base URL | `http://localhost:5000` |
| `E2E_CLIENT_URL` | app.client base URL | `http://localhost:3000` |
| `E2E_ADMIN_URL` | app.admin base URL | `http://localhost:3001` |
| `E2E_RESCUE_URL` | app.rescue base URL | `http://localhost:3002` |
| `E2E_ADOPTER_EMAIL` / `E2E_RESCUE_EMAIL` / `E2E_ADMIN_EMAIL` | Override seeded login emails | seeded users |
| `E2E_SEED_PASSWORD` | Override seeded password | `DevPassword123!` |
| `E2E_SKIP_HEALTH` | Skip the global health probe | unset |
| `E2E_SKIP_AUTH` | Skip the global UI login (reuse cached `.auth/*.json`) | unset |
| `E2E_RUN_ID` | Stamp used in unique fixture data | `local` (CI sets a unique id) |

## Adding a new spec

1. Pick the right `tests/<app>/` folder. Name the file by **behaviour**, e.g. `adopter-favourites-and-applies.spec.ts`.
2. Import from `'../../fixtures'` to get the extended `test`/`expect` and helpers.
3. Use semantic locators first; only fall back to test-ids in `helpers/selectors.ts`.
4. Keep mutating tests **collision-proof** — generate names/emails via `helpers/factories.ts`.
5. For cross-app journeys, use the `asRole('rescue' | 'adopter' | 'admin')` fixture to open a second authenticated browser context.

## CI

The `test-e2e` job in `.github/workflows/ci.yml` runs after `test-backend` and `test-frontend` succeed. It:

1. Boots the stack with `docker-compose.yml` + `docker-compose.ci.yml`.
2. Waits for `:5000/health`, `:3000`, `:3001`, `:3002`.
3. Runs migrations and seeds inside the backend container.
4. Executes `npm run test:e2e`.
5. Uploads `e2e/playwright-report/`, `e2e/test-results/`, and `docker-compose.log` as artifacts.
