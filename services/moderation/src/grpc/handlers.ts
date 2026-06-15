// gRPC handler implementations for ModerationService.
//
// Phase 8.3b — first batch ships the report lifecycle:
// FileReport, GetReport, ListReports, AssignReport, ResolveReport.
// The remaining 9 RPCs (LogModeratorAction, ListModeratorActions,
// AddEvidence, IssueSanction, ListUserSanctions, AppealSanction,
// OpenSupportTicket, GetSupportTicket, ListSupportTickets,
// RespondToTicket) ship in focused follow-ups.
//
// Discipline:
//   - State-changing writes wrap @adopt-dont-shop/events.withTransaction
//     so NATS events only fire after the row writes commit.
//   - Authz: FileReport is open to any authenticated principal
//     (any user can file a report). Reads (GetReport/ListReports) gate
//     on MODERATION_REPORTS_VIEW, with a reporter self-read path: a
//     caller reading their OWN report needs no permission. Writes
//     (AssignReport/ResolveReport) gate on MODERATION_REPORTS_MANAGE.
//   - SQL parameters use $-indexed placeholders, never string-spliced
//     values. The mapper from #912 handles row → proto translation.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { MODERATION_REPORTS_MANAGE, MODERATION_REPORTS_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  AssignReportRequest,
  AssignReportResponse,
  FileReportRequest,
  FileReportResponse,
  GetReportRequest,
  GetReportResponse,
  ListReportsRequest,
  ListReportsResponse,
  ResolveReportRequest,
  ResolveReportResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { SYSTEM_USER_ID } from '../nats/system-principal.js';

import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import { categoryToDb, entityTypeToDb, reportStatusToDb, severityToDb } from './enum-map.js';
import {
  reportRowToProto,
  transitionRowToProto,
  type ReportRow,
  type ReportStatusTransitionRow,
} from './mapper.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

function ensureReportsManagePermission(principal: Principal): void {
  if (!requirePermission(principal, MODERATION_REPORTS_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_REPORTS_MANAGE}' required`);
  }
}

// --- FileReport ------------------------------------------------------

export async function fileReport(
  deps: HandlerDeps,
  principal: Principal,
  req: FileReportRequest
): Promise<FileReportResponse> {
  // FileReport is open to any authenticated principal — anyone can
  // file a report. The principal is required (the adapter ensures it
  // exists) but no permission gate beyond that.
  if (req.reportedEntityId === undefined || req.reportedEntityId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'reported_entity_id is required');
  }
  if (req.title === undefined || req.title === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'title is required');
  }
  if (req.description === undefined || req.description === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'description is required');
  }
  if (req.reportedEntityType === undefined || req.reportedEntityType === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'reported_entity_type is required');
  }
  if (req.category === undefined || req.category === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'category is required');
  }
  if (req.severity === undefined || req.severity === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'severity is required');
  }

  const entityTypeDb = entityTypeToDb(req.reportedEntityType);
  const categoryDb = categoryToDb(req.category);
  const severityDb = severityToDb(req.severity);
  const metadataJson = parseMetadataJson(req.metadataJson);

  return withTransaction(deps, async ({ client, publish }) => {
    const reportId = randomUUID();
    // `was_inserted` (xmax = 0) distinguishes a fresh insert from the
    // ON CONFLICT no-op so JetStream redelivery of a SYSTEM auto-report
    // doesn't re-publish. The persisted report_id (not the throwaway
    // `reportId`) is the canonical id on the conflict path.
    const inserted = await client.query<ReportRow & { was_inserted: boolean }>(
      `INSERT INTO reports (
         report_id, reporter_id, reported_entity_type, reported_entity_id,
         reported_user_id, category, severity, status, title, description,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10::jsonb)
       ON CONFLICT (reported_entity_type, reported_entity_id)
         WHERE reporter_id = '${SYSTEM_USER_ID}'
         DO UPDATE SET updated_at = reports.updated_at
       RETURNING report_id, reporter_id, reported_entity_type, reported_entity_id,
                 reported_user_id, category, severity, status, title, description,
                 metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
                 resolution, resolution_notes, escalated_to, escalated_at,
                 escalation_reason, created_at, updated_at, (xmax = 0) AS was_inserted`,
      [
        reportId,
        principal.userId,
        entityTypeDb,
        req.reportedEntityId,
        req.reportedUserId ?? null,
        categoryDb,
        severityDb,
        req.title,
        req.description,
        metadataJson,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    const row = inserted.rows[0];

    // Only publish for a genuinely new row. On the conflict no-op (a
    // redelivered system auto-report) the row already exists and was
    // already announced, so re-publishing would mint duplicate events.
    if (row.was_inserted) {
      publish({
        type: 'moderation.reportFiled',
        id: row.report_id,
        payload: {
          reportId: row.report_id,
          reporterId: principal.userId,
          reportedEntityType: entityTypeDb,
          reportedEntityId: req.reportedEntityId,
          category: categoryDb,
          severity: severityDb,
        },
      });
    }

    return { report: reportRowToProto(row) };
  });
}

// --- GetReport -------------------------------------------------------

export async function getReport(
  deps: HandlerDeps,
  principal: Principal,
  req: GetReportRequest
): Promise<GetReportResponse> {
  if (req.reportId === undefined || req.reportId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'report_id is required');
  }

  const { rows } = await deps.pool.query<ReportRow>(
    `SELECT report_id, reporter_id, reported_entity_type, reported_entity_id,
            reported_user_id, category, severity, status, title, description,
            metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
            resolution, resolution_notes, escalated_to, escalated_at,
            escalation_reason, created_at, updated_at
     FROM reports
     WHERE report_id = $1`,
    [req.reportId]
  );

  if (rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `report ${req.reportId} not found`);
  }

  // A reporter can always read their OWN report without a moderation
  // permission; everyone else needs MODERATION_REPORTS_VIEW.
  const isReporter = rows[0].reporter_id === principal.userId;
  if (!isReporter && !requirePermission(principal, MODERATION_REPORTS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_REPORTS_VIEW}' required`);
  }

  const response: GetReportResponse = {
    report: reportRowToProto(rows[0]),
    transitions: [],
  };

  if (req.includeTransitions) {
    const transitions = await deps.pool.query<ReportStatusTransitionRow>(
      `SELECT transition_id, report_id, from_status, to_status,
              transitioned_at, transitioned_by, reason
       FROM report_status_transitions
       WHERE report_id = $1
       ORDER BY transitioned_at ASC`,
      [req.reportId]
    );
    response.transitions = transitions.rows.map(transitionRowToProto);
  }

  return response;
}

// --- ListReports -----------------------------------------------------

export async function listReports(
  deps: HandlerDeps,
  principal: Principal,
  req: ListReportsRequest
): Promise<ListReportsResponse> {
  const limit = clampLimit(req.limit);

  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  // Callers without MODERATION_REPORTS_VIEW are strictly self-scoped:
  // they only ever see reports they filed. Moderators with the
  // permission see all reports.
  if (!requirePermission(principal, MODERATION_REPORTS_VIEW)) {
    where.push(`reporter_id = $${p++}`);
    params.push(principal.userId);
  }

  if (req.status !== undefined && req.status !== 0) {
    where.push(`status = $${p++}`);
    params.push(reportStatusToDb(req.status));
  }
  if (req.severity !== undefined && req.severity !== 0) {
    where.push(`severity = $${p++}`);
    params.push(severityToDb(req.severity));
  }
  if (req.category !== undefined && req.category !== 0) {
    where.push(`category = $${p++}`);
    params.push(categoryToDb(req.category));
  }
  if (req.assignedModerator !== undefined) {
    if (req.assignedModerator === '') {
      where.push(`assigned_moderator IS NULL`);
    } else {
      where.push(`assigned_moderator = $${p++}`);
      params.push(req.assignedModerator);
    }
  }

  if (req.cursor !== undefined && req.cursor !== '') {
    let cursor;
    try {
      cursor = decodeCursor(req.cursor);
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        throw new HandlerError('INVALID_ARGUMENT', err.message);
      }
      throw err;
    }
    where.push(`(created_at < $${p++} OR (created_at = $${p - 1} AND report_id < $${p++}))`);
    params.push(cursor.createdAt);
    params.push(cursor.id);
  }

  const whereSql = where.length === 0 ? '' : `WHERE ${where.join(' AND ')}`;
  params.push(limit + 1);
  const sql = `
    SELECT report_id, reporter_id, reported_entity_type, reported_entity_id,
           reported_user_id, category, severity, status, title, description,
           metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
           resolution, resolution_notes, escalated_to, escalated_at,
           escalation_reason, created_at, updated_at
    FROM reports
    ${whereSql}
    ORDER BY created_at DESC, report_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<ReportRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const reports = pageRows.map(reportRowToProto);

  const response: ListReportsResponse = { reports };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.report_id,
    });
  }

  return response;
}

// --- AssignReport ----------------------------------------------------

export async function assignReport(
  deps: HandlerDeps,
  principal: Principal,
  req: AssignReportRequest
): Promise<AssignReportResponse> {
  ensureReportsManagePermission(principal);

  if (req.reportId === undefined || req.reportId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'report_id is required');
  }
  if (req.moderatorId === undefined || req.moderatorId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'moderator_id is required');
  }

  return withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<ReportRow>(
      `SELECT report_id, reporter_id, reported_entity_type, reported_entity_id,
              reported_user_id, category, severity, status, title, description,
              metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
              resolution, resolution_notes, escalated_to, escalated_at,
              escalation_reason, created_at, updated_at
       FROM reports
       WHERE report_id = $1
       FOR UPDATE`,
      [req.reportId]
    );

    if (existing.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `report ${req.reportId} not found`);
    }

    const row = existing.rows[0];

    // The trigger from #886 mig 003 propagates the to_status into
    // reports.status when we insert a status transition. So we INSERT
    // the transition AND explicitly UPDATE the assignment columns;
    // the trigger handles the status update.
    const updated = await client.query<ReportRow>(
      `UPDATE reports
       SET assigned_moderator = $1,
           assigned_at = NOW(),
           updated_at = NOW()
       WHERE report_id = $2
       RETURNING report_id, reporter_id, reported_entity_type, reported_entity_id,
                 reported_user_id, category, severity, status, title, description,
                 metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
                 resolution, resolution_notes, escalated_to, escalated_at,
                 escalation_reason, created_at, updated_at`,
      [req.moderatorId, req.reportId]
    );

    if (updated.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'update returned no rows');
    }

    // Insert status transition; the trigger propagates to_status to
    // reports.status atomically.
    await client.query(
      `INSERT INTO report_status_transitions (
         transition_id, report_id, from_status, to_status, transitioned_by, reason
       )
       VALUES ($1, $2, $3, 'under_review', $4, $5)`,
      [randomUUID(), req.reportId, row.status, principal.userId, req.reason ?? null]
    );

    publish({
      type: 'moderation.reportAssigned',
      id: req.reportId,
      payload: {
        reportId: req.reportId,
        moderatorId: req.moderatorId,
        assignedBy: principal.userId,
      },
    });

    // Re-fetch to capture the trigger-propagated status.
    const final = await client.query<ReportRow>(
      `SELECT report_id, reporter_id, reported_entity_type, reported_entity_id,
              reported_user_id, category, severity, status, title, description,
              metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
              resolution, resolution_notes, escalated_to, escalated_at,
              escalation_reason, created_at, updated_at
       FROM reports
       WHERE report_id = $1`,
      [req.reportId]
    );

    return { report: reportRowToProto(final.rows[0]) };
  });
}

// --- ResolveReport ---------------------------------------------------

export async function resolveReport(
  deps: HandlerDeps,
  principal: Principal,
  req: ResolveReportRequest
): Promise<ResolveReportResponse> {
  ensureReportsManagePermission(principal);

  if (req.reportId === undefined || req.reportId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'report_id is required');
  }
  if (req.resolution === undefined || req.resolution === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'resolution is required');
  }

  return withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<ReportRow>(
      `SELECT status FROM reports WHERE report_id = $1 FOR UPDATE`,
      [req.reportId]
    );

    if (existing.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `report ${req.reportId} not found`);
    }

    const fromStatus = existing.rows[0].status;

    await client.query(
      `UPDATE reports
       SET resolved_by = $1,
           resolved_at = NOW(),
           resolution = $2,
           resolution_notes = $3,
           updated_at = NOW()
       WHERE report_id = $4`,
      [principal.userId, req.resolution, req.resolutionNotes ?? null, req.reportId]
    );

    await client.query(
      `INSERT INTO report_status_transitions (
         transition_id, report_id, from_status, to_status, transitioned_by, reason
       )
       VALUES ($1, $2, $3, 'resolved', $4, $5)`,
      [randomUUID(), req.reportId, fromStatus, principal.userId, req.resolutionNotes ?? null]
    );

    publish({
      type: 'moderation.reportResolved',
      id: req.reportId,
      payload: {
        reportId: req.reportId,
        resolvedBy: principal.userId,
        resolution: req.resolution,
      },
    });

    const final = await client.query<ReportRow>(
      `SELECT report_id, reporter_id, reported_entity_type, reported_entity_id,
              reported_user_id, category, severity, status, title, description,
              metadata, assigned_moderator, assigned_at, resolved_by, resolved_at,
              resolution, resolution_notes, escalated_to, escalated_at,
              escalation_reason, created_at, updated_at
       FROM reports
       WHERE report_id = $1`,
      [req.reportId]
    );

    return { report: reportRowToProto(final.rows[0]) };
  });
}

// --- Helpers ---------------------------------------------------------

function parseMetadataJson(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return '{}';
  }
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new Error('metadata_json must encode a JSON object');
    }
    return JSON.stringify(obj);
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `metadata_json invalid: ${(err as Error).message}`);
  }
}
