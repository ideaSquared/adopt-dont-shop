// gRPC handler implementations for MatchingService.
//
// Phase 9.3b — ships StartSession + EndSession. The remaining four
// RPCs (Recommend, RecordSwipe, SearchPets, ListSwipeHistory) follow
// in a focused follow-up keyed off the same adapter / cursor / mapper
// foundation.
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

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { PETS_VIEW } from '@adopt-dont-shop/lib.types';
import {
  MatchingV1,
  type EndSessionRequest,
  type EndSessionResponse,
  type StartSessionRequest,
  type StartSessionResponse,
} from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { deviceTypeToDb } from './enum-map.js';
import { sessionRowToProto, type SwipeSessionRow } from './mapper.js';

function ensureSwipePermission(principal: Principal): void {
  if (!requirePermission(principal, PETS_VIEW)) {
    throw new HandlerError('PERMISSION_DENIED', `'${PETS_VIEW}' required`);
  }
}

// --- StartSession ----------------------------------------------------

export async function startSession(
  deps: HandlerDeps,
  principal: Principal,
  req: StartSessionRequest
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
        req.ipAddress ?? null,
        req.userAgent ?? null,
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

    // Authz scope: a swipe session belongs to its user; only the
    // owner can close it. Admins bypass via super_admin (handled by
    // requirePermission).
    if (
      row.user_id !== null &&
      row.user_id !== principal.userId &&
      !hasPermission(principal, PETS_VIEW) === false
    ) {
      // hasPermission gate above already covered — just guard the
      // ownership here. Admins skip via super_admin in
      // requirePermission.
      if (!principal.roles.includes('super_admin')) {
        throw new HandlerError('PERMISSION_DENIED', 'not the session owner');
      }
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
