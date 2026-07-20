// gRPC handler implementations for MatchingService.
//
// This file ships StartSession + EndSession + RecordSwipe +
// ListSwipeHistory. Recommend + SearchPets are implemented alongside
// in recommend-handlers.ts and share the PetsClient wired in
// server.ts — the "follows in a later phase" note that used to live
// here is out of date.
//
// Discipline:
//   - State-changing writes wrap @adopt-dont-shop/events.withTransaction
//     so publish-after-commit holds — NATS events never fire on a
//     rolled-back write.
//   - Authz uses @adopt-dont-shop/authz.requirePermission against the
//     stamped principal. Defence-in-depth — the gateway will gate
//     first; the handler re-checks.
//   - SQL parameters use $-indexed placeholders, never string-spliced
//     values. The mapper from #911 handles row → proto translation.

import { randomUUID } from 'node:crypto';

import type { Metadata } from '@grpc/grpc-js';

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { PETS_VIEW } from '@adopt-dont-shop/lib.types';
import {
  MatchingV1,
  type EndSessionRequest,
  type EndSessionResponse,
  type ListSwipeHistoryRequest,
  type ListSwipeHistoryResponse,
  type RecordSwipeRequest,
  type RecordSwipeResponse,
  type StartSessionRequest,
  type StartSessionResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import {
  decodeSwipeHistoryCursor,
  encodeSwipeHistoryCursor,
  InvalidCursorError,
} from './cursor.js';
import { deviceTypeToDb, swipeActionToDb } from './enum-map.js';
import {
  actionRowToProto,
  sessionRowToProto,
  type SwipeActionRow,
  type SwipeSessionRow,
} from './mapper.js';

function ensureSwipePermission(principal: Principal): void {
  if (!requirePermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
  }
}

// ip_address / user_agent are forensic columns (abuse investigation,
// fraud review). They must reflect the connection origin, so they are
// read from the metadata the GATEWAY stamps at the edge (x-client-ip /
// x-client-user-agent, from its own connection context in
// buildMetadata) — never from the caller-controlled request body, which
// any adopter could forge (ADS-931). Absent metadata → NULL, not a body
// fallback. The proto's ip_address / user_agent fields are deliberately
// ignored.
const CLIENT_IP_HEADER = 'x-client-ip';
const CLIENT_USER_AGENT_HEADER = 'x-client-user-agent';

function metadataHeader(metadata: Metadata | undefined, key: string): string | null {
  const values = metadata?.get(key) ?? [];
  if (values.length === 0) {
    return null;
  }
  const first = values[0];
  return typeof first === 'string' ? first : first.toString();
}

// --- StartSession ----------------------------------------------------

export async function startSession(
  deps: HandlerDeps,
  principal: Principal,
  req: StartSessionRequest,
  metadata?: Metadata
): Promise<StartSessionResponse> {
  ensureSwipePermission(principal);

  return withTransaction(deps, async ({ client, publish }) => {
    // Idempotency: if the user already has an active session, return
    // it unchanged. NATS event fires only on a fresh create.
    const existing = await client.query<SwipeSessionRow>(
      `SELECT session_id, user_id, start_time, end_time, total_swipes,
              likes, passes, super_likes, filters, ip_address,
              user_agent, device_type, is_active, created_at, updated_at
       FROM swipe_sessions
       WHERE user_id = $1 AND is_active = true
       ORDER BY start_time DESC
       LIMIT 1`,
      [principal.userId]
    );

    if (existing.rows.length > 0) {
      return {
        session: sessionRowToProto(existing.rows[0]),
        created: false,
      };
    }

    const sessionId = randomUUID();
    const deviceTypeDb =
      req.deviceType === undefined || req.deviceType === 0
        ? 'unknown'
        : deviceTypeToDb(req.deviceType);
    // Validate the filters_json BEFORE writing it so a bad blob from
    // the client surfaces as INVALID_ARGUMENT instead of a Postgres
    // 22P02. Empty string normalises to {} so the column stays JSONB.
    const filtersJson = parseFiltersJson(req.filtersJson);

    const inserted = await client.query<SwipeSessionRow>(
      `INSERT INTO swipe_sessions (
         session_id, user_id, filters, ip_address, user_agent, device_type
       )
       VALUES ($1, $2, $3::jsonb, $4, $5, $6)
       RETURNING session_id, user_id, start_time, end_time, total_swipes,
                 likes, passes, super_likes, filters, ip_address,
                 user_agent, device_type, is_active, created_at, updated_at`,
      [
        sessionId,
        principal.userId,
        filtersJson,
        metadataHeader(metadata, CLIENT_IP_HEADER),
        metadataHeader(metadata, CLIENT_USER_AGENT_HEADER),
        deviceTypeDb,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    publish({
      type: 'matching.sessionStarted',
      id: sessionId,
      payload: {
        sessionId,
        userId: principal.userId,
        startTime: inserted.rows[0].start_time.toISOString(),
      },
    });

    return {
      session: sessionRowToProto(inserted.rows[0]),
      created: true,
    };
  });
}

// --- EndSession ------------------------------------------------------

export async function endSession(
  deps: HandlerDeps,
  principal: Principal,
  req: EndSessionRequest
): Promise<EndSessionResponse> {
  ensureSwipePermission(principal);

  if (req.sessionId === undefined || req.sessionId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'session_id is required');
  }

  return withTransaction(deps, async ({ client, publish }) => {
    // Lock the row so a concurrent EndSession doesn't double-end.
    const existing = await client.query<SwipeSessionRow>(
      `SELECT session_id, user_id, start_time, end_time, total_swipes,
              likes, passes, super_likes, filters, ip_address,
              user_agent, device_type, is_active, created_at, updated_at
       FROM swipe_sessions
       WHERE session_id = $1
       FOR UPDATE`,
      [req.sessionId]
    );

    if (existing.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `session ${req.sessionId} not found`);
    }

    const row = existing.rows[0];

    // Ownership: only the session owner can close it. super_admin
    // bypasses (CAD pattern) — same guard shape as recordSwipe.
    if (
      row.user_id !== null &&
      row.user_id !== principal.userId &&
      !principal.roles.includes('super_admin')
    ) {
      throw new HandlerError('PERMISSION_DENIED', 'not the session owner');
    }

    // Idempotency: closing an already-closed session is a no-op.
    // Returns the existing row, doesn't fire another event.
    if (!row.is_active) {
      return { session: sessionRowToProto(row) };
    }

    const updated = await client.query<SwipeSessionRow>(
      `UPDATE swipe_sessions
       SET end_time = NOW(), is_active = false, updated_at = NOW()
       WHERE session_id = $1
       RETURNING session_id, user_id, start_time, end_time, total_swipes,
                 likes, passes, super_likes, filters, ip_address,
                 user_agent, device_type, is_active, created_at, updated_at`,
      [req.sessionId]
    );

    if (updated.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'update returned no rows');
    }

    publish({
      type: 'matching.sessionEnded',
      id: req.sessionId,
      payload: {
        sessionId: req.sessionId,
        userId: row.user_id,
        endTime: updated.rows[0].end_time?.toISOString() ?? null,
        totalSwipes: updated.rows[0].total_swipes,
      },
    });

    return { session: sessionRowToProto(updated.rows[0]) };
  });
}

// --- RecordSwipe -----------------------------------------------------

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function recordSwipe(
  deps: HandlerDeps,
  principal: Principal,
  req: RecordSwipeRequest
): Promise<RecordSwipeResponse> {
  ensureSwipePermission(principal);

  if (req.sessionId === undefined || req.sessionId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'session_id is required');
  }
  if (req.petId === undefined || req.petId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'pet_id is required');
  }
  if (req.action === undefined || req.action === 0) {
    throw new HandlerError('INVALID_ARGUMENT', 'action is required');
  }

  const actionDb = swipeActionToDb(req.action);

  return withTransaction(deps, async ({ client, publish }) => {
    // Lock the session row so the counter update is consistent under
    // concurrent swipes. The (user_id, is_active) idx makes the
    // lookup fast.
    const session = await client.query<SwipeSessionRow>(
      `SELECT session_id, user_id, start_time, end_time, total_swipes,
              likes, passes, super_likes, filters, ip_address,
              user_agent, device_type, is_active, created_at, updated_at
       FROM swipe_sessions
       WHERE session_id = $1
       FOR UPDATE`,
      [req.sessionId]
    );

    if (session.rows.length === 0) {
      throw new HandlerError('NOT_FOUND', `session ${req.sessionId} not found`);
    }

    const sessionRow = session.rows[0];

    // Ownership: only the session owner can record a swipe on it.
    // super_admin bypasses (CAD pattern).
    if (
      sessionRow.user_id !== null &&
      sessionRow.user_id !== principal.userId &&
      !principal.roles.includes('super_admin')
    ) {
      throw new HandlerError('PERMISSION_DENIED', 'not the session owner');
    }

    // A swipe on a closed session is a contract violation — the SPA
    // should have called StartSession before resuming. Surface as
    // INVALID_ARGUMENT rather than NOT_FOUND so the client knows to
    // recover via StartSession.
    if (!sessionRow.is_active) {
      throw new HandlerError('INVALID_ARGUMENT', `session ${req.sessionId} is closed`);
    }

    const swipeActionId = randomUUID();
    const inserted = await client.query<SwipeActionRow>(
      `INSERT INTO swipe_actions (
         swipe_action_id, session_id, pet_id, user_id, action,
         response_time, device_type
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING swipe_action_id, session_id, pet_id, user_id, action,
                 timestamp, response_time, device_type`,
      [
        swipeActionId,
        req.sessionId,
        req.petId,
        principal.userId,
        actionDb,
        req.responseTime ?? null,
        req.deviceType ?? null,
      ]
    );

    if (inserted.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'insert returned no rows');
    }

    // Tick the session counters. total_swipes always +1; one of
    // likes / passes / super_likes also +1 depending on the action.
    // 'info' increments only total_swipes (it's a trace event, not a
    // commit).
    const counterCol =
      actionDb === 'like'
        ? 'likes = likes + 1'
        : actionDb === 'pass'
          ? 'passes = passes + 1'
          : actionDb === 'super_like'
            ? 'super_likes = super_likes + 1'
            : null;

    const sessionUpdateSql = counterCol
      ? `UPDATE swipe_sessions
         SET total_swipes = total_swipes + 1, ${counterCol}, updated_at = NOW()
         WHERE session_id = $1
         RETURNING session_id, user_id, start_time, end_time, total_swipes,
                   likes, passes, super_likes, filters, ip_address,
                   user_agent, device_type, is_active, created_at, updated_at`
      : `UPDATE swipe_sessions
         SET total_swipes = total_swipes + 1, updated_at = NOW()
         WHERE session_id = $1
         RETURNING session_id, user_id, start_time, end_time, total_swipes,
                   likes, passes, super_likes, filters, ip_address,
                   user_agent, device_type, is_active, created_at, updated_at`;

    const updatedSession = await client.query<SwipeSessionRow>(sessionUpdateSql, [req.sessionId]);

    if (updatedSession.rows.length !== 1) {
      throw new HandlerError('INTERNAL', 'session counter update returned no rows');
    }

    publish({
      type: 'matching.swipeRecorded',
      id: swipeActionId,
      payload: {
        swipeActionId,
        sessionId: req.sessionId,
        petId: req.petId,
        userId: principal.userId,
        action: actionDb,
        timestamp: inserted.rows[0].timestamp.toISOString(),
      },
    });

    return {
      action: actionRowToProto(inserted.rows[0]),
      session: sessionRowToProto(updatedSession.rows[0]),
    };
  });
}

// --- ListSwipeHistory ------------------------------------------------

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.trunc(raw), MAX_LIMIT);
}

export async function listSwipeHistory(
  deps: HandlerDeps,
  principal: Principal,
  req: ListSwipeHistoryRequest
): Promise<ListSwipeHistoryResponse> {
  ensureSwipePermission(principal);

  const limit = clampLimit(req.limit);

  // Adopters can only list their OWN swipe history. super_admin
  // bypasses (CAD pattern). hasPermission gate above already
  // confirmed the basic permission; this is the ownership scope.
  const targetUserId = principal.userId;
  if (!hasPermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', 'pets.read required');
  }

  const where: string[] = ['user_id = $1'];
  const params: unknown[] = [targetUserId];
  let p = 2;

  if (req.actionFilter !== undefined && req.actionFilter !== 0) {
    where.push(`action = $${p++}`);
    params.push(swipeActionToDb(req.actionFilter));
  }

  if (req.cursor !== undefined && req.cursor !== '') {
    let cursor;
    try {
      cursor = decodeSwipeHistoryCursor(req.cursor);
    } catch (err) {
      if (err instanceof InvalidCursorError) {
        throw new HandlerError('INVALID_ARGUMENT', err.message);
      }
      throw err;
    }
    where.push(`(timestamp < $${p++} OR (timestamp = $${p - 1} AND swipe_action_id < $${p++}))`);
    params.push(cursor.timestamp);
    params.push(cursor.swipeActionId);
  }

  params.push(limit + 1);
  const sql = `
    SELECT swipe_action_id, session_id, pet_id, user_id, action,
           timestamp, response_time, device_type
    FROM swipe_actions
    WHERE ${where.join(' AND ')}
    ORDER BY timestamp DESC, swipe_action_id DESC
    LIMIT $${p}
  `;

  const { rows } = await deps.pool.query<SwipeActionRow>(sql, params);

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const actions = pageRows.map(actionRowToProto);

  const response: ListSwipeHistoryResponse = { actions };
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    response.nextCursor = encodeSwipeHistoryCursor({
      timestamp: last.timestamp.toISOString(),
      swipeActionId: last.swipe_action_id,
    });
  }

  return response;
}

// --- Helpers ---------------------------------------------------------

function parseFiltersJson(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return '{}';
  }
  try {
    // Parse just to validate; we round-trip through JSON.stringify so
    // any whitespace or formatting drift normalises.
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new Error('filters_json must encode a JSON object');
    }
    return JSON.stringify(obj);
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `filters_json invalid: ${(err as Error).message}`);
  }
}

// Re-export the MatchingV1 helpers some adjacent modules want at the
// matching service boundary. Keeps the import surface small for the
// follow-up handler files.
export { MatchingV1 };
