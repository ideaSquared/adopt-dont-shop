// GetApplicantProfile — the applicant's name and email for one application,
// for the rescue staff reviewing it.
//
// Rescue staff can't call AdminGetUser (admin.users.read), so before this
// RPC every applicant rendered as "Unknown" in the rescue app. This RPC is
// narrower: it returns only name + email, and only for a user who applied
// to the caller's rescue. Auth can't see applications itself, so it asks
// service.applications under the caller's OWN principal — Get's draft-aware
// read scope then refuses anything the caller couldn't open directly (other
// rescues, still-private drafts) — and checks applications.read is held for
// that application's rescue. admin.users.read holders already read any user
// through AdminGetUser, so they read the given user_id directly (Get would
// refuse a regular admin).

import { hasPermission, requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { ADMIN_USERS_READ, APPLICATIONS_VIEW, type RescueId } from '@adopt-dont-shop/lib.types';
import type {
  GetApplicantProfileRequest,
  GetApplicantProfileResponse,
  GetApplicationResponse,
} from '@adopt-dont-shop/proto';
import { principalToMetadata } from '@adopt-dont-shop/service-bootstrap';

import type { ApplicationsClient } from './applications-client.js';
import { HandlerError, type HandlerDeps } from './handlers.js';

const CROSS_SERVICE_GRPC_NOT_FOUND = 5;
const CROSS_SERVICE_GRPC_PERMISSION_DENIED = 7;
const CROSS_SERVICE_GRPC_DEADLINE_EXCEEDED = 4;
const CROSS_SERVICE_GRPC_UNAVAILABLE = 14;

type ApplicantRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export function makeGetApplicantProfile(
  applicationsClient: ApplicationsClient
): (
  deps: HandlerDeps,
  principal: Principal,
  req: GetApplicantProfileRequest
) => Promise<GetApplicantProfileResponse> {
  return async (deps, principal, req) => {
    if (!req.applicationId) {
      throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
    }

    const applicantId = await resolveApplicantId(applicationsClient, principal, req);
    const { rows } = await deps.pool.query<ApplicantRow>(
      `SELECT user_id, first_name, last_name, email
       FROM auth.users
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [applicantId]
    );
    const row = rows[0];
    if (!row) {
      throw new HandlerError('NOT_FOUND', 'applicant not found');
    }

    return {
      userId: row.user_id,
      firstName: row.first_name ?? '',
      lastName: row.last_name ?? '',
      email: row.email,
    };
  };
}

// admin.users.read holders may read any user (as AdminGetUser does), and
// ApplicationService.Get scopes regular admins out, so they use the user id
// from their own application list. Everyone else gets the applicant from the
// application, which Get only returns if the caller may see it.
async function resolveApplicantId(
  applicationsClient: ApplicationsClient,
  principal: Principal,
  req: GetApplicantProfileRequest
): Promise<string> {
  if (hasPermission(principal, ADMIN_USERS_READ) && req.userId) {
    return req.userId;
  }
  const application = await resolveApplication(applicationsClient, principal, req.applicationId);
  // The proto carries a plain string; brand it the same way
  // services/applications/src/grpc/command-runner.ts does.
  if (
    !requirePermission(principal, APPLICATIONS_VIEW, {
      rescueId: application.rescueId as RescueId,
    })
  ) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_VIEW}' required for this rescue`);
  }
  return application.adopterId;
}

async function resolveApplication(
  applicationsClient: ApplicationsClient,
  principal: Principal,
  applicationId: string
): Promise<{ adopterId: string; rescueId: string }> {
  let res: GetApplicationResponse;
  try {
    res = await applicationsClient.getApplication(
      { applicationId, includeTimeline: false },
      principalToMetadata(principal)
    );
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? err.code : undefined;
    if (code === CROSS_SERVICE_GRPC_NOT_FOUND) {
      throw new HandlerError('NOT_FOUND', `application ${applicationId} not found`);
    }
    if (code === CROSS_SERVICE_GRPC_PERMISSION_DENIED) {
      throw new HandlerError('PERMISSION_DENIED', 'not authorized for this application');
    }
    if (code === CROSS_SERVICE_GRPC_UNAVAILABLE || code === CROSS_SERVICE_GRPC_DEADLINE_EXCEEDED) {
      throw new HandlerError('UNAVAILABLE', 'applications service unavailable');
    }
    throw new HandlerError('INTERNAL', 'failed to resolve application');
  }

  if (!res.application) {
    throw new HandlerError('NOT_FOUND', `application ${applicationId} not found`);
  }
  return { adopterId: res.application.adopterId, rescueId: res.application.rescueId };
}
