// REST → gRPC translation for /api/v1/reports/*. Backed by
// service.audit, which owns the saved_reports + report_templates
// state. Execute / schedules / shares remain monolith-owned for now —
// the SPA reads the persisted config from here and POSTs to the
// monolith's /execute when a chart needs to render.

import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  AuditV1,
  type AuditCreateSavedReportRequest,
  type AuditListReportTemplatesRequest,
  type AuditListSavedReportsRequest,
  type AuditReportTemplate,
  type AuditSavedReport,
  type AuditUpdateSavedReportRequest,
} from '@adopt-dont-shop/proto';

import type { AuditClient } from '../grpc-clients/audit-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { parsePagination } from '../middleware/pagination.js';

export type ReportsRoutesOptions = {
  client: AuditClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
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
  const { client } = opts;

  // GET /api/v1/reports — paginated list. Self-scoped at the service.
  app.get('/api/v1/reports', async (req, reply) => {
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
  });

  // GET /api/v1/reports/templates — register BEFORE /:id so the
  // static path wins.
  app.get('/api/v1/reports/templates', async (req, reply) => {
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
  });

  app.get<{ Params: { id: string } }>('/api/v1/reports/:id', async (req, reply) => {
    try {
      const res = await client.getSavedReport({ savedReportId: req.params.id }, buildMetadata(req));
      if (!res.report) {
        return reply.code(404).send({ success: false, error: 'not found' });
      }
      return reply.send({ success: true, data: reportToView(res.report) });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  app.post('/api/v1/reports', async (req, reply) => {
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
  });

  app.put<{ Params: { id: string } }>('/api/v1/reports/:id', async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const grpcReq: AuditUpdateSavedReportRequest = {
      savedReportId: req.params.id,
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      configJson:
        body.config !== undefined || body.configJson !== undefined || body.config_json !== undefined
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
  });

  app.delete<{ Params: { id: string } }>('/api/v1/reports/:id', async (req, reply) => {
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
  });
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

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
