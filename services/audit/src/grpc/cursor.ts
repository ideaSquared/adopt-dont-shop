// Base64-JSON keyset cursor helper for AuditQueryService.{Query,
// GetByTarget}. Cursor is the (occurred_at, event_id) tuple from the
// last row of the previous page — stable across new inserts because
// audit_events is append-only (CAD pattern, same as the monolith's
// audit-log pagination).

import { Buffer } from 'node:buffer';

export type AuditCursor = {
  occurredAt: string;
  eventId: string;
};

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): AuditCursor {
  let json: string;
  try {
    json = Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    throw new InvalidCursorError('cursor is not valid base64url');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new InvalidCursorError('cursor does not decode to JSON');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { occurredAt?: unknown }).occurredAt !== 'string' ||
    typeof (parsed as { eventId?: unknown }).eventId !== 'string'
  ) {
    throw new InvalidCursorError('cursor missing occurredAt or eventId');
  }

  return parsed as AuditCursor;
}
