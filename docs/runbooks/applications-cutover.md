# Applications strangler cutover

How to move `/api/v1/applications/*` traffic from the residual monolith to
`service.applications`, validate it, and roll back. Implements the flip of
`CUTOVER_APPLICATIONS` from ADR 0002.

**Default state:** `CUTOVER_APPLICATIONS=false`. The gateway does NOT register
the applications routes, so `/api/v1/applications/*` proxies to the monolith —
today's behaviour. Flipping the flag is the cutover; flipping it back is the
rollback (instant, no data move).

## ⚠️ Go / no-go — read before flipping

The contract + backfill are ready, but the flip is **gated on data ownership**.
Confirm ALL of these before enabling in any shared environment:

1. **`service.applications` is deployed and healthy** and reachable from the
   gateway at `APPLICATIONS_GRPC_URL` (default `service-applications:6005`).
2. **The backfill has run** (see below) and the new event store's row count
   matches `SELECT count(*) FROM public.applications WHERE deleted_at IS NULL`.
   The backfill's schema assumptions are verified against the monolith models.
3. **The 13 monolith integrations are migrated, OR you accept staleness.** This
   is the real blocker. After the flip, the SPA's writes go to
   `service.applications`; the monolith's `applications` table stops receiving
   them. Anything in the monolith that still reads that table directly — GDPR
   erasure, analytics, weekly-digest, admin export, user/rescue deletion
   cascades, upload-ACL, etc. (ADR 0002 Gap 3) — will see **stale** data. Do
   NOT flip in production until Stage D migrates those consumers off the model
   (or a transitional event-sync keeps the monolith table current). Flipping in
   a staging/preview environment to validate the contract is fine.
4. **Known contract gaps are acceptable for the environment** (see "Known gaps").

## Pre-flight

```bash
# 1. Deploy service.applications; confirm health + migrations.
curl -fsS http://service-applications:5005/health/simple

# 2. Run the one-off backfill (idempotent — safe to re-run). It synthesizes an
#    event stream per monolith application into the event store and projects the
#    read model. Reads public.applications + application_answers/_references.
#    (Run mechanism — npm script vs scheduled job — TBD with the team; the
#    script is services/applications/src/backfill/run-backfill.ts.)

# 3. Reconcile counts (should match):
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.applications WHERE deleted_at IS NULL;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM applications;"  # the new read model
```

## Enable

Set on the GATEWAY environment, then restart/redeploy the gateway:

```bash
CUTOVER_APPLICATIONS=true
APPLICATIONS_GRPC_URL=service-applications:6005   # if not already set
```

The gateway now registers `/api/v1/applications/*` and serves it from the
service; everything else still proxies to the monolith.

## Validate (smoke, as a seeded adopter + rescue-staff persona)

```
GET   /api/v1/applications                  → 200, { data: [...] } (no drafts)
GET   /api/v1/applications/stats?rescue=…    → 200, { data: { total, submitted, underReview, approved, rejected, pendingReferences } }
GET   /api/v1/applications/:id               → 200, { data: {...} } (404 for a draft id)
POST  /api/v1/applications                   → 201, { data: { status: 'submitted', … } }
PATCH /api/v1/applications/:id/status        → 200 (approved/rejected/withdrawn)
PUT   /api/v1/applications/:id/withdraw       → 200
```

Each response must satisfy the SPA's `ApplicationSchema` / `ApplicationStatsSchema`
Zod parse — the gateway view adapter (`routes/applications-view.ts`) guarantees
the shape. Open `app.client` and confirm the application list, detail, and
submit flows render without an "Error loading applications" page.

## Rollback

```bash
CUTOVER_APPLICATIONS=false   # restart the gateway
```

Instant: the routes deregister and `/api/v1/applications/*` proxies to the
monolith again. No data move is needed — the monolith table was never deleted.
(Writes made to `service.applications` while the flag was on remain only in the
new store; if you flipped in production and took writes, reconcile before
re-enabling — another reason not to flip prod before Stage D.)

## Known gaps (as of the cutover-readiness milestone)

- **Documents** — upload/list/remove. Service-side metadata RPCs are being added;
  the gateway multipart + object-storage upload path is a remaining follow-up.
  Until both land, document features 404 under the flag.
- **`PUT /:id` update** behaviour change: the service only allows answer edits
  while `draft` / `under_review`; editing a decided application returns 400
  (the monolith allowed freer edits).
- **List pagination** — the gateway returns the first page; the SPA's current
  list methods don't pass a cursor, so this is not user-visible, but large
  rescue inboxes are not yet paged.
- **No NATS publish from the backfill** — historical applications are seeded
  without re-emitting `applications.*` events (intentional; downstream
  consumers already hold the monolith's history).

## Per-vertical note

The same `CUTOVER_<DOMAIN>` switch exists for every extracted vertical (auth,
pets, rescue, moderation, matching, audit). Each needs its own contract audit +
view adapter + this same go/no-go before its flag is flipped — applications is
the worked example.
