// Base64-JSON keyset cursor helper for ApplicationService's
// ListApplications RPC. Cursor encodes (created_at, application_id)
// from the last row of the previous page.
//
// Order is descending on created_at (newest first) — matches the
// rescue inbox + adopter dashboard surfaces. Ties break on the
// application_id PK so pagination stays deterministic when two
// applications land in the same millisecond.
//
// Stable across new inserts because the projection's
// applications.created_at is event-stamped at submit time, not at
// projection time — backfilled events from a NATS replay land with
// their original timestamps, not now().
//
// Same shape as services/audit (#904) and services/moderation (#905)
// cursor helpers.

import { Buffer } from 'node:buffer';

export type ApplicationsCursor = {
  createdAt: string;
  applicationId: string;
};

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(cursor: ApplicationsCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): ApplicationsCursor {
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
    typeof (parsed as { createdAt?: unknown }).createdAt !== 'string' ||
    typeof (parsed as { applicationId?: unknown }).applicationId !== 'string'
  ) {
    throw new InvalidCursorError('cursor missing createdAt or applicationId');
  }

  return parsed as ApplicationsCursor;
}
