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
    'getStats',
    'getApplicationDefaults',
    'updateApplicationDefaults',
    'getApplicationDraft',
    'saveApplicationDraft',
    'deleteApplicationDraft',
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

  it('PATCH /api/v1/applications/:id/answers threads expectedVersion + patch', async () => {
    mocks.saveDraftAnswers.mockResolvedValue({ application: APP });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/applications/app-1/answers',
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

  it('POST /api/v1/applications/:id/submit threads expectedVersion', async () => {
    mocks.submitDraft.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/submit',
      headers: ADOPTER,
      payload: { expectedVersion: 4 },
    });
    expect(mocks.submitDraft.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      expectedVersion: 4,
    });
  });

  it('POST /api/v1/applications/:id/review forwards the staff note', async () => {
    mocks.startReview.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/review',
      headers: STAFF,
      payload: { note: 'opening' },
    });
    expect(mocks.startReview.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      note: 'opening',
    });
  });

  it('POST /api/v1/applications/:id/home-visit/complete parses the outcome enum', async () => {
    mocks.completeHomeVisit.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/home-visit/complete',
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
      url: '/api/v1/applications/app-1/home-visit/complete',
      headers: STAFF,
      payload: { outcome: 'HOME_VISIT_OUTCOME_FAILED' },
    });
    expect(mocks.completeHomeVisit.mock.calls[0][0]).toMatchObject({
      outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_FAILED,
    });
  });

  it('POST /api/v1/applications/:id/reject requires a reason field', async () => {
    mocks.reject.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/reject',
      headers: STAFF,
      payload: { reason: 'home unsuitable' },
    });
    expect(mocks.reject.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      reason: 'home unsuitable',
    });
  });

  it('POST /api/v1/applications/:id/adopt needs no body', async () => {
    mocks.markAdopted.mockResolvedValue({ application: APP });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/adopt',
      headers: STAFF,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.markAdopted.mock.calls[0][0]).toMatchObject({ applicationId: 'app-1' });
  });

  it('GET /api/v1/applications → List with parsed status filter + scoping query', async () => {
    mocks.list.mockResolvedValue({ applications: [APP] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/applications?status=submitted&limit=10&rescue=rsc-1&adopter=usr-9',
      headers: STAFF,
    });
    expect(mocks.list.mock.calls[0][0]).toMatchObject({
      statusFilter: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
      limit: 10,
      rescueIdFilter: 'rsc-1',
      adopterIdFilter: 'usr-9',
    });
  });

  it('GET /api/v1/applications/:id passes includeTimeline', async () => {
    mocks.get.mockResolvedValue({ application: APP, timeline: [] });
    await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1?timeline=true',
      headers: ADOPTER,
    });
    expect(mocks.get.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      includeTimeline: true,
    });
  });

  // A submitted (frontend-visible) application for the Stage B view tests.
  const SUBMITTED = {
    ...APP,
    status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
    answersJson: '{"personalInfo":{"firstName":"Jo"}}',
  };

  it('List returns the frontend view wrapped in { data } and drops drafts', async () => {
    mocks.list.mockResolvedValue({ applications: [SUBMITTED, APP] }); // APP is a draft
    const res = await app.inject({ method: 'GET', url: '/api/v1/applications', headers: STAFF });
    const body = res.json() as { data: Array<Record<string, unknown>> };
    expect(body.data).toHaveLength(1); // the draft was filtered out
    expect(body.data[0]).toMatchObject({
      id: 'app-1',
      userId: 'usr-1',
      status: 'submitted',
      stage: 'pending',
      data: { personalInfo: { firstName: 'Jo' } },
    });
  });

  it('Get returns the frontend view in { data } for a visible application', async () => {
    mocks.get.mockResolvedValue({ application: SUBMITTED, timeline: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: { status: string } }).data).toMatchObject({
      status: 'submitted',
    });
  });

  it('Get 404s a draft application (no frontend representation)', async () => {
    mocks.get.mockResolvedValue({ application: APP, timeline: [] }); // APP is a draft
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/applications/stats collapses the counts to the frontend stats shape', async () => {
    mocks.getStats.mockResolvedValue({
      total: 10,
      draft: 2,
      submitted: 3,
      underReview: 1,
      homeVisitScheduled: 1,
      homeVisitCompleted: 1,
      approved: 1,
      rejected: 1,
      withdrawn: 0,
      adopted: 0,
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/stats?rescue=rsc-1',
      headers: STAFF,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: Record<string, number> }).data).toEqual({
      total: 8, // 10 - 2 drafts
      submitted: 3,
      underReview: 3, // under_review + home_visit_scheduled + home_visit_completed
      approved: 1,
      rejected: 1,
      pendingReferences: 0,
    });
    expect(mocks.getStats.mock.calls[0][0]).toMatchObject({ rescueIdFilter: 'rsc-1' });
  });

  it('POST orchestrates StartDraft→SaveDraftAnswers→SubmitDraft and returns the view', async () => {
    mocks.startDraft.mockResolvedValue({ application: { ...APP, version: 1 } });
    mocks.saveDraftAnswers.mockResolvedValue({ application: { ...APP, version: 2 } });
    mocks.submitDraft.mockResolvedValue({ application: SUBMITTED });

    const payload = { userId: 'usr-1', petId: 'pet-1', personalInfo: { firstName: 'Jo' } };
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: ADOPTER,
      payload,
    });

    expect(res.statusCode).toBe(201);
    expect((res.json() as { data: { status: string } }).data).toMatchObject({
      status: 'submitted',
    });
    expect(mocks.startDraft.mock.calls[0][0]).toEqual({ adopterId: 'usr-1', petId: 'pet-1' });
    // The whole frontend data blob is stored as answers, version threaded.
    expect(mocks.saveDraftAnswers.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      expectedVersion: 1,
      answersPatchJson: JSON.stringify(payload),
    });
    expect(mocks.submitDraft.mock.calls[0][0]).toEqual({
      applicationId: 'app-1',
      expectedVersion: 2,
    });
  });

  it('PATCH /:id/status approved → Approve, returns the view', async () => {
    mocks.approve.mockResolvedValue({ application: SUBMITTED });
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/applications/app-1/status',
      headers: STAFF,
      payload: { status: 'approved', notes: 'great home' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.approve.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      notes: 'great home',
    });
    expect((res.json() as { data: unknown }).data).toBeDefined();
  });

  it('PATCH /:id/status rejected → Reject with reason from notes', async () => {
    mocks.reject.mockResolvedValue({ application: SUBMITTED });
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/applications/app-1/status',
      headers: STAFF,
      payload: { status: 'rejected', notes: 'no yard' },
    });
    expect(mocks.reject.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      reason: 'no yard',
    });
  });

  it('PATCH /:id/status with an unsupported target → 400', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/applications/app-1/status',
      headers: STAFF,
      payload: { status: 'under_review' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('PUT /:id (update) reads the current version then SaveDraftAnswers with the blob', async () => {
    mocks.get.mockResolvedValue({ application: { ...SUBMITTED, version: 5 }, timeline: [] });
    mocks.saveDraftAnswers.mockResolvedValue({ application: SUBMITTED });
    const payload = { personalInfo: { firstName: 'Jo' } };
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/applications/app-1',
      headers: ADOPTER,
      payload,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.get.mock.calls[0][0]).toMatchObject({ applicationId: 'app-1' });
    expect(mocks.saveDraftAnswers.mock.calls[0][0]).toEqual({
      applicationId: 'app-1',
      expectedVersion: 5,
      answersPatchJson: JSON.stringify(payload),
    });
  });

  it('PUT /:id/withdraw → Withdraw, returns the view', async () => {
    mocks.withdraw.mockResolvedValue({ application: SUBMITTED });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/applications/app-1/withdraw',
      headers: ADOPTER,
      payload: { reason: 'found another pet' },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.withdraw.mock.calls[0][0]).toMatchObject({
      applicationId: 'app-1',
      reason: 'found another pet',
    });
  });

  it('maps a service UNIMPLEMENTED (StartDraft stub) → 501', async () => {
    mocks.startDraft.mockRejectedValue({
      code: grpcStatus.UNIMPLEMENTED,
      details: 'StartDraft not yet implemented',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: ADOPTER,
      payload: { adopterId: 'usr-1', petId: 'pet-1' },
    });
    expect(res.statusCode).toBe(501);
  });

  it('maps PERMISSION_DENIED → 403 and NOT_FOUND → 404', async () => {
    mocks.list.mockRejectedValue({ code: grpcStatus.PERMISSION_DENIED, details: 'nope' });
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v1/applications',
      headers: ADOPTER,
    });
    expect(denied.statusCode).toBe(403);

    mocks.get.mockRejectedValue({ code: grpcStatus.NOT_FOUND, details: 'gone' });
    const missing = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-x',
      headers: ADOPTER,
    });
    expect(missing.statusCode).toBe(404);
  });

  it('GET /api/v1/profile/application-defaults returns the parsed defaults in { data }', async () => {
    mocks.getApplicationDefaults.mockResolvedValue({
      defaultsJson: JSON.stringify({ personalInfo: { firstName: 'Jo' } }),
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/application-defaults',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: unknown }).data).toEqual({
      personalInfo: { firstName: 'Jo' },
    });
    expect(mocks.getApplicationDefaults.mock.calls[0][0]).toEqual({});
  });

  it('GET /api/v1/profile/application-defaults returns {} when the adopter has no saved row', async () => {
    mocks.getApplicationDefaults.mockResolvedValue({ defaultsJson: '' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/application-defaults',
      headers: ADOPTER,
    });
    expect((res.json() as { data: unknown }).data).toEqual({});
  });

  it('PUT /api/v1/profile/application-defaults sends the patch and returns the merged result', async () => {
    mocks.updateApplicationDefaults.mockResolvedValue({
      defaultsJson: JSON.stringify({ personalInfo: { firstName: 'Grace', lastName: 'Hopper' } }),
    });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/profile/application-defaults',
      headers: ADOPTER,
      payload: { applicationDefaults: { personalInfo: { firstName: 'Grace' } } },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.updateApplicationDefaults.mock.calls[0][0]).toEqual({
      defaultsPatchJson: JSON.stringify({ personalInfo: { firstName: 'Grace' } }),
    });
    expect((res.json() as { data: unknown }).data).toEqual({
      personalInfo: { firstName: 'Grace', lastName: 'Hopper' },
    });
  });

  it('GET /api/v1/applications/drafts/:petId returns the draft payload in { data }', async () => {
    mocks.getApplicationDraft.mockResolvedValue({
      found: true,
      answersJson: JSON.stringify({ q1: 'a' }),
      updatedAt: '2026-06-20T10:00:00.000Z',
      expiresAt: '2026-07-20T10:00:00.000Z',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/drafts/pet-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as { data: unknown }).data).toEqual({
      petId: 'pet-1',
      answers: { q1: 'a' },
      updatedAt: '2026-06-20T10:00:00.000Z',
      expiresAt: '2026-07-20T10:00:00.000Z',
    });
    expect(mocks.getApplicationDraft.mock.calls[0][0]).toEqual({ petId: 'pet-1' });
  });

  it('GET /api/v1/applications/drafts/:petId 404s when the caller has no draft', async () => {
    mocks.getApplicationDraft.mockResolvedValue({ found: false, answersJson: '', updatedAt: '' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/drafts/pet-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(404);
  });

  it('PUT /api/v1/applications/drafts/:petId sends answers and returns the saved payload', async () => {
    mocks.saveApplicationDraft.mockResolvedValue({
      answersJson: JSON.stringify({ q1: 'a' }),
      updatedAt: '2026-06-20T10:00:00.000Z',
      expiresAt: undefined,
    });
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/applications/drafts/pet-1',
      headers: ADOPTER,
      payload: { answers: { q1: 'a' } },
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.saveApplicationDraft.mock.calls[0][0]).toEqual({
      petId: 'pet-1',
      answersJson: JSON.stringify({ q1: 'a' }),
    });
    expect((res.json() as { data: { expiresAt: string | null } }).data).toEqual({
      petId: 'pet-1',
      answers: { q1: 'a' },
      updatedAt: '2026-06-20T10:00:00.000Z',
      expiresAt: null,
    });
  });

  it('DELETE /api/v1/applications/drafts/:petId returns 204', async () => {
    mocks.deleteApplicationDraft.mockResolvedValue({});
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/applications/drafts/pet-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(204);
    expect(mocks.deleteApplicationDraft.mock.calls[0][0]).toEqual({ petId: 'pet-1' });
  });

  it('does not let the drafts route shadow GET /api/v1/applications/:id', async () => {
    mocks.get.mockResolvedValue({ application: SUBMITTED, timeline: [] });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/applications/app-1',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(200);
    expect(mocks.get).toHaveBeenCalled();
    expect(mocks.getApplicationDraft).not.toHaveBeenCalled();
  });

  it('maps PERMISSION_DENIED on GET /api/v1/profile/application-defaults → 403', async () => {
    mocks.getApplicationDefaults.mockRejectedValue({
      code: grpcStatus.PERMISSION_DENIED,
      details: 'nope',
    });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/profile/application-defaults',
      headers: ADOPTER,
    });
    expect(res.statusCode).toBe(403);
  });

  it('threads x-user-* metadata to the gRPC client', async () => {
    mocks.approve.mockResolvedValue({ application: APP });
    await app.inject({
      method: 'POST',
      url: '/api/v1/applications/app-1/approve',
      headers: STAFF,
      payload: { notes: 'ok' },
    });
    const metadata = mocks.approve.mock.calls[0][1];
    expect(metadata.get('x-user-id')).toEqual(['staff-1']);
    expect(metadata.get('x-rescue-id')).toEqual(['rsc-1']);
  });

  describe('PATCH /api/v1/applications/bulk-update', () => {
    it('requires a non-empty applicationIds array', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: [], updates: { status: 'approved' } },
      });
      expect(res.statusCode).toBe(400);
    });

    it('status: approved → Approve for every id, reporting an all-success summary', async () => {
      mocks.approve.mockResolvedValue({ application: SUBMITTED });
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: {
          applicationIds: ['app-1', 'app-2'],
          updates: { status: 'approved', notes: 'great home' },
        },
      });
      expect(res.statusCode).toBe(200);
      expect(mocks.approve).toHaveBeenCalledTimes(2);
      expect(mocks.approve.mock.calls[0][0]).toMatchObject({
        applicationId: 'app-1',
        notes: 'great home',
      });
      expect(mocks.approve.mock.calls[1][0]).toMatchObject({ applicationId: 'app-2' });
      expect(res.json()).toEqual({ data: { successCount: 2, failureCount: 0, failures: [] } });
    });

    it('status: rejected → Reject, preferring rejectionReason over notes', async () => {
      mocks.reject.mockResolvedValue({ application: SUBMITTED });
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: {
          applicationIds: ['app-1'],
          updates: { status: 'rejected', notes: 'fallback', rejectionReason: 'no yard' },
        },
      });
      expect(mocks.reject.mock.calls[0][0]).toMatchObject({
        applicationId: 'app-1',
        reason: 'no yard',
      });
    });

    it('status: withdrawn → Withdraw with withdrawalReason', async () => {
      mocks.withdraw.mockResolvedValue({ application: SUBMITTED });
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: ADOPTER,
        payload: {
          applicationIds: ['app-1'],
          updates: { status: 'withdrawn', withdrawalReason: 'found another pet' },
        },
      });
      expect(mocks.withdraw.mock.calls[0][0]).toMatchObject({
        applicationId: 'app-1',
        reason: 'found another pet',
      });
    });

    it('stage: reviewing → StartReview (single-row stage transition, ADS-642)', async () => {
      mocks.startReview.mockResolvedValue({ application: SUBMITTED });
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: ['app-1'], updates: { stage: 'reviewing' } },
      });
      expect(mocks.startReview.mock.calls[0][0]).toMatchObject({ applicationId: 'app-1' });
    });

    it('stage: visiting → ScheduleHomeVisit, requires scheduledAt', async () => {
      mocks.scheduleHomeVisit.mockResolvedValue({ application: SUBMITTED });
      const ok = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: {
          applicationIds: ['app-1'],
          updates: { stage: 'visiting', scheduledAt: '2026-07-01T10:00:00.000Z' },
        },
      });
      expect(mocks.scheduleHomeVisit.mock.calls[0][0]).toMatchObject({
        applicationId: 'app-1',
        scheduledAt: '2026-07-01T10:00:00.000Z',
      });
      expect((ok.json() as { data: { successCount: number } }).data.successCount).toBe(1);

      const missingDate = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: ['app-2'], updates: { stage: 'visiting' } },
      });
      const body = missingDate.json() as { data: { failureCount: number } };
      expect(body.data.failureCount).toBe(1);
    });

    it('stage: deciding → CompleteHomeVisit with the parsed outcome', async () => {
      mocks.completeHomeVisit.mockResolvedValue({ application: SUBMITTED });
      await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: {
          applicationIds: ['app-1'],
          updates: { stage: 'deciding', outcome: 'passed', notes: 'all good' },
        },
      });
      expect(mocks.completeHomeVisit.mock.calls[0][0]).toMatchObject({
        applicationId: 'app-1',
        outcome: ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED,
        notes: 'all good',
      });
    });

    it('an unrecognised updates shape is a per-item failure, not a 400', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: ['app-1'], updates: { foo: 'bar' } },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { data: { failureCount: number; failures: unknown[] } };
      expect(body.data.failureCount).toBe(1);
      expect(body.data.failures).toEqual([
        {
          applicationId: 'app-1',
          error: 'updates must include a recognised status or stage transition',
        },
      ]);
    });

    it('one failing id does not block the others from succeeding', async () => {
      mocks.approve.mockResolvedValueOnce({ application: SUBMITTED }).mockRejectedValueOnce({
        code: grpcStatus.FAILED_PRECONDITION,
        details: 'already decided',
      });
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: ['app-1', 'app-2'], updates: { status: 'approved' } },
      });
      const body = res.json() as {
        data: {
          successCount: number;
          failureCount: number;
          failures: Array<{ applicationId: string; error: string }>;
        };
      };
      expect(body.data.successCount).toBe(1);
      expect(body.data.failureCount).toBe(1);
      expect(body.data.failures).toEqual([{ applicationId: 'app-2', error: 'already decided' }]);
    });

    it('a server-side (5xx) failure is reported generically, not with internal details', async () => {
      mocks.approve.mockRejectedValue({ code: grpcStatus.INTERNAL, details: 'db connection lost' });
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/applications/bulk-update',
        headers: STAFF,
        payload: { applicationIds: ['app-1'], updates: { status: 'approved' } },
      });
      const body = res.json() as { data: { failures: Array<{ error: string }> } };
      expect(body.data.failures[0].error).toBe('internal_error');
    });
  });
});
