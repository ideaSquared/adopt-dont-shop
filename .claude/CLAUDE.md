# CLAUDE.md

Adopt Don't Shop is a Turborepo + pnpm monorepo: three React apps, a Fastify gateway, ten gRPC
microservices, and shared packages. This file is the dispatcher. It holds the rules that apply
everywhere and points at the skill or doc that holds the rest. Skills under `.claude/skills/` are
normative and load on demand; package READMEs are code-verified; docs under `docs/` are
descriptive and may lag the code, so verify them against source before relying on them.

## 1. How to work here

- State assumptions before coding. If a requirement has more than one reading, present the
  options; do not pick silently. If something is unclear, stop and ask.
- Write the minimum code that solves the problem. No speculative abstractions, no configurability
  nobody asked for, no error handling for impossible cases.
- Touch only what the task needs. Match the surrounding style. Do not refactor, reformat, or
  "improve" adjacent code. Remove only the orphans your own change created; mention other dead
  code, do not delete it.
- Every change traces to the request, and every behaviour change ships with a test. Turn the task
  into a verifiable goal first (red test, green code, refactor), then loop until it is verified:
  `pnpm exec turbo test --filter=<package>` and `pnpm ci:local:quick` before you call it done.
- If a simpler approach exists, say so. Push back when warranted.

## 2. Repo map

```
adopt-dont-shop/
├── apps/                    # React 19 + Vite frontends
│   ├── admin/               #   app.admin  — admin dashboard        (port 3001)
│   ├── client/              #   app.client — public adoption portal (port 3000)
│   └── rescue/              #   app.rescue — rescue org portal      (port 3002)
├── services/                # Fastify gateway + gRPC microservices
│   ├── gateway/             #   REST/WS edge on port 4000 — the only HTTP surface
│   ├── auth/ pets/ rescue/ applications/ chat/
│   └── notifications/ moderation/ matching/ cms/ audit/
├── packages/
│   ├── lib.*/               #   frontend-shared libs (lib.api, lib.components, lib.types, …)
│   │                        #   see docs/libraries/README.md; lib.av-scan is service-only
│   ├── authz/ config-secrets/ db/ events/ observability/ proto/
│   ├── seed-faker/ service-bootstrap/ storage/ test-utils/
│   └── eslint-config-{base,node,react}/
├── e2e/                     # Playwright cross-app suite
├── docs/                    # descriptive docs, ADRs, runbooks
└── scripts/                 # host-side tooling (bootstrap, seed, ci checks)
```

Package scoping, all under `@adopt-dont-shop/`:

- Apps: `app.<name>` (`@adopt-dont-shop/app.admin`)
- Frontend libs: `lib.<name>` (`@adopt-dont-shop/lib.api`)
- Services: `service.<name>` (`@adopt-dont-shop/service.gateway`)
- Service-only shared packages: bare name (`@adopt-dont-shop/proto`, `@adopt-dont-shop/db`)

Reference workspace packages with the `workspace:*` protocol. Turbo orders builds via
`dependsOn: ["^build"]`, so `pnpm build` builds libs before apps without manual sequencing.
In dev, Vite aliases point at each lib's `src/`, so libs hot-reload without a build.

## 3. Commands

pnpm is pinned by `packageManager` in `package.json`; run `corepack enable` once.
Full script index: `docs/tasks.md` (or `pnpm tasks`). Dev-stack internals: `docs/DOCKER.md`.

```bash
# First run
pnpm bootstrap               # writes .env, generates secrets, validates env

# Docker dev (primary workflow — full stack with HMR)
pnpm docker:dev              # preflight + start all containers (foreground)
pnpm docker:dev:detach       # same, in background
pnpm docker:dev:build        # force-rebuild the shared dev image, then start
pnpm docker:down             # stop containers
pnpm docker:reset            # stop and wipe volumes (incl. DB)
pnpm docker:logs             # follow logs (also :gateway, :apps, :infra, :services)
pnpm docker:shell:db         # psql in the database container
pnpm db:seed                 # seed dev data — host-side orchestrator, stack must be running

# Native dev (no Docker for app code; you run Postgres + Redis yourself)
pnpm dev:services            # Postgres + Redis in Docker, detached
pnpm dev                     # everything via Turbo (apps + gateway + services)
pnpm dev:apps                # frontend apps only

# Quality
pnpm ci:local:quick          # format:check + lint + type-check (what the pre-push hook runs)
pnpm ci:local                # the full local CI mirror, incl. coverage and every check:* script
pnpm test                    # all tests (Vitest everywhere)
pnpm test:e2e                # Playwright suite (needs a running stack); test:e2e:smoke for @smoke
pnpm exec turbo test --filter=@adopt-dont-shop/service.gateway   # one package
pnpm exec turbo build --filter=@adopt-dont-shop/app.admin

# Database — each service migrates its own schema on container start.
docker compose exec service-auth pnpm db:migrate                  # by hand, one service
```

## 4. Hard rules

TypeScript

- Strict mode everywhere, including tests. No `any` (use `unknown`). No type assertions unless
  unavoidable, with a comment saying why. No `@ts-ignore` / `@ts-expect-error` without a reason.
- Prefer `type` over `interface`. Define a Zod schema first, then `z.infer` the type from it.
- Files are `kebab-case`; types `PascalCase`; functions `camelCase` verbs; true constants
  `UPPER_SNAKE_CASE`.

Code style

- Immutable data only. Small pure functions. Array methods over imperative loops.
- Early returns and guard clauses. No nested if/else; max two levels of nesting.
- Functional React components only. Server state lives in TanStack Query, never in
  hand-rolled `useState` + `useEffect` fetches.

Testing

- TDD: red, green, refactor. Tests describe business behaviour through public APIs and never
  reach into implementation details. No 1:1 test-file-per-source-file requirement.
- Coverage floors are ratcheted upward by `scripts/ratchet-coverage.mjs` and persisted per
  package. Never lower a floor; do not describe the target as "100%".
- Vitest everywhere; React Testing Library and MSW for the apps; Playwright in `e2e/`.

Backend

- Never modify a shipped migration. Add a new `NNN_snake_case.ts` file in the owning service.
- Never re-decode the JWT in a service handler. The gateway stamps the `Principal`; the handler
  calls `requirePermission(principal, PERMISSION)` itself. The gateway gate is not enough.
- Permission constants come from `@adopt-dont-shop/lib.types`
  (`packages/lib.types/src/types/rescue-permissions.ts`). Never inline permission strings.
- Never log secrets or PII except through the redaction helpers in
  `@adopt-dont-shop/observability` (`redactSecretFields`, `redactUrl`).
- State changes that need a forensic trail publish `<domain>.actionTaken` inside
  `withTransaction` so the event fires only on commit.

Commits

- Conventional Commits, checked by commitlint: `type(scope): imperative summary (ADS-NNN)`.
  The Linear ticket goes in the subject, as in `fix(gateway): reject blank tokens (ADS-1255)`.
- Every commit is a complete, working change with its tests. One feature or fix per PR.

## 5. Architecture in one screen

```
HTTP request
  → services/gateway        Fastify plugin in src/routes/<domain>.ts; validates the body,
                            builds gRPC metadata, no business logic
    → src/grpc-clients/     typed gRPC client per service
      → services/<name>     handler in src/grpc/*-handlers.ts: pure async fn
                            (deps, principal, request) → response
        → pg.Pool           raw parameterised SQL via @adopt-dont-shop/db
HTTP response               gateway maps HandlerError → grpc.status → HTTP status
                            (services/gateway/src/middleware/grpc-error.ts)
```

- No ORM, no Sequelize, no `models/` directory. Reads and writes are raw SQL.
- Each service owns exactly one Postgres schema (`auth`, `pets`, …). The connection's
  `search_path` is `<schema>, public`. No cross-schema foreign keys; store the other
  aggregate's UUID and enforce integrity application-side.
- Handlers throw `HandlerError` with one of `INVALID_ARGUMENT`, `UNAUTHENTICATED`,
  `PERMISSION_DENIED`, `NOT_FOUND`, `ALREADY_EXISTS`, `INTERNAL`; the per-service `adapter.ts`
  translates to grpc-js. `requirePermission` returns a boolean; the handler throws on `false`.
- Writes plus events go through `withTransaction(deps, async ({ client, publish }) => …)` from
  `@adopt-dont-shop/events`. Events are staged in a transactional outbox and relayed to NATS
  after commit. `services/audit` subscribes to `*.actionTaken` and persists every event.

```ts
export async function archivePet(deps: HandlerDeps, principal: Principal, req: ArchivePetRequest) {
  if (!requirePermission(principal, PETS_ARCHIVE, { rescueId: req.rescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_ARCHIVE}' required for this rescue`);
  }
  const { rows } = await deps.pool.query<PetRow>(`SELECT ... FROM pets.pets WHERE pet_id = $1`, [
    req.petId,
  ]);
  if (!rows[0]) throw new HandlerError('NOT_FOUND', 'pet not found');
  // write + publish inside withTransaction — see the audit-logging skill
}
```

Frontend: React 19 + Vite. Styles are vanilla-extract `.css.ts` files using the tokens in
`packages/lib.components/src/styles/theme.css.ts`. Server state is TanStack Query. All requests
go through `apiService` in `@adopt-dont-shop/lib.api`, which uses native `fetch` with
cookie-based auth (`credentials: 'include'`) and an automatic CSRF token; API failures surface
as `ApiError`.

## 6. Where to look

| Task                                        | Skill                      | Canonical source                                                        |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| First day / running the stack               | —                          | `docs/GETTING-STARTED.md`, `docs/DOCKER.md`                             |
| Contributing, CI gates, PR flow             | `commit-conventions`       | `CONTRIBUTING.md`, `.github/workflows/README.md`                        |
| New REST endpoint (proto → handler → route) | `backend-endpoint`         | `docs/backend/implementation-guide.md`, `docs/backend/api-endpoints.md` |
| Schema change                               | `db-migration`             | `docs/backend/writing-migrations.md`                                    |
| Audit trail for a state change              | `audit-logging`            | `services/audit/src/nats/event-types.ts`                                |
| Errors and HTTP status mapping              | `error-handling`           | `services/gateway/src/middleware/grpc-error.ts`                         |
| Field-level read/write masking (backend)    | `field-permissions`        | `docs/adr/0006-field-permission-enforcement.md`                         |
| Backend tests (handlers, routes)            | `backend-test`             | `docs/testing.md`, `docs/backend/testing.md`                            |
| Frontend tests (components, hooks, MSW)     | `frontend-test`            | `docs/testing.md`                                                       |
| Playwright journeys                         | `e2e-test`                 | `e2e/README.md`                                                         |
| Fetching or mutating server data            | `react-query`, `api-fetch` | `packages/lib.api/README.md`                                            |
| Forms, validation, submission               | `forms`                    | `packages/lib.components/README.md`                                     |
| Styling and theme tokens                    | `design-tokens`            | `DESIGN_TOKENS.md`                                                      |
| Accessibility of any JSX                    | `accessibility`            | `docs/ACCESSIBILITY.md`                                                 |
| Gating UI by permission                     | `permissions-frontend`     | `packages/lib.permissions/README.md`                                    |
| Feature flags (Statsig)                     | `feature-flags`            | `packages/lib.feature-flags/README.md`                                  |
| Dates, money, postcodes, phones             | `uk-localization`          | `docs/UK_LOCALIZATION.md`                                               |
| App layout, routing, providers              | —                          | `docs/frontend/app-shell.md`, `docs/frontend/technical-architecture.md` |
| New shared component                        | `new-component`            | `packages/lib.components/README.md`                                     |
| New `lib.*` package                         | `new-lib`                  | `docs/libraries/README.md`, `docs/templates/README.lib.md`              |
| New `app.*` package                         | `new-app`                  | `docs/templates/README.app.md`                                          |
| Docker images, containers, logs             | `docker-build`             | `docs/DOCKER.md`, `docs/runbooks/dev-stack-troubleshooting.md`          |
| Environment variables                       | —                          | `.env.example`, `docs/env-reference.md`                                 |
| Something is on fire in production          | —                          | `docs/runbooks/README.md`, `docs/operations/deploy.md`                  |
| Why is it built this way                    | —                          | `docs/adr/README.md`, `docs/infrastructure/MICROSERVICES-STANDARDS.md`  |
| Every pnpm script                           | —                          | `docs/tasks.md`                                                         |

`new-app`, `new-component`, `new-lib`, `backend-endpoint`, `db-migration` and `docker-build` are
invoked by a person (`/name`), not auto-loaded. Load a skill before writing code in its area.

## 7. Gotchas

- The dev image is Debian, not Alpine. Vite/rolldown and sharp ship glibc-only native bindings.
- One shared dev image bakes `node_modules`; containers bind-mount host source and re-expose the
  baked `node_modules` through anonymous volumes. The host's `node_modules` is never used inside
  a container (its pnpm symlinks are host-absolute), so `pnpm docker:dev:build` after lockfile
  changes.
- Redis is published on host port `6380`, not 6379 (Windows reserves it). Override with
  `REDIS_HOST_PORT` in `.env`.
- `pnpm docker:dev` uses the `dev` profile: apps, services, database, redis, nats. nginx and the
  monitoring stack only start with `--profile full`; `http://localhost/` is not served by default.
- Native `pnpm dev` runs on the host: set `DB_HOST=localhost` and `REDIS_HOST=localhost` in
  `.env` first (`.env.example` uses the Docker hostnames `database` / `redis`).
- The gateway owns no schema and has no `db:migrate`. Only the ten domain services migrate.
- `useFeatureGate(name)` returns `{ value }`, not a boolean.
- `apiService.get(url, params)` takes the query object as the second argument, not `{ params }`.
- `TextInput` is deprecated; use `Input` from `@adopt-dont-shop/lib.components`. `pnpm check:forms`
  ratchets the remaining raw-control and `TextInput` count downward and fails on any increase.
- Only `auth`, `pets`, `rescue`, `applications` and `chat` have a `db:seed`; `pnpm db:seed` runs
  them in that dependency order via `docker compose exec`.
