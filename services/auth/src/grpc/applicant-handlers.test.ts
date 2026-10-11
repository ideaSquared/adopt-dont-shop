import type { Metadata } from '@grpc/grpc-js';
import type { NatsConnection } from 'nats';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Principal } from '@adopt-dont-shop/authz';
import {
  ADMIN_USERS_READ,
  APPLICATIONS_CREATE,
  APPLICATIONS_VIEW,
  type UserId,
} from '@adopt-dont-shop/lib.types';
import { ApplicationsV1, type GetApplicantProfileResponse } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from './applications-client.js';
import { makeGetApplicantProfile } from './applicant-handlers.js';
import type { HandlerDeps } from './handlers.js';

// Application app-1 belongs to rescue rsc-1; usr-adopter applied.
const APP_RESCUE_ID = 'rsc-1';

const STAFF: Principal = {
  userId: 'usr-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [APPLICATIONS_VIEW],
  rescueId: APP_RESCUE_ID,
};

const OTHER_RESCUE_STAFF: Principal = {
  userId: 'usr-other-staff' as UserId,
  roles: ['rescue_staff'],
  permissions: [APPLICATIONS_VIEW],
  rescueId: 'rsc-2',
};

// Adopters can read their own application, but that is not a reason to
// hand out applicant details through this RPC.
const ADOPTER: Principal = {
  userId: 'usr-adopter' as UserId,
  roles: ['adopter'],
  permissions: [APPLICATIONS_VIEW, APPLICATIONS_CREATE],
};

const ADMIN: Principal = {
  userId: 'usr-admin' as UserId,
  roles: ['admin'],
  permissions: [ADMIN_USERS_READ],
};

const GRPC_NOT_FOUND = 5;
const GRPC_PERMISSION_DENIED = 7;
const GRPC_UNAVAILABLE = 14;
const GRPC_DEADLINE_EXCEEDED = 4;
const GRPC_INTERNAL = 13;

function makeMocks() {
  const getApplication = vi.fn().mockResolvedValue({
    application: ApplicationsV1.Application.fromPartial({
      applicationId: 'app-1',
      adopterId: 'usr-adopter',
      rescueId: APP_RESCUE_ID,
    }),
    timeline: [],
  });
  const applicationsClient: ApplicationsClient = { getApplication, close: vi.fn() };
  const query = vi.fn().mockResolvedValue({
    rows: [{ user_id: 'usr-adopter', first_name: 'Jane', last_name: 'Doe', email: 'jane@x.test' }],
  });
  const deps: HandlerDeps = {
    pool: { query } as unknown as Pool,
    nats: {} as unknown as NatsConnection,
    passwordHasher: {} as unknown as HandlerDeps['passwordHasher'],
    tokenIssuer: {} as unknown as HandlerDeps['tokenIssuer'],
  };
  return { deps, getApplication, query, applicationsClient };
}

describe('getApplicantProfile', () => {
  let mocks: ReturnType<typeof makeMocks>;
  let getApplicantProfile: ReturnType<typeof makeGetApplicantProfile>;

  beforeEach(() => {
    mocks = makeMocks();
    getApplicantProfile = makeGetApplicantProfile(mocks.applicationsClient);
  });

  it("gives staff of the application's rescue the applicant's name and email", async () => {
    const res = await getApplicantProfile(mocks.deps, STAFF, {
      applicationId: 'app-1',
      userId: '',
    });

    expect(res).toEqual<GetApplicantProfileResponse>({
      userId: 'usr-adopter',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@x.test',
    });
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['usr-adopter']);
  });

  it("resolves the application under the caller's own principal", async () => {
    await getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' });

    const [req, metadata] = mocks.getApplication.mock.calls[0] as [unknown, Metadata];
    expect(req).toMatchObject({ applicationId: 'app-1' });
    expect(metadata.get('x-user-id')).toEqual(['usr-staff']);
    expect(metadata.get('x-rescue-id')).toEqual([APP_RESCUE_ID]);
  });

  it('refuses staff of a different rescue', async () => {
    await expect(
      getApplicantProfile(mocks.deps, OTHER_RESCUE_STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('refuses when the applications service denies the caller the application', async () => {
    mocks.getApplication.mockRejectedValueOnce({ code: GRPC_PERMISSION_DENIED });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('refuses an adopter, even one reading their own application', async () => {
    await expect(
      getApplicantProfile(mocks.deps, ADOPTER, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it('lets an admin with admin.users.read read the applicant without an application scope', async () => {
    // ApplicationService.Get scopes regular admins to nothing, so the admin
    // path must not depend on it.
    const res = await getApplicantProfile(mocks.deps, ADMIN, {
      applicationId: 'app-1',
      userId: 'usr-adopter',
    });

    expect(res.email).toBe('jane@x.test');
    expect(mocks.getApplication).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['usr-adopter']);
  });

  it("ignores a staff caller's user id and reads the application's own adopter", async () => {
    await getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: 'usr-other' });

    expect(mocks.query.mock.calls[0]?.[1]).toEqual(['usr-adopter']);
  });

  it('returns NOT_FOUND for an unknown application', async () => {
    mocks.getApplication.mockRejectedValueOnce({ code: GRPC_NOT_FOUND });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'missing', userId: '' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('returns UNAVAILABLE when the applications service is unreachable', async () => {
    mocks.getApplication.mockRejectedValueOnce({ code: GRPC_UNAVAILABLE });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('returns UNAVAILABLE when the applications service times out', async () => {
    mocks.getApplication.mockRejectedValueOnce({ code: GRPC_DEADLINE_EXCEEDED });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('returns INTERNAL for an unexpected applications-service failure', async () => {
    mocks.getApplication.mockRejectedValueOnce({ code: GRPC_INTERNAL });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });

  it('returns NOT_FOUND when the applicant account no longer exists', async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: 'app-1', userId: '' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects a request with no application id', async () => {
    await expect(
      getApplicantProfile(mocks.deps, STAFF, { applicationId: '', userId: '' })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    expect(mocks.getApplication).not.toHaveBeenCalled();
  });
});
