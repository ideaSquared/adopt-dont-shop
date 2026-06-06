import { status as grpcStatus } from '@grpc/grpc-js';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';

import { registerApplicationsRoutes } from './applications.js';

// A minimally-complete Application proto so the response toJSON encoders
// (which throw on an undefined enum) don't blow up.
const APP = {
  applicationId: 'app-1',
  adopterId: 'usr-1',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT,
  answersJson: '{}',
  referencesJson: '[]',
  version: 1,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

function makeClient(): {
  client: ApplicationsClient;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of [
    'startDraft',
    'saveDraftAnswers',
    'submitDraft',
    'startReview',
    'scheduleHomeVisit',
    'completeHomeVisit',
    'approve',
    'reject',
    'withdraw',
    'markAdopted',
    'get',
    'list',
  ]) {
    mocks[m] = vi.fn();
  }
  const client = { ...mocks, close: vi.fn() } as unknown as ApplicationsClient;
  return { client, mocks };
}

async function makeApp(client: ApplicationsClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await registerApplicationsRoutes(app, { client });
  return app;
}

const ADOPTER = {
  'x-user-id': 'usr-1',
  'x-user-roles': 'adopter',
  'x-user-permissions': 'applications.read,applications.update',
};

const STAFF = {
  'x-user-id': 'staff-1',
  'x-user-roles': 'rescue_staff',
  'x-user-permissions': 'applications.review,applications.approve,applications.reject',
  'x-rescue-id': 'rsc-1',
};

describe('applications routes', () => {
  let app: FastifyInstance;
  let mocks: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    const m = makeClient();
    mocks = m.mocks;
    app = await makeApp(m.client);
  });

  afterEach(async () => {
    await app.close();
  });

  it('PATCH /api/applications/:id/answers threads expectedVersion + patch', async () => {
    mocks.saveDraftAnswers.mockResolvedValue({ application: APP });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/applications/app-1/answers',
      headers: ADOPTER,
      payload: { expectedVersion: 3, answersPatchJson: '{"q1":"a"}' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.saveDraftAnswers.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      expectedVersion: 3,
      answersPatchJson: '{"q1":"a"}',
    });
  });

  it('POST /api/applications/:id/submit threads expectedVersion', async () => {
    mocks.submitDraft.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/submit',
      headers: ADOPTER,
      payload: { expectedVersion: 4 },
    });
    expect(mocks.submitDraft.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      expectedVersion: 4,
    });
  });

  it('POST /api/applications/:id/review forwards the staff note', async () => {
    mocks.startReview.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/review',
      headers: STAFF,
      payload: { note: 'opening' },
    });
    expect(mocks.startReview.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      note: 'opening',
    });
  });

  it('POST /api/applications/:id/home-visit/complete parses the outcome enum', async () => {
    mocks.completeHomeVisit.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/home-visit/complete',
      headers: STAFF,
      payload: { outcome: 'passed', notes: 'great fit' },
    });
    expect(mocks.completeHomeVisit.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
    });
  });

  it('accepts the SCREAMING proto-form outcome too', async () => {
    mocks.completeHomeVisit.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/home-visit/complete',
      headers: STAFF,
      payload: { outcome: 'HOME_VISIT_OUTCOME_FAILED' },
    });
    expect(mocks.completeHomeVisit.mock.calls[0][0]).toMatchObject({
      outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_FAILED,
    });
  });

  it('POST /api/applications/:id/reject requires a reason field', async () => {
    mocks.reject.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/reject',
      headers: STAFF,
      payload: { reason: 'home unsuitable' },
    });
    expect(mocks.reject.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      reason: 'home unsuitable',
    });
  });

  it('POST /api/applications/:id/adopt needs no body', async () => {
    mocks.markAdopted.mockResolvedValue({ application: APP });
    const res = await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/adopt',
      headers: STAFF,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.markAdopted.mock.calls[0][0]).toMatchObject({ applicationId: 'app-1' });
  });

  it('GET /api/applications → List with parsed status filter + scoping query', async () => {
    mocks.list.mockResolvedValue({ applications: [APP] });
    await app.inject({
      method: 'GET',
      url: '/api/applications?status=submitted&limit=10&rescue=rsc-1&adopter=usr-9',
      headers: STAFF,
    });
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      statusFilter: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
      limit: 10,
      rescueIdFilter: 'rsc-1',
      adopterIdFilter: 'usr-9',
    });
  });

  it('GET /api/applications/:id passes includeTimeline', async () => {
    mocks.get.mockResolvedValue({ application: APP, timeline: [] });
    await app.inject({
      method: 'GET',
      url: '/api/applications/app-1?timeline=true',
      headers: ADOPTER,
    });
    expect(mocks.get.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      includeTimeline: true,
    });
  });

  it('maps a service UNIMPLEMENTED (StartDraft stub) → 501', async () => {
    mocks.startDraft.mockRejectedValue({
      code: grpcStatus.UNIMPLEMENTED,
      details: 'StartDraft not yet implemented',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/applications',
      headers: ADOPTER,
      payload: { adopterId: 'usr-1', petId: 'pet-1' },
    });
    expect(res.statusCode).toBe(501);
  });

  it('maps PERMISSION_DENIED → 403 and NOT_FOUND → 404', async () => {
    mocks.list.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'nope' });
    const denied = await app.inject({ method: 'GET', url: '/api/applications', headers: ADOPTER });
    expect(denied.statusCode).toBe(403);

    mocks.get.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'gone' });
    const missing = await app.inject({
      method: 'GET',
      url: '/api/applications/app-x',
      headers: ADOPTER,
    });
    expect(missing.statusCode).toBe(404);
  });

  it('threads x-user-* metadata to the gRPC client', async () => {
    mocks.approve.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/applications/app-1/approve',
      headers: STAFF,
      payload: { notes: 'ok' },
    });
    const metadata = mocks.approve.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['staff-1']);
    expect(metadata.get('x-rescue-id')).toEqual(['rsc-1']);
  });
});
