// gRPC handlers for the email template admin surface:
// ListEmailTemplates, GetEmailTemplate, CreateEmailTemplate,
// UpdateEmailTemplate, DeleteEmailTemplate, PreviewEmailTemplate.
//
// CRUD over the email_templates table the SendEmail render path reads.
// Each gates on the matching email.templates.* permission. Preview
// reuses renderEmailTemplate so the admin UI sees exactly what SendEmail
// would queue.

import { randomUUID } from 'node:crypto';

import { hasPermission, type Principal } from '@adopt-dont-shop/authz';
import type { WithTransactionDeps } from '@adopt-dont-shop/events';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  NotificationsV1,
  type CreateEmailTemplateRequest,
  type CreateEmailTemplateResponse,
  type DeleteEmailTemplateRequest,
  type DeleteEmailTemplateResponse,
  type EmailTemplate as EmailTemplateProto,
  type GetEmailTemplateRequest,
  type GetEmailTemplateResponse,
  type ListEmailTemplatesRequest,
  type ListEmailTemplatesResponse,
  type PreviewEmailTemplateRequest,
  type PreviewEmailTemplateResponse,
  type UpdateEmailTemplateRequest,
  type UpdateEmailTemplateResponse,
} from '@adopt-dont-shop/proto';

import { renderEmailTemplate } from '../email/renderer.js';

import { HandlerError } from './handlers.js';

export type EmailTemplateDeps = WithTransactionDeps;

// --- Permissions -----------------------------------------------------

const TEMPLATES_READ: Permission = 'email.templates.read' as Permission;
const TEMPLATES_CREATE: Permission = 'email.templates.create' as Permission;
const TEMPLATES_UPDATE: Permission = 'email.templates.update' as Permission;
const TEMPLATES_DELETE: Permission = 'email.templates.delete' as Permission;

// --- Row shape + enum maps -------------------------------------------

type TemplateTypeDb = 'transactional' | 'notification' | 'marketing' | 'system' | 'administrative';
type TemplateStatusDb = 'draft' | 'active' | 'inactive' | 'archived';

type TemplateRow = {
  template_id: string;
  name: string;
  description: string | null;
  type: TemplateTypeDb;
  category: string;
  status: TemplateStatusDb;
  subject: string;
  html_content: string;
  text_content: string | null;
  variables: unknown[];
  locale: string;
  usage_count: number;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const TEMPLATE_SELECT = `
  template_id, name, description, type, category, status, subject,
  html_content, text_content, variables, locale, usage_count,
  last_used_at, created_at, updated_at
`;

const dbTypeToProto = (v: TemplateTypeDb): NotificationsV1.EmailTemplateType => {
  switch (v) {
    case 'transactional':
      return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL;
    case 'notification':
      return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_NOTIFICATION;
    case 'marketing':
      return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_MARKETING;
    case 'system':
      return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_SYSTEM;
    case 'administrative':
      return NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_ADMINISTRATIVE;
  }
};

const protoTypeToDb = (v: NotificationsV1.EmailTemplateType): TemplateTypeDb | null => {
  switch (v) {
    case NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_TRANSACTIONAL:
      return 'transactional';
    case NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_NOTIFICATION:
      return 'notification';
    case NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_MARKETING:
      return 'marketing';
    case NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_SYSTEM:
      return 'system';
    case NotificationsV1.EmailTemplateType.EMAIL_TEMPLATE_TYPE_ADMINISTRATIVE:
      return 'administrative';
    default:
      return null;
  }
};

const dbStatusToProto = (v: TemplateStatusDb): NotificationsV1.EmailTemplateStatus => {
  switch (v) {
    case 'draft':
      return NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT;
    case 'active':
      return NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ACTIVE;
    case 'inactive':
      return NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_INACTIVE;
    case 'archived':
      return NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ARCHIVED;
  }
};

const protoStatusToDb = (v: NotificationsV1.EmailTemplateStatus): TemplateStatusDb | null => {
  switch (v) {
    case NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_DRAFT:
      return 'draft';
    case NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ACTIVE:
      return 'active';
    case NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_INACTIVE:
      return 'inactive';
    case NotificationsV1.EmailTemplateStatus.EMAIL_TEMPLATE_STATUS_ARCHIVED:
      return 'archived';
    default:
      return null;
  }
};

const rowToProto = (row: TemplateRow): EmailTemplateProto => ({
  templateId: row.template_id,
  name: row.name,
  description: row.description ?? undefined,
  type: dbTypeToProto(row.type),
  category: row.category,
  status: dbStatusToProto(row.status),
  subject: row.subject,
  htmlContent: row.html_content,
  textContent: row.text_content ?? undefined,
  variablesJson: JSON.stringify(row.variables ?? []),
  locale: row.locale,
  usageCount: row.usage_count,
  lastUsedAt: row.last_used_at?.toISOString(),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

const parseVariables = (json: string | undefined): unknown[] => {
  if (!json) {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new HandlerError('INVALID_ARGUMENT', 'variables_json must encode an array');
  } catch (err) {
    if (err instanceof HandlerError) {
      throw err;
    }
    throw new HandlerError('INVALID_ARGUMENT', 'variables_json could not be parsed');
  }
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// --- ListEmailTemplates ----------------------------------------------

export async function listEmailTemplates(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: ListEmailTemplatesRequest
): Promise<ListEmailTemplatesResponse> {
  if (!hasPermission(principal, TEMPLATES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_READ}' required`);
  }
  const limit = req.limit ? Math.min(req.limit, MAX_LIMIT) : DEFAULT_LIMIT;
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  const typeDb = protoTypeToDb(req.typeFilter);
  if (typeDb) {
    where.push(`type = $${params.length + 1}`);
    params.push(typeDb);
  }
  const statusDb = protoStatusToDb(req.statusFilter);
  if (statusDb) {
    where.push(`status = $${params.length + 1}`);
    params.push(statusDb);
  }
  if (req.categoryFilter) {
    where.push(`category = $${params.length + 1}`);
    params.push(req.categoryFilter);
  }
  if (req.search) {
    const escaped = req.search.replace(/[\\%_]/g, c => `\\${c}`);
    const n = params.length + 1;
    where.push(`(name ILIKE $${n} OR subject ILIKE $${n})`);
    params.push(`%${escaped}%`);
  }
  const whereClause = where.join(' AND ');

  const countRes = await deps.pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM email_templates WHERE ${whereClause}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  const rowsRes = await deps.pool.query<TemplateRow>(
    `
    SELECT ${TEMPLATE_SELECT} FROM email_templates
    WHERE ${whereClause}
    ORDER BY updated_at DESC, template_id DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    templates: rowsRes.rows.map(rowToProto),
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

// --- GetEmailTemplate ------------------------------------------------

async function loadTemplate(deps: EmailTemplateDeps, templateId: string): Promise<TemplateRow> {
  const res = await deps.pool.query<TemplateRow>(
    `SELECT ${TEMPLATE_SELECT} FROM email_templates WHERE template_id = $1 AND deleted_at IS NULL`,
    [templateId]
  );
  if (res.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `template ${templateId} not found`);
  }
  return res.rows[0];
}

export async function getEmailTemplate(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: GetEmailTemplateRequest
): Promise<GetEmailTemplateResponse> {
  if (!req.templateId) {
    throw new HandlerError('INVALID_ARGUMENT', 'template_id is required');
  }
  if (!hasPermission(principal, TEMPLATES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_READ}' required`);
  }
  return { template: rowToProto(await loadTemplate(deps, req.templateId)) };
}

// --- CreateEmailTemplate ---------------------------------------------

export async function createEmailTemplate(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: CreateEmailTemplateRequest
): Promise<CreateEmailTemplateResponse> {
  if (!hasPermission(principal, TEMPLATES_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_CREATE}' required`);
  }
  if (!req.name) {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  if (!req.subject) {
    throw new HandlerError('INVALID_ARGUMENT', 'subject is required');
  }
  if (!req.htmlContent) {
    throw new HandlerError('INVALID_ARGUMENT', 'html_content is required');
  }
  if (!req.category) {
    throw new HandlerError('INVALID_ARGUMENT', 'category is required');
  }
  const typeDb = protoTypeToDb(req.type) ?? 'transactional';
  const statusDb = protoStatusToDb(req.status) ?? 'draft';
  const variables = parseVariables(req.variablesJson);

  const templateId = randomUUID();
  try {
    const res = await deps.pool.query<TemplateRow>(
      `
      INSERT INTO email_templates (
        template_id, name, description, type, category, status,
        subject, html_content, text_content, variables, locale,
        created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, now(), now())
      RETURNING ${TEMPLATE_SELECT}
      `,
      [
        templateId,
        req.name,
        req.description ?? null,
        typeDb,
        req.category,
        statusDb,
        req.subject,
        req.htmlContent,
        req.textContent ?? null,
        JSON.stringify(variables),
        req.locale || 'en',
        principal.userId,
      ]
    );
    return { template: rowToProto(res.rows[0]) };
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      throw new HandlerError('INVALID_ARGUMENT', `template name '${req.name}' already exists`);
    }
    throw err;
  }
}

// --- UpdateEmailTemplate ---------------------------------------------

export async function updateEmailTemplate(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: UpdateEmailTemplateRequest
): Promise<UpdateEmailTemplateResponse> {
  if (!req.templateId) {
    throw new HandlerError('INVALID_ARGUMENT', 'template_id is required');
  }
  if (!hasPermission(principal, TEMPLATES_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_UPDATE}' required`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const setStr = (col: string, v: string | undefined): void => {
    if (v !== undefined) {
      sets.push(`${col} = $${params.length + 1}`);
      params.push(v);
    }
  };

  setStr('name', req.name);
  if (req.description !== undefined) {
    sets.push(`description = $${params.length + 1}`);
    params.push(req.description === '' ? null : req.description);
  }
  const typeDb = protoTypeToDb(req.type);
  if (typeDb) {
    sets.push(`type = $${params.length + 1}`);
    params.push(typeDb);
  }
  setStr('category', req.category);
  const statusDb = protoStatusToDb(req.status);
  if (statusDb) {
    sets.push(`status = $${params.length + 1}`);
    params.push(statusDb);
  }
  setStr('subject', req.subject);
  setStr('html_content', req.htmlContent);
  if (req.textContent !== undefined) {
    sets.push(`text_content = $${params.length + 1}`);
    params.push(req.textContent === '' ? null : req.textContent);
  }
  if (req.variablesJson !== undefined) {
    sets.push(`variables = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(parseVariables(req.variablesJson)));
  }

  if (sets.length === 0) {
    return { template: rowToProto(await loadTemplate(deps, req.templateId)) };
  }

  sets.push('updated_at = now()');
  sets.push('version = version + 1');

  const res = await deps.pool.query<TemplateRow>(
    `
    UPDATE email_templates
    SET ${sets.join(', ')}
    WHERE template_id = $${params.length + 1} AND deleted_at IS NULL
    RETURNING ${TEMPLATE_SELECT}
    `,
    [...params, req.templateId]
  );
  if (res.rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `template ${req.templateId} not found`);
  }
  return { template: rowToProto(res.rows[0]) };
}

// --- DeleteEmailTemplate ---------------------------------------------

export async function deleteEmailTemplate(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: DeleteEmailTemplateRequest
): Promise<DeleteEmailTemplateResponse> {
  if (!req.templateId) {
    throw new HandlerError('INVALID_ARGUMENT', 'template_id is required');
  }
  if (!hasPermission(principal, TEMPLATES_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_DELETE}' required`);
  }
  // Soft-delete; idempotent (a second delete still reports deleted=true).
  await deps.pool.query(
    `UPDATE email_templates SET deleted_at = now(), updated_at = now()
     WHERE template_id = $1 AND deleted_at IS NULL`,
    [req.templateId]
  );
  return { deleted: true };
}

// --- PreviewEmailTemplate --------------------------------------------

export async function previewEmailTemplate(
  deps: EmailTemplateDeps,
  principal: Principal,
  req: PreviewEmailTemplateRequest
): Promise<PreviewEmailTemplateResponse> {
  if (!req.templateId) {
    throw new HandlerError('INVALID_ARGUMENT', 'template_id is required');
  }
  if (!hasPermission(principal, TEMPLATES_READ)) {
    throw new HandlerError('PERMISSION_DENIED', `'${TEMPLATES_READ}' required`);
  }
  const row = await loadTemplate(deps, req.templateId);

  let variables: Record<string, unknown> = {};
  if (req.variablesJson) {
    try {
      const parsed = JSON.parse(req.variablesJson) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        variables = parsed as Record<string, unknown>;
      } else {
        throw new HandlerError('INVALID_ARGUMENT', 'variables_json must encode an object');
      }
    } catch (err) {
      if (err instanceof HandlerError) {
        throw err;
      }
      throw new HandlerError('INVALID_ARGUMENT', 'variables_json could not be parsed');
    }
  }

  const rendered = renderEmailTemplate(
    { subject: row.subject, htmlContent: row.html_content, textContent: row.text_content },
    variables
  );
  return {
    subject: rendered.subject,
    htmlContent: rendered.htmlContent,
    textContent: rendered.textContent ?? undefined,
  };
}
