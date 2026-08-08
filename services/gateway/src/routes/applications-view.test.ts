import { describe, expect, it } from 'vitest';

import {
  ApplicationsV1,
  type Application,
  type HomeVisitRecord,
  type ReferenceCheck,
  type TimelineEntry,
  type TimelineNote,
} from '@adopt-dont-shop/proto';

import {
  applicationToView,
  buildTimeline,
  buildTimelineStats,
  documentToView,
  homeVisitToView,
  isHiddenFromFrontend,
  referenceCheckToView,
  statsToView,
  timelineEntryToView,
  timelineNoteToView,
} from './applications-view.js';

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

describe('statsToView — count collapse', () => {
  it('excludes drafts from total, folds review/visit into underReview, adopted into approved', () => {
    const view = statsToView({
      total: 12,
      draft: 2,
      submitted: 4,
      underReview: 1,
      homeVisitScheduled: 1,
      homeVisitCompleted: 1,
      approved: 1,
      rejected: 1,
      withdrawn: 1,
      adopted: 1,
    });
    expect(view).toEqual({
      total: 10, // 12 - 2 drafts
      submitted: 4,
      underReview: 3, // 1 + 1 + 1
      approved: 2, // approved + adopted
      rejected: 1,
      pendingReferences: 0,
    });
  });
});

describe('documentToView', () => {
  it('renames documentId → id and copies the rest', () => {
    const v = documentToView({
      documentId: 'doc-1',
      applicationId: 'app-1',
      type: 'id_verification',
      filename: 'aaa.pdf',
      url: '/uploads/documents/aaa.pdf',
      uploadedAt: '2026-06-06T12:00:00.000Z',
      size: 1234,
      mimeType: 'application/pdf',
    });
    expect(v).toEqual({
      id: 'doc-1',
      applicationId: 'app-1',
      type: 'id_verification',
      filename: 'aaa.pdf',
      url: '/uploads/documents/aaa.pdf',
      uploadedAt: '2026-06-06T12:00:00.000Z',
      size: 1234,
      mimeType: 'application/pdf',
    });
  });

  it('omits size/mimeType when absent', () => {
    const v = documentToView({
      documentId: 'doc-1',
      applicationId: 'app-1',
      type: 'x',
      filename: 'x',
      url: '/x',
      uploadedAt: '2026',
    });
    expect('size' in v).toBe(false);
    expect('mimeType' in v).toBe(false);
  });
});

describe('homeVisitToView', () => {
  const visit: HomeVisitRecord = {
    visitId: 'visit-1',
    applicationId: 'app-1',
    scheduledDate: '2026-06-10',
    scheduledTime: '14:00:00',
    status: 'scheduled',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  it('renames visitId → id and defaults assignedStaff to empty string', () => {
    expect(homeVisitToView(visit)).toEqual({
      id: 'visit-1',
      applicationId: 'app-1',
      scheduledDate: '2026-06-10',
      scheduledTime: '14:00:00',
      assignedStaff: '',
      status: 'scheduled',
    });
  });

  it('renames cancelledReason → cancelReason and copies optional fields', () => {
    const v = homeVisitToView({
      ...visit,
      assignedStaff: 'staff-1',
      notes: 'bring a leash',
      outcome: 'approved',
      outcomeNotes: 'looked great',
      cancelledReason: 'adopter unavailable',
      completedAt: '2026-06-10T15:00:00.000Z',
    });
    expect(v).toMatchObject({
      assignedStaff: 'staff-1',
      notes: 'bring a leash',
      outcome: 'approved',
      outcomeNotes: 'looked great',
      cancelReason: 'adopter unavailable',
      completedAt: '2026-06-10T15:00:00.000Z',
    });
  });
});

describe('referenceCheckToView', () => {
  it('renames referenceId → id and copies the rest', () => {
    const check: ReferenceCheck = {
      referenceId: 'ref-0',
      applicationId: 'app-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      relationship: 'friend',
      status: 'contacted',
      notes: 'left a voicemail',
      contactedAt: '2026-06-05T10:00:00.000Z',
      contactedBy: 'staff-1',
    };
    expect(referenceCheckToView(check)).toEqual({
      id: 'ref-0',
      applicationId: 'app-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      relationship: 'friend',
      status: 'contacted',
      notes: 'left a voicemail',
      contactedAt: '2026-06-05T10:00:00.000Z',
      contactedBy: 'staff-1',
    });
  });

  it('omits optional fields when absent', () => {
    const v = referenceCheckToView({
      referenceId: 'ref-0',
      applicationId: 'app-1',
      name: 'Ada',
      email: 'ada@example.com',
      relationship: 'friend',
      status: 'pending',
    });
    expect('notes' in v).toBe(false);
    expect('contactedAt' in v).toBe(false);
    expect('contactedBy' in v).toBe(false);
  });
});

describe('timelineEntryToView / timelineNoteToView / buildTimeline', () => {
  const entry: TimelineEntry = {
    entryId: 'evt-1',
    applicationId: 'app-1',
    fromStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
    toStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
    actorUserId: 'staff-1',
    occurredAt: '2026-06-01T10:00:00.000Z',
  };

  const note: TimelineNote = {
    noteId: 'note-1',
    applicationId: 'app-1',
    title: 'Called applicant',
    description: 'Left a voicemail',
    noteType: 'general',
    metadataJson: '{}',
    createdBy: 'staff-1',
    createdAt: '2026-06-02T10:00:00.000Z',
  };

  it('collapses a status-transition entry to snake_case status labels', () => {
    expect(timelineEntryToView(entry)).toEqual({
      id: 'evt-1',
      application_id: 'app-1',
      event_type: 'status_change',
      title: 'Status changed',
      description: 'Status changed to under_review',
      created_at: '2026-06-01T10:00:00.000Z',
      created_by: 'staff-1',
      previous_status: 'submitted',
      new_status: 'under_review',
    });
  });

  it('prefers the entry note as the description when present', () => {
    const v = timelineEntryToView({ ...entry, note: 'opening for review' });
    expect(v.description).toBe('opening for review');
  });

  it('maps a timeline note to the same item shape', () => {
    expect(timelineNoteToView(note)).toEqual({
      id: 'note-1',
      application_id: 'app-1',
      event_type: 'general',
      title: 'Called applicant',
      description: 'Left a voicemail',
      created_at: '2026-06-02T10:00:00.000Z',
      created_by: 'staff-1',
    });
  });

  it('merges entries and notes chronologically', () => {
    const items = buildTimeline([entry], [note]);
    expect(items.map(i => i.id)).toEqual(['evt-1', 'note-1']);
  });
});

describe('buildTimelineStats', () => {
  it('counts events by type and reports the latest activity', () => {
    const items = buildTimeline(
      [
        {
          entryId: 'evt-1',
          applicationId: 'app-1',
          fromStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
          toStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
          actorUserId: 'staff-1',
          occurredAt: '2026-06-01T10:00:00.000Z',
        },
      ],
      [
        {
          noteId: 'note-1',
          applicationId: 'app-1',
          title: 't',
          description: 'd',
          noteType: 'general',
          metadataJson: '{}',
          createdBy: 'staff-1',
          createdAt: '2026-06-02T10:00:00.000Z',
        },
      ]
    );

    const stats = buildTimelineStats(items);
    expect(stats.totalEvents).toBe(2);
    expect(stats.eventTypeCounts).toEqual({ status_change: 1, general: 1 });
    expect(stats.lastActivity).toBe('2026-06-02T10:00:00.000Z');
  });

  it('omits lastActivity for an empty timeline', () => {
    const stats = buildTimelineStats([]);
    expect(stats.totalEvents).toBe(0);
    expect('lastActivity' in stats).toBe(false);
  });
});
