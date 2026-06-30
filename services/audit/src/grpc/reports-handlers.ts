// gRPC handlers for the saved-reports / templates surface.
//
// Persistence-only: service.audit owns the audit.saved_reports +
// audit.report_templates tables; the compute engine (analytics
// aggregations driven by ReportConfig) stays in the monolith for now.
// The SPA persists the config as JSON-string here and posts it to the
// monolith's /execute when a chart needs to render.
//
// Permission model:
//   reports.read[:any] for reads — without :any, only the principal's
//     own user_id is returned
//   reports.create / reports.update / reports.delete for writes
//   reports.update:any to update any user's saved report (not gated on read:any)
//   reports.delete:any to delete any user's saved report (not gated on read:any)
//   reports.read for ListReportTemplates (no separate template perm —
//     templates aren't sensitive)

import { createHash, randomBytes } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import type { Permission } from '@adopt-dont-shop/lib.types';
import {
  AuditV1,
  type AuditCreateReportShareRequest,
  type AuditCreateReportShareResponse,
  type AuditCreateSavedReportRequest,
  type AuditCreateSavedReportResponse,
  type AuditDeleteSavedReportRequest,
  type AuditDeleteSavedReportResponse,
  type AuditGetSavedReportRequest,
  type AuditGetSavedReportResponse,
  type AuditListReportTemplatesRequest,
  type AuditListReportTemplatesResponse,
  type AuditListSavedReportsRequest,
  type AuditListSavedReportsResponse,
  type AuditReportSchedule,
  type AuditReportShare,
  type AuditReportTemplate,
  type AuditSavedReport,
  type AuditUpdateSavedReportRequest,
  type AuditUpdateSavedReportResponse,
  type AuditUpsertReportScheduleRequest,
  type AuditUpsertReportScheduleResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';

const REPORTS_READ: Permission = 'reports.read';
const REPORTS_READ_ANY: Permission = 'reports.read:any';
const REPORTS_CREATE: Permission = 'reports.create';
const REPORTS_UPDATE: Permission = 'reports.update';
const REPORTS_UPDATE_ANY: Permission = 'reports.update:any';
const REPORTS_DELETE: Permission = 'reports.delete';
const REPORTS_DELETE_ANY: Permission = 'reports.delete:any';

const SAVED_REPORT_COLUMNS = `saved_report_id, user_id, rescue_id, template_id, name,
  description, config, is_archived, created_at, updated_at`;

const TEMPLATE_COLUMNS = `template_id, name, description, category, config, is_system,
  rescue_id, created_at, updated_at`;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Route through requirePermission (no scope) so the super_admin role grant
// is honoured consistently with the rest of the service — super_admin's
// permission isn't in the permissions array, it's implied by the role.
function hasPerm(principal: Principal, p: Permission): boolean {
  return requirePermission(principal, p);
}

function ensureRead(principal: Principal): void {
  if (!hasPerm(principal, REPORTS_READ) && !hasPerm(principal, REPORTS_READ_ANY)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_READ}' required`);
  }
}

function clampLimit(raw: number | undefined): number {
  if (!Number.isFinite(raw) || (raw ?? 0) <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw!), MAX_LIMIT);
}

type SavedReportRow = {
  saved_report_id: string;
  user_id: string;
  rescue_id: string | null;
  template_id: string | null;
  name: string;
  description: string | null;
  config: unknown;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
};

function rowToSavedReport(row: SavedReportRow): AuditSavedReport {
  return {
    savedReportId: row.saved_report_id,
    userId: row.user_id,
    rescueId: row.rescue_id ?? undefined,
    templateId: row.template_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    configJson: JSON.stringify(row.config ?? {}),
    isArchived: row.is_archived,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

type TemplateRow = {
  template_id: string;
  name: string;
  description: string | null;
  category: 'adoption' | 'engagement' | 'operations' | 'fundraising' | 'custom';
  config: unknown;
  is_system: boolean;
  rescue_id: string | null;
  created_at: Date;
  updated_at: Date;
};

function categoryToProto(c: TemplateRow['category']): AuditV1.ReportTemplateCategory {
  switch (c) {
    case 'adoption':
      return AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION;
    case 'engagement':
      return AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ENGAGEMENT;
    case 'operations':
      return AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_OPERATIONS;
    case 'fundraising':
      return AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_FUNDRAISING;
    case 'custom':
      return AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_CUSTOM;
  }
}

function categoryFromProto(c: AuditV1.ReportTemplateCategory): TemplateRow['category'] | null {
  switch (c) {
    case AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ADOPTION:
      return 'adoption';
    case AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_ENGAGEMENT:
      return 'engagement';
    case AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_OPERATIONS:
      return 'operations';
    case AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_FUNDRAISING:
      return 'fundraising';
    case AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_CUSTOM:
      return 'custom';
    default:
      return null;
  }
}

function rowToTemplate(row: TemplateRow): AuditReportTemplate {
  return {
    templateId: row.template_id,
    name: row.name,
    description: row.description ?? undefined,
    category: categoryToProto(row.category),
    configJson: JSON.stringify(row.config ?? {}),
    isSystem: row.is_system,
    rescueId: row.rescue_id ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// Try to parse a JSON config string; throw INVALID_ARGUMENT on bad shape.
function parseConfig(raw: string | undefined): unknown {
  if (!raw || raw.trim() === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'config_json is required');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new HandlerError('INVALID_ARGUMENT', 'config_json must be valid JSON');
  }
}

// --- ListSavedReports -----------------------------------------------

export async function listSavedReports(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditListSavedReportsRequest
): Promise<AuditListSavedReportsResponse> {
  ensureRead(principal);

  const limit = clampLimit(req.limit);
  const page = Math.max(req.page || 1, 1);
  const offset = (page - 1) * limit;

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  // Self-ownership applies when the principal doesn't have :any.
  if (!hasPerm(principal, REPORTS_READ_ANY)) {
    where.push(`user_id = $${params.length + 1}`);
    params.push(principal.userId);
  }
  if (req.rescueId !== undefined && req.rescueId !== '') {
    where.push(`rescue_id = $${params.length + 1}`);
    params.push(req.rescueId);
  }
  if (req.isArchived !== undefined) {
    where.push(`is_archived = $${params.length + 1}`);
    params.push(req.isArchived);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const countRes = await deps.pool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM saved_reports ${whereSql}`,
    params
  );
  const total = Number.parseInt(countRes.rows[0]?.total ?? '0', 10);

  const result = await deps.pool.query<SavedReportRow>(
    `SELECT ${SAVED_REPORT_COLUMNS} FROM saved_reports ${whereSql}
       ORDER BY updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    reports: result.rows.map(rowToSavedReport),
    total,
    page,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

// --- GetSavedReport --------------------------------------------------

export async function getSavedReport(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditGetSavedReportRequest
): Promise<AuditGetSavedReportResponse> {
  ensureRead(principal);
  const id = req.savedReportId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'saved_report_id is required');
  }
  const result = await deps.pool.query<SavedReportRow>(
    `SELECT ${SAVED_REPORT_COLUMNS} FROM saved_reports
       WHERE saved_report_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `saved report ${id} not found`);
  }
  // Self-ownership: without :any, refuse to return rows owned by another user.
  if (!hasPerm(principal, REPORTS_READ_ANY) && row.user_id !== principal.userId) {
    // Return NOT_FOUND rather than PERMISSION_DENIED — avoids leaking
    // existence of foreign rows.
    throw new HandlerError('NOT_FOUND', `saved report ${id} not found`);
  }
  return { report: rowToSavedReport(row) };
}

// --- CreateSavedReport -----------------------------------------------

export async function createSavedReport(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditCreateSavedReportRequest
): Promise<AuditCreateSavedReportResponse> {
  if (!hasPerm(principal, REPORTS_CREATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_CREATE}' required`);
  }
  const name = req.name?.trim() ?? '';
  if (name === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'name is required');
  }
  const config = parseConfig(req.configJson);

  // Reject a reference to a template that doesn't exist (or was soft-deleted)
  // with a clear validation error, rather than relying solely on the FK to
  // raise an opaque constraint violation (ADS-785). The FK still backstops
  // a TOCTOU race where the template is deleted between this check and the
  // INSERT — but the common case gets a readable message.
  const templateId = req.templateId ?? null;
  if (templateId !== null) {
    const exists = await deps.pool.query<{ template_id: string }>(
      `SELECT template_id FROM report_templates
         WHERE template_id = $1 AND deleted_at IS NULL`,
      [templateId]
    );
    if (exists.rows.length === 0) {
      throw new HandlerError('INVALID_ARGUMENT', `template ${templateId} does not exist`);
    }
  }

  const result = await deps.pool.query<SavedReportRow>(
    `INSERT INTO saved_reports
       (user_id, rescue_id, template_id, name, description, config)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING ${SAVED_REPORT_COLUMNS}`,
    [
      principal.userId,
      req.rescueId ?? null,
      templateId,
      name,
      req.description ?? null,
      JSON.stringify(config),
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('INTERNAL', 'insert returned no row');
  }
  return { report: rowToSavedReport(row) };
}

// --- UpdateSavedReport -----------------------------------------------

export async function updateSavedReport(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditUpdateSavedReportRequest
): Promise<AuditUpdateSavedReportResponse> {
  if (!hasPerm(principal, REPORTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_UPDATE}' required`);
  }
  const id = req.savedReportId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'saved_report_id is required');
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (req.name !== undefined) {
    sets.push(`name = $${params.length + 1}`);
    params.push(req.name);
  }
  if (req.description !== undefined) {
    sets.push(`description = $${params.length + 1}`);
    params.push(req.description);
  }
  if (req.configJson !== undefined) {
    const config = parseConfig(req.configJson);
    sets.push(`config = $${params.length + 1}::jsonb`);
    params.push(JSON.stringify(config));
  }
  if (req.isArchived !== undefined) {
    sets.push(`is_archived = $${params.length + 1}`);
    params.push(req.isArchived);
  }
  if (sets.length === 0) {
    // Nothing to do — just return the current row.
    return getSavedReport(deps, principal, { savedReportId: id });
  }
  sets.push(`updated_at = now()`);
  params.push(id);

  // Self-ownership filter on the UPDATE for users without :any.
  let whereClause = `saved_report_id = $${params.length} AND deleted_at IS NULL`;
  if (!hasPerm(principal, REPORTS_UPDATE_ANY)) {
    params.push(principal.userId);
    whereClause += ` AND user_id = $${params.length}`;
  }

  const result = await deps.pool.query<SavedReportRow>(
    `UPDATE saved_reports SET ${sets.join(', ')} WHERE ${whereClause}
     RETURNING ${SAVED_REPORT_COLUMNS}`,
    params
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `saved report ${id} not found`);
  }
  return { report: rowToSavedReport(row) };
}

// --- DeleteSavedReport -----------------------------------------------

export async function deleteSavedReport(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditDeleteSavedReportRequest
): Promise<AuditDeleteSavedReportResponse> {
  if (!hasPerm(principal, REPORTS_DELETE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_DELETE}' required`);
  }
  const id = req.savedReportId?.trim() ?? '';
  if (id === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'saved_report_id is required');
  }

  const params: unknown[] = [id];
  let whereClause = `saved_report_id = $1 AND deleted_at IS NULL`;
  if (!hasPerm(principal, REPORTS_DELETE_ANY)) {
    params.push(principal.userId);
    whereClause += ` AND user_id = $2`;
  }
  const result = await deps.pool.query<{ saved_report_id: string }>(
    `UPDATE saved_reports SET deleted_at = now() WHERE ${whereClause}
     RETURNING saved_report_id`,
    params
  );
  return { deleted: (result.rowCount ?? 0) > 0 };
}

// --- ListReportTemplates --------------------------------------------

export async function listReportTemplates(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditListReportTemplatesRequest
): Promise<AuditListReportTemplatesResponse> {
  ensureRead(principal);

  const where: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];

  if (
    req.category !== undefined &&
    req.category !== AuditV1.ReportTemplateCategory.REPORT_TEMPLATE_CATEGORY_UNSPECIFIED
  ) {
    const cat = categoryFromProto(req.category);
    if (cat !== null) {
      where.push(`category = $${params.length + 1}`);
      params.push(cat);
    }
  }
  if (req.rescueId !== undefined && req.rescueId !== '') {
    // Include both rescue-specific and system (rescue_id IS NULL) when
    // a rescue is provided — the admin UI wants to see both.
    where.push(`(rescue_id = $${params.length + 1} OR rescue_id IS NULL)`);
    params.push(req.rescueId);
  }
  if (req.systemOnly === true) {
    where.push(`is_system = true`);
  }

  const result = await deps.pool.query<TemplateRow>(
    `SELECT ${TEMPLATE_COLUMNS} FROM report_templates
       WHERE ${where.join(' AND ')}
       ORDER BY category ASC, name ASC`,
    params
  );
  return { templates: result.rows.map(rowToTemplate) };
}

// --- Report schedules / shares ---------------------------------------
//
// Both gate on reports.update[:any] (no separate read requirement) and
// scope to the caller's own saved reports unless they hold the :any
// variant — mirrors updateSavedReport's self-ownership rule.

async function ensureOwnedSavedReport(
  deps: HandlerDeps,
  principal: Principal,
  savedReportId: string
): Promise<void> {
  const result = await deps.pool.query<{ user_id: string }>(
    `SELECT user_id FROM saved_reports WHERE saved_report_id = $1 AND deleted_at IS NULL`,
    [savedReportId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `saved report ${savedReportId} not found`);
  }
  // Foreign rows resolve to NOT_FOUND (not PERMISSION_DENIED) to avoid
  // leaking existence, matching getSavedReport.
  if (!hasPerm(principal, REPORTS_UPDATE_ANY) && row.user_id !== principal.userId) {
    throw new HandlerError('NOT_FOUND', `saved report ${savedReportId} not found`);
  }
}

type ScheduleRecipientJson = { email: string; userId?: string };

type ScheduleRow = {
  schedule_id: string;
  saved_report_id: string;
  cron: string;
  timezone: string;
  recipients: ScheduleRecipientJson[];
  format: 'pdf' | 'csv' | 'inline-html';
  is_enabled: boolean;
  last_run_at: Date | null;
  next_run_at: Date | null;
  last_status: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};

const SCHEDULE_COLUMNS = `schedule_id, saved_report_id, cron, timezone, recipients, format,
  is_enabled, last_run_at, next_run_at, last_status, last_error, created_at, updated_at`;

function scheduleFormatFromProto(f: AuditV1.ReportScheduleFormat): ScheduleRow['format'] {
  switch (f) {
    case AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_CSV:
      return 'csv';
    case AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_INLINE_HTML:
      return 'inline-html';
    default:
      return 'pdf';
  }
}

function scheduleFormatToProto(f: ScheduleRow['format']): AuditV1.ReportScheduleFormat {
  switch (f) {
    case 'csv':
      return AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_CSV;
    case 'inline-html':
      return AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_INLINE_HTML;
    case 'pdf':
      return AuditV1.ReportScheduleFormat.REPORT_SCHEDULE_FORMAT_PDF;
  }
}

function rowToSchedule(row: ScheduleRow): AuditReportSchedule {
  return {
    scheduleId: row.schedule_id,
    savedReportId: row.saved_report_id,
    cron: row.cron,
    timezone: row.timezone,
    recipients: row.recipients.map(r => ({ email: r.email, userId: r.userId ?? undefined })),
    format: scheduleFormatToProto(row.format),
    isEnabled: row.is_enabled,
    lastRunAt: row.last_run_at?.toISOString() ?? undefined,
    nextRunAt: row.next_run_at?.toISOString() ?? undefined,
    lastStatus: row.last_status ?? undefined,
    lastError: row.last_error ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// --- UpsertReportSchedule ---------------------------------------------

export async function upsertReportSchedule(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditUpsertReportScheduleRequest
): Promise<AuditUpsertReportScheduleResponse> {
  if (!hasPerm(principal, REPORTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_UPDATE}' required`);
  }
  const savedReportId = req.savedReportId?.trim() ?? '';
  if (savedReportId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'saved_report_id is required');
  }
  const cron = req.cron?.trim() ?? '';
  if (cron === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'cron is required');
  }
  await ensureOwnedSavedReport(deps, principal, savedReportId);

  const recipients: ScheduleRecipientJson[] = (req.recipients ?? []).map(r => ({
    email: r.email,
    userId: r.userId,
  }));

  const result = await deps.pool.query<ScheduleRow>(
    `INSERT INTO saved_report_schedules
       (saved_report_id, cron, timezone, recipients, format, is_enabled)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (saved_report_id) DO UPDATE SET
       cron = EXCLUDED.cron,
       timezone = EXCLUDED.timezone,
       recipients = EXCLUDED.recipients,
       format = EXCLUDED.format,
       is_enabled = EXCLUDED.is_enabled,
       updated_at = now()
     RETURNING ${SCHEDULE_COLUMNS}`,
    [
      savedReportId,
      cron,
      req.timezone?.trim() || 'UTC',
      JSON.stringify(recipients),
      scheduleFormatFromProto(req.format),
      req.isEnabled ?? true,
    ]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('INTERNAL', 'upsert returned no row');
  }
  return { schedule: rowToSchedule(row) };
}

// --- CreateReportShare -------------------------------------------------

type ShareRow = {
  share_id: string;
  saved_report_id: string;
  share_type: string;
  permission: 'view' | 'edit';
  expires_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
};

const SHARE_COLUMNS = `share_id, saved_report_id, share_type, permission, expires_at,
  revoked_at, created_at`;

function sharePermissionFromProto(p: AuditV1.ReportSharePermission): ShareRow['permission'] {
  return p === AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT ? 'edit' : 'view';
}

function sharePermissionToProto(p: ShareRow['permission']): AuditV1.ReportSharePermission {
  return p === 'edit'
    ? AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_EDIT
    : AuditV1.ReportSharePermission.REPORT_SHARE_PERMISSION_VIEW;
}

function rowToShare(row: ShareRow): AuditReportShare {
  return {
    shareId: row.share_id,
    savedReportId: row.saved_report_id,
    shareType: row.share_type,
    permission: sharePermissionToProto(row.permission),
    expiresAt: row.expires_at?.toISOString() ?? undefined,
    revokedAt: row.revoked_at?.toISOString() ?? undefined,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createReportShare(
  deps: HandlerDeps,
  principal: Principal,
  req: AuditCreateReportShareRequest
): Promise<AuditCreateReportShareResponse> {
  if (!hasPerm(principal, REPORTS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${REPORTS_UPDATE}' required`);
  }
  const savedReportId = req.savedReportId?.trim() ?? '';
  if (savedReportId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'saved_report_id is required');
  }
  await ensureOwnedSavedReport(deps, principal, savedReportId);

  // Plaintext token returned only here — only its hash is persisted.
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const result = await deps.pool.query<ShareRow>(
    `INSERT INTO saved_report_shares
       (saved_report_id, share_type, permission, token_hash, expires_at)
     VALUES ($1, 'token', $2, $3, $4)
     RETURNING ${SHARE_COLUMNS}`,
    [savedReportId, sharePermissionFromProto(req.permission), tokenHash, req.expiresAt ?? null]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HandlerError('INTERNAL', 'insert returned no row');
  }
  return { share: rowToShare(row), token };
}
