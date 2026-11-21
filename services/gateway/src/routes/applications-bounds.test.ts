import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ApplicationsClient } from '../grpc-clients/applications-client.js';
import {
  createBoundsHarness,
  describeBounds,
  makeAnyClient,
  type BoundsCase,
  type BoundsHarness,
} from '../../test/helpers/bounds-cases.js';

import { registerApplicationsRoutes } from './applications.js';

const cases: readonly BoundsCase[] = [
  {
    method: 'POST',
    url: '/api/v1/applications',
    valid: { petId: 'pet-1' },
    fields: [['petId', 'token']],
  },
  {
    method: 'PATCH',
    url: '/api/v1/applications/app-1/status',
    valid: { status: 'approved' },
    fields: [['notes', 'longText']],
  },
  {
    method: 'PUT',
    url: '/api/v1/applications/app-1/withdraw',
    valid: {},
    fields: [['reason', 'longText']],
  },
  {
    method: 'PATCH',
    url: '/api/v1/applications/app-1/answers',
    valid: { expectedVersion: 1, answersPatchJson: '{}' },
    fields: [
      ['answersPatchJson', 'jsonBlob'],
      ['referencesJson', 'jsonBlob'],
    ],
  },
  {
    method: 'PATCH',
    url: '/api/v1/applications/bulk-update',
    valid: { applicationIds: ['app-1'], updates: { status: 'approved' } },
    fields: [
      ['applicationIds.0', 'token'],
      ['updates.status', 'token'],
      ['updates.stage', 'token'],
      ['updates.notes', 'longText'],
      ['updates.rejectionReason', 'longText'],
      ['updates.withdrawalReason', 'longText'],
      ['updates.scheduledAt', 'token'],
      ['updates.scheduledDate', 'token'],
      ['updates.outcome', 'token'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/review',
    valid: {},
    fields: [['note', 'longText']],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/home-visit/schedule',
    valid: { scheduledAt: '2026-06-01T10:00:00.000Z' },
    fields: [
      ['scheduledAt', 'token'],
      ['note', 'longText'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/home-visit/complete',
    valid: { outcome: 'approved' },
    fields: [
      ['outcome', 'token'],
      ['notes', 'longText'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/approve',
    valid: {},
    fields: [['notes', 'longText']],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/reject',
    valid: { reason: 'no' },
    fields: [['reason', 'longText']],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/withdraw',
    valid: {},
    fields: [['reason', 'longText']],
  },
  {
    method: 'PUT',
    url: '/api/v1/applications/app-1/home-visits/visit-1',
    valid: { status: 'scheduled' },
    fields: [
      ['status', 'token'],
      ['scheduled_date', 'token'],
      ['scheduled_time', 'token'],
      ['assigned_staff', 'name'],
      ['notes', 'longText'],
      ['outcome', 'token'],
      ['conditions', 'longText'],
      ['reschedule_reason', 'longText'],
      ['cancelled_reason', 'longText'],
      ['cancelled_at', 'token'],
      ['completed_at', 'token'],
    ],
  },
  {
    method: 'PATCH',
    url: '/api/v1/applications/app-1/references',
    valid: { referenceId: 'ref-1' },
    fields: [
      ['referenceId', 'token'],
      ['status', 'token'],
      ['notes', 'longText'],
      ['contacted_at', 'token'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/timeline/notes',
    valid: { title: 'Called', description: 'Spoke to the adopter' },
    fields: [
      ['title', 'name'],
      ['description', 'longText'],
      ['event_type', 'token'],
      ['note_type', 'token'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/applications/app-1/timeline/events',
    valid: { title: 'Called', description: 'Spoke to the adopter' },
    fields: [
      ['title', 'name'],
      ['description', 'longText'],
      ['event_type', 'token'],
      ['note_type', 'token'],
    ],
  },
  {
    method: 'POST',
    url: '/api/v1/profile/quick-application',
    valid: { petId: 'pet-1' },
    fields: [['petId', 'token']],
  },
];

describe('applications mutation body bounds (ENG-1406)', () => {
  let harness: BoundsHarness;

  beforeAll(async () => {
    harness = await createBoundsHarness(app =>
      registerApplicationsRoutes(app, { client: makeAnyClient<ApplicationsClient>() })
    );
  });

  afterAll(async () => {
    await harness.app.close();
  });

  describeBounds(() => harness, cases);

  it('still accepts a POST /applications blob with extra answer keys', async () => {
    const before = harness.handlerRuns();
    await harness.app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      payload: { petId: 'pet-1', answers: { q1: 'a'.repeat(2000) }, extra: ['x'] },
      remoteAddress: '10.9.9.9',
    });
    expect(harness.handlerRuns()).toBe(before + 1);
  });
});
