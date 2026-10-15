// GetUserName — a plain display-name lookup by user id, for a caller's
// own inter-service enrichment (ADS-1408: the gateway resolving chat
// participant/sender names the same way it already resolves pets and
// rescues via lookupById).
//
// Unlike GetApplicantProfile, this takes no scoping parameter and
// checks no permission beyond requiring a principal — it returns only
// first_name/last_name, never email or other PII, and grants no new
// visibility: a caller only ever has a legitimate reason to pass an id
// it already learned from another, separately-authorized read (e.g.
// a chat the caller is confirmed to participate in), never an id
// typed by an end user.

import type { Principal } from '@adopt-dont-shop/authz';
import type { GetUserNameRequest, GetUserNameResponse } from '@adopt-dont-shop/proto';

import { HandlerError, type HandlerDeps } from './handlers.js';

type UserNameRow = {
  first_name: string | null;
  last_name: string | null;
};

export async function getUserName(
  deps: HandlerDeps,
  _principal: Principal,
  req: GetUserNameRequest
): Promise<GetUserNameResponse> {
  if (!req.userId) {
    throw new HandlerError('INVALID_ARGUMENT', 'user_id is required');
  }

  const { rows } = await deps.pool.query<UserNameRow>(
    `SELECT first_name, last_name
     FROM auth.users
     WHERE user_id = $1 AND deleted_at IS NULL`,
    [req.userId]
  );
  const row = rows[0];
  if (!row) {
    throw new HandlerError('NOT_FOUND', 'user not found');
  }

  return {
    userId: req.userId,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
  };
}
