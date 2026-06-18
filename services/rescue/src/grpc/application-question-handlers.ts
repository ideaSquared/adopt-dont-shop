// gRPC handlers for the rescue service's application-questions surface —
// the rescue-configurable adoption questionnaire. Ports the monolith's
// /api/v1/rescues/:rescueId/questions CRUD onto the rescue.application_
// questions table (migration 006).
//
// Discipline matches handlers.ts / staff-foster-handlers.ts:
//   - Permission gating via @adopt-dont-shop/authz, rescue-scoped so a
//     staffer only manages their own rescue's questions.
//   - `core` rows (rescue_id IS NULL) are the shared baseline: visible to
//     every rescue's list, but immutable here (only rescue_specific rows
//     can be created/deleted).
//   - Soft-delete (deleted_at) — never a hard DELETE.

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import type { Permission, RescueId } from '@adopt-dont-shop/lib.types';
import {
  RescueV1,
  type ApplicationQuestion,
  type CreateApplicationQuestionRequest,
  type CreateApplicationQuestionResponse,
  type DeleteApplicationQuestionRequest,
  type DeleteApplicationQuestionResponse,
  type ListApplicationQuestionsRequest,
  type ListApplicationQuestionsResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

// --- Permissions -----------------------------------------------------

const APPLICATIONS_READ: Permission = 'applications.read' as Permission;
const APPLICATIONS_UPDATE: Permission = 'applications.update' as Permission;

// --- Row shape -------------------------------------------------------

type ApplicationQuestionRow = {
  question_id: string;
  rescue_id: string | null;
  question_key: string;
  scope: 'core' | 'rescue_specific';
  category: string;
  question_type: string;
  question_text: string;
  help_text: string | null;
  placeholder: string | null;
  options: string[] | null;
  display_order: number;
  is_enabled: boolean;
  is_required: boolean;
  created_at: Date;
  updated_at: Date;
};

const QUESTION_SELECT = `
  question_id, rescue_id, question_key, scope, category, question_type,
  question_text, help_text, placeholder, options, display_order,
  is_enabled, is_required, created_at, updated_at
`;

const scopeToProto = (s: 'core' | 'rescue_specific'): RescueV1.ApplicationQuestionScope =>
  s === 'core'
    ? RescueV1.ApplicationQuestionScope.APPLICATION_QUESTION_SCOPE_CORE
    : RescueV1.ApplicationQuestionScope.APPLICATION_QUESTION_SCOPE_RESCUE_SPECIFIC;

const questionRowToProto = (row: ApplicationQuestionRow): ApplicationQuestion => ({
  questionId: row.question_id,
  rescueId: row.rescue_id ?? undefined,
  questionKey: row.question_key,
  scope: scopeToProto(row.scope),
  category: row.category,
  questionType: row.question_type,
  questionText: row.question_text,
  helpText: row.help_text ?? undefined,
  placeholder: row.placeholder ?? undefined,
  options: row.options ?? [],
  displayOrder: row.display_order,
  isEnabled: row.is_enabled,
  isRequired: row.is_required,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

// --- ListApplicationQuestions ----------------------------------------

export async function listApplicationQuestions(
  deps: HandlerDeps,
  principal: Principal,
  req: ListApplicationQuestionsRequest
): Promise<ListApplicationQuestionsResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!requirePermission(principal, APPLICATIONS_READ, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_READ}' required for this rescue`);
  }

  // The shared `core` baseline (rescue_id IS NULL) plus this rescue's own
  // questions, in display order. Soft-deleted rows are excluded.
  const res = await deps.pool.query<ApplicationQuestionRow>(
    `SELECT ${QUESTION_SELECT}
       FROM rescue.application_questions
      WHERE deleted_at IS NULL
        AND (rescue_id IS NULL OR rescue_id = $1)
      ORDER BY display_order ASC, created_at ASC`,
    [req.rescueId]
  );
  return { questions: res.rows.map(questionRowToProto) };
}

// --- CreateApplicationQuestion ---------------------------------------

export async function createApplicationQuestion(
  deps: HandlerDeps,
  principal: Principal,
  req: CreateApplicationQuestionRequest
): Promise<CreateApplicationQuestionResponse> {
  if (!req.rescueId) {
    throw new HandlerError('INVALID_ARGUMENT', 'rescue_id is required');
  }
  if (!req.questionKey) {
    throw new HandlerError('INVALID_ARGUMENT', 'question_key is required');
  }
  if (!req.questionText) {
    throw new HandlerError('INVALID_ARGUMENT', 'question_text is required');
  }
  if (!req.category) {
    throw new HandlerError('INVALID_ARGUMENT', 'category is required');
  }
  if (!req.questionType) {
    throw new HandlerError('INVALID_ARGUMENT', 'question_type is required');
  }
  if (!requirePermission(principal, APPLICATIONS_UPDATE, { rescueId: req.rescueId as RescueId })) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${APPLICATIONS_UPDATE}' required for this rescue`
    );
  }

  const questionId = randomUUID();
  // options is text[]; pass null when empty so the column stays NULL.
  const options = req.options.length > 0 ? req.options : null;
  let inserted: ApplicationQuestionRow | undefined;
  try {
    const res = await deps.pool.query<ApplicationQuestionRow>(
      `
      INSERT INTO rescue.application_questions (
        question_id, rescue_id, question_key, scope, category, question_type,
        question_text, help_text, placeholder, options, display_order,
        is_required, created_by, created_at, updated_at
      )
      VALUES ($1, $2, $3, 'rescue_specific', $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now())
      RETURNING ${QUESTION_SELECT}
      `,
      [
        questionId,
        req.rescueId,
        req.questionKey,
        req.category,
        req.questionType,
        req.questionText,
        req.helpText ?? null,
        req.placeholder ?? null,
        options,
        req.displayOrder,
        req.isRequired,
        principal.userId,
      ]
    );
    inserted = res.rows[0];
  } catch (err) {
    // The (question_key, rescue_id) partial-unique index rejects a
    // duplicate key for the same rescue.
    if ((err as { code?: string }).code === '23505') {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `question_key '${req.questionKey}' already exists for this rescue`
      );
    }
    // A bad category/question_type value fails the ENUM cast (22P02).
    if ((err as { code?: string }).code === '22P02') {
      throw new HandlerError('INVALID_ARGUMENT', 'invalid category or question_type');
    }
    throw err;
  }

  if (!inserted) {
    throw new HandlerError('INTERNAL', 'application question insert returned no rows');
  }
  return { question: questionRowToProto(inserted) };
}

// --- DeleteApplicationQuestion ---------------------------------------

export async function deleteApplicationQuestion(
  deps: HandlerDeps,
  principal: Principal,
  req: DeleteApplicationQuestionRequest
): Promise<DeleteApplicationQuestionResponse> {
  if (!req.questionId) {
    throw new HandlerError('INVALID_ARGUMENT', 'question_id is required');
  }

  const existing = await deps.pool.query<Pick<ApplicationQuestionRow, 'rescue_id' | 'scope'>>(
    `SELECT rescue_id, scope FROM rescue.application_questions
      WHERE question_id = $1 AND deleted_at IS NULL`,
    [req.questionId]
  );
  const row = existing.rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', `application question ${req.questionId} not found`);
  }
  // Core questions are the shared baseline — not a rescue's to delete.
  if (row.scope === 'core' || !row.rescue_id) {
    throw new HandlerError('INVALID_ARGUMENT', 'core questions cannot be deleted');
  }
  if (!requirePermission(principal, APPLICATIONS_UPDATE, { rescueId: row.rescue_id as RescueId })) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${APPLICATIONS_UPDATE}' required for this rescue`
    );
  }

  await deps.pool.query(
    `UPDATE rescue.application_questions
        SET deleted_at = now(), updated_at = now(), updated_by = $2
      WHERE question_id = $1`,
    [req.questionId, principal.userId]
  );
  return { deleted: true };
}
