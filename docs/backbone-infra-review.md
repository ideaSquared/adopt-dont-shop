# Shared Backbone & Infrastructure Review

Audit of the areas the earlier service/frontend reviews never covered: the
shared backend packages every microservice depends on (`packages/events`,
`authz`, `db`, `config-secrets`, `storage`, `observability`) and the
infrastructure (`.github/workflows`, Docker, `scripts/`, `e2e/`).

Each genuine finding was fixed in place with tests; items that are
intentional design or need an ops/architecture decision are listed as
recommendations rather than changed.

## Fixed

| Area | Fix | Severity |
|---|---|---|
| observability | The shared `createLogger` shipped every log line to console + Loki with **no redaction** (a documented TODO) — any service logging an object with a `password`/`token`/`secret`/`authorization`/`cookie`/`api-key`/`otp` field leaked it verbatim; the Sentry and audit redactors only cover those two paths. Added a recursive redactor (`packages/observability/src/redact.ts`) wired in as a logger-level Winston format so redaction runs ahead of every transport. | High |
| CI (deploy.yml) | The free-text `tag_overrides` `workflow_dispatch` input was interpolated raw into single-quoted shell on both the runner and the prod host, so a `'` could break out and run arbitrary commands **before** the regex allowlist (in the same script) ran. Now passed via the environment (mirroring `rollback.yml`'s `ROLLBACK_SHA`), so the value is inert and validation actually guards it. | Medium |
| events | A handler that consistently threw on a *parseable* message was `nak()`'d with no delay → immediate, indefinite redelivery (no `max_deliver`, no backoff) spinning the consumer hot. `nak()` now applies an exponential backoff keyed on the redelivery count (fast first retry, capped at 30s). | Medium |
| db | The per-connection `SET search_path` ran fire-and-forget (`void`) — a failure silently served a wrong-schema connection (unqualified tables → `public`). Now surfaced via the pool's error channel (or stderr). Also validates `schema` as a plain SQL identifier at construction (fail-fast; closes the theoretical interpolation vector). | Low |

## Verified sound (no change)

- **authz** — the linchpin of all service authorization is correct: `hasPermission`/`requirePermission` **fail closed**, `super_admin` is the only bypass, and `rescueId`/`userId` scope uses plain branded-string equality. No fail-open/mis-scope path.
- **config-secrets** — `requireSecret` rejects blank/whitespace (an empty secret can't pass as present), both-set is a hard error, `parsePort` rejects non-positive/NaN. No insecure defaults; no secret values logged.
- **storage** — signed-URL generation/expiry is sound (S3 presigner TTL; gateway HMAC checks expiry before a constant-time signature compare). Path-traversal is guarded at the consumer (`safeResolve`, server-generated UUID filenames).
- **Infra (rest)** — actions SHA-pinned; secrets flow via `envs:`/BuildKit `--secret`/file-mounted Docker secrets (never interpolated into `script:`); cosign keyless sign→verify→deploy; prod/staging pin `DEPLOY_SHA` (no `:latest`); containers run non-root with `cap_drop: ALL` + `no-new-privileges` + read-only rootfs; `.dockerignore` keeps `.env`/`.git` out of build context. The `ci-required` aggregator fails only on real failures (treats `skipped` as pass). The e2e harness has no hard waits and disposes role contexts per test.

## Recommendations (intentional design / need a decision — not changed here)

| Area | Item | Why deferred |
|---|---|---|
| service-bootstrap | When `PRINCIPAL_SIGNING_KEY` is unset, `extractPrincipal` falls back to trusting `x-user-*` headers (the **real** cross-service authz boundary). It is correctly fail-closed *when* a key is present, and the keyless mode is the intentional ADS-800 phased-rollout path — but consider failing closed (or at least a loud boot warning) when `NODE_ENV=production` and no key is set, so a misconfigured prod can't silently trust forged headers. Deployment-posture decision. |
| events | No shared consumer-idempotency helper despite documented redelivery (broker `Nats-Msg-Id` dedup window is 2 min vs 7-day retention). Handlers are individually idempotent today; a shared "processed-events" helper would enforce it. Architectural. |
| events | `nak()` backoff (added) slows hot-loops but there is still no `max_deliver` + dead-letter subject, so a permanently-poison message retries forever. Adding a DLQ drops/parks messages after N tries — needs a decision on the retry budget. |
| events | A changed `deliver_policy`/`filter_subject` is silently ignored on an already-existing durable consumer (JetStream create-or-reuse). Operational footgun; worth a comment or explicit update path. |
| storage | The provider methods (`getSignedUrl`/`deleteFile`/`getFileInfo`) trust callers for `..`-free path segments — safe today (guarded at the gateway, flat S3 keys) but would be more robust rejecting `..` internally. Defense-in-depth. |
| infra | Dev-only notes: Grafana anonymous-Admin (bound to `127.0.0.1` in the observability profile — keep it out of any prod compose); `GRANT CREATE ON SCHEMA public TO PUBLIC` in `init-postgis.sql`; and `service-chat`/`service-cms` appear in prod/staging compose but not the base/dev compose while the e2e `.env` sets `CUTOVER_CHAT/CMS=true` (topology gap to confirm). |

**Verification:** all changed packages green; `turbo build` for all packages (32 tasks) and `turbo test type-check` for all services (31 tasks) pass — the shared logger change is safe across the backend.

## Follow-ups — resolved (per product decision)

The recommendations above were actioned:

| Area | Resolution | Decision |
|---|---|---|
| service-bootstrap | `assertPrincipalVerificationConfig()` now **fails closed at boot in production** when `PRINCIPAL_SIGNING_KEY` is unset (so a service can't silently trust forgeable `x-user-*` headers), unless `ALLOW_UNSIGNED_PRINCIPAL=true` is an explicit opt-in for the phased rollout. Wired into `startGrpcServer` (all gRPC services) and the gateway boot (the token signer). | Fail closed + escape hatch |
| events | After the `nak()` backoff, consumers now set **`max_deliver=7`** and dead-letter exhausted messages to a new `DOMAIN_EVENTS_DLQ` stream (`dlq.<original-subject>`, 14-day retention) with triage headers, then `term()` — parked for inspection, not dropped or looped. | max_deliver + dead-letter |
| events | `claimEvent` promoted to a **shared idempotency primitive** in `@adopt-dont-shop/events` (schema-agnostic via search_path). notifications re-exports it; new consumers adopt it via the `processed_events` migration. Naturally idempotent consumers (GDPR erase, ON CONFLICT inserts, deterministic completion ids) were intentionally left unchanged rather than gold-plated. | Build shared dedup helper |
| events | Documented that a durable consumer's `deliver_policy`/`filter_subject` can't change on re-add (requires recreate). | — |
| storage | Provider methods now reject any `filename`/`category` segment containing a path separator or `..` (guard runs before the catch so `getFileInfo` can't mask it). | — |
| infra | The `service-chat`/`service-cms` "topology gap" was investigated and is a **non-issue**: `cutover.chat/cms` default to `false`, so the gateway doesn't route to those services unless explicitly enabled (prod/staging, where the containers exist); the dev/base omission is correct. The Grafana anon-admin and `init-postgis` GRANT remain documented dev-only notes. | — |

**Verification:** `turbo build` (all packages) + `turbo test type-check lint` (all services + changed packages) — 57/57 tasks pass.
