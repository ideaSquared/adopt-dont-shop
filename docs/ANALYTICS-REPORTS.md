# Analytics Reports (ADS-105)

The custom analytics report builder lets users compose dashboards out
of widgets, save them, schedule email delivery, and share them with
teammates or via signed-token URLs. Real-time invalidation events
push to subscribers via Socket.IO.

## Architecture

```
Browser  ──REST──►  /api/v1/reports/*  ──►  ReportsService
                                            │
                                            ├──► AnalyticsService (existing aggregations)
                                            ├──► ReportCache (Redis, optional)
                                            └──► BullMQ queue ──► reports worker
                                                                  ├──► PDF/CSV renderer
                                                                  └──► email.service.sendEmail

Browser  ──WS────►  Socket.IO  ──►  analytics:invalidate / metric-update events
```

### Backend layout

| Path | Purpose |
| --- | --- |
| `service.backend/src/migrations/08-create-analytics-reports.ts` | Tables: `report_templates`, `saved_reports`, `scheduled_reports`, `report_shares` |
| `service.backend/src/models/{ReportTemplate,SavedReport,ScheduledReport,ReportShare}.ts` | Sequelize models (audit-columns + paranoid soft-delete) |
| `service.backend/src/schemas/reports.schema.ts` | Canonical Zod schemas for the report config |
| `service.backend/src/services/reports.service.ts` | CRUD + execute + share + schedule orchestration |
| `service.backend/src/services/report-cache.service.ts` | Redis cache with TTLs scaled to widget freshness |
| `service.backend/src/services/report-renderer.service.ts` | PDF (`pdfkit`) + CSV (`papaparse`) renderers |
| `service.backend/src/lib/redis.ts` | Lazy ioredis client; no-op when `REDIS_URL` is unset |
| `service.backend/src/lib/queue.ts` | BullMQ `reports` queue + worker factory |
| `service.backend/src/workers/reports.worker.ts` | Two job types: `report:scheduled-run`, `report:render-and-email` |
| `service.backend/src/socket/analytics-emitter.ts` | Server → client Socket.IO events with debouncing |
| `service.backend/src/controllers/reports.controller.ts` | HTTP layer; enforces rescue-scope authorization |
| `service.backend/src/routes/reports.routes.ts` | Mounted at `/api/v1/reports` |

### Frontend layout

| Path | Purpose |
| --- | --- |
| `lib.analytics/src/schemas/reports.ts` | Zod schemas mirroring the backend (single source of truth for types) |
| `lib.analytics/src/services/report-service.ts` | Typed API client over `lib.api`'s `ApiService` |
| `lib.analytics/src/hooks/useReports.ts` | React Query v3 hooks: `useReports`, `useReport`, `useExecuteSavedReport`, `useExecuteReportPreview`, `useSaveReport`, `useUpdateReport`, `useDeleteReport`, `useUpsertSchedule`, `useCreateUserShare`, `useCreateTokenShare`, `useRevokeShare` |
| `lib.analytics/src/hooks/useRealtimeAnalytics.ts` | Socket.IO subscription + `useAnalyticsInvalidator` (mount once at app root) |
| `lib.components/src/components/charts/*` | Recharts-backed primitives: `LineChart`, `BarChart`, `PieChart`, `AreaChart`, `MetricCard`, `DataTable`, `ChartFrame` |
| `lib.components/src/components/reports/*` | `ReportBuilder`, `ReportRenderer`, `WidgetPicker`, `FilterPanel`, `DrillDownModal` |
| `app.admin/src/pages/{Reports,ReportBuilderPage,ReportViewPage}.tsx` | Admin user-facing pages |
| `app.rescue/src/pages/{Reports,ReportBuilderPage,ReportViewPage}.tsx` | Rescue user-facing pages |

## Endpoints

All routes mount at `/api/v1/reports`. All require auth except the
token-share viewer.

| Method | Path | Permission | Notes |
| --- | --- | --- | --- |
| GET | `/` | `reports.read.own` | Lists user's reports + rescue/platform reports the caller can view |
| POST | `/` | `reports.create` | Creates a saved report. Backend forces `rescueId` to caller's rescue unless `reports.read.platform`. |
| GET | `/templates` | `reports.read.own` | Lists system + rescue-private templates |
| POST | `/execute` | `reports.create` | Runs an unsaved config (preview, not cached) |
| GET | `/:id` | scope-checked | Owner / rescue / platform / share-row matrix |
| PUT | `/:id` | `reports.update` + ownership | |
| DELETE | `/:id` | `reports.delete` + ownership | Soft-delete |
| POST | `/:id/execute` | scope-checked | Runs the saved config; cached |
| POST | `/:id/schedule` | `reports.schedule` | Upserts BullMQ repeatable |
| DELETE | `/schedules/:scheduleId` | `reports.schedule` | Removes the repeatable |
| POST | `/:id/share` | `reports.share` | `shareType: 'user'` or `'token'` |
| DELETE | `/shares/:shareId` | `reports.share` | Revokes |
| GET | `/shared/:token` | none | Token-based read-only viewer; verifies signed JWT + DB row |

## Report config schema

```ts
{
  filters: {
    startDate?: Date, endDate?: Date,
    groupBy?: 'day' | 'week' | 'month',
    rescueId?: UUID,            // platform admins only
  },
  layout: { columns: 1 | 2 | 3 | 4, rowGap?: number },
  widgets: Array<{
    id: UUID, title: string, position: { x, y, w, h },
    metric: 'adoption' | 'application' | 'user' | 'communication' | 'platform' | 'custom',
    chartType: 'line' | 'bar' | 'pie' | 'area' | 'table' | 'metric-card',
    options: <discriminated union by chartType>,   // see schema for shapes
    drilldown?: { enabled: boolean, dimension: string },
  }>,
}
```

Each `chartType` has its own `options` shape; mismatches are
compile-time errors and 400s at runtime.

## Permissions matrix

| Permission | super_admin | admin | rescue_admin | rescue_staff | adopter |
| --- | --- | --- | --- | --- | --- |
| `reports.create` | ✓ | ✓ | ✓ | ✓ | — |
| `reports.read.own` | ✓ | ✓ | ✓ | ✓ | — |
| `reports.read.rescue` | ✓ | ✓ | ✓ | ✓ | — |
| `reports.read.platform` | ✓ | ✓ | — | — | — |
| `reports.update` | ✓ | ✓ | ✓ | — | — |
| `reports.delete` | ✓ | ✓ | ✓ | — | — |
| `reports.share` | ✓ | ✓ | ✓ | — | — |
| `reports.schedule` | ✓ | ✓ | ✓ | — | — |
| `reports.template.manage` | ✓ | ✓ | — | — | — |

## Sharing model

Two paths in the same `report_shares` table:

- **User share** (`share_type='user'`) — `shared_with_user_id` is the
  target user. The viewer endpoint `GET /:id` checks the share row in
  addition to ownership / rescue match.
- **Token share** (`share_type='token'`) — `token_hash` stores the
  sha256 of a random `jti`. The signed JWT (separate
  `JWT_REPORT_SHARE_SECRET`) is delivered to the share recipient as a
  URL fragment. `GET /shared/:token` verifies the signature and
  re-checks the DB row so revocation is instant.

## Real-time

Server emits to scoped rooms joined at handshake:

| Event | Room | Payload |
| --- | --- | --- |
| `analytics:invalidate` | `analytics:rescue:{rescueId}` / `analytics:platform` | `{ rescueId, categories }` |
| `analytics:metric-update` | same | `{ metric, scope, delta?, value?, ts }` |
| `reports:scheduled-run-complete` | `user:{ownerId}` | `{ savedReportId, scheduleId, status, ts }` |

`analytics:invalidate` is debounced server-side to one event per
`(rescueId, category)` per 5 seconds so chat-heavy mutations don't
flood subscribers.

Frontend integration: mount `useAnalyticsInvalidator()` once at the
app root. It calls `queryClient.invalidateQueries(['analytics', cat])`
and `queryClient.invalidateQueries('reports')` whenever the server
fires `analytics:invalidate`.

## Scheduling

`upsertSchedule` writes a `scheduled_reports` row and registers a
BullMQ repeatable keyed by `ScheduledReport.id` with the cron pattern
and timezone. Two job types in the same queue:

1. `report:scheduled-run` — fires on the cron, enqueues a
   render-and-email job.
2. `report:render-and-email` — runs the report, renders the chosen
   format (PDF / CSV / inline-html), pushes through `emailService`.

Retries: 3 attempts, exponential backoff (1m, 5m, 25m). Final failure
sets `last_status='failed'`, persists `last_error`, and emits
`reports:schedule-failed` to the owner's user-room.

## Operational notes

### Required env vars

| Var | Required | Notes |
| --- | --- | --- |
| `REDIS_URL` | for caching + scheduling | When unset, cache is a no-op and the worker refuses to start. The HTTP API still works. |
| `JWT_REPORT_SHARE_SECRET` | for token shares | Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Distinct from `JWT_SECRET`. |
| `WORKER_ENABLED` | optional | When `true` (or in dev), the API process also runs the BullMQ worker. Set `false` in prod and run a dedicated worker container. |

### Rollout

- New tables are additive; no existing code references them. Safe to
  apply migration `08` ahead of feature rollout.
- The feature surface is gated behind `analytics.customReports`
  feature flag (when wired) — UI hides menu entries; backend returns
  404 on routes when disabled.
- Without Redis, `/api/v1/reports/*` still serves CRUD + execute
  (uncached). Scheduling silently disables (`is_enabled` rows just
  never fire).

### Verification

```bash
npm run docker:dev:build          # now starts redis
npm run db:migrate
npm run db:seed:reference         # seeds permissions + role-permissions
```

Then in app.admin:

1. Log in as super-admin, go to `/reports`, click **New report**.
2. Add the **Adoption trends** preset, then **Save**.
3. From the saved report, click **Schedule**, set cron `*/2 * * * *`
   and a recipient email. Watch Ethereal (dev provider) for delivery
   in ~2 minutes.
4. Click **Share link**, paste in incognito, confirm read-only render.
5. Trigger an `Application` create from app.client; the open report
   should auto-refresh via Socket.IO.

## Testing

- `service.backend/src/__tests__/services/reports.service.test.ts`
  covers execute dispatch, cache hit/miss, view-permission matrix.
- `service.backend/src/__tests__/services/report-cache.service.test.ts`
  asserts graceful degradation when Redis is unreachable.
