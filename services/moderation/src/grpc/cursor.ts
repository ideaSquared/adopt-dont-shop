// Base64-JSON keyset cursor helper for ModerationService's list
// RPCs (ListReports, ListModeratorActions, ListUserSanctions,
// ListSupportTickets). Cursor encodes (created_at, id) from the last
// row of the previous page — stable across new inserts because the
// queries order by created_at DESC and ties break on a deterministic
// uuid PK.
//
// Same shape as services/audit/src/grpc/cursor.ts. Per-list-RPC id
// names vary (report_id, action_id, sanction_id, ticket_id) but the
// cursor carries a generic `id` field; the handler dispatches.

import { Buffer } from 'node:buffer';

export type ModerationCursor = {
  createdAt: string;
  id: string;
};

export class InvalidCursorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(cursor: ModerationCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): ModerationCursor {
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
    typeof (parsed as { id?: unknown }).id !== 'string'
  ) {
    throw new InvalidCursorError('cursor missing createdAt or id');
  }

  return parsed as ModerationCursor;
}
