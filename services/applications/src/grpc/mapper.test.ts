import { describe, expect, it } from 'vitest';

import { ApplicationsV1 } from '@adopt-dont-shop/proto';

import {
  applicationRowToProto,
  timelineRowToProto,
  type ApplicationRow,
  type TimelineEntryRow,
} from './mapper.js';

function baseApplicationRow(overrides: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    application_id: '11111111-1111-1111-1111-111111111111',
    user_id: '22222222-2222-2222-2222-222222222222',
    pet_id: '33333333-3333-3333-3333-333333333333',
    rescue_id: '44444444-4444-4444-4444-444444444444',
    status: 'submitted',
    version: 3,
    answers: { hasYard: true, otherPets: 'cat' },
    references: [{ name: 'Jane Doe', email: 'jane@example.com' }],
    submitted_at: new Date('2026-06-01T12:00:00.000Z'),
    review_started_at: null,
    home_visit_scheduled_at: null,
    home_visit_completed_at: null,
    home_visit_outcome: null,
    home_visit_notes: null,
    decided_at: null,
    decided_by: null,
    decision_notes: null,
    rejection_reason: null,
    adopted_at: null,
    created_at: new Date('2026-05-30T08:00:00.000Z'),
    updated_at: new Date('2026-06-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('applicationRowToProto', () => {
  it('translates a freshly-submitted application', () => {
    const proto = applicationRowToProto(baseApplicationRow());
    expect(proto).toEqual({
      applicationId: '11111111-1111-1111-1111-111111111111',
      adopterId: '22222222-2222-2222-2222-222222222222',
      petId: '33333333-3333-3333-3333-333333333333',
      rescueId: '44444444-4444-4444-4444-444444444444',
      status: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
      answersJson: '{"hasYard":true,"otherPets":"cat"}',
      referencesJson: '[{"name":"Jane Doe","email":"jane@example.com"}]',
      version: 3,
      submittedAt: '2026-06-01T12:00:00.000Z',
      createdAt: '2026-05-30T08:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });
  });

  it('normalises null answers / references to "{}" / "[]"', () => {
    const proto = applicationRowToProto(baseApplicationRow({ answers: null, references: null }));
    expect(proto.answersJson).toBe('{}');
    expect(proto.referencesJson).toBe('[]');
  });

  it('omits home_visit_outcome when NULL (draft / submitted state)', () => {
    const proto = applicationRowToProto(baseApplicationRow());
    expect(proto.homeVisitOutcome).toBeUndefined();
  });

  it('populates all timestamps + outcome for an approved application', () => {
    const proto = applicationRowToProto(
      baseApplicationRow({
        status: 'approved',
        review_started_at: new Date('2026-06-02T09:00:00.000Z'),
        home_visit_scheduled_at: new Date('2026-06-05T14:00:00.000Z'),
        home_visit_completed_at: new Date('2026-06-05T15:30:00.000Z'),
        home_visit_outcome: 'passed',
        home_visit_notes: 'Family + yard great fit.',
        decided_at: new Date('2026-06-06T10:00:00.000Z'),
        decided_by: '55555555-5555-5555-5555-555555555555',
        decision_notes: 'Approved.',
      })
    );
    expect(proto.status).toBe(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_APPROVED);
    expect(proto.reviewStartedAt).toBe('2026-06-02T09:00:00.000Z');
    expect(proto.homeVisitScheduledAt).toBe('2026-06-05T14:00:00.000Z');
    expect(proto.homeVisitCompletedAt).toBe('2026-06-05T15:30:00.000Z');
    expect(proto.homeVisitOutcome).toBe(ApplicationsV1.HomeVisitOutcome.HOME_VISIT_OUTCOME_PASSED);
    expect(proto.homeVisitNotes).toBe('Family + yard great fit.');
    expect(proto.decidedAt).toBe('2026-06-06T10:00:00.000Z');
    expect(proto.decidedBy).toBe('55555555-5555-5555-5555-555555555555');
    expect(proto.decisionNotes).toBe('Approved.');
  });

  it('throws on an unknown status (schema drift guard)', () => {
    expect(() => applicationRowToProto(baseApplicationRow({ status: 'maybe' }))).toThrowError();
  });
});

function baseTimelineRow(overrides: Partial<TimelineEntryRow> = {}): TimelineEntryRow {
  return {
    transition_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    application_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    from_status: 'submitted',
    to_status: 'under_review',
    transitioned_by: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    transitioned_at: new Date('2026-06-02T09:00:00.000Z'),
    reason: 'Started review.',
    ...overrides,
  };
}

describe('timelineRowToProto', () => {
  it('translates a standard transition', () => {
    const proto = timelineRowToProto(baseTimelineRow());
    expect(proto).toEqual({
      entryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      applicationId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      fromStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_SUBMITTED,
      toStatus: ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNDER_REVIEW,
      actorUserId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      occurredAt: '2026-06-02T09:00:00.000Z',
      note: 'Started review.',
    });
  });

  it('surfaces UNSPECIFIED for the first transition (from_status NULL)', () => {
    const proto = timelineRowToProto(
      baseTimelineRow({ from_status: null, to_status: 'draft', reason: null })
    );
    expect(proto.fromStatus).toBe(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_UNSPECIFIED);
    expect(proto.toStatus).toBe(ApplicationsV1.ApplicationStatus.APPLICATION_STATUS_DRAFT);
    expect(proto.note).toBeUndefined();
  });

  it('emits empty actorUserId when transitioned_by is NULL (system transition)', () => {
    const proto = timelineRowToProto(baseTimelineRow({ transitioned_by: null }));
    expect(proto.actorUserId).toBe('');
  });
});
