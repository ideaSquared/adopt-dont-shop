// REST → gRPC translation for /api/v1/reports/*. CRUD on saved
// reports/templates is backed by service.audit, which owns that state.
// Execute/schedule/share orchestrate across service.audit (schedule +
// share persistence) and service.pets / service.applications /
// service.auth (the live aggregation RPCs each report widget reads).
//
// Widget → aggregation RPC mapping (the 5 WidgetPicker presets in
// lib.components — see computeWidgetData below):
//   metric=adoption, chartType=line       → pets.getAdoptionTrend
//   metric=adoption, chartType=pie        → pets.getAdoptionsByType
//   metric=application, chartType=bar     → applications.getStats
//   metric=adoption, chartType=table       → pets.getTopRescuesByAdoptions
//   metric=user, chartType=metric-card     → auth.getUserStatistics
// Any other metric/chartType combination (custom widgets outside the
// 5 presets) returns an empty data array rather than erroring.
//
// ADS-939: GetUserStatistics has no rescue filter (the RPC returns
// platform-wide counts only), unlike the pets/applications aggregations
// above which all accept `rescueIdFilter`. Rather than adding a filter
// to the auth service (option 1 in the ticket), we take the interim
// gateway-side drop (option 2): a non-platform-admin principal gets the
// empty-array default instead of the RPC's platform totals, logged at
// INFO so the drop is visible. See callerIsPlatformAdmin below.
//
// Known gaps (no backing RPC exists yet, so these are intentionally
// unimplemented rather than half-built):
//   - rescue-leaderboard rows expose {rescueId, adoptions} only — there
//     is no cross-service rescue-name lookup RPC, so the SPA's `name`
//     column renders blank.
//   - user-targeted shares (`shareType: 'user'`) — CreateReportShareRequest
//     has no shared_with_user_id field; only token shares work.
//   - deleteSchedule / revokeShare / viewSharedByToken — no RPC backs
//     any of these; the frontend ReportService methods that call them
//     will fail until that backend work lands separately.

import { type Metadata } from '@grpc/grpc-js';
import type { FastifyInstance } from 'fastify';

import {
  AuditV1,
  AuthV1,
  PetsV1,
  type AuditCreateReportShareRequest,
  type AuditCreateSavedReportRequest,
  type AuditListReportTemplatesRequest,
  type AuditListSavedReportsRequest,
  type AuditReportSchedule,
  type AuditReportShare,
  type AuditReportTemplate,
  type AuditSavedReport,
  type AuditUpdateSavedReportRequest,
  type AuditUpsertReportScheduleRequest,
  type GetStatsResponse,
} from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import type { AuditClient } from '../grpc-clients/audit-client.js';
import type { AuthClient } from '../grpc-clients/auth-client.js';
import type { PetsClient } from '../grpc-clients/pets-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { handleGrpcError } from '../middleware/grpc-error.js';
import { parsePagination } from '../middleware/pagination.js';

export type ReportsRoutesOptions = {
  client: AuditClient;
  petsClient: PetsClient;
  applicationsClient: ApplicationsClient;
  authClient: AuthClient;
};

const CATEGORY_FROM_STRING: Record<string, AuditV1.ReportTemplateCategory> = {
  adoption: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION,
  engagement: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ENGAGEMENT,
  operations: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_OPERATIONS,
  fundraising: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_FUNDRAISING,
  custom: AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_CUSTOM,
};

const CATEGORY_TO_STRING: Record<number, string> = {
  [AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION]: 'adoption',
  [AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ENGAGEMENT]: 'engagement',
  [AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_OPERATIONS]: 'operations',
  [AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_FUNDRAISING]: 'fundraising',
  [AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_CUSTOM]: 'custom',
};

const FORMAT_FROM_STRING: Record<string, AuditV1.ReportScheduleFormat> = {
  pdf: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF,
  csv: AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_CSV,
  'inline-html': AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_INLINE_HTML,
};

const FORMAT_TO_STRING: Record<number, string> = {
  [AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF]: 'pdf',
  [AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_CSV]: 'csv',
  [AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_INLINE_HTML]: 'inline-html',
};

const PERMISSION_FROM_STRING: Record<string, AuditV1.ReportSharePermission> = {
  view: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW,
  edit: AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT,
};

const PERMISSION_TO_STRING: Record<number, string> = {
  [AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW]: 'view',
  [AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT]: 'edit',
};

// DB status strings (service.applications) → GetStatsResponse field names.
const APPLICATION_STATUS_FIELDS: ReadonlyArray<{
  status: string;
  field: keyof GetStatsResponse;
}> = [
  { status: 'draft', field: 'draft' },
  { status: 'submitted', field: 'submitted' },
  { status: 'under_review', field: 'underReview' },
  { status: 'home_visit_scheduled', field: 'homeVisitScheduled' },
  { status: 'home_visit_completed', field: 'homeVisitCompleted' },
  { status: 'approved', field: 'approved' },
  { status: 'rejected', field: 'rejected' },
  { status: 'withdrawn', field: 'withdrawn' },
  { status: 'adopted', field: 'adopted' },
];

// Minimal shapes for the `config` JSON blob (saved-report configJson, or
// the unsaved `config` object posted to /execute). Treated as untyped
// input — the gateway has no dependency on lib.analytics's Zod schemas
// (services don't depend on frontend packages), so fields are narrowed
// defensively rather than validated against the full schema.
type ReportFiltersInput = {
  startDate?: string;
  endDate?: string;
  groupBy?: string;
  rescueId?: string;
};

type ReportWidgetInput = {
  id?: unknown;
  metric?: unknown;
  chartType?: unknown;
  options?: Record<string, unknown>;
};

type ReportConfigInput = {
  filters?: ReportFiltersInput;
  widgets?: ReportWidgetInput[];
};

function parseConfig(configJson: string | undefined): ReportConfigInput {
  if (!configJson) {
    return { filters: {}, widgets: [] };
  }
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    const filters = (
      parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : {}
    ) as ReportFiltersInput;
    const widgets = Array.isArray(parsed.widgets) ? (parsed.widgets as ReportWidgetInput[]) : [];
    return { filters, widgets };
  } catch {
    return { filters: {}, widgets: [] };
  }
}

// Widget `options` (xKey/seriesKey/labelKey/valueKey) are client-controlled
// and used as row key names below. Deny dangerous keys, and build rows via
// Object.fromEntries (not `{ [key]: value }` object-literal syntax) so a
// key like `__proto__` is never written as a literal computed property —
// CodeQL's remote-property-injection sink only matches the literal form.
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function sanitizeKey(key: string, fallback: string): string {
  return DANGEROUS_KEYS.has(key) ? fallback : key;
}

function seriesKeyFrom(options: Record<string, unknown>): string {
  const series = options.series;
  if (Array.isArray(series) && series.length > 0 && typeof series[0]?.key === 'string') {
    return sanitizeKey(series[0].key, 'count');
  }
  return 'count';
}

function petTypeLabel(type: PetsV1.PetType): string {
  return PetsV1.petTypeToJSON(type).replace('PET_TYPE_', '').toLowerCase();
}

function scheduleToView(s: AuditReportSchedule): Record<string, unknown> {
  return {
    schedule_id: s.scheduleId,
    saved_report_id: s.savedReportId,
    cron: s.cron,
    timezone: s.timezone,
    recipients: s.recipients.map(r => ({ email: r.email, userId: r.userId || undefined })),
    format: FORMAT_TO_STRING[s.format] ?? 'pdf',
    is_enabled: s.isEnabled,
    last_run_at: s.lastRunAt ?? null,
    next_run_at: s.nextRunAt ?? null,
    last_status: s.lastStatus ?? null,
    last_error: s.lastError ?? null,
  };
}

function shareToView(s: AuditReportShare): Record<string, unknown> {
  return {
    share_id: s.shareId,
    saved_report_id: s.savedReportId,
    share_type: s.shareType,
    shared_with_user_id: null,
    permission: PERMISSION_TO_STRING[s.permission] ?? 'view',
    expires_at: s.expiresAt ?? null,
    revoked_at: s.revokedAt ?? null,
  };
}

type AggregationClients = {
  petsClient: PetsClient;
  applicationsClient: ApplicationsClient;
  authClient: AuthClient;
};

// Same shape as dashboard.ts's ADMIN_ROLES/callerIsAdmin — x-user-roles is
// stamped by the gateway's authenticate middleware from the validated
// principal (see middleware/authenticate.ts SPOOFABLE_HEADERS), so it
// can't be forged by the client.
const PLATFORM_ADMIN_ROLES = new Set(['admin', 'super_admin']);

function callerIsPlatformAdmin(metadata: Metadata): boolean {
  const raw = metadata.get('x-user-roles');
  const value = typeof raw[0] === 'string' ? raw[0] : '';
  return value
    .split(',')
    .map(r => r.trim())
    .some(r => PLATFORM_ADMIN_ROLES.has(r));
}

type WidgetLogger = { info: (obj: Record<string, unknown>, msg: string) => void };

// Widget → aggregation RPC dispatch. See the file-header comment for the
// full metric/chartType → RPC mapping table.
async function computeWidgetData(
  widget: ReportWidgetInput,
  filters: ReportFiltersInput,
  clients: AggregationClients,
  metadata: Metadata,
  log: WidgetLogger
): Promise<unknown[]> {
  const metric = typeof widget.metric === 'string' ? widget.metric : '';
  const chartType = typeof widget.chartType === 'string' ? widget.chartType : '';
  const options = widget.options ?? {};

  if (metric === 'adoption' && chartType === 'line') {
    const res = await clients.petsClient.getAdoptionTrend(
      {
        rescueIdFilter: filters.rescueId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
      },
      metadata
    );
    const xKey = sanitizeKey(typeof options.xKey === 'string' ? options.xKey : 'date', 'date');
    const seriesKey = seriesKeyFrom(options);
    return res.points.map(p =>
      Object.fromEntries([
        [xKey, p.date],
        [seriesKey, p.count],
      ])
    );
  }

  if (metric === 'adoption' && chartType === 'pie') {
    const res = await clients.petsClient.getAdoptionsByType(
      { rescueIdFilter: filters.rescueId, startDate: filters.startDate, endDate: filters.endDate },
      metadata
    );
    const labelKey = sanitizeKey(
      typeof options.labelKey === 'string' ? options.labelKey : 'type',
      'type'
    );
    const valueKey = sanitizeKey(
      typeof options.valueKey === 'string' ? options.valueKey : 'count',
      'count'
    );
    return res.counts.map(c =>
      Object.fromEntries([
        [labelKey, petTypeLabel(c.type)],
        [valueKey, c.count],
      ])
    );
  }

  if (metric === 'application' && chartType === 'bar') {
    const res = await clients.applicationsClient.getStats(
      {
        rescueIdFilter: filters.rescueId,
        createdAfter: filters.startDate,
        createdBefore: filters.endDate,
      },
      metadata
    );
    const xKey = sanitizeKey(typeof options.xKey === 'string' ? options.xKey : 'status', 'status');
    const seriesKey = seriesKeyFrom(options);
    return APPLICATION_STATUS_FIELDS.map(({ status, field }) =>
      Object.fromEntries([
        [xKey, status],
        [seriesKey, res[field] ?? 0],
      ])
    );
  }

  if (metric === 'adoption' && chartType === 'table') {
    const res = await clients.petsClient.getTopRescuesByAdoptions(
      { startDate: filters.startDate, endDate: filters.endDate, limit: 10 },
      metadata
    );
    // No rescue-name lookup RPC exists — rows intentionally omit `name`.
    return res.rescues.map(r => ({ rescueId: r.rescueId, adoptions: r.adoptions }));
  }

  if (metric === 'user' && chartType === 'metric-card') {
    if (!callerIsPlatformAdmin(metadata)) {
      log.info(
        { widgetId: typeof widget.id === 'string' ? widget.id : '' },
        'Dropping user-statistics widget for non-platform-admin principal (ADS-939)'
      );
      return [];
    }
    const res = await clients.authClient.getUserStatistics({}, metadata);
    const valueKey = sanitizeKey(
      typeof options.valueKey === 'string' ? options.valueKey : 'value',
      'value'
    );
    const active = res.byStatus.find(s => s.status === AuthV1.UserStatus.USER_STATUS_ACTIVE);
    return [Object.fromEntries([[valueKey, active?.count ?? 0]])];
  }

  return [];
}

async function executeConfig(
  config: ReportConfigInput,
  clients: AggregationClients,
  metadata: Metadata,
  log: WidgetLogger & { error: (obj: Record<string, unknown>, msg: string) => void }
): Promise<Record<string, unknown>> {
  const filters = config.filters ?? {};
  const widgets = config.widgets ?? [];
  const settled = await Promise.allSettled(
    widgets.map(async widget => ({
      id: typeof widget.id === 'string' ? widget.id : '',
      data: await computeWidgetData(widget, filters, clients, metadata, log),
      meta: {
        metric: typeof widget.metric === 'string' ? widget.metric : '',
        chartType: typeof widget.chartType === 'string' ? widget.chartType : '',
        computedAt: new Date().toISOString(),
      },
    }))
  );
  const widgetResults = settled.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { ...result.value, status: 'ok' };
    }
    const widget = widgets[i];
    const widgetId = typeof widget?.id === 'string' ? widget.id : '';
    const metric = typeof widget?.metric === 'string' ? widget.metric : '';
    const errorMessage =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
    // ADS-977: the full message (which can carry SQL fragments, table/DNS
    // names, or gRPC status text) stays server-side in the log, correlated
    // by widgetId/metric. The client only ever sees a fixed, caller-safe
    // string — the SPA treats status:'error' as the render trigger, so the
    // text itself is cosmetic and doesn't need to be specific.
    log.error({ widgetId, metric, error: errorMessage }, 'Widget aggregation failed');
    return {
      id: widgetId,
      data: [],
      meta: {
        metric,
        chartType: typeof widget?.chartType === 'string' ? widget.chartType : '',
        computedAt: new Date().toISOString(),
      },
      status: 'error',
      error: 'Aggregation unavailable',
    };
  });
  return {
    widgets: widgetResults,
    filters,
    computedAt: new Date().toISOString(),
    cacheHit: false,
  };
}

function reportToView(r: AuditSavedReport): Record<string, unknown> {
  let config: unknown = {};
  try {
    config = r.configJson ? JSON.parse(r.configJson) : {};
  } catch {
    config = {};
  }
  return {
    saved_report_id: r.savedReportId,
    user_id: r.userId,
    rescue_id: r.rescueId,
    template_id: r.templateId,
    name: r.name,
    description: r.description,
    config,
    is_archived: r.isArchived,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function templateToView(t: AuditReportTemplate): Record<string, unknown> {
  let config: unknown = {};
  try {
    config = t.configJson ? JSON.parse(t.configJson) : {};
  } catch {
    config = {};
  }
  return {
    template_id: t.templateId,
    name: t.name,
    description: t.description,
    category: CATEGORY_TO_STRING[t.category] ?? '',
    config,
    is_system: t.isSystem,
    rescue_id: t.rescueId,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export const registerReportsRoutes = async (
  app: FastifyInstance,
  opts: ReportsRoutesOptions
): Promise<void> => {
  const { client, petsClient, applicationsClient, authClient } = opts;
  const aggregationClients: AggregationClients = { petsClient, applicationsClient, authClient };

  // GET /api/v1/reports — paginated list. Self-scoped at the service.
  app.get(
    '/api/v1/reports',
    {
      schema: {
        tags: ['reports'],
        summary: 'List saved reports',
        querystring: {
          type: 'object',
          properties: {
            rescue_id: { type: 'string' },
            rescueId: { type: 'string' },
            is_archived: { type: 'string' },
            archived: { type: 'string' },
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
              pagination: { type: 'object', additionalProperties: true },
            },
          },
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const pagination = parsePagination(q);
      if (!pagination.ok) {
        return reply.code(400).send({ success: false, error: pagination.error });
      }
      const grpcReq: AuditListSavedReportsRequest = {
        rescueId: q.rescue_id || q.rescueId,
        isArchived:
          q.is_archived === 'true' || q.archived === 'true'
            ? true
            : q.is_archived === 'false' || q.archived === 'false'
              ? false
              : undefined,
        page: pagination.page,
        limit: pagination.limit,
      };
      try {
        const res = await client.listSavedReports(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          data: res.reports.map(reportToView),
          pagination: {
            page: res.page,
            limit: grpcReq.limit || 20,
            total: res.total,
            totalPages: res.totalPages,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // GET /api/v1/reports/templates — register BEFORE /:id so the
  // static path wins.
  app.get(
    '/api/v1/reports/templates',
    {
      schema: {
        tags: ['reports'],
        summary: 'List report templates',
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            rescue_id: { type: 'string' },
            rescueId: { type: 'string' },
            system: { type: 'string' },
            system_only: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
      },
    },
    async (req, reply) => {
      const q = req.query as Record<string, string | undefined>;
      const cat = CATEGORY_FROM_STRING[(q.category ?? '').toLowerCase()];
      const grpcReq: AuditListReportTemplatesRequest = {
        category: cat ?? AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_UNSPECIFIED,
        rescueId: q.rescue_id || q.rescueId,
        systemOnly: q.system === 'true' || q.system_only === 'true' ? true : undefined,
      };
      try {
        const res = await client.listReportTemplates(grpcReq, buildMetadata(req));
        return reply.send({
          success: true,
          data: res.templates.map(templateToView),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/v1/reports/:id',
    {
      schema: {
        tags: ['reports'],
        summary: 'Get a saved report by ID',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.getSavedReport(
          { savedReportId: req.params.id },
          buildMetadata(req)
        );
        if (!res.report) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, data: reportToView(res.report) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post(
    '/api/v1/reports',
    {
      schema: {
        tags: ['reports'],
        summary: 'Create a saved report',
        body: { type: 'object', additionalProperties: true },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          500: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const configJson = encodeConfig(body.config, body.configJson, body.config_json);
      const grpcReq: AuditCreateSavedReportRequest = {
        name: String(body.name ?? ''),
        description: typeof body.description === 'string' ? body.description : undefined,
        rescueId:
          typeof body.rescue_id === 'string'
            ? body.rescue_id
            : typeof body.rescueId === 'string'
              ? body.rescueId
              : undefined,
        templateId:
          typeof body.template_id === 'string'
            ? body.template_id
            : typeof body.templateId === 'string'
              ? body.templateId
              : undefined,
        configJson,
      };
      try {
        const res = await client.createSavedReport(grpcReq, buildMetadata(req));
        if (!res.report) {
          return reply.code(500).send({ success: false, error: 'no row returned' });
        }
        return reply.code(201).send({ success: true, data: reportToView(res.report) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.put<{ Params: { id: string } }>(
    '/api/v1/reports/:id',
    {
      schema: {
        tags: ['reports'],
        summary: 'Update a saved report',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: { type: 'object', additionalProperties: true },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: AuditUpdateSavedReportRequest = {
        savedReportId: req.params.id,
        name: typeof body.name === 'string' ? body.name : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        configJson:
          body.config !== undefined ||
          body.configJson !== undefined ||
          body.config_json !== undefined
            ? encodeConfig(body.config, body.configJson, body.config_json)
            : undefined,
        isArchived:
          typeof body.is_archived === 'boolean'
            ? body.is_archived
            : typeof body.isArchived === 'boolean'
              ? body.isArchived
              : undefined,
      };
      try {
        const res = await client.updateSavedReport(grpcReq, buildMetadata(req));
        if (!res.report) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true, data: reportToView(res.report) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/api/v1/reports/:id',
    {
      schema: {
        tags: ['reports'],
        summary: 'Delete a saved report',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: { type: 'object', properties: { success: { type: 'boolean' } } },
          404: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const res = await client.deleteSavedReport(
          { savedReportId: req.params.id },
          buildMetadata(req)
        );
        if (!res.deleted) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        return reply.send({ success: true });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/reports/execute — preview an unsaved config. Registered
  // BEFORE /:id/execute so the static path wins (same convention as
  // /templates above).
  app.post(
    '/api/v1/reports/execute',
    {
      schema: {
        tags: ['reports'],
        summary: 'Execute a report preview from an unsaved config',
        body: { type: 'object', additionalProperties: true },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          400: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const config = body.config;
      if (!config || typeof config !== 'object') {
        return reply.code(400).send({ success: false, error: 'config is required' });
      }
      try {
        const result = await executeConfig(
          config as ReportConfigInput,
          aggregationClients,
          buildMetadata(req),
          req.log
        );
        return reply.send({ success: true, data: result });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/reports/:id/execute',
    {
      schema: {
        tags: ['reports'],
        summary: 'Execute a saved report',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          404: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      try {
        const metadata = buildMetadata(req);
        const res = await client.getSavedReport({ savedReportId: req.params.id }, metadata);
        if (!res.report) {
          return reply.code(404).send({ success: false, error: 'not found' });
        }
        const config = parseConfig(res.report.configJson);
        const result = await executeConfig(config, aggregationClients, metadata, req.log);
        return reply.send({ success: true, data: result });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  app.post<{ Params: { id: string } }>(
    '/api/v1/reports/:id/schedule',
    {
      schema: {
        tags: ['reports'],
        summary: 'Create or update a report schedule',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            cron: { type: 'string' },
            timezone: { type: 'string' },
            recipients: { type: 'array', items: { type: 'object', additionalProperties: true } },
            format: { type: 'string' },
            isEnabled: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          500: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const recipients = Array.isArray(body.recipients)
        ? (body.recipients as Array<Record<string, unknown>>).map(r => ({
            email: String(r.email ?? ''),
            userId: typeof r.userId === 'string' ? r.userId : undefined,
          }))
        : [];
      const format =
        typeof body.format === 'string'
          ? (FORMAT_FROM_STRING[body.format] ??
            AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF)
          : AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF;
      const grpcReq: AuditUpsertReportScheduleRequest = {
        savedReportId: req.params.id,
        cron: String(body.cron ?? ''),
        timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
        recipients,
        format,
        isEnabled: typeof body.isEnabled === 'boolean' ? body.isEnabled : undefined,
      };
      try {
        const res = await client.upsertReportSchedule(grpcReq, buildMetadata(req));
        if (!res.schedule) {
          return reply.code(500).send({ success: false, error: 'no row returned' });
        }
        return reply.send({ success: true, data: scheduleToView(res.schedule) });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/reports/:id/share — token shares only. CreateReportShareRequest
  // has no shared_with_user_id field, so user-targeted shares aren't backed yet.
  app.post<{ Params: { id: string } }>(
    '/api/v1/reports/:id/share',
    {
      schema: {
        tags: ['reports'],
        summary: 'Create a report share (token shares only)',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          properties: {
            shareType: { type: 'string' },
            permission: { type: 'string' },
            expiresAt: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', additionalProperties: true },
            },
          },
          500: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
          501: {
            type: 'object',
            properties: { success: { type: 'boolean' }, error: { type: 'string' } },
          },
        },
      },
    },
    async (req, reply) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      if (body.shareType === 'user') {
        return reply
          .code(501)
          .send({ success: false, error: 'user-targeted shares are not supported yet' });
      }
      const permission =
        typeof body.permission === 'string'
          ? (PERMISSION_FROM_STRING[body.permission] ??
            AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW)
          : AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW;
      const grpcReq: AuditCreateReportShareRequest = {
        savedReportId: req.params.id,
        permission,
        expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : undefined,
      };
      try {
        const res = await client.createReportShare(grpcReq, buildMetadata(req));
        if (!res.share) {
          return reply.code(500).send({ success: false, error: 'no row returned' });
        }
        return reply.code(201).send({
          success: true,
          data: { share: shareToView(res.share), token: res.token || undefined },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

function encodeConfig(configObj: unknown, configJson: unknown, configSnake: unknown): string {
  // Prefer the JS object form when present (most common in REST), fall
  // back to the JSON string form (camel + snake_case).
  if (configObj !== undefined && configObj !== null) {
    return JSON.stringify(configObj);
  }
  if (typeof configJson === 'string') {
    return configJson;
  }
  if (typeof configSnake === 'string') {
    return configSnake;
  }
  return '';
}
