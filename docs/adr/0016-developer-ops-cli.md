# ADR 0016 — Run developer operations through a server-side ops service and CLI

- Status: Accepted — implemented
- Date: 2026-11-08
- Scope: `services/ops` (`@adopt-dont-shop/service.ops`), `packages/ops-cli`, `packages/ops-contract`, the `sensitivity` field option in `packages/proto`, the dry-run adapter in `packages/service-bootstrap`, the `service-ops` blocks in `docker-compose*.yml`, and the deploy pipeline that ships them
- Linear: —
- Supersedes / Superseded by: —

## Context

There is no tooling for a developer to inspect or correct data in a running environment. Today the
options are `gh workflow run` (deploy, rollback, backup) and SSH to the host as the shared `deploy`
user, which sits in the `docker` group and so can do anything to every container, volume and secret.

Three facts make the obvious shortcuts unsafe:

- **The principal-signing key is one shared secret.** Every service verifies the HMAC-signed
  `x-principal-token` with the same `PRINCIPAL_SIGNING_KEY`
  ([internal gRPC trust model](../security/internal-grpc-trust.md)). Anyone who holds it can mint a
  token for any user with any role, including `super_admin`. It currently lives on the host and in
  the gateway, and that is the only reason it is safe.
- **No gRPC port is reachable from outside the Docker network.** Staging and production publish
  nothing but the gateway ([DEPLOYMENT-PLAN.md](../infrastructure/DEPLOYMENT-PLAN.md)). A laptop
  cannot call a service directly without either a new published port or a shell on the host.
- **Nothing classifies the data.** Responses from the services mix identifiers, free text, contact
  details and special-category data, and the proto files do not say which is which. A tool that
  prints "whatever the RPC returns" prints PII into terminals, shell history and screenshots.

The pressure is the ordinary one for a small team running a live service with applicant personal
data: a support case or a bad row needs a developer to look at, and sometimes change, production
state, and the only available answer is a root-equivalent shell with no per-person record.

## Decision

Add a developer CLI, `pnpm ops …`, backed by a new server-side service, `service-ops`, deployed in
each environment's stack. The CLI is a thin client; every decision is made on the server.

```
ads-ops CLI (laptop) --HTTP/JSON--> service-ops (in the env's stack) --gRPC--> services/<name>
   packages/ops-cli   SSH tunnel     services/ops: login, registry,         x-principal-token
                      (staging/prod) minted principal, dry-run, masking,    (+ x-dry-run: 1)
                                     unlocks, audit
```

1. **The signing key stays on the server.** Only `service-ops` holds it, and it mints a principal
   per call. The minted principal has **no roles**, only the permissions the registry entry for
   that RPC declares, and `userId` set to the operator's UUID. A compromised laptop yields at most
   a session token for that operator, never the key.
2. **Identity is GitHub.** Login uses the GitHub device flow. `service-ops` checks that the user is
   a member of `OPS_GITHUB_ORG` / `OPS_GITHUB_TEAM`, with one team per environment, so access to
   staging and to production are separate grants. Sessions last `OPS_SESSION_TTL_HOURS` (8). Dev
   uses `OPS_AUTH_MODE=local` (no GitHub), which the service refuses outside
   `NODE_ENV=development`.
3. **RPC exposure is an explicit allow-list.** The registry in `service-ops` names every RPC the
   tool may call, its kind (read or write), its permissions, its dry-run mode and its PII lookup
   fields. An RPC that is not listed is refused with `NOT_ENABLED`. Adding an RPC is a code change
   with a test, never a runtime setting.
4. **Reads run immediately; writes preview by default.** A write returns a plan, not a result.
   Executing needs the `planId` of a preview of the identical environment, RPC and request by the
   same operator, unexpired (10 minutes) and unused. A production execute also requires
   `confirm: 'prod'`. The CLI's `--execute` flag only supplies these; the server enforces them.
5. **A preview is real only where it can be.** Each write RPC declares one mode:
   - `rollback`: the handler runs for real in one transaction that is always rolled back. Nested
     `BEGIN`/`COMMIT`/`ROLLBACK` become savepoints, reads are routed to the same transaction, and
     NATS is replaced with a no-op, so no rows and no events escape. `service-ops` sets
     `x-dry-run: 1`; the `adapt`/`adaptUnauth` wrappers in `@adopt-dont-shop/service-bootstrap` do
     the swap and echo `x-dry-run-applied: 1`. A dry-run response without the echo is treated as an
     error, so a service that does not support it can never be "previewed" by really running.
   - `native`: the RPC has its own dry-run field (for example `notifications.Broadcast`).
   - `preview-only`: the RPC has side effects outside Postgres. Nothing is called; the preview
     shows the validated request and the principal.
6. **PII masking is server-side and fail-closed.** A proto field option
   `(adopt_dont_shop.v1.sensitivity) = SENSITIVITY_PUBLIC | _INTERNAL | _PII | _SPECIAL` classifies
   fields. With no unlock, a field annotated `PUBLIC` or `INTERNAL` is visible and one annotated
   `PII` or `SPECIAL` is hidden. An unannotated `string`, `bytes` or `map` is hidden. An
   unannotated bool, number or enum is visible. An unannotated message is recursed into. A hidden
   value is replaced by `{"$hidden": true}` and its dotted path is listed in `hidden`. A new
   free-text field is therefore masked until someone classifies it, not exposed until someone
   notices.
7. **Break-glass unlocks reveal PII, and they are loud.** An unlock needs a reason (at least 10
   characters) and a ticket (`ADS-123`). It is time-boxed (default 30, maximum 60 minutes) and
   scoped to one subject (a user, rescue or application id) or `any`. Creating one posts a Discord
   webhook alert, publishes `ops.actionTaken` (so `services/audit` records it), and appends to a
   hash-chained `ops.access_log`. Every call made under an unlock records which fields it revealed
   (names, never values). While one person maintains the system, the operator approves their own
   unlock (see Consequences). If the Discord webhook is not configured in staging or production,
   unlocks are refused with `UNLOCKS_DISABLED`: no alert channel, no unlock.
8. **The surface is loopback-only.** `service-ops` listens on `0.0.0.0:4100` inside its container
   and compose publishes it on the host loopback only: `127.0.0.1:4100` (dev), `127.0.0.1:4101`
   (staging) and `127.0.0.1:4102` (production). It is never behind the public nginx or the edge
   gateway. Developers reach staging and production through an SSH tunnel as a tunnel-only user
   ([runbook](../runbooks/ops-cli.md)). This is a deliberate, documented exception to "only the
   gateway publishes ports", for the same reason the observability UIs bind `127.0.0.1`.

Out of scope: replacing the `deploy` SSH key or restricting what the deploy workflows can do;
adding any write RPC to the registry beyond what a PR names; an approval flow with a second
person; a UI; and masking in the existing gateway or admin app.

## Consequences

### Positive

- A developer can answer "what is in this row" and fix a bad one without a shell on the host, with a
  per-person identity, a dry run, and a record of who did what.
- The shared signing key never leaves the server. The blast radius of a stolen laptop is one
  operator's session, which expires, and which cannot mint roles.
- Masking fails closed. Forgetting to classify a field hides it rather than leaking it, and the
  `sensitivity` annotation is useful beyond this tool.
- Writes cannot be run by accident. An execute needs a matching preview, and production needs a
  typed confirmation, enforced by the server rather than by CLI politeness.

### Negative / accepted costs

- **A rollback dry run is not a full simulation.** It undoes Postgres writes only. Redis writes,
  emails and push notifications, S3 objects and effects in other services are not undone, and
  NATS is stubbed, so downstream consumers never see the event. That is why each write RPC must
  declare `rollback`, `native` or `preview-only`, and why anything with an effect outside Postgres
  is `preview-only`. A wrong mode on a registry entry is a real hazard and is a review item.
- **The shared `deploy` SSH key still bypasses all of this.** Anyone with a shell as `deploy` can
  read the signing key from `secrets/` and call any service. This ADR gives developers a better
  path; it does not remove the worse one. The gap closes only when humans move to tunnel-only SSH
  users and the `deploy` key is used by CI alone.
- **Unlocks are self-approved.** With one maintainer there is no second person to approve, so the
  controls are the reason, the ticket, the time box, the Discord alert and the append-only log:
  they make misuse visible after the fact and do not prevent it. This matches the posture in
  [ADR 0015](./0015-solo-maintainer-review-posture.md) and has the same promotion trigger: once a
  second maintainer exists, an unlock should need their approval.
- **`service-ops` is another holder of the signing key and another target.** It runs with the same
  hardening as the other services (read-only root, dropped capabilities), has a small HTTP surface
  and is not reachable from the network, but it is one more place to patch and one more process
  that must stay healthy for a deploy to pass its health gate.
- **A new Postgres schema owner.** `ops` adds a connection pool. Staging and production pin it to
  two connections so the budget in `docs/operations/connection-budget.md` still holds.
- **The registry and the classification are manual work.** Every RPC the tool should reach needs a
  registry entry and a review of its dry-run mode, and a field that should be visible to
  `INTERNAL` readers needs an annotation.

### Follow-on work

- Move humans to tunnel-only SSH users and restrict the `deploy` key to CI.
- When a second maintainer joins, require their approval for unlocks (the trigger in ADR 0015).
- Classify the remaining proto fields so fewer values are masked by default, and grow the registry
  one reviewed RPC at a time.

## Alternatives considered

**Call gRPC directly from the laptop with the signing key.** Rejected. It puts the one secret that
can mint `super_admin` on every developer machine, makes revocation a rotation of the key for the
whole system, and gives no per-person identity, no masking and no dry run. It would also need a
published gRPC port.

**An `ssh` + `docker exec` wrapper script.** Rejected. It needs a shell as a user in the `docker`
group, which is root-equivalent on the host, and it records only that the shared `deploy` user
connected. There is no per-person identity, no allow-list, and nothing to stop a mistyped command
reaching production.

**Admin endpoints hosted in the gateway.** Rejected. The gateway is the public edge and already
signs principals for every request; putting a tool that can invoke arbitrary allow-listed RPCs and
unmask PII on it would move the ops surface onto the internet-facing process and couple its
release and failure modes to the public API. A separate service on a loopback-only port keeps the
ops surface off the edge.

**Grant production access to the admin app's `super_admin` role.** Rejected. It is a role for
product staff, grants everything, and is a browser session rather than something scriptable or
dry-runnable.

## Compliance

- `services/ops` and `packages/ops-contract` have behaviour tests under `vitest` (registry
  allow-list, plan binding and expiry, prod confirmation, masking rules including the unannotated
  cases, unlock lifecycle and `UNLOCKS_DISABLED`, hash-chain integrity). Both the CLI and the
  service parse with the `packages/ops-contract` schemas.
- `services/ops/src/pg-store.integration.test.ts` runs the real migrations and store SQL against
  Postgres (single-use plans under a race, concurrent hash-chained access-log appends, the
  append-only trigger); it runs wherever `DATABASE_URL` is set and is skipped otherwise.
- `pnpm check:proto-fresh` fails if `PROTO_SCHEMA` (the masking source) is stale against the
  `.proto` sources, so a new or re-annotated field can't ship without regenerating it.
- The dry-run adapter in `packages/service-bootstrap` has tests proving no row and no event
  survives a rollback dry run and that the `x-dry-run-applied` echo is present.
- `scripts/deploy-secrets.test.mjs` pins the optional `ops_discord_webhook_url` secret: written
  when provided, empty (and the deploy still succeeds) when unset.
- `pnpm check:workspaces`, `check:stop-grace-period` and `check:docker-pinning` cover the new
  `service-ops` blocks in `docker-compose*.yml`; `docker compose config` validates them.
- The loopback-only publishing is reviewed by hand: any `ports:` entry for `service-ops` that is
  not `127.0.0.1:…`, and any `service-ops` upstream in `nginx/` or `deploy/gateway/`, is a
  blocking review comment.
