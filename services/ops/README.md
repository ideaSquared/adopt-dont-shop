# service.ops

## Purpose

The server half of the `ads-ops` developer CLI. Authenticates developers (GitHub device flow plus
team membership), invokes allow-listed gRPC RPCs on the domain services with a least-privilege
principal it mints itself, previews writes before they run, masks PII fail-closed, and runs
break-glass unlocks with an audit trail and a Discord alert. Owns the `ops` schema. HTTP only: it
is a gRPC **client** of every domain service and exposes no gRPC server.

## Location in the architecture

```
ads-ops CLI --HTTP/JSON--> service.ops --gRPC (x-principal-token)--> services/<name>
```

Reached over an SSH tunnel for staging and prod; published on host loopback only (dev 4100,
staging 4101, prod 4102), never behind nginx. It holds `PRINCIPAL_SIGNING_KEY` so the key never
reaches a laptop. For every call it mints a principal with **no roles**, `userId` = the operator's
uuid, only the permissions the registry entry declares, and a `rescueId` from the entry's `scope`.
The HTTP contract is `packages/ops-contract/src/index.ts`; every request body is parsed and every
response validated with its schemas.

## Scripts

```bash
pnpm dev          # tsx watch
pnpm build        # tsc
pnpm start        # run the built server
pnpm test         # Vitest
pnpm db:migrate   # run pending migrations (ops schema)
pnpm lint
pnpm type-check
```

## Running locally

In the Docker dev stack this runs as container `service-ops` with `OPS_AUTH_MODE=local`, published
on `127.0.0.1:4100` (no tunnel, no GitHub):

```bash
pnpm bootstrap                          # once: provisions PRINCIPAL_SIGNING_KEY, which ops requires
pnpm docker:dev:detach                  # start the whole stack
docker compose logs -f service-ops      # follow just this service
curl localhost:4100/health/ready        # readiness probe
pnpm ops login && pnpm ops pets         # drive it with the CLI
```

## Environment variables consumed

| Variable                                                         | Notes                                                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `OPS_ENV`                                                        | **Required**: `dev`, `staging` or `prod`. Never inferred.                                                                              |
| `OPS_HTTP_PORT`                                                  | Default `4100` (inside the container).                                                                                                 |
| `DATABASE_URL`, `NATS_URL`, `NATS_AUTH_TOKEN`                    | As other services.                                                                                                                     |
| `PRINCIPAL_SIGNING_KEY` / `_FILE`                                | **Required in every environment**, at least 32 bytes. Roleless principals only work signed.                                            |
| `OPS_AUTH_MODE`                                                  | `github` (default) or `local`. `local` throws unless `NODE_ENV=development` and `OPS_ENV=dev`.                                         |
| `OPS_GITHUB_CLIENT_ID`, `OPS_GITHUB_ORG`, `OPS_GITHUB_TEAM`      | Required in github mode. Device flow must be enabled on the OAuth app; scope `read:org`.                                               |
| `OPS_DISCORD_WEBHOOK_URL` / `_FILE`                              | Required for unlocks on staging/prod (`UNLOCKS_DISABLED` otherwise). The alert is posted first; if it fails the unlock is not granted. |
| `OPS_SESSION_TTL_HOURS`                                          | Default `8`.                                                                                                                           |
| `AUTH_GRPC_URL`, `PETS_GRPC_URL`, ... (gateway's names/defaults) | gRPC targets.                                                                                                                          |

## REST / gRPC contract

Every `/v1/*` route (login included) requires the `x-ops-expected-env` header
(`EXPECTED_ENV_HEADER`) and it must equal this service's `OPS_ENV`; otherwise the response is
`FAILED_PRECONDITION` (412) before authentication or any other work, so a tunnel pointed at the
wrong stack cannot log in, read or unlock. `/health/*` and `/metrics` are exempt.

Operators are identified by the stable GitHub account id: a rename updates the login on the same
operator, and a different account that later takes the old login gets a new operator (no old
unlocks or history). Local logins (dev only, no GitHub id) are keyed by login. Login and logout
each publish an `ops.actionTaken` event (`login` / `logout`: operator, login, auth mode, session
id; never the token or its hash) in the same transaction as the session row.

`POST /v1/login/start`, `/v1/login/poll`, `/v1/login/local` (local mode only), `/v1/logout`,
`GET /v1/whoami`, `GET /v1/catalog`, `GET /v1/history`, `POST /v1/invoke`,
`POST|GET|DELETE /v1/unlocks`, `DELETE /v1/unlocks/:unlockId`; plus `/health/simple`,
`/health/ready`, `/metrics`. Errors are always `ErrorResponse` with a hint.

### Invoke

- **Reads** run immediately and are masked.
- **Writes** preview by default and return a `plan`; executing needs the `planId` of a preview of
  the identical env + rpc + request by the same operator (10 minutes, single use). Prod execute also
  needs `confirm: 'prod'`.
- **Dry-run modes**: `rollback` sends `x-dry-run: 1` and requires the `x-dry-run-applied` echo
  (otherwise `INTERNAL`, and the write may have applied); `native` sets the request's own `dryRun`
  true for the preview and false on execute; `preview-only` calls nothing.
- **Unlocks** (`POST /v1/unlocks`): with a webhook configured, the Discord alert is posted
  before anything is recorded. A network error or non-2xx means no unlock and `UNLOCKS_DISABLED`
  ("Could not alert #ops, so the unlock was not granted"). Dev without a webhook records the unlock
  with no alert.
- **PII lookups** (a registry `piiRequestFields` field set) need an active unlock.
- **Masking** follows the proto `sensitivity` option (see `src/masking.ts`); hidden values become
  `{"$hidden": true}`. An unlock matching the registry `subject` (or `any`) reveals them and logs
  the field names.
- Every invoke appends a row to the hash-chained `ops.access_log`; if it cannot be written the
  response is withheld. Reveals and write executions also emit `ops.actionTaken`.

### Registry

`src/registry.ts` is the allow-list. Each entry was checked against the handler's permission call.

| RPC                                    | Kind  | Permission                           | Dry run  |
| -------------------------------------- | ----- | ------------------------------------ | -------- |
| `pets.Get` / `pets.List`               | read  | `pets.read`                          |          |
| `pets.GetStats`                        | read  | `pets.read` (rescueIdFilter needed)  |          |
| `rescue.Get`                           | read  | `rescues.read`                       |          |
| `applications.List`                    | read  | `applications.read` (rescueIdFilter) |          |
| `auth.AdminGetUser`                    | read  | `admin.users.read`                   |          |
| `auth.SearchUsers`                     | read  | `admin.users.search`                 |          |
| `auth.AdminListSessions`               | read  | `admin.security.read`                |          |
| `audit.Query` / `audit.GetByTarget`    | read  | `admin.audit_logs`                   |          |
| `moderation.GetReport` / `ListReports` | read  | `moderation.reports.view`            |          |
| `notifications.ListEmailTemplates`     | read  | `email.templates.read`               |          |
| `pets.UpdateStatus`                    | write | `pets.manage:any`                    | rollback |
| `auth.DeactivateUser`                  | write | `admin.users.deactivate`             | rollback |
| `auth.ReactivateUser`                  | write | `admin.users.reactivate`             | rollback |
| `notifications.Broadcast`              | write | `notifications.broadcast`            | native   |
| `demo.CreateRescue` (dev, staging)     | write | per step, see below                  | preview  |
| `demo.DeleteRescue` (dev, staging)     | write | per step, see below                  | preview  |

The two `demo.*` entries are handled in-process (`local`, `src/demo-rescue.ts`): each step calls
an existing RPC with its own principal holding only that handler's permissions.

- **CreateRescue:** `auth.RegisterRescueOwner` (none), `auth.AdminUpdateUser`
  (`admin.users.update`), `rescue.RegisterRescue` (none), `rescue.Verify`
  (`admin.security.manage`), `pets.Create` (`pets.create` + `pets.manage:any`, rescue-scoped).
  The generated owner email and password are shown in the execute result only (`revealOnExecute`);
  they are not in the plan, the access log or any event. A failed step names what was created.
- **DeleteRescue:** refuses a rescue whose email is not a generated `demo-…@example.com`. Then
  `rescue.ListStaffMembers` (`admin.security.manage`), `auth.AdminGetUser` (`admin.users.read`),
  `pets.List` (`pets.read`) and `pets.Delete` (`pets.delete` + `pets.manage:any`) for every pet,
  `rescue.Delete` (`admin.security.manage`), and `auth.DeactivateUser`
  (`admin.users.deactivate`) for staff with demo emails only.

## Schema (`ops`)

`operators` (`github_id` unique; `github_login` unique only among local operators), `sessions` (token sha256 only), `plans`, `unlocks`, `access_log` (append-only; row
triggers reject UPDATE/DELETE and a statement trigger rejects TRUNCATE, no bypass), `event_outbox`.
Migrations: `src/migrations/001`-`006`.

## Testing notes

Behaviour-level Vitest through Fastify `inject` with an in-memory store, scripted gRPC and fetch
(`src/test-support.ts`); no network. The registry test asserts every entry exists in the generated
`PROTO_SCHEMA`. `src/pg-store.integration.test.ts` runs the real migrations and store SQL against
Postgres (single-use plans under a race, hash-chained concurrent access-log appends, append-only
trigger); it is skipped unless `DATABASE_URL` is set — see `docs/testing.md`.

## Ownership

See [`.github/CODEOWNERS`](../../.github/CODEOWNERS) for the current owner of
`/services/`.
