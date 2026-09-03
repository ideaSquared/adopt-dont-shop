# Analytics Reports (ADS-105)

The saved-report feature: compose a report config out of widgets, save it, execute it against the
platform's analytics aggregations, share it with a teammate or via a signed-token URL. Owned by
the `audit` service, fronted by the gateway at `/api/v1/reports/*`.

> Status note: report **execution/preview** and **sharing** are implemented. Scheduled email
> delivery and real-time push are **not yet wired** — see the "Not yet implemented" section.

## Architecture

```
Browser ──REST──►  /api/v1/reports/*  ──gRPC──►  service.audit reports handlers
  (gateway)                                        ├──► analytics aggregation gRPC clients (execute)
                                                   └──► Postgres (audit schema: saved_reports, …)
```

Report execution fans out to the analytics aggregation clients via `executeConfig`
(`services/gateway/src/routes/reports.ts`); persistence is raw SQL in the audit service. There is
no BullMQ, no ioredis, no Sequelize, and no PDF/CSV renderer in the codebase today.

### Backend layout (service.audit)

| Path                                                                      | Purpose                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/audit/src/grpc/reports-handlers.ts`                             | All report RPCs: list/get/create/update/delete saved reports, list templates, upsert/delete schedule, create/revoke share, token-share lookup |
| `services/audit/src/migrations/003_create_reports.ts`                     | Tables `report_templates`, `saved_reports`                                                                                                    |
| `services/audit/src/migrations/008_create_report_schedules_and_shares.ts` | Tables `saved_report_schedules`, `saved_report_shares`                                                                                        |
| `services/audit/src/db/`                                                  | Query helpers                                                                                                                                 |
| `services/audit/src/scheduler/scheduler.ts`                               | Generic in-process tick scheduler (60 s default). Currently registers only the GDPR saga sweep jobs — not report delivery                     |
| `services/gateway/src/routes/reports.ts`                                  | REST edge; `executeConfig` aggregation fan-out                                                                                                |

Frontend consumers live in `lib.analytics` (schemas, `report-service`, `useReports` hooks) and
`lib.components` (chart primitives, report-builder components); admin/rescue pages under
`app.admin` / `app.rescue`.

## Endpoints

All mount under `/api/v1/reports`; all require auth except the token-share viewer. The handlers
gate on these permissions (`services/audit/src/grpc/reports-handlers.ts`): `reports.read`,
`reports.read:any`, `reports.create`, `reports.update`, `reports.update:any`, `reports.delete`,
`reports.delete:any`. The `:any` variants are the platform-wide grants (super_admin); the base
permission is owner-scoped.

| Method | Path                     | Notes                                                      |
| ------ | ------------------------ | ---------------------------------------------------------- |
| GET    | `/`                      | List the caller's saved reports (`:any` sees all)          |
| POST   | `/`                      | Create a saved report                                      |
| GET    | `/templates`             | List system + rescue templates                             |
| POST   | `/execute`               | Run an unsaved config (preview, not cached)                |
| GET    | `/:id`                   | Read one (owner / `:any`)                                  |
| PUT    | `/:id`                   | Update (owner / `:any`)                                    |
| DELETE | `/:id`                   | Soft-delete                                                |
| POST   | `/:id/execute`           | Run a saved config                                         |
| POST   | `/:id/schedule`          | Upsert a `saved_report_schedules` row                      |
| DELETE | `/schedules/:scheduleId` | Remove a schedule row                                      |
| POST   | `/:id/share`             | `shareType: 'user'` or `'token'`                           |
| DELETE | `/shares/:shareId`       | Revoke a share                                             |
| GET    | `/shared/:token`         | Token-based read-only viewer; verifies signed JWT + DB row |

## Report config schema

```ts
{
  filters: { startDate?, endDate?, groupBy?: 'day'|'week'|'month', rescueId? },
  layout: { columns: 1|2|3|4, rowGap? },
  widgets: Array<{
    id, title, position: { x, y, w, h },
    metric: 'adoption'|'application'|'user'|'communication'|'platform'|'custom',
    chartType: 'line'|'bar'|'pie'|'area'|'table'|'metric-card',
    options,               // discriminated union by chartType
    drilldown?: { enabled, dimension },
  }>,
}
```

Each `chartType` has its own `options` shape; a mismatch is a compile-time error and a 400 at
runtime. The canonical Zod schema lives in `lib.analytics`.

## Sharing model

Two share types in the same `saved_report_shares` table:

- **User share** (`share_type='user'`) — `shared_with_user_id` names the target. `GET /:id`
  checks the share row in addition to ownership.
- **Token share** (`share_type='token'`) — stores the sha256 of a random `jti`. A JWT signed with
  a dedicated `JWT_REPORT_SHARE_SECRET` is delivered as a URL fragment; `GET /shared/:token`
  verifies the signature and re-checks the DB row so revocation is instant.

## Not yet implemented

These appear in the frontend or schema but have no server-side implementation:

- **Scheduled delivery.** `POST /:id/schedule` persists a `saved_report_schedules` row, but the
  audit scheduler currently registers only the GDPR saga sweep jobs — nothing reads due schedules
  to render and email a report. Creating a schedule has no automated effect yet.
- **Real-time push.** The events `analytics:invalidate`, `analytics:metric-update`, and
  `reports:scheduled-run-complete` are defined on the client
  (`lib.analytics/src/hooks/useRealtimeAnalytics.ts`) but no service emits them — grep finds no
  server-side emitter. Treat the real-time section as a client-side contract awaiting a producer.

## Operational notes

### Env vars

| Var                       | Required         | Notes                                                                                                                |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| `JWT_REPORT_SHARE_SECRET` | for token shares | Distinct from `JWT_SECRET`. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `REDIS_URL`               | shared           | Used by the gateway rate limiter and service idempotency; report execution does not cache today                      |

## Verification

```bash
pnpm docker:dev:build
docker compose exec service-audit pnpm db:migrate   # report tables
docker compose exec service-auth pnpm db:migrate    # permissions + role grants
```

Then in app.admin:

1. Log in as super-admin, go to `/reports`, click **New report**.
2. Add the **Adoption trends** preset, then **Save**.
3. Open the saved report and **Execute** it — confirm it renders against live aggregations.
   (Creating a **Schedule** persists a row, but automated delivery is not yet wired — see above.)
4. Click **Share link**, paste in incognito, confirm the read-only render.

## Testing

- `services/audit/src/grpc/reports-handlers.test.ts` covers the report RPCs: create/update/delete,
  the view-permission matrix, schedule upsert/delete, and share create/revoke/token-lookup.
