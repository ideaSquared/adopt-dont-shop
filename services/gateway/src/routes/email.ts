// REST → gRPC translation for the /api/v1/email/templates/* admin
// surface. Backed entirely by service.notifications (which owns the
// email_templates table). Each route maps the SPA's JSON shape onto the
// proto fields and the gRPC status onto an HTTP status.
//
// Same dev-mode auth contract as the other gateway routes — the
// authenticate middleware populates x-user-* metadata the notifications
// handlers' principal extractor reads, and they gate on
// email.templates.* permissions.

import { status } from '@grpc/grpc-js';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  NotificationsV1,
  type CreateEmailTemplateRequest,
  type ListEmailTemplatesRequest,
  type UpdateEmailTemplateRequest,
} from '@adopt-dont-shop/proto';

import type { NotificationsClient } from '../grpc-clients/notifications-client.js';
import { buildMetadata } from '../middleware/metadata.js';
import { parsePagination } from '../middleware/pagination.js';

export type EmailRoutesOptions = {
  client: NotificationsClient;
};

const GRPC_TO_HTTP: Record<number, number> = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.INTERNAL]: 500,
};

const typeFromString = (raw: string | undefined): NotificationsV1.EmailTemplateType => {
  if (!raw) {
    return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_UNSPECIFIED;
  }
  const upper = `EMAIL_TEMPLATE_TYPE_${raw.toUpperCase()}`;
  const parsed = NotificationsV1.emailTemplateTypeFromJSON(
    Object.values(NotificationsV1.EmailTemplateType).includes(upper as never) ? upper : raw
  );
  return parsed === NotificationsV1.EmailTemplateType.UNRECOGNIZED
    ? NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_UNSPECIFIED
    : parsed;
};

const statusFromString = (raw: string | undefined): NotificationsV1.EmailTemplateStatus => {
  if (!raw) {
    return NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_UNSPECIFIED;
  }
  const upper = `EMAIL_TEMPLATE_STATUS_${raw.toUpperCase()}`;
  const parsed = NotificationsV1.emailTemplateStatusFromJSON(
    Object.values(NotificationsV1.EmailTemplateStatus).includes(upper as never) ? upper : raw
  );
  return parsed === NotificationsV1.EmailTemplateStatus.UNRECOGNIZED
    ? NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_UNSPECIFIED
    : parsed;
};

// Body → proto string-or-undefined helper for variables. The SPA may
// send `variables` as an array; we JSON-stringify it for the proto's
// variables_json field.
const variablesJson = (v: unknown): string | undefined => {
  if (v === undefined) {
    return undefined;
  }
  if (typeof v === 'string') {
    return v;
  }
  return JSON.stringify(v);
};

export const registerEmailRoutes = async (
  app: FastifyInstance,
  opts: EmailRoutesOptions
): Promise<void> => {
  const { client } = opts;

  // GET /api/v1/email/templates
  app.get('/api/v1/email/templates', async (req, reply) => {
    const metadata = buildMetadata(req);
    const q = req.query as Record<string, string | undefined>;
    const pagination = parsePagination(q, { limit: 0 });
    if (!pagination.ok) {
      return reply.code(400).send({ success: false, error: pagination.error });
    }
    const grpcReq: ListEmailTemplatesRequest = {
      typeFilter: typeFromString(q.type),
      statusFilter: statusFromString(q.status),
      categoryFilter: q.category,
      search: q.search,
      page: pagination.page,
      limit: pagination.limit,
    };
    try {
      const res = await client.listEmailTemplates(grpcReq, metadata);
      return reply.send({
        success: true,
        data: res.templates.map(t => NotificationsV1.EmailTemplate.toJSON(t)),
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

  // POST /api/v1/email/templates
  app.post('/api/v1/email/templates', async (req, reply) => {
    const metadata = buildMetadata(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const grpcReq: CreateEmailTemplateRequest = {
      name: typeof body.name === 'string' ? body.name : '',
      description: typeof body.description === 'string' ? body.description : undefined,
      type: typeFromString(typeof body.type === 'string' ? body.type : undefined),
      category: typeof body.category === 'string' ? body.category : '',
      status: statusFromString(typeof body.status === 'string' ? body.status : undefined),
      subject: typeof body.subject === 'string' ? body.subject : '',
      htmlContent:
        typeof body.htmlContent === 'string'
          ? body.htmlContent
          : typeof body.html_content === 'string'
            ? body.html_content
            : '',
      textContent:
        typeof body.textContent === 'string'
          ? body.textContent
          : typeof body.text_content === 'string'
            ? body.text_content
            : undefined,
      variablesJson: variablesJson(body.variables) ?? '[]',
      locale: typeof body.locale === 'string' ? body.locale : undefined,
    };
    try {
      const res = await client.createEmailTemplate(grpcReq, metadata);
      return reply.code(201).send({
        success: true,
        data: NotificationsV1.EmailTemplate.toJSON(res.template!),
      });
    } catch (err) {
      return handleGrpcError(err, reply);
    }
  });

  // GET /api/v1/email/templates/:templateId
  app.get<{ Params: { templateId: string } }>(
    '/api/v1/email/templates/:templateId',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        const res = await client.getEmailTemplate({ templateId: req.params.templateId }, metadata);
        return reply.send({
          success: true,
          data: NotificationsV1.EmailTemplate.toJSON(res.template!),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // PUT /api/v1/email/templates/:templateId
  app.put<{ Params: { templateId: string } }>(
    '/api/v1/email/templates/:templateId',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as Record<string, unknown>;
      const grpcReq: UpdateEmailTemplateRequest = {
        templateId: req.params.templateId,
        name: typeof body.name === 'string' ? body.name : undefined,
        description: typeof body.description === 'string' ? body.description : undefined,
        type: typeFromString(typeof body.type === 'string' ? body.type : undefined),
        category: typeof body.category === 'string' ? body.category : undefined,
        status: statusFromString(typeof body.status === 'string' ? body.status : undefined),
        subject: typeof body.subject === 'string' ? body.subject : undefined,
        htmlContent:
          typeof body.htmlContent === 'string'
            ? body.htmlContent
            : typeof body.html_content === 'string'
              ? body.html_content
              : undefined,
        textContent:
          typeof body.textContent === 'string'
            ? body.textContent
            : typeof body.text_content === 'string'
              ? body.text_content
              : undefined,
        variablesJson: variablesJson(body.variables),
      };
      try {
        const res = await client.updateEmailTemplate(grpcReq, metadata);
        return reply.send({
          success: true,
          data: NotificationsV1.EmailTemplate.toJSON(res.template!),
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // DELETE /api/v1/email/templates/:templateId
  app.delete<{ Params: { templateId: string } }>(
    '/api/v1/email/templates/:templateId',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      try {
        await client.deleteEmailTemplate({ templateId: req.params.templateId }, metadata);
        return reply.send({ success: true, message: 'Template deleted' });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );

  // POST /api/v1/email/templates/:templateId/preview
  app.post<{ Params: { templateId: string } }>(
    '/api/v1/email/templates/:templateId/preview',
    async (req, reply) => {
      const metadata = buildMetadata(req);
      const body = (req.body ?? {}) as { variables?: unknown };
      try {
        const res = await client.previewEmailTemplate(
          {
            templateId: req.params.templateId,
            variablesJson: variablesJson(body.variables) ?? '{}',
          },
          metadata
        );
        return reply.send({
          success: true,
          data: {
            subject: res.subject,
            htmlContent: res.htmlContent,
            textContent: res.textContent ?? null,
          },
        });
      } catch (err) {
        return handleGrpcError(err, reply);
      }
    }
  );
};

// --- Helpers ---------------------------------------------------------

type GrpcError = { code?: number; details?: string; message?: string };

function handleGrpcError(err: unknown, reply: FastifyReply): FastifyReply {
  const grpcErr = err as GrpcError;
  const httpStatus = (grpcErr?.code !== undefined && GRPC_TO_HTTP[grpcErr.code]) || 500;
  return reply.code(httpStatus).send({
    success: false,
    error: grpcErr?.details ?? grpcErr?.message ?? 'internal_error',
  });
}
