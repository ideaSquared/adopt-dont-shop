// gRPC handler implementations for ModerationService — batch 4 (final).
//
// Phase 8.3b — ships the support-ticket surface: OpenSupportTicket,
// GetSupportTicket, ListSupportTickets, RespondToTicket. This
// completes the 14-RPC ModerationService set (report lifecycle #924,
// moderator actions + evidence #925, sanctions #926, tickets here).
//
// Same discipline: withTransaction for writes, ticket reads gate on
// MODERATION_TICKETS_MANAGE, $-indexed SQL params, mappers from #914
// for row → proto.
//
// Note: OpenSupportTicket is OPEN to any principal AND to
// unauthenticated callers (the proto carries user_id as optional).
// The gateway will route unauthenticated ticket opens; here we treat
// a missing principal as the unauth case (the adapter's adaptUnauth
// variant passes a synthetic principal — for now any authenticated
// user can open one).

import { randomUUID } from 'node:crypto';

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { MODERATION_TICKETS_MANAGE } from '@adopt-dont-shop/lib.types';
import type {
  AssignSupportTicketRequest,
  AssignSupportTicketResponse,
  GetSupportTicketRequest,
  GetSupportTicketResponse,
  ListSupportTicketsRequest,
  ListSupportTicketsResponse,
  OpenSupportTicketRequest,
  OpenSupportTicketResponse,
  RespondToTicketRequest,
  RespondToTicketResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor.js';
import { ticketCategoryToDb, ticketPriorityToDb, ticketStatusToDb } from './enum-map.js';
import {
  responseRowToProto,
  ticketRowToProto,
  type SupportTicketResponseRow,
  type SupportTicketRow,
} from './sanction-ticket-mapper.js';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const TICKET_SELECT = `
  ticket_id, user_id, user_email, user_name, assigned_to, status,
  priority, category, subject, description, tags, metadata,
  first_response_at, last_response_at, resolved_at, closed_at,
  created_at, updated_at
`;

const RESPONSE_SELECT = `
  response_id, ticket_id, responder_id, responder_type, content,
  is_internal, created_at
`;

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

// Ticket identity-field validation (ADS-1017). user_email / user_name are
// written verbatim into the support_tickets row, the moderation.ticketOpened
// event, and the staff inbox, so they must not carry a CRLF / control-char
// header-injection payload, and user_email must be a plausibly-real, bounded
// address rather than arbitrary attacker text.
const MAX_EMAIL_LENGTH = 254; // RFC 5321 forward-path limit.
const MAX_NAME_LENGTH = 200;
// C0 controls (incl. CR U+000D / LF U+000A), DEL, and C1 controls — reject so a
// CRLF header-injection payload can't ride through into anything that later
// composes headers from these fields.
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;
// Pragmatic single-line email shape: non-space/@ local, @, dotted domain.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateTicketEmail(email: string): void {
  if (email.length > MAX_EMAIL_LENGTH) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_email exceeds the maximum length');
  }
  if (CONTROL_CHARS.test(email)) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_email contains control characters');
  }
  if (!EMAIL_SHAPE.test(email)) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_email is not a valid email address');
  }
}

function validateTicketName(name: string | undefined): void {
  if (name === undefined || name === '') {
    return;
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_name exceeds the maximum length');
  }
  if (CONTROL_CHARS.test(name)) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_name contains control characters');
  }
}

// --- OpenSupportTicket -----------------------------------------------

export async function openSupportTicket(
  deps: HandlerDeps,
  principal: Principal,
  req: OpenSupportTicketRequest
): Promise<OpenSupportTicketResponse> {
  // Open to any authenticated principal — anyone can open a ticket.
  // No admin gate (the adapter ensures the principal exists).
  if (req.userEmail === undefined || req.userEmail === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'user_email is required');
  }
  if (req.subject === undefined || req.subject === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'subject is required');
  }
  if (req.description === undefined || req.description === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'description is required');
  }
  if (req.priority === undefined || req.priority === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'priority is required');
  }
  if (req.category === undefined || req.category === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'category is required');
  }

  // Reject a malformed / control-char-bearing user_email or user_name before
  // it reaches the row, the ticketOpened event, or the staff inbox (ADS-1017).
  validateTicketEmail(req.userEmail);
  validateTicketName(req.userName);

  const priorityDb = ticketPriorityToDb(req.priority);
  const categoryDb = ticketCategoryToDb(req.category);
  // user_id is derived from the authenticated principal: a caller-supplied
  // user_id is trusted ONLY when the caller holds MODERATION_TICKETS_MANAGE
  // (staff opening a ticket on a user's behalf during support-agent-assisted
  // intake). Anyone else passing a user_id that doesn't match their own is
  // rejected outright rather than silently overridden. (ADS-917: a
  // caller-supplied user_id previously won unconditionally.)
  //
  // user_email / user_name are NOT yet identity-bound (ADS-1017): they are
  // validated above but still taken from the request, because binding them to
  // the principal's verified account requires resolving the principal's email
  // of record via the auth service — moderation has no auth client wired, the
  // same gap ADS-1008 hit. Until that shared capability exists, a support
  // agent must treat user_email as claimed, not verified. See the ticket for
  // the deferred identity-binding follow-up.
  const canProxy = requirePermission(principal, MODERATION_TICKETS_MANAGE);
  if (
    !canProxy &&
    req.userId !== undefined &&
    req.userId !== '' &&
    req.userId !== principal.userId
  ) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${MODERATION_TICKETS_MANAGE}' required to open a ticket on behalf of another user`
    );
  }
  const userId = canProxy && req.userId ? req.userId : principal.userId;
  const tags = req.tags ?? [];

  return withTransaction(deps, async ({ client, publish }) => {
    const ticketId = randomUUID();
    const inserted = await client.query<SupportTicketRow>(
      `INSERT INTO support_tickets (
         ticket_id, user_id, user_email, user_name, status, priority,
         category, subject, description, tags
       )
       VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9)
       RETURNING ${TICKET_SELECT}`,
      [
        ticketId,
        userId ?? null,
        req.userEmail,
        req.userName ?? null,
        priorityDb,
        categoryDb,
        req.subject,
        req.description,
        tags,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    publish({
      type: 'moderation.ticketOpened',
      id: ticketId,
      payload: {
        ticketId,
        userId: userId ?? null,
        userEmail: req.userEmail,
        priority: priorityDb,
        category: categoryDb,
      },
    });

    return { ticket: ticketRowToProto(inserted.rows[0]) };
  });
}

// --- GetSupportTicket ------------------------------------------------

export async function getSupportTicket(
  deps: HandlerDeps,
  principal: Principal,
  req: GetSupportTicketRequest
): Promise<GetSupportTicketResponse> {
  if (req.ticketId === undefined || req.ticketId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'ticket_id is required');
  }

  const { rows } = await deps.pool.query<SupportTicketRow>(
    `SELECT ${TICKET_SELECT} FROM support_tickets WHERE ticket_id = $1`,
    [req.ticketId]
  );

  if (rows.length === 0) {
    throw new HandlerError('NOT_FOUND', `ticket ${req.ticketId} not found`);
  }

  // Admins can read any ticket; non-admins must own it. Anonymous-
  // owner tickets (user_id NULL) are admin-only.
  const isAdmin = requirePermission(principal, MODERATION_TICKETS_MANAGE);
  if (!isAdmin && rows[0].user_id !== principal.userId) {
    throw new HandlerError('NOT_FOUND', `ticket ${req.ticketId} not found`);
  }

  const response: GetSupportTicketResponse = {
    ticket: ticketRowToProto(rows[0]),
    responses: [],
  };

  if (req.includeResponses) {
    // Internal notes are moderator-only: respondToTicket blocks non-admins
    // from POSTing them, so we must not return them to a non-admin owner
    // reading their own ticket.
    const internalFilter = isAdmin ? '' : 'AND is_internal = false';
    const responses = await deps.pool.query<SupportTicketResponseRow>(
      `SELECT ${RESPONSE_SELECT}
       FROM support_ticket_responses
       WHERE ticket_id = $1 AND deleted_at IS NULL ${internalFilter}
       ORDER BY created_at ASC`,
      [req.ticketId]
    );
    response.responses = responses.rows.map(responseRowToProto);
  }

  return response;
}

// --- ListSupportTickets ----------------------------------------------

export async function listSupportTickets(
  deps: HandlerDeps,
  principal: Principal,
  req: ListSupportTicketsRequest
): Promise<ListSupportTicketsResponse> {
  const isAdmin = requirePermission(principal, MODERATION_TICKETS_MANAGE);

  const limit = clampLimit(req.limit);

  const where: string[] = [];
  const params: unknown[] = [];
  let p = 1;

  // Non-admins are strictly self-scoped: any explicit user_id filter
  // must match the principal; otherwise the list is forced to the
  // caller's own tickets.
  if (!isAdmin) {
    if (req.userId !== undefined && req.userId !== '' && req.userId !== principal.userId) {
      throw new HandlerError(
        'PERMISSION_DENIED',
        `'${MODERATION_TICKETS_MANAGE}' required to list another user's tickets`
      );
    }
    where.push(`user_id = $${p++}`);
    params.push(principal.userId);
  }

  if (req.status !== undefined && req.status !== 0) {
    where.push(`status = $${p++}`);
    params.push(ticketStatusToDb(req.status));
  }
  if (req.priority !== undefined && req.priority !== 0) {
    where.push(`priority = $${p++}`);
    params.push(ticketPriorityToDb(req.priority));
  }
  if (req.category !== undefined && req.category !== 0) {
    where.push(`category = $${p++}`);
    params.push(ticketCategoryToDb(req.category));
  }
  if (req.assignedTo !== undefined) {
    if (req.assignedTo === '') {
      where.push(`assigned_to IS NULL`);
    } else {
      where.push(`assigned_to = $${p++}`);
      params.push(req.assignedTo);
    }
  }
  // For admins, an explicit user_id filter narrows the list to a single
  // user. For non-admins this branch is unreachable — the self-scope
  // clause above already added a user_id condition.
  if (isAdmin && req.userId !== undefined && req.userId !== '') {
    where.push(`user_id = $${p++}`);
    params.push(req.userId);
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
    where.push(`(created_at < $${p++} OR (created_at = $${p - 1} AND ticket_id < $${p++}))`);
    params.push(cursor.createdAt);
    params.push(cursor.id);
  }

  const whereSql = where.length === 0 ? '' : `WHERE ${where.join(' AND ')}`;
  params.push(limit + 1);
  const sql = `
    SELECT ${TICKET_SELECT}
    FROM support_tickets
    ${whereSql}
    ORDER BY created_at DESC, ticket_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<SupportTicketRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const tickets = pageRows.map(ticketRowToProto);

  const response: ListSupportTicketsResponse = { tickets };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeCursor({
      createdAt: last.created_at.toISOString(),
      id: last.ticket_id,
    });
  }

  return response;
}

// --- RespondToTicket -------------------------------------------------

export async function respondToTicket(
  deps: HandlerDeps,
  principal: Principal,
  req: RespondToTicketRequest
): Promise<RespondToTicketResponse> {
  if (req.ticketId === undefined || req.ticketId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'ticket_id is required');
  }
  if (req.content === undefined || req.content === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'content is required');
  }
  const isAdmin = requirePermission(principal, MODERATION_TICKETS_MANAGE);
  // Non-admins MUST NOT post internal-only notes.
  if (!isAdmin && req.isInternal) {
    throw new HandlerError(
      'PERMISSION_DENIED',
      `'${MODERATION_TICKETS_MANAGE}' required for internal responses`
    );
  }

  return withTransaction(deps, async ({ client, publish }) => {
    // Lock the ticket so the last_response_at update is consistent.
    const ticket = await client.query<{ ticket_id: string; user_id: string | null }>(
      `SELECT ticket_id, user_id FROM support_tickets WHERE ticket_id = $1 FOR UPDATE`,
      [req.ticketId]
    );

    if (ticket.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `ticket ${req.ticketId} not found`);
    }
    // Non-admin responders must be the ticket owner.
    if (!isAdmin && ticket.rows[0].user_id !== principal.userId) {
      throw new HandlerError('NOT_FOUND', `ticket ${req.ticketId} not found`);
    }

    // responder_type reflects WHO is replying — staff for admins,
    // 'user' for the ticket owner.
    const responderType = isAdmin ? 'staff' : 'user';
    const responseId = randomUUID();
    const inserted = await client.query<SupportTicketResponseRow>(
      `INSERT INTO support_ticket_responses (
         response_id, ticket_id, responder_id, responder_type, content,
         is_internal
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${RESPONSE_SELECT}`,
      [
        responseId,
        req.ticketId,
        principal.userId,
        responderType,
        req.content,
        req.isInternal ?? false,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    // Bump the ticket's response timestamps. first_response_at is set
    // only once (COALESCE keeps an existing value).
    await client.query(
      `UPDATE support_tickets
       SET first_response_at = COALESCE(first_response_at, NOW()),
           last_response_at = NOW(),
           updated_at = NOW()
       WHERE ticket_id = $1`,
      [req.ticketId]
    );

    publish({
      type: 'moderation.ticketResponded',
      id: responseId,
      payload: {
        responseId,
        ticketId: req.ticketId,
        responderId: principal.userId,
        isInternal: req.isInternal ?? false,
      },
    });

    return { response: responseRowToProto(inserted.rows[0]) };
  });
}

// --- AssignSupportTicket ---------------------------------------------

export async function assignSupportTicket(
  deps: HandlerDeps,
  principal: Principal,
  req: AssignSupportTicketRequest
): Promise<AssignSupportTicketResponse> {
  if (!requirePermission(principal, MODERATION_TICKETS_MANAGE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${MODERATION_TICKETS_MANAGE}' required`);
  }

  if (req.ticketId === undefined || req.ticketId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'ticket_id is required');
  }
  if (req.assignedTo === undefined || req.assignedTo === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'assigned_to is required');
  }

  return withTransaction(deps, async ({ client, publish }) => {
    const existing = await client.query<{ ticket_id: string }>(
      `SELECT ticket_id FROM support_tickets WHERE ticket_id = $1 FOR UPDATE`,
      [req.ticketId]
    );

    if (existing.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `ticket ${req.ticketId} not found`);
    }

    // Set the assignee and move an untouched 'open' ticket into
    // 'in_progress'; any other status is left as-is (mirrors how
    // assignReport advances a report to under_review).
    const updated = await client.query<SupportTicketRow>(
      `UPDATE support_tickets
       SET assigned_to = $1,
           status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
           updated_at = NOW()
       WHERE ticket_id = $2
       RETURNING ${TICKET_SELECT}`,
      [req.assignedTo, req.ticketId]
    );

    if (updated.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'update returned no rows');
    }

    publish({
      type: 'moderation.ticketAssigned',
      id: req.ticketId,
      payload: {
        ticketId: req.ticketId,
        assignedTo: req.assignedTo,
        assignedBy: principal.userId,
      },
    });

    return { ticket: ticketRowToProto(updated.rows[0]) };
  });
}
