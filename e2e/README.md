# @adopt-dont-shop/e2e

Behaviour-focused end-to-end tests for the adopt-dont-shop monorepo, driven by [Playwright](https://playwright.dev/).

The suite exercises real user journeys across the three React apps (`app.client`, `app.rescue`, `app.admin`) and the gateway API. Tests assert on **user-observable outcomes** (visible text, route changes, API responses) rather than on component internals — those concerns are covered by the per-package Vitest suites.

> **Phase 11 status (post-monolith) — incremental un-park.** The auth rework landed in #1076: the gateway↔SPA contract (Bearer tokens, the `/me` envelope, and proto-enum casing) is aligned, so `global-setup` can drive a real UI login per role and snapshot storageState. The legacy app-driven projects are now being **un-parked one journey at a time** rather than all at once — each spec is validated in CI (the `run-e2e` PR label, and the full suite on push to `main`) before being added to the `UNPARKED` allowlist in `playwright.config.ts`, so `main` gates on real coverage without going red on un-vetted specs.
>
> **Un-parked so far:**
> - `gateway-smoke` — gateway health + seeded-persona login (always on).
> - `client/registration-and-login.spec.ts` — the `@smoke` public-registration + failed-login journey (runs unauthenticated).
> - `client/adoption-application.spec.ts` — the `@smoke` full adoption journey (submit → rescue approves → adopter sees approval). The `apiAs` fixture and `seeds.ts` mutation helpers now authenticate with Bearer tokens (no CSRF), matching the gateway.
>
> **Still parked** (every other spec under `tests/client`, `tests/rescue`, `tests/admin`): un-park each by adding its glob to `UNPARKED[project]` once it passes in CI. Some non-auth specs (chat / moderation / cms / matching / notifications detail) may need follow-up gateway work — the same enum/envelope normalisation #1076 applied to auth likely applies to those domains' responses too.
>
> **Blocked on architecture, not yet un-parked** — these assert the monolith's CSRF + cookie-session model, which the Bearer-only gateway deliberately removed (there is no `GET /api/v1/csrf-token` endpoint and JWTs are stateless): `client/api-csrf-and-cookie-contract.spec.ts`, `client/logout-flow.spec.ts`, `client/rate-limit-application-submission.spec.ts`. `client/swipe-and-favourite.spec.ts` additionally needs a favourites seed in the pets service. Each needs a rewrite to the Bearer contract (and a seed) rather than a config flip. `rescue/custom-application-questions`, `admin/bulk-user-actions`, `admin/2fa-enrollment` need new gateway routes built (ADS-868).
>
> **`client/profile-update-persistence.spec.ts` — deferred, needs runtime debugging.** The whole server path is wired (the SPA submits `bio`; the gateway `PUT /users/profile` maps it; `account-handlers` persists it; `GET /auth/me` returns it via `withApiUser`), yet the bio does not round-trip back into the edit form after a reload (the assertion timed out across all CI retries). The likely cause is the client hydrating a stale cached user rather than refetching `/me` — confirm at runtime before un-parking (ADS-868).

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
│   ├── seeds.ts                  # seed data helpers for test setup
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

All seeded users use the password `DevPassword123!`. The personas are defined in `services/auth/src/db/seed-data.ts` (with matching rescue/pet fixtures in `services/rescue/src/db/seed-data.ts` and `services/pets/src/db/seed-data.ts`) and inserted by the per-service `db:seed` scripts — see [Seeding the stack](#seeding-the-stack) below.

Each project (`client`, `rescue`, `admin`) reuses its role's storageState. Specs that need to test login/registration itself live in the `*-anon` projects with no storageState. Cross-app journeys use the `asRole(...)` fixture to spin up a second authenticated context for a different role.

## Running E2E Locally

End-to-end tests need the full Docker stack (backend + three React apps + Postgres + Redis) running and seeded. The commands below are the exact sequence used in development.

```bash
# 1. One-time setup
pnpm install
pnpm test:e2e:install                              # downloads chromium

# 2. Bring up the stack (detached so the terminal stays free)
pnpm docker:dev:detach

# 3. Wait until every service is healthy
#    Poll the four endpoints the suite depends on. The CI workflow does the
#    same wait — see `.github/workflows/ci.yml` ("Wait for services").
for url in \
  http://localhost:4000/health/simple \
  http://localhost:3000 \
  http://localhost:3001 \
  http://localhost:3002; do
  echo "Waiting for $url"
  until curl -fsS --max-time 5 "$url" >/dev/null 2>&1; do sleep 2; done
done

# 4. Seed the database with the canonical personas + reference data.
#    Each microservice migrates its own schema on boot; `db:seed` populates
#    the dev/e2e fixtures (idempotent — safe to re-run). See "Seeding the
#    stack" below. The dev Docker image also runs this automatically on
#    container start, so step 4 is only needed if you bypass that.
pnpm db:seed

# 5. Run the suite
pnpm test:e2e                                      # full suite
pnpm test:e2e:smoke                                # @smoke subset only
pnpm test:e2e -- --project=client                  # one Playwright project
pnpm test:e2e:single -- tests/client/adoption-application.spec.ts
pnpm test:e2e:single -- tests/auth.spec.ts --headed

# Skip global health-check / auth setup when the stack is already up and
# `.auth/*.json` exists from a previous run.
E2E_SKIP_HEALTH=1 E2E_SKIP_AUTH=1 pnpm test:e2e
```

The `test:e2e:single` script forwards all arguments straight through to Playwright in the `e2e` workspace, so any Playwright flag works (`--headed`, `--debug`, `--repeat-each=3`, `--grep "approves"`, etc.).

## Seeding the stack

The microservice stack ships no data on a fresh boot. The dev/e2e seed recreates the canonical personas (so the suite can log in) plus enough reference data to exercise the golden path (browse a pet, view a rescue).

**How it runs:** each schema-owning service exposes a `db:seed` script (`tsx ./src/db/seed.ts`) that inserts directly into its own Postgres schema with idempotent `ON CONFLICT DO UPDATE` upserts. The dev Docker image runs `db:migrate` then `db:seed` on container start, so `pnpm docker:dev:detach` already produces a seeded stack. To (re-)seed an already-running stack by hand:

```bash
pnpm db:seed        # root orchestrator: docker compose exec into
                       # service-auth → service-rescue → service-pets,
                       # running each service's db:seed in dependency order
```

`pnpm db:seed` is safe to re-run at any time. Per-service overrides are available too (`docker compose exec service-auth pnpm db:seed`).

**Seeded personas** (all share the password `DevPassword123!`, override with `SEED_PASSWORD`):

| Email | Role | App |
| --- | --- | --- |
| `john.smith@gmail.com` | adopter | app.client |
| `emily.davis@yahoo.com` | adopter | app.client |
| `michael.brown@outlook.com` | adopter | app.client |
| `rescue.manager@pawsrescue.dev` | rescue_staff | app.rescue |
| `sarah.johnson@pawsrescue.dev` | rescue_staff | app.rescue |
| `maria@happytailsrescue.dev` | rescue_staff | app.rescue |
| `superadmin@adoptdontshop.dev` | super_admin | app.admin |
| `admin@adoptdontshop.dev` | admin | app.admin |
| `moderator@adoptdontshop.dev` | moderator | app.admin |

**Reference data:** two verified rescues (Paws Rescue, Happy Tails Rescue) with staff links, plus a small pet catalogue (available / pending / adopted / on-hold) attached to those rescues. Pet + adopter ids are pinned to the values `helpers/seeds.ts` expects.

**Verify login** against a running gateway (the gateway is exposed on
`localhost:4000` in the microservice stack):

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"john.smith@gmail.com","password":"DevPassword123!"}'
# → 200 with { "user": {...}, "tokens": { "accessToken": "...", ... } }
```

## Debugging Failures

Playwright is configured in `playwright.config.ts` to capture diagnostics automatically:

| Artefact | When it's captured | Where it lands |
| --- | --- | --- |
| `trace.zip` | `trace: 'on-first-retry'` | `e2e/test-results/<spec>/` |
| Screenshot | `screenshot: 'only-on-failure'` | `e2e/test-results/<spec>/` |
| Video (`.webm`) | `video: 'retain-on-failure'` | `e2e/test-results/<spec>/` |
| HTML report | always | `e2e/playwright-report/` |

Recommended workflow when something fails:

```bash
# Interactive runner — best for iterating on a single failing spec.
# Pick the spec from the left pane, watch it run, edit, hit re-run.
pnpm test:e2e:ui

# Step through with the Playwright Inspector (pauses at each action).
pnpm test:e2e:debug

# Re-open the last HTML report (failures, retries, attached traces/videos).
pnpm test:e2e:report

# Open a single trace.zip in the trace viewer.
pnpm exec playwright show-trace e2e/test-results/<spec-folder>/trace.zip
```

In CI the entire `e2e/playwright-report/` and `e2e/test-results/` directories — including traces, screenshots, and videos for any failed test — are uploaded as the `e2e-playwright-report` artefact (retained 7 days). Download it from the failing run's "Artifacts" section to debug CI-only failures locally with `pnpm exec playwright show-report e2e/playwright-report` and `pnpm exec playwright show-trace`.

The CI job also emits a workflow warning listing how many tests needed retries (`retries: 2` on CI, `0` locally), so flaky tests surface without having to open the report.

## Smoke vs Full Suite

CI splits the suite to keep PR feedback fast while still gating `main` on the full integration set. See `.github/workflows/ci.yml` (the "Run Playwright suite" step in the `test-e2e` job):

- **Pull requests** run `pnpm test:e2e:smoke` — Playwright is invoked with `--grep @smoke`, executing only tests whose title contains `@smoke`. This is the critical-journey subset and currently completes in roughly 3–5 minutes.
- **Push to `main` / `develop`** runs the full `pnpm test:e2e`. This is the integration gate before deploy.

Existing `@smoke` tests:

- `tests/client/registration-and-login.spec.ts` — _a new adopter can register via the public API_
- `tests/client/adoption-application.spec.ts` — _full adoption journey: submit application → rescue approves → adopter sees approval_

If you want broader PR coverage, the lever is to tag more specs as `@smoke` (see below) — the workflow itself does not need to change.

## Tagging tests as @smoke

A `@smoke` tag is just the literal string `@smoke` anywhere in the test title. Playwright's `--grep @smoke` matches on the title, so no config changes are needed:

```typescript
test('full adoption journey: submit application → rescue approves → adopter sees approval @smoke', async ({ ... }) => {
  // ...
});
```

Guidance on what to tag:

- **Tag** the one or two end-to-end journeys per app that, if broken, would block a release — e.g. register/login, the headline adoption flow, a rescue staff approving an application.
- **Tag** anything that exercises a cross-cutting concern (auth, payments, notifications) that other specs implicitly depend on.
- **Don't tag** edge cases, validation-error paths, or per-field UI behaviour — those belong in the full suite that runs on `main`.
- **Don't tag** long-running specs (multi-minute waits, large fixtures) — the smoke suite's value is its sub-5-minute turnaround on PRs.

Aim to keep the smoke suite under ~5 minutes total. If you tag a new spec, run `pnpm test:e2e:smoke` locally and confirm it still fits the budget.

## Environment overrides

| Variable | Purpose | Default |
| --- | --- | --- |
| `E2E_API_URL` | gateway base URL | `http://localhost:4000` |
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
2. Waits for `:4000/health/simple`, `:3000`, `:3001`, `:3002`.
3. Runs migrations and seeds inside the backend container.
4. Executes `pnpm test:e2e`.
5. Uploads `e2e/playwright-report/`, `e2e/test-results/`, and `docker-compose.log` as artifacts.
