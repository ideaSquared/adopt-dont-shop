// ListColleagueProfiles — names and emails of the caller's rescue colleagues,
// for the rescue staff list.
//
// Rescue staff can't call AdminGetUser (admin.users.read), so before this RPC
// every colleague rendered as "Unknown User" in the rescue app. Like
// GetApplicantProfile it is narrower: userId, name and email only, and only
// for users who are staff of the caller's OWN rescue. Auth can't see rescue
// membership (no cross-schema reads), so it asks service.rescue
// ListStaffMembers under the caller's own principal with no rescue_id — the
// rescue service then resolves the caller's own rescue and enforces
// staff.read itself. Requested ids are intersected with that list; anything
// else is silently omitted so the response never confirms whether an
// outsider's id exists. The request carries no rescue id.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { STAFF_VIEW } from '@adopt-dont-shop/lib.types';
import type {
  ListColleagueProfilesRequest,
  ListColleagueProfilesResponse,
  ListStaffMembersResponse,
} from '@adopt-dont-shop/proto';
import { principalToMetadata } from '@adopt-dont-shop/service-bootstrap';

import { HandlerError, type HandlerDeps } from './handlers.js';
import type { RescueClient } from './rescue-client.js';

const MAX_USER_IDS = 100;

const CROSS_SERVICE_GRPC_NOT_FOUND = 5;
const CROSS_SERVICE_GRPC_PERMISSION_DENIED = 7;
const CROSS_SERVICE_GRPC_DEADLINE_EXCEEDED = 4;
const CROSS_SERVICE_GRPC_UNAVAILABLE = 14;

type ColleagueRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export function makeListColleagueProfiles(
  rescueClient: RescueClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: ListColleagueProfilesRequest
) => Promise<ListColleagueProfilesResponse> {
  return async (deps, principal, req) => {
    if (!requirePermission(principal, STAFF_VIEW)) {
      throw new HandlerError('PERMISSION_DENIED', `'${STAFF_VIEW}' required`);
    }
    if (req.userIds.length > MAX_USER_IDS) {
      throw new HandlerError('INVALID_ARGUMENT', `at most ${MAX_USER_IDS} user_ids per request`);
    }
    if (req.userIds.length === 0) {
      return { profiles: [] };
    }

    const colleagueIds = await listColleagueIds(rescueClient, principal);
    const wanted = [...new Set(req.userIds)].filter(id => colleagueIds.has(id));
    if (wanted.length === 0) {
      return { profiles: [] };
    }

    const { rows } = await deps.pool.query<ColleagueRow>(
      `SELECT user_id, first_name, last_name, email
       FROM auth.users
       WHERE user_id = ANY($1) AND deleted_at IS NULL`,
      [wanted]
    );
    return {
      profiles: rows.map(row => ({
        userId: row.user_id,
        firstName: row.first_name ?? '',
        lastName: row.last_name ?? '',
        email: row.email,
      })),
    };
  };
}

async function listColleagueIds(
  rescueClient: RescueClient,
  principal: Principal
): Promise<ReadonlySet<string>> {
  let res: ListStaffMembersResponse;
  try {
    res = await rescueClient.listStaffMembers(
      { rescueId: undefined },
      principalToMetadata(principal)
    );
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined;
    // The caller belongs to no rescue, so they have no colleagues.
    if (code === CROSS_SERVICE_GRPC_NOT_FOUND) {
      return new Set();
    }
    if (code === CROSS_SERVICE_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not authorized to list rescue staff');
    }
    if (code === CROSS_SERVICE_GRPC_UNAVAILABLE || code === CROSS_SERVICE_GRPC_DEADLINE_EXCEEDED) {
      throw new HandlerError('UNAVAILABLE', 'rescue service unavailable');
    }
    throw new HandlerError('INTERNAL', 'failed to resolve rescue staff');
  }
  return new Set(res.staffMembers.map(member => member.userId));
}
