# Production Readiness Review — 2026-08

A technical assessment of what remains before this platform is ready to serve
production traffic. Scope: the full monorepo — 11 backend services, the Fastify
gateway, 3 React apps, shared libraries, CI/CD, and the deploy/observability
stack.

Method: six parallel dimension audits (backend completeness, security,
testing/quality gates, observability & reliability, infrastructure &
deployment, frontend), each cross-checked against the code rather than the
tracking docs. The headline findings were then re-verified by reading the
implementing source directly. "Tracked" means the team already has a
ticket/ADR for it; "new" means this review surfaced it.

---

## Executive summary

**This is a mature, unusually well-engineered codebase.** It actively patches
CVEs, ships contract tests, release-please, Renovate, cosign-signed images,
digest-pinned CI, runbooks, SLO-mapped alert rules, graceful shutdown, circuit
breakers, JetStream DLQs, and hardened non-root containers. Genuine code debt is
tiny — **6 `TODO`/`FIXME` markers in all production source**, no skipped/focused
tests, no committed secrets, no SQL injection, no structurally-missing services.

So "what's left" is **not** a long tail of half-built features. It is a short,
specific list dominated by three themes:

1. **Un-activated capability.** The strongest reliability and security controls
   are built but off-by-default — the whole observability/alerting/tracing stack
   is not in the prod compose, and the signed internal-principal auth control
   fails open when its key is unset. The pre-launch work is _turning these on and
   proving they work_, not building them.
2. **One correctness bug with real blast radius.** RBAC seed↔handler permission
   drift silently collapses the admin console (and CMS/email/field-permission
   surfaces) to super-admin-only.
3. **A few feature stubs and data-safety gaps** — push notifications, upload AV
   scanning, upload backups.

### Verdict

- **Is the architecture production-grade?** Yes.
- **Can you `docker compose -f docker-compose.prod.yml up` today and be safe?**
  No — you'd deploy with no metrics, no alerting, and no paging.
- **Is there a short, well-defined path to ready?** Yes — the P0/P1 list below.
- **Any deep architectural rework required?** No.

Net: **not launch-ready as a default deploy, but close.** Clear the P0 items and
consciously accept or close the P1 items and it is ready for an eyes-on,
small-scale production launch. A formal availability/durability SLA additionally
needs the resilience work already designed in ADRs 0007/0009.

---

## Priority tiers

### P0 — Launch blockers (a default prod deploy is not safe/observable without these)

- **Activate the observability & alerting stack — it is inert by default.**
  Prometheus, Alertmanager, Grafana, Tempo and Loki live only in
  `docker-compose.observability.yml`, not `docker-compose.prod.yml`;
  `OTEL_EXPORTER_OTLP_ENDPOINT` and `SENTRY_DSN` default empty
  (`docker-compose.prod.yml:88-89`); Alertmanager ships with no notifier
  (`observability/alertmanager/alertmanager.yml`). A stock prod bring-up
  therefore has **no metric scraping, no tracing, no error tracking, and no
  paging — even for `critical` ServiceDown / GdprSagaFailed alerts.** The rules
  and dashboards are excellent; they're just not wired in. _Pre-launch task:
  layer in the observability compose, set the two env vars (→ `tempo:4318`),
  drop in the Alertmanager webhook secret, and prove an alert actually pages._
  (tracked as a deliberate "template both, decide later" design, ADS-1041 — but
  activation must be verified before launch.)

- **Point container healthchecks at the readiness probe.** `/health/ready`
  actively probes DB/NATS/Redis (`packages/service-bootstrap/src/readiness.ts`)
  and is wired on every service, but every compose healthcheck (dev **and** prod)
  hits `/health/simple` — pure liveness (`docker-compose.prod.yml:300-441`). A
  service that loses its DB pool keeps reporting healthy and keeps taking
  traffic; nothing drains or restarts it. Repoint prod healthchecks (and/or
  `depends_on` gating) at `/health/ready`. _(new)_

### P1 — Resolve or consciously accept before launch

- **RBAC seed↔handler permission drift → admin surfaces are super-admin-only.**
  Handlers gate on permission strings that **no role is seeded** and **no
  `lib.types` constant defines**, written as `'admin.users.read' as Permission`
  literals. `hasPermission` is exact-match with only a `super_admin`
  short-circuit (`packages/authz/src/has-permission.ts:14-19`), so every
  non-super-admin role gets 403. Verified affected surfaces:
  - `services/auth/src/grpc/admin-handlers.ts:64-72` — the entire admin
    user-administration surface (`admin.users.*`). The seed
    (`services/auth/src/migrations/016_seed_core_rbac.ts:122-127`) grants the
    `admin` role `users.*` and its own comment says admin does "user
    administration" — a **different, unseeded namespace**.
  - `services/cms/src/grpc/handlers.ts:93-96` — all CMS content management
    (`cms.content.*`).
  - `services/notifications/src/grpc/email-template-handlers.ts:42-43` —
    email-template CRUD (`email.templates.*`).
  - `services/auth/src/grpc/field-permission-handlers.ts:49-50` —
    `admin.field_permissions.*`.
  - `services/auth/src/grpc/privacy-prefs-handlers.ts:36-39` —
    `auth.privacy-prefs.*`.
  - `services/chat/src/grpc/handlers.ts:1233` — `chat.message.delete:any` (mods
    can't delete others' messages).

  Fail-closed, so **not a security hole** — but it functionally breaks the
  delegated-admin model the platform provisions. **Root cause: the
  `as Permission` casts defeat the type-checker that would otherwise reject a
  nonexistent permission.** Fix = reconcile seed↔handler namespaces, seed the
  missing grants, and replace the casts with real constants. _(new; the
  moderation instance of this exact pattern was already fixed via the seeded
  `MODERATION_REPORTS` permission namespace.)_

- **Harden the signed internal-principal control (`PRINCIPAL_SIGNING_KEY`) —
  it fails open.** When the key is unset, every service falls back to trusting
  the spoofable `x-user-*` headers (`packages/service-bootstrap/src/adapter.ts:116-127`).
  The key is **not** emitted by `scripts/generate-secrets.mjs`, **not** in the
  env-validation schema (`packages/lib.validation/src/schemas/env.ts`), and read
  as _optional_ in gateway config (`services/gateway/src/config.ts:185`). Prod
  compose does wire it as a required Docker secret
  (`docker-compose.prod.yml:559-560`) and no gRPC port is host-exposed, so the
  happy path is safe — but the tooling gaps make a fail-open misdeploy easy.
  _Fix: generate it, add it to the env schema, and fail prod boot if absent._
  _(risk documented in `docs/security/internal-grpc-trust.md`; tooling gaps new.)_

- **Push notifications are non-functional in production.** The only non-console
  provider, FCM, is a hard stub whose `send()` always returns failure
  (`services/notifications/src/push/providers/fcm.ts:29-39`), and `console` is
  banned in prod (`services/notifications/src/config.ts:122`) — so every push
  fails closed. _Decision: wire the vendor SDK, or descope push from the launch
  channels (email + in-app) and document that._ _(new; deferred in code.)_

- **User-uploads have no automated, verified backup.** `backup.yml` snapshots
  Postgres nightly, but nothing runs `scripts/snapshot-uploads.sh` — it's
  referenced by zero workflows. The `uploads` volume holds pet photos **and
  adoption documents** (proof-of-address / ID). Its only backup today is a
  manual, unverifiable host cron per a doc snippet
  (`docs/operations/snapshot-policy.md:52-64`). _Fix: wire uploads snapshotting
  into a workflow alongside the Postgres one._ _(new — the script exists, the
  automation doesn't.)_

- **Backups are logical-only, never restore-tested by automation, no PITR.**
  Nightly `pg_dump → S3` gives **RPO ≈ 24h** and a **manual** restore path. The
  policy _says_ a monthly restore drill is required but it's a human process, not
  enforced — an unverified backup is a latent zero. _Decision: automate a restore
  drill and either adopt PITR/pgBackRest or explicitly accept 24h RPO as a
  business decision._ _(tracked, ADR 0007 proposed / ADS-443.)_

- **No AV/malware scanning on uploads.** `services/gateway/src/routes/uploads.ts:12`
  and `application-documents.ts:14` both carry `TODO(ADS-848 step 3)`; the
  `clamd`-backed scanner doesn't exist yet. Mitigated by magic-byte sniffing,
  image-bomb caps, private-key storage with signed-URL reads, and nginx denying
  direct document access — but the platform accepts user ID documents unscanned.
  _Decision: wire AV scanning, or accept the residual risk explicitly for launch._
  _(new; ticketed in code.)_

### P2 — Fast-follow (first weeks post-launch)

- **The 52-spec E2E suite does not gate PRs.** It runs only on push-to-`main`,
  `workflow_dispatch`, or a `run-e2e` label; on a normal PR it is skipped, and
  `ci-required` treats skipped as pass (`.github/workflows/ci.yml:530-536,620-626`).
  Headline journeys (auth, adoption-application, chat) can regress and merge
  green. _Make at least the `@smoke` subset a required PR gate._
- **Coverage gate holes.** `authz` (the permission core) and `events` (the
  publish-after-commit seam) — and the other non-lib `packages/*` — declare no
  coverage thresholds, so a drop won't fail CI. `lib.dev-tools` and `lib.matching`
  have coverage disabled outright (`vitest.config.ts` thresholds at 0), and
  `lib.dev-tools` ships a tautological self-reimplementing test. _(tracked ADS-717
  for the zero-libs; the non-lib gap is new.)_
- **~54 frontend routes call gateway endpoints that don't exist**, plus several
  silent mis-routes (`/pets/featured`, `/applications/statistics` collapsing onto
  `:id`). _Triage which are in launch scope and back or hide them._ _(tracked —
  `docs/backend/api-route-audit-findings.md` §2/§3.)_
- **Accessibility is not enforced in CI.** `eslint-plugin-jsx-a11y` is disabled
  (ESLint 10 incompatibility, `packages/eslint-config-react/index.js:6`) and
  there's no axe/pa11y gate — a regression risk given the platform's stated a11y
  and GDPR commitments. The manual a11y work itself is largely good. _(new.)_
- **The weekly-digest job is a scaffold** — `runDigestForUser` only logs; the
  fan-out RPCs are unwired, so the digest email does nothing. _Implement or
  disable the scheduler._ _(new.)_
- **Security-relevant actions skip audit events** — 2FA enable/disable/regenerate
  (`services/auth/src/grpc/two-factor-handlers.ts`) and field-permission changes
  (`field-permission-handlers.ts:289-395`) produce no `actionTaken` row. _(new.)_
- **Verify the deploy secret-teardown vs `restart: always`.** Deploy/rollback
  materialize `./secrets/*`, `up -d`, then `rm -f` the files
  (`.github/workflows/deploy.yml:772-774`); with non-swarm file-secrets a host
  reboot / container recreate re-resolves the now-deleted source. Confirm a
  reboot doesn't strand services without secrets. Also add `validate-env` as a
  deploy preflight (it currently runs only in onboarding-smoke). _(new.)_
- **Close the still-open pass-2 handoffs:** GDPR erasure of email-keyed rows
  (rescue pending invitations leave PII residue) and the chat `openChat`
  null-UUID `rescue_id` placeholder (rescue-scoped chat search never matches
  gRPC-created chats). _(tracked — services review pass-2, handoffs A & B.)_

### P3 — Backlog / already-accepted tradeoffs

- **Single-host, single-replica; every datastore a SPOF; no auto-rollback, no
  zero-downtime deploy** (ADR 0009 proposed / ADS-1045). The documented
  "2 replicas" target is currently unachievable — every service has a fixed
  `container_name`. Acceptable for an eyes-on small-scale launch; blocks any
  availability SLA.
- **No mTLS on inter-service gRPC** (cleartext HTTP/2) — accepted on network
  isolation; `/metrics` is unauthenticated (fine while ports stay internal).
- **Gateway `authenticate` hook doesn't reject unauthenticated requests** to
  protected paths — all enforcement rests on handler gates (stale strangler-fig
  rationale; loss of defence-in-depth only).
- **Back-compat migration contract is unenforced** — rollback safety depends on
  discipline; `schema-equivalence.yml` checks migrations apply, not that they're
  non-breaking (ADR 0008 proposed lint).
- **Frontend polish** — inert realtime-analytics hook (ADS-105), no Core Web
  Vitals sink (ADS-507), `PlanGate`/`PetManagement` UI gating unused
  (backend-enforced), rescue-app form/consistency debt (UX review EPIC D).
- **Doc rot** — `docs/observability-alerting.md` and `docs/upgrades/README.md`
  describe the deleted monolith; runbook↔rule alert-name drift in
  `docs/runbooks/db-pool-exhaustion.md`.

---

## Detail by dimension

### Backend completeness

Substantially complete; two prior review passes closed the high-risk
security/GDPR/token defects. Open: the RBAC drift (P1), push stub (P1), AV
scanning (P1), weekly-digest scaffold (P2), missing audit events on 2FA /
field-permissions (P2), and the tracked frontend↔gateway route gaps (P2). No
hardcoded secrets; CORS fails closed in prod; all 11 services have adapters,
migrations, and tests.

### Security

Strong: parameterised SQL throughout, layered rate limiting on all auth/upload
paths, helmet + HSTS-preload, allowlist CORS failing closed, httpOnly/secure/
sameSite cookies with path-scoped refresh + constant-time double-submit CSRF,
magic-byte upload sniffing with path-traversal-safe storage, disciplined secret
loading with prod-gated distinctness checks. One pre-prod item: the fail-open
`PRINCIPAL_SIGNING_KEY` (P1). No SQLi, committed secrets, ungated admin routes,
or missing rate limits found.

### Testing & quality gates

Mature: no skipped/focused tests, per-package ratcheted coverage that genuinely
blocks merge for services (72–91%) and most libs (77–99%), real lint/type-check/
contract gates behind a clean `ci-required` aggregator with no soft-fails.
Gaps: E2E doesn't gate PRs, coverage ungated for `authz`/`events`/non-lib
packages and disabled for two libs, app floors (35–65%) below the stated goal,
contract breadth narrow (3 of ~20 service edges). No payments subsystem exists,
so that's not a gap.

### Observability & reliability

Top-decile primitives: graceful SIGTERM drain (HTTP→gRPC→NATS→pool) with
process-error backstops, per-attempt gRPC deadlines + idempotent retries +
per-downstream circuit breakers, JetStream durable consumers with DLQ + poison
handling + transactional outbox + idempotency, budgeted DB pools, and PromQL
rules mapped 1:1 to per-service SLOs. Dominant risk is activation (P0), plus the
readiness-probe-unused gap (P0) and no Redis health signal for the WS adapter.

### Infrastructure & deployment

Build/ship/run security is excellent: multi-stage non-root images with
read-only rootfs + `cap_drop: ALL`, digest pinning enforced in CI + Renovate, no
`:latest` in prod, cosign keyless sign→verify→deploy gate, file-mounted
uncommitted secrets, a locked-down TLS edge (TLS1.2/1.3, HSTS preload, tight
CSP, XFF anti-spoofing), governed deploys with approval gates and a working
rollback. Short on resilience & data-safety: uploads backup (P1), restore-drill/
PITR (P1), SPOF/auto-rollback (P3, ADR 0009).

### Frontend

Production-ready fundamentals across all three apps: top-level + route-level
ErrorBoundaries → Sentry, lazy-loaded routes, env-driven config (no hardcoded
prod URLs), httpOnly-cookie auth with fail-closed permission/flag gating,
React Query with global mutation-error toasts, DOMPurify-wrapped HTML. No
stubs, mock data, coming-soon pages, or dead links in shipping code. Gaps are
polish/defense-in-depth: the a11y CI gate (P2) and the inert realtime-analytics
hook (P3).

---

## What's already production-grade (for confidence)

- Hardened non-root, digest-pinned, cosign-signed container images with CI
  enforcement; network-isolated datastores publishing no host ports.
- Graceful shutdown + process-error backstops on all 11 services; circuit
  breakers, retries, and gRPC deadlines on every downstream.
- Durable event pipeline: JetStream pull consumers, explicit ack, DLQ after
  max-deliver, transactional outbox, idempotency keys.
- Real, ratcheted, merge-blocking coverage for services and most libs; verified
  Pact contract gates; no skipped/focused tests.
- Layered rate limiting, hardened cookies + CSRF, parameterised SQL, disciplined
  secret loading, consistent handler-level permission gates.
- SLO-mapped alert rules, a working rollback workflow, nightly Postgres backups,
  and a thorough runbook library.

---

## Recommended pre-launch checklist

1. [ ] Layer the observability compose into prod; set OTEL + Sentry env; wire a pager; prove a `critical` alert fires end-to-end. **(P0)**
2. [ ] Repoint prod healthchecks at `/health/ready`. **(P0)**
3. [ ] Fix RBAC seed↔handler drift; replace `as Permission` casts with real `lib.types` constants. **(P1)**
4. [ ] Generate `PRINCIPAL_SIGNING_KEY`, add it to the env schema, fail prod boot if absent. **(P1)**
5. [ ] Wire FCM (or descope push from launch and document it). **(P1)**
6. [ ] Automate uploads backup + a restore drill; decide PITR vs 24h RPO. **(P1)**
7. [ ] Wire upload AV scanning or accept the risk explicitly. **(P1)**
8. [ ] Make the E2E `@smoke` subset a required PR gate. **(P2)**
9. [ ] Triage the ~54 unbacked frontend routes for launch scope. **(P2)**
10. [ ] Decide the SPOF/availability posture for launch (ADR 0009). **(P3)**
