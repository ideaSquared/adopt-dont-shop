import { describe, expect, it } from 'vitest';

import { fold } from '../domain/index.js';
import {
  expectedStatus,
  mapMonolithApplication,
  REJECTION_REASON_FALLBACK,
  type MonolithApplicationInput,
  type MonolithApplicationStatus,
} from './map-monolith-application.js';

const CREATED_AT = '2026-01-01T10:00:00.000Z';
const SUBMITTED_AT = '2026-01-02T10:00:00.000Z';
const REVIEWED_AT = '2026-01-03T10:00:00.000Z';
const DECIDED_AT = '2026-01-04T10:00:00.000Z';

const base = (overrides: Partial<MonolithApplicationInput> = {}): MonolithApplicationInput => ({
  applicationId: '11111111-1111-1111-1111-111111111111',
  userId: '22222222-2222-2222-2222-222222222222',
  petId: '33333333-3333-3333-3333-333333333333',
  rescueId: '44444444-4444-4444-4444-444444444444',
  status: 'submitted',
  answers: {},
  references: [],
  createdAt: CREATED_AT,
  submittedAt: SUBMITTED_AT,
  reviewedAt: REVIEWED_AT,
  decidedAt: DECIDED_AT,
  actionedBy: '55555555-5555-5555-5555-555555555555',
  rejectionReason: null,
  withdrawalReason: null,
  ...overrides,
});

const eventTypes = (input: MonolithApplicationInput): ReadonlyArray<string> =>
  mapMonolithApplication(input).map(e => e.type);

describe('mapMonolithApplication — event sequence per source status', () => {
  it('submitted → draftCreated, draftSubmitted', () => {
    expect(eventTypes(base({ status: 'submitted' }))).toEqual(['draftCreated', 'draftSubmitted']);
  });

  it('approved → draftCreated, draftSubmitted, reviewStarted, approved', () => {
    expect(eventTypes(base({ status: 'approved' }))).toEqual([
      'draftCreated',
      'draftSubmitted',
      'reviewStarted',
      'approved',
    ]);
  });

  it('rejected → draftCreated, draftSubmitted, reviewStarted, rejected', () => {
    expect(eventTypes(base({ status: 'rejected', rejectionReason: 'No fenced garden' }))).toEqual([
      'draftCreated',
      'draftSubmitted',
      'reviewStarted',
      'rejected',
    ]);
  });

  it('withdrawn → draftCreated, draftSubmitted, withdrawn (no review)', () => {
    expect(eventTypes(base({ status: 'withdrawn' }))).toEqual([
      'draftCreated',
      'draftSubmitted',
      'withdrawn',
    ]);
  });
});

describe('mapMonolithApplication — folds to the correct terminal status', () => {
  const statuses: ReadonlyArray<MonolithApplicationStatus> = [
    'submitted',
    'approved',
    'rejected',
    'withdrawn',
  ];

  it.each(statuses)('%s folds to the matching domain status', status => {
    const input = base({ status, rejectionReason: 'reason' });
    const state = fold(mapMonolithApplication(input));
    expect(state.status).toBe(expectedStatus(status));
  });

  it('carries the immutable identity fields onto the folded state', () => {
    const state = fold(mapMonolithApplication(base({ status: 'approved' })));
    expect(state.applicationId).toBe('11111111-1111-1111-1111-111111111111');
    expect(state.adopterId).toBe('22222222-2222-2222-2222-222222222222');
    expect(state.petId).toBe('33333333-3333-3333-3333-333333333333');
    expect(state.rescueId).toBe('44444444-4444-4444-4444-444444444444');
  });
});

describe('mapMonolithApplication — answers / references carried through', () => {
  it('emits draftAnswersSaved when answers are present', () => {
    const input = base({ answers: { hasYard: true, householdSize: 3 } });
    expect(eventTypes(input)).toContain('draftAnswersSaved');
    const state = fold(mapMonolithApplication(input));
    expect(state.answers).toEqual({ hasYard: true, householdSize: 3 });
  });

  it('emits draftAnswersSaved when only references are present', () => {
    const references = [{ name: 'Vet Bob', email: 'bob@vets.example', relationship: 'vet' }];
    const input = base({ references });
    expect(eventTypes(input)).toContain('draftAnswersSaved');
    const state = fold(mapMonolithApplication(input));
    expect(state.references).toEqual(references);
  });

  it('omits draftAnswersSaved when there are no answers and no references', () => {
    expect(eventTypes(base())).not.toContain('draftAnswersSaved');
    const state = fold(mapMonolithApplication(base()));
    expect(state.answers).toEqual({});
    expect(state.references).toEqual([]);
  });
});

describe('mapMonolithApplication — timestamp preservation', () => {
  it('stamps draftCreated.at from createdAt and draftSubmitted.at from submittedAt', () => {
    const events = mapMonolithApplication(base({ status: 'submitted' }));
    const created = events.find(e => e.type === 'draftCreated');
    const submitted = events.find(e => e.type === 'draftSubmitted');
    expect(created?.at).toBe(CREATED_AT);
    expect(submitted?.at).toBe(SUBMITTED_AT);
  });

  it('stamps reviewStarted from reviewedAt and the decision from decidedAt', () => {
    const events = mapMonolithApplication(base({ status: 'approved' }));
    const review = events.find(e => e.type === 'reviewStarted');
    const approved = events.find(e => e.type === 'approved');
    expect(review?.at).toBe(REVIEWED_AT);
    expect(approved?.at).toBe(DECIDED_AT);
  });

  it('folds lifecycle timestamps onto the read-model state', () => {
    const state = fold(mapMonolithApplication(base({ status: 'approved' })));
    expect(state.createdAt).toBe(CREATED_AT);
    expect(state.submittedAt).toBe(SUBMITTED_AT);
    expect(state.reviewStartedAt).toBe(REVIEWED_AT);
    expect(state.decidedAt).toBe(DECIDED_AT);
    expect(state.decidedBy).toBe('55555555-5555-5555-5555-555555555555');
  });

  it('falls back to createdAt when submittedAt is null (legacy rows)', () => {
    const events = mapMonolithApplication(base({ status: 'submitted', submittedAt: null }));
    const submitted = events.find(e => e.type === 'draftSubmitted');
    expect(submitted?.at).toBe(CREATED_AT);
  });

  it('falls back to the decision time for reviewStarted when reviewedAt is null', () => {
    const events = mapMonolithApplication(
      base({ status: 'approved', reviewedAt: null, decidedAt: DECIDED_AT })
    );
    const review = events.find(e => e.type === 'reviewStarted');
    expect(review?.at).toBe(DECIDED_AT);
  });
});

describe('mapMonolithApplication — decision detail preservation', () => {
  it('preserves the rejection reason when present', () => {
    const state = fold(
      mapMonolithApplication(base({ status: 'rejected', rejectionReason: 'No fenced garden' }))
    );
    expect(state.rejectionReason).toBe('No fenced garden');
  });

  it('substitutes the fallback reason when the monolith rejection_reason is null', () => {
    const state = fold(mapMonolithApplication(base({ status: 'rejected', rejectionReason: null })));
    expect(state.rejectionReason).toBe(REJECTION_REASON_FALLBACK);
  });

  it('carries the withdrawal reason (nullable) onto decisionNotes', () => {
    const state = fold(
      mapMonolithApplication(base({ status: 'withdrawn', withdrawalReason: 'Found another pet' }))
    );
    expect(state.decisionNotes).toBe('Found another pet');
  });
});

describe('mapMonolithApplication — idempotency contract (deterministic output)', () => {
  it('produces identical event sequences across repeated calls', () => {
    const input = base({ status: 'approved', answers: { a: 1 } });
    expect(mapMonolithApplication(input)).toEqual(mapMonolithApplication(input));
  });

  it('keys every event aggregate on the monolith application id', () => {
    const input = base({ status: 'rejected', rejectionReason: 'x' });
    for (const event of mapMonolithApplication(input)) {
      expect(event.applicationId).toBe(input.applicationId);
    }
  });
});
