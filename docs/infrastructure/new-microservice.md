# Add a new microservice

`scripts/create-new-app.js` (see [`new-app-generator.md`](./new-app-generator.md))
scaffolds a new React app but explicitly punts on the backend: "add a new
backend domain by creating a new service there, not via this generator."
This is that follow-up. There's no generator for services yet
(`scripts/create-new-service.js` would be a good follow-up, out of scope
here) — this is the manual walkthrough.

**Reference example throughout:** `services/cms/` — the smallest existing
service (13 source files), and a good template because it's a plain CRUD +
workflow domain with no unusual dependencies. `services/audit/` is a good
second reference if you want to see a slightly larger example.

> While writing this guide we found `service-cms` was missing its
> `docker-compose.yml` entry entirely — it existed in the codebase, was
> wired into the gateway's config and the deploy pipeline, but had no local
> dev container, so it silently never started under `pnpm docker:dev`. That
> gap is now fixed; it's a good illustration of exactly the failure mode
> this runbook exists to prevent — a step that's easy to skip because
> nothing fails loudly when you miss it.

## 1. Choose a name and port

Services are numbered `services/<name>/`, and each gets an HTTP health port
in the `500N` range with a matching gRPC port at `600N` (same N). The
current allocation (from `docker-compose.yml` and each service's
`src/config.ts`):

| Service               | HTTP (health) | gRPC                                 |
| --------------------- | ------------- | ------------------------------------ |
| service-gateway       | 4000          | — (REST/WS edge, not a gRPC service) |
| service-notifications | 5001          | 6001                                 |
| service-auth          | 5002          | 6002                                 |
| service-pets          | 5003          | 6003                                 |
| service-rescue        | 5004          | 6004                                 |
| service-applications  | 5005          | 6005                                 |
| service-chat          | 5006          | 6006                                 |
| service-moderation    | 5007          | 6007                                 |
| service-matching      | 5008          | 6008                                 |
| service-audit         | 5009          | 6009                                 |
| service-cms           | 5010          | 6010                                 |

The next new service is **5011 / 6011**. Update this table when you add one.

## 2. Scaffold `services/<name>/`

Copy the shape of `services/cms/`:

```
services/<name>/
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
  src/
    index.ts            # process entry point — connects NATS/DB, starts gRPC + HTTP
    config.ts            # loadConfig(): env parsing, DEFAULT_PORT/DEFAULT_GRPC_PORT
    server.ts             # createServer(): Fastify HTTP server (health checks) via
                           # @adopt-dont-shop/service-bootstrap's createMicroserviceServer
    db/
      migrate.ts           # db:migrate entry — see docs/backend/writing-migrations.md
    grpc/
      server.ts            # startGrpcServer(): binds the generated *ServiceService to handlers
      adapter.ts            # maps proto request/response <-> handler types
      handlers.ts           # the actual business logic (see step 5)
      principal.ts           # auth/permission helpers for this domain
    migrations/
      001_create_<table>.ts  # see docs/backend/writing-migrations.md
    gdpr/
      erase.ts              # registerGdprSubscriber callback — required if you store user data
```

`package.json` — copy `services/cms/package.json` and rename. Notable
fields:

- `"name": "@adopt-dont-shop/service.<name>"` (dot, not hyphen)
- `"main"`/`"exports"` point at `src/server.ts` (not `dist/`) — services run
  via `tsx` in dev; the build output is only used by the production Docker
  image
- `dependencies` always include `@adopt-dont-shop/{authz, config-secrets,
db, events, lib.types, observability, proto, service-bootstrap}`,
  `@grpc/grpc-js`, `fastify`, `nats`, `node-pg-migrate`, `pg`, `winston`
- Standard scripts: `dev` (`tsx watch ./src/index.ts`), `start` (compiled),
  `db:migrate`, `build` (`tsc`), `test`/`test:coverage`, `lint`, `type-check`

## 3. Proto + gRPC stub generation

1. Add `packages/proto/proto/adopt_dont_shop/<name>/v1/<name>.proto`. Look at
   `cms/v1/cms.proto` for the shape: one `service <Name>Service { rpc ... }`
   block, request/response messages per RPC, a comment block describing what
   schema the service owns and what NATS events it publishes.
2. Run `pnpm --filter @adopt-dont-shop/proto build` (`buf generate && tsc`).
   This is hermetic — codegen runs the local `ts_proto` plugin
   (`packages/proto/buf.gen.yaml`), no network call to buf.build. Output
   lands in `packages/proto/src/generated/proto/adopt_dont_shop/<name>/`.
3. `buf.yaml` lints + breaking-change-checks every `.proto` in the module —
   fix any lint errors before committing (`pnpm --filter @adopt-dont-shop/proto lint`
   if that script exists, or `buf lint` from `packages/proto/`).

## 4. First migration

There's no Sequelize layer in the extracted services — migrations are
**node-pg-migrate**, explicit `pgm.createTable(...)` calls, no
`sync()`/baseline step. See
[`docs/backend/writing-migrations.md`](../backend/writing-migrations.md)
for the full guide (numbering, `up`/`down`, testing, failure recovery). Your
first migration is just `001_create_<your_table>.ts` — look at
`services/cms/src/migrations/001_create_cms_content.ts` for the shape.

`src/db/migrate.ts` is boilerplate — copy `services/cms/src/db/migrate.ts`
verbatim and swap the `serviceName` string; it just points
`@adopt-dont-shop/db`'s `runMigrations()` at `../migrations`.

**If your service publishes any NATS events** (almost all do), it also needs an
`event_outbox` table in its own schema — the transactional outbox
`withTransaction` stages events into (ADS-1048). Add a migration that re-exports
the shared DDL, exactly like `services/cms/src/migrations/004_create_event_outbox.ts`:

```typescript
export { up, down } from '@adopt-dont-shop/events/outbox-schema';
```

Then start the relay once at boot (step 5).

## 5. gRPC handlers: error + audit patterns

Handlers live in `src/grpc/handlers.ts` as plain async functions
`(deps, principal, request) => response`, matching the pattern in
`services/auth/src/grpc/handlers.ts` and `services/cms/src/grpc/handlers.ts`:

- Throw `HandlerError('NOT_FOUND' | 'PERMISSION_DENIED' | ...,  message)`
  for expected failures — the gRPC adapter maps these to gRPC status codes.
  Grep `HandlerError` in any existing service's `grpc/handlers.ts` for the
  pattern (e.g. `services/cms/src/grpc/handlers.ts`).
- Permission gates live in the handler: `requirePermission(principal, PERMISSION)`
  from `@adopt-dont-shop/authz` (constants from `@adopt-dont-shop/lib.types`,
  never inlined). The gateway does not enforce domain permissions.
- State-changing handlers run their DB write + NATS publish inside
  `withTransaction` from `@adopt-dont-shop/events` so events only fire
  after commit (publish-after-commit — see any `handlers.ts` for the
  `withTransaction(deps, async ({ client, publish }) => {...})` shape).
- **Audit logging** — there is **no** `AuditLogService.log()` and **no**
  `auditRoute()` middleware (those were the deleted monolith). For any action
  that needs a forensic trail, `publish({ type: '<domain>.actionTaken', … })`
  from inside the `withTransaction` block; `services/audit` consumes the
  wildcard `*.actionTaken` and persists it. Never write to `audit.audit_events`
  directly, and never emit the audit event from the gateway. See the
  `audit-logging` skill for the payload shape.
- **Outbox relay** — start it once at boot in `index.ts`:
  `const relay = startOutboxRelay({ pool, nats, logger });` and `relay.stop()`
  on shutdown (copy `services/cms/src/index.ts`). Without it, events staged in
  `event_outbox` are only best-effort published on the inline path and never
  swept if that misses.
- If your service stores any user-linked data, register a GDPR erasure
  subscriber (`src/gdpr/erase.ts`, wired in `index.ts` via
  `registerGdprSubscriber`) — see `services/cms/src/gdpr/erase.ts`.

## 6. Gateway registration

The gateway (`services/gateway/src/server.ts`) wires each domain in three
places — follow the `cms` wiring as the template:

1. **gRPC client** — `services/gateway/src/grpc-clients/<name>-client.ts`
   (see `cms-client.ts`), a thin wrapper constructing the generated
   `<Name>ServiceClient` against `<NAME>_GRPC_URL` (default
   `service-<name>:600N`, see `config.ts`'s `DEFAULT_CMS_GRPC_URL` pattern).
2. **Routes** — `services/gateway/src/routes/<name>.ts` exporting
   `register<Name>Routes(server, { client })`, mapping REST endpoints under
   `/api/v1/<name>/*` to gRPC calls (see `routes/cms.ts`).
3. **Server wiring** — in `server.ts`: import the client type and the route
   registrar, add an optional `<name>Client?: <Name>Client` field to the
   server options (optional so the gateway still boots if the service isn't
   configured), and register the routes conditionally:
   ```ts
   if (opts.cmsClient) {
     await registerCmsRoutes(server, { client: opts.cmsClient });
   }
   ```
4. **Pact contract test** — add
   `services/gateway/src/grpc-clients/<name>-client.contract.test.ts`
   (mirror `cms-client.contract.test.ts`) so the consumer↔provider contract is
   pinned. The gateway's `test:contracts:consumer` / `test:contracts:provider`
   scripts and the root `pacts/` directory pick it up.

## 7. Wire the service into every pipeline file

This is the step that's easy to half-do — a new service must be added to
**every** file below or it silently never starts, never builds, never deploys,
or never gets health-checked. `Dockerfile.service` is a single parameterised
Dockerfile shared by every service, so you never create a new one; you add the
service to each list. Worked example: everywhere `service-cms` / `cms` already
appears is exactly the set you must touch. One line per file:

| File                                       | What to add (mirror the `cms` line)                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`                       | The dev-container `service-<name>:` block (build args `SERVICE` / `SERVICE_DIR`, `<<: *ms-env`, `ports: ['127.0.0.1:500N:500N']`, healthcheck on `/health/simple`), right before the `volumes:` section. |
| `docker-compose.dev.yml`                   | The `service-<name>:` overlay block (migrate-then-`dev` command), **and** the service's `node_modules` anonymous-volume line in the shared `*dev-volumes` list (`- /app/services/<name>/node_modules`).  |
| `docker-compose.prod.yml`                  | The `service-<name>:` block: pinned `image:` (`…/service-<name>:${SERVICE_<NAME>_TAG:-…}`) and `container_name: ads_prod_<name>`.                                                                        |
| `docker-compose.staging.yml`               | Same block as prod, `container_name: ads_staging_<name>`.                                                                                                                                                |
| `.github/workflows/docker.yml`             | Add `- <name>` to the image build matrix.                                                                                                                                                                |
| `.github/workflows/release.yml`            | Add the `{ name: service-<name>, pkg: '@adopt-dont-shop/service.<name>', dir: services/<name> }` matrix entry.                                                                                           |
| `.github/workflows/deploy.yml`             | Add the service to **all four** lists: the image manifest line, the `docker compose pull` service list, the up/restart service list, and the `wait-for-services` host:port list (`service-<name>:500N`). |
| `.github/workflows/rollback.yml`           | Add `service-<name>` to the rollback health-check service list.                                                                                                                                          |
| `.github/workflows/schema-equivalence.yml` | Add `<name>` to the `for svc in …` schema loop.                                                                                                                                                          |
| `package.json` (root)                      | Add `service-<name>` to the `docker:logs:services` script's service list.                                                                                                                                |

`.env.example` doesn't need a new entry for the common case — services resolve
their gRPC URL to `service-<name>:600N` by default (the Docker Compose network
alias). Only add one if your service needs a var no shared pattern covers
(e.g. a third-party API key); if so, also document it in
[`docs/env-reference.md`](../env-reference.md).

Close the loop with a grep — every file above should show your service, exactly
as `cms` does:

```bash
grep -rn "service-<name>\|<name>" \
  docker-compose*.yml .github/workflows/ package.json
```

## 8. Docs index

A new service is not done until the docs point at it:

- Add a row to the index table in [`services/README.md`](../../services/README.md)
  (npm name, HTTP + gRPC ports, schema, one-line purpose, key deps).
- Add the port pair to the table in **step 1** of this file, and bump "the next
  new service is 501(N+1) / 601(N+1)".
- Write `services/<name>/README.md` from
  [`docs/templates/README.service.md`](../templates/README.service.md) — every
  templated heading (including `## Running locally`) is enforced by
  `scripts/check-readmes.mjs`, so run `node scripts/check-readmes.mjs` before you
  commit.
- Document any new env var in [`docs/env-reference.md`](../env-reference.md).

## 9. Local smoke test

```bash
pnpm --filter @adopt-dont-shop/proto build   # regenerate stubs
pnpm docker:dev:build                        # rebuild images (new service = new Dockerfile.service target)
docker compose --profile full up -d
docker compose logs -f service-<name>        # or: pnpm docker:logs (see docs/DOCKER.md)
curl http://localhost:500N/health/simple     # should return 200 once migrations + boot finish
```

Then hit the gateway route you registered in step 6
(`curl http://localhost:4000/api/v1/<name>/...`) to confirm the full request
path — gateway → gRPC client → your handler → Postgres — works end to end.
