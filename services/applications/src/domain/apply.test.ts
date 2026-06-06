import { describe, expect, it } from 'vitest';

import { apply, fold, INITIAL_STATE } from './apply.js';
import type { ApplicationEvent } from './types.js';

// --- Helpers ---------------------------------------------------------

const AT_T0 = '2026-06-01T10:00:00Z';
const AT_T1 = '2026-06-01T10:05:00Z';
const AT_T2 = '2026-06-01T10:10:00Z';
const AT_T3 = '2026-06-01T10:15:00Z';

const DRAFT_CREATED: ApplicationEvent = {
  type: 'draftCreated',
  applicationId: 'app-1',
  adopterId: 'usr-adopter',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  at: AT_T0,
};

// --- INITIAL_STATE ---------------------------------------------------

describe('INITIAL_STATE', () => {
  it('has version 0 and empty IDs (the structural signal that no events have arrived)', () => {
    expect(INITIAL_STATE.version).toBe(0);
    expect(INITIAL_STATE.applicationId).toBe('');
    expect(INITIAL_STATE.adopterId).toBe('');
  });
});

// --- apply (per-event) ----------------------------------------------

describe('apply — draftCreated', () => {
  it('populates the identity fields + status=draft + version=1', () => {
    const next = apply(INITIAL_STATE, DRAFT_CREATED);
    expect(next.applicationId).toBe('app-1');
    expect(next.adopterId).toBe('usr-adopter');
    expect(next.status).toBe('draft');
    expect(next.version).toBe(1);
    expect(next.createdAt).toBe(AT_T0);
    expect(next.updatedAt).toBe(AT_T0);
  });

  it('immutability — the input state is unchanged', () => {
    const before = { ...INITIAL_STATE };
    apply(INITIAL_STATE, DRAFT_CREATED);
    expect(INITIAL_STATE).toEqual(before);
  });
});

describe('apply — draftAnswersSaved', () => {
  it('MERGES the answers patch (does not replace)', () => {
    const created = apply(INITIAL_STATE, DRAFT_CREATED);
    const withFirst = apply(created, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      answersPatch: { age: 28, hasGarden: true },
      references: null,
      at: AT_T1,
    });
    const withSecond = apply(withFirst, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      // hasGarden overrides; age stays; otherPets added
      answersPatch: { hasGarden: false, otherPets: 0 },
      references: null,
      at: AT_T2,
    });
    expect(withSecond.answers).toEqual({ age: 28, hasGarden: false, otherPets: 0 });
    expect(withSecond.version).toBe(3);
  });

  it('REPLACES references wholesale when supplied (not merge)', () => {
    const created = apply(INITIAL_STATE, DRAFT_CREATED);
    const withRefs = apply(created, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      answersPatch: {},
      references: [{ name: 'Sam', email: 's@x', relationship: 'colleague' }],
      at: AT_T1,
    });
    expect(withRefs.references).toHaveLength(1);

    const cleared = apply(withRefs, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      answersPatch: {},
      references: [],
      at: AT_T2,
    });
    expect(cleared.references).toHaveLength(0);
  });

  it('null references leaves the list unchanged', () => {
    const created = apply(INITIAL_STATE, DRAFT_CREATED);
    const withRefs = apply(created, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      answersPatch: {},
      references: [{ name: 'Sam', email: 's@x', relationship: 'colleague' }],
      at: AT_T1,
    });
    const patched = apply(withRefs, {
      type: 'draftAnswersSaved',
      applicationId: 'app-1',
      answersPatch: { age: 30 },
      references: null,
      at: AT_T2,
    });
    expect(patched.references).toHaveLength(1);
    expect(patched.answers).toEqual({ age: 30 });
  });
});

describe('apply — lifecycle transitions', () => {
  function withDraft(): ReturnType<typeof apply> {
    return apply(INITIAL_STATE, DRAFT_CREATED);
  }

  it('draftSubmitted → status submitted + submittedAt stamped', () => {
    const next = apply(withDraft(), {
      type: 'draftSubmitted',
      applicationId: 'app-1',
      at: AT_T1,
    });
    expect(next.status).toBe('submitted');
    expect(next.submittedAt).toBe(AT_T1);
  });

  it('reviewStarted is IDEMPOTENT — second event keeps the first reviewStartedAt', () => {
    const submitted = apply(withDraft(), {
      type: 'draftSubmitted',
      applicationId: 'app-1',
      at: AT_T1,
    });
    const first = apply(submitted, {
      type: 'reviewStarted',
      applicationId: 'app-1',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T2,
    });
    const second = apply(first, {
      type: 'reviewStarted',
      applicationId: 'app-1',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T3,
    });
    expect(second.reviewStartedAt).toBe(AT_T2);
    // But version still bumps on the second one.
    expect(second.version).toBe(first.version + 1);
  });

  it('approved stamps decidedAt / decidedBy / decisionNotes', () => {
    const review = fold([
      DRAFT_CREATED,
      { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 },
      {
        type: 'reviewStarted',
        applicationId: 'app-1',
        actorUserId: 'usr-staff',
        note: null,
        at: AT_T2,
      },
    ]);
    const approved = apply(review, {
      type: 'approved',
      applicationId: 'app-1',
      actorUserId: 'usr-staff',
      notes: 'all good',
      at: AT_T3,
    });
    expect(approved.status).toBe('approved');
    expect(approved.decidedAt).toBe(AT_T3);
    expect(approved.decidedBy).toBe('usr-staff');
    expect(approved.decisionNotes).toBe('all good');
  });
});

// --- fold (replay) --------------------------------------------------

describe('fold', () => {
  it('returns INITIAL_STATE for an empty stream', () => {
    expect(fold([])).toEqual(INITIAL_STATE);
  });

  it('replay = live write — the same state emerges from event-by-event apply and one fold', () => {
    const events: ApplicationEvent[] = [
      DRAFT_CREATED,
      {
        type: 'draftAnswersSaved',
        applicationId: 'app-1',
        answersPatch: { age: 30, hasGarden: true },
        references: null,
        at: AT_T1,
      },
      { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T2 },
      {
        type: 'reviewStarted',
        applicationId: 'app-1',
        actorUserId: 'usr-staff',
        note: 'opening',
        at: AT_T3,
      },
    ];

    const live = events.reduce(apply, INITIAL_STATE);
    const replayed = fold(events);

    expect(replayed).toEqual(live);
    expect(replayed.version).toBe(events.length);
    expect(replayed.status).toBe('under_review');
  });
});
