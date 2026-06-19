# ADR 0002 — Applications strangler-fig cutover plan

> **Superseded.** The per-domain `CUTOVER_<DOMAIN>` switches this ADR describes
> have been removed. The residual monolith was deleted (Phase 11) and the
> gateway now always registers a domain's routes when its gRPC client is wired —
> there is no flag and no fall-through. The response-shape (view-adapter)
> requirements below remain the standard for any gateway route. Retained for
> historical context.

- Status: Superseded
- Date: 2026-06-06
- Scope: `services/applications`, `services/gateway`, `services/api` (residual
  monolith), `lib.applications`

## Context

The applications domain has been extracted into an event-sourced microservice
(`services/applications`). As of June 2026 the gRPC surface is **feature
complete** — all 12 `ApplicationService` RPCs are implemented (StartDraft,
SaveDraftAnswers, SubmitDraft, StartReview, ScheduleHomeVisit,
CompleteHomeVisit, Approve, Reject, Withdraw, MarkAdopted, Get, List), the
gRPC server boots, the gateway has `/api/applications/*` REST routes, and
`service.notifications` consumes the `applications.*` events.

Preparing the final cutover (retire the monolith's applications code) surfaced
three blocking gaps. They are documented here so the cutover is sequenced
deliberately rather than attempted as a single destructive delete.

### Gap 1 — the extracted services are "dark" (path-version mismatch)

The frontend libraries call **`/api/v1/<domain>/*`**:

```
lib.applications → /api/v1/applications, /api/v1/applications/:id, …
lib.pets         → /api/v1/pets, /api/v1/pets/:id, …
```

The gateway's service-specific routes are registered at **`/api/<domain>`**
(no `v1`):

```
routes/applications.ts → /api/applications, /api/applications/:id/submit, …
routes/pets.ts         → /api/pets, …
routes/moderation.ts   → /api/moderation, …
```

Fastify's first-registered-wins routing never matches these against the
frontend's `/api/v1/...` requests, so **every** frontend call falls through the
catch-all proxy (`prefix: '/api'`, `rewritePrefix: '/api'`) straight to the
residual monolith. The extracted services — pets, applications, moderation,
audit, matching — are registered and tested but receive **zero production
traffic**. The earlier "cutover" PRs (e.g. pets #867) wired the routes but
never actually moved any traffic, because the path version was never aligned.

This is systemic, not specific to applications. It must be fixed once, for all
verticals, as the foundation of any real cutover.

### Gap 2 — response-shape divergence (proto-JSON vs the frontend contract)

The gateway returns ts-proto `toJSON` output. The frontend's Zod
`ApplicationSchema` expects a different shape:

| Concept | Gateway proto-JSON | Frontend `ApplicationSchema` |
|---|---|---|
| id | `applicationId` | `id` |
| adopter | `adopterId` | `userId` |
| status | `"APPLICATION_STATUS_SUBMITTED"` | `"submitted"` (lowercase) |
| answers | `answersJson` (stringified blob) | nested camelCase `data` object (`personalInfo`, `livingConditions`, `petExperience`, `references`, `additionalInfo`, `answers`) |
| references | inside `answersJson` | `data.references` |
| extra fields | — | `stage`, `priority`, `reviewedAt`, `reviewedBy`, `reviewNotes`, `documents[]` |

If only the path (Gap 1) were fixed, `ApplicationSchema.parse()` would throw on
every response. The path fix and a shape adapter must ship together.

### Gap 3 — missing surface + a deep monolith dependency web

The frontend uses endpoints the service does not yet implement:

- documents: `POST/GET /:id/documents`, `DELETE /:id/documents/:documentId`
- stats: `GET /applications/stats`
- questions: rescue-scoped application questions
- timeline / history: `GET /:id/history`

And the monolith's `Application` model is read **directly** by ~13 other
services and middleware, any of which breaks if the model is deleted before it
is migrated:

GDPR erasure, analytics, weekly-digest, user-deletion cascade,
rescue lifecycle, admin export, upload-ACL, socket broadcasts, notifications,
audit hooks, abuse rate-limits (`applicationCreate*Limiter`), idempotency keys,
field-level permissions (`fieldMask('applications', …)`).

The unique constraint `UNIQUE (user_id, pet_id) WHERE deleted_at IS NULL AND
status NOT IN ('rejected','withdrawn')` already exists in the new schema
(migration 002), so that invariant is preserved.

## Decision

Cut over in **staged, individually-shippable PRs**. Do not delete any monolith
applications code until every consumer in Gap 3 has been migrated off direct
model access and the frontend is served end-to-end by the new service through a
compatibility layer. Sequence:

### Stage A — align the gateway path (fixes Gap 1, all verticals)

Move the gateway service routes from `/api/<domain>` to `/api/v1/<domain>` so
they actually intercept frontend traffic before the catch-all. This is a
foundational, low-risk change but it makes the (currently dark) services live —
so it MUST land together with Stage B for applications, and the other verticals
need their own shape audits before their paths are flipped. Recommend a feature
flag / per-domain enablement so each vertical goes live only when its shape
adapter is ready.

### Stage B — gateway compatibility adapter for applications (fixes Gap 2)

Add a translation layer in `routes/applications.ts` (or a dedicated
`applications-view.ts`):

- response: proto-JSON → frontend `ApplicationSchema` shape (`applicationId`→`id`,
  `adopterId`→`userId`, status enum → lowercase, parse `answersJson` back into
  the nested `data` object, surface `stage`/`priority`/`reviewedAt`/… from the
  proto optionals).
- request: frontend payload → gRPC request (the inverse — collapse the nested
  `data` object into `answersJson`, map `id`/`userId`).

Cover the mapping with golden-fixture tests asserting a real `ApplicationSchema`
`parse()` succeeds.

**Decisions confirmed (June 2026):**

- **Status: gateway collapse.** The service's 9 states map onto the frontend's
  4-value `status` + 6-value `stage` in the gateway; the frontend is untouched.
  The table (service → status/stage): `submitted`→submitted/pending,
  `under_review`→submitted/reviewing, `home_visit_scheduled`→submitted/visiting,
  `home_visit_completed`→submitted/deciding, `approved`→approved/resolved,
  `rejected`→rejected/resolved, `withdrawn`→withdrawn/withdrawn,
  `adopted`→approved/resolved. `draft` + UNSPECIFIED have no frontend
  representation — List filters them out and Get 404s them.
- **Read path shipped** in `routes/applications-view.ts` (`applicationToView`) +
  the List/Get routes, wrapped in the `{ data }` envelope the SPA expects. Flag
  stays off.
- **Still to do for Stage B:** the WRITE path is a protocol adapter, not a field
  rename — the frontend's single `submitApplication(data)` POST maps to the
  service's draft flow (StartDraft → SaveDraftAnswers → SubmitDraft), and
  `updateStatus`/`withdraw` map to the specific command RPCs. Pagination
  (keyset cursor) and `ApplicationWithPetInfo` pet-join fields are also TBD.

### Stage C — fill the missing surface (fixes Gap 3, part 1)

For documents / stats / questions / timeline:

**Decision confirmed (June 2026): build natively** in `services/applications`
(proto + handlers + gateway) rather than transitionally proxying to the monolith.
A `GetStats` RPC (counts by status off the read model) is the bounded first
piece; documents (file upload metadata + storage) is the larger one.

### Stage D.0 — data migration (NEWLY IDENTIFIED PREREQUISITE)

Not in the original plan, and it gates flipping `CUTOVER_APPLICATIONS` on for any
real environment: **the new event store is empty.** The monolith's existing
`applications` rows (and their answers/references/transitions) must be backfilled
into `services/applications`' event store — most cleanly as a one-off
`draftCreated`/`draftSubmitted`/… event synthesis per historical application, or
a projection-only seed of the read model with a sentinel event. Until this runs,
flipping the flag would show every adopter an empty application history. Sequence
it after Stages B+C and before the cutover flip.

### Stage D — migrate the monolith integrations (fixes Gap 3, part 2)

Peel each of the ~13 consumers off the `Application` Sequelize model, one PR at
a time, replacing direct reads/writes with either a gRPC call to
`service.applications` or consumption of an `applications.*` NATS event:

1. notifications + socket broadcasts → already event-driven; verify parity.
2. audit hooks → the service already emits its own audit; confirm coverage.
3. analytics / weekly-digest / admin export → read via gRPC List/Get or a new
   stats RPC.
4. GDPR erasure → an `EraseUserApplications` / `EraseRescueApplications` RPC.
5. user / rescue deletion cascade → coordinate via gRPC or an event the service
   consumes.
6. upload-ACL, abuse rate-limits, idempotency, field-permissions → move the
   enforcement to the gateway or the service.

### Stage E — delete the monolith applications code (destructive — last)

Only after Stages A–D: remove routes, controllers, services, models,
validation, and the now-unused migrations/seeders from `services/api`, and drop
the transitional proxy from Stage C. Requires explicit sign-off.

## Consequences

- The vertical's gRPC surface being complete is necessary but **not sufficient**
  for cutover — the gateway contract bridge (A+B+C) is the real cutover work,
  and the monolith integration migration (D) is the bulk of the effort.
- Until Stage A ships, the new service is correct but unused; the monolith
  remains the source of truth for applications. No data is at risk.
- Each stage is independently shippable and reversible (flip the flag / restore
  the route) until Stage E.

## Lessons (for the Notion "Things that bit us" / "Things we'd do differently")

- **Verify the path, not just the route module.** A "gateway routes" PR that
  registers `/api/<domain>` while clients call `/api/v1/<domain>` is dark — it
  passes its own tests (which hit the registered path) but never serves a real
  request. Every prior vertical cutover shipped in this state. The route test
  must assert the path clients actually use, and an integration smoke must hit
  the gateway on the client's real URL.
- **A proto-JSON gRPC surface is not a drop-in REST replacement.** ts-proto
  `toJSON` (SCREAMING enum names, `*_json` blob fields, proto field names) and a
  hand-written REST contract diverge by default. Budget a translation layer per
  vertical, or migrate the client — don't assume transparency.
