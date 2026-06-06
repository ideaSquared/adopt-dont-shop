import { describe, expect, it } from 'vitest';

import { ApplicationsV1, type Application } from '@adopt-dont-shop/proto';

import { applicationToView, isHiddenFromFrontend } from './applications-view.js';

const S = ApplicationsV1.ApplicationStatus;

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    applicationId: 'app-1',
    adopterId: 'usr-1',
    petId: 'pet-1',
    rescueId: 'rsc-1',
    status: S.APPLICATION_STATUS_SUBMITTED,
    answersJson: '{}',
    referencesJson: '[]',
    version: 2,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-02T00:00:00.000Z',
    ...overrides,
  } as Application;
}

describe('applicationToView — status collapse', () => {
  const cases: Array<[number, string | null, string | null]> = [
    [S.APPLICATION_STATUS_UNSPECIFIED, null, null],
    [S.APPLICATION_STATUS_DRAFT, null, null],
    [S.APPLICATION_STATUS_SUBMITTED, 'submitted', 'pending'],
    [S.APPLICATION_STATUS_UNDER_REVIEW, 'submitted', 'reviewing'],
    [S.APPLICATION_STATUS_HOME_VISIT_SCHEDULED, 'submitted', 'visiting'],
    [S.APPLICATION_STATUS_HOME_VISIT_COMPLETED, 'submitted', 'deciding'],
    [S.APPLICATION_STATUS_APPROVED, 'approved', 'resolved'],
    [S.APPLICATION_STATUS_REJECTED, 'rejected', 'resolved'],
    [S.APPLICATION_STATUS_WITHDRAWN, 'withdrawn', 'withdrawn'],
    [S.APPLICATION_STATUS_ADOPTED, 'approved', 'resolved'],
  ];

  it.each(cases)('maps service status %i → (%s, %s)', (status, expectedStatus, expectedStage) => {
    const view = applicationToView(makeApp({ status }));
    if (expectedStatus === null) {
      expect(view).toBeNull();
      expect(isHiddenFromFrontend(makeApp({ status }))).toBe(true);
      return;
    }
    expect(view).not.toBeNull();
    expect(view?.status).toBe(expectedStatus);
    expect(view?.stage).toBe(expectedStage);
    expect(isHiddenFromFrontend(makeApp({ status }))).toBe(false);
  });
});

describe('applicationToView — field mapping', () => {
  it('renames proto fields to the frontend shape', () => {
    const view = applicationToView(
      makeApp({
        applicationId: 'app-9',
        adopterId: 'usr-9',
        petId: 'pet-9',
        rescueId: 'rsc-9',
        status: S.APPLICATION_STATUS_APPROVED,
        submittedAt: '2026-06-03T00:00:00.000Z',
        decidedAt: '2026-06-05T00:00:00.000Z',
        decidedBy: 'staff-1',
        decisionNotes: 'great home',
      })
    );
    expect(view).toMatchObject({
      id: 'app-9',
      userId: 'usr-9',
      petId: 'pet-9',
      rescueId: 'rsc-9',
      status: 'approved',
      submittedAt: '2026-06-03T00:00:00.000Z',
      reviewedAt: '2026-06-05T00:00:00.000Z',
      reviewedBy: 'staff-1',
      reviewNotes: 'great home',
    });
  });

  it('falls back reviewedAt → reviewStartedAt and reviewNotes → rejectionReason', () => {
    const view = applicationToView(
      makeApp({
        status: S.APPLICATION_STATUS_REJECTED,
        reviewStartedAt: '2026-06-04T00:00:00.000Z',
        rejectionReason: 'no yard',
      })
    );
    expect(view?.reviewedAt).toBe('2026-06-04T00:00:00.000Z');
    expect(view?.reviewNotes).toBe('no yard');
  });

  it('emits null for stage timestamps the application has not reached', () => {
    const view = applicationToView(makeApp({ status: S.APPLICATION_STATUS_SUBMITTED }));
    expect(view?.submittedAt).toBeNull();
    expect(view?.reviewedAt).toBeNull();
    expect(view?.reviewedBy).toBeNull();
    expect(view?.reviewNotes).toBeNull();
  });
});

describe('applicationToView — data blob', () => {
  it('parses a non-empty answersJson into the nested data object', () => {
    const view = applicationToView(
      makeApp({ answersJson: '{"personalInfo":{"firstName":"Jo"},"answers":{"q1":"a"}}' })
    );
    expect(view?.data).toEqual({ personalInfo: { firstName: 'Jo' }, answers: { q1: 'a' } });
  });

  it('omits data when answersJson is empty / "{}" / malformed / a non-object', () => {
    expect(applicationToView(makeApp({ answersJson: '' }))?.data).toBeUndefined();
    expect(applicationToView(makeApp({ answersJson: '{}' }))?.data).toBeUndefined();
    expect(applicationToView(makeApp({ answersJson: 'not-json' }))?.data).toBeUndefined();
    expect(applicationToView(makeApp({ answersJson: '[1,2]' }))?.data).toBeUndefined();
  });
});
