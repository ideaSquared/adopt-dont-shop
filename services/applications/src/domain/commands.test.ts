import { describe, expect, it } from 'vitest';

import { apply, fold, INITIAL_STATE } from './apply.js';
import { handle } from './commands.js';
import { DomainError, type ApplicationEvent } from './types.js';

const AT_T0 = '2026-06-01T10:00:00Z';
const AT_T1 = '2026-06-01T10:05:00Z';

const DRAFT_CREATED: ApplicationEvent = {
  type: 'draftCreated',
  applicationId: 'app-1',
  adopterId: 'usr-adopter',
  petId: 'pet-1',
  rescueId: 'rsc-1',
  at: AT_T0,
};

function stateInStatus(status: ApplicationEvent['type']) {
  // Helper to build a state at a particular point in the lifecycle.
  switch (status) {
    case 'draftCreated':
      return fold([DRAFT_CREATED]);
    case 'draftSubmitted':
      return fold([DRAFT_CREATED, { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 }]);
    case 'reviewStarted':
      return fold([
        DRAFT_CREATED,
        { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 },
        {
          type: 'reviewStarted',
          applicationId: 'app-1',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
      ]);
    case 'homeVisitScheduled':
      return fold([
        DRAFT_CREATED,
        { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 },
        {
          type: 'reviewStarted',
          applicationId: 'app-1',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
        {
          type: 'homeVisitScheduled',
          applicationId: 'app-1',
          scheduledAt: '2026-06-10T10:00:00Z',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
      ]);
    case 'homeVisitCompleted':
      return fold([
        DRAFT_CREATED,
        { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 },
        {
          type: 'reviewStarted',
          applicationId: 'app-1',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
        {
          type: 'homeVisitScheduled',
          applicationId: 'app-1',
          scheduledAt: '2026-06-10T10:00:00Z',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
        {
          type: 'homeVisitCompleted',
          applicationId: 'app-1',
          outcome: 'passed',
          actorUserId: 'usr-staff',
          notes: null,
          at: AT_T1,
        },
      ]);
    case 'approved':
      return fold([
        DRAFT_CREATED,
        { type: 'draftSubmitted', applicationId: 'app-1', at: AT_T1 },
        {
          type: 'reviewStarted',
          applicationId: 'app-1',
          actorUserId: 'usr-staff',
          note: null,
          at: AT_T1,
        },
        {
          type: 'approved',
          applicationId: 'app-1',
          actorUserId: 'usr-staff',
          notes: null,
          at: AT_T1,
        },
      ]);
    default:
      throw new Error(`unhandled fixture status: ${status}`);
  }
}

// --- startDraft ------------------------------------------------------

describe('handle — startDraft', () => {
  it('produces a draftCreated event from a fresh aggregate', () => {
    const events = handle(INITIAL_STATE, {
      type: 'startDraft',
      adopterId: 'usr-1',
      petId: 'pet-1',
      rescueId: 'rsc-1',
      at: AT_T0,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('draftCreated');
  });

  it('rejects when an aggregate already exists (ILLEGAL_TRANSITION)', () => {
    expect(() =>
      handle(stateInStatus('draftCreated'), {
        type: 'startDraft',
        adopterId: 'usr-1',
        petId: 'pet-1',
        rescueId: 'rsc-1',
        at: AT_T0,
      })
    ).toThrowError(/aggregate/);
  });

  it('rejects empty IDs (INVALID_INPUT)', () => {
    expect(() =>
      handle(INITIAL_STATE, {
        type: 'startDraft',
        adopterId: '',
        petId: 'pet-1',
        rescueId: 'rsc-1',
        at: AT_T0,
      })
    ).toThrowError(/adopterId/);
  });
});

// --- saveDraftAnswers -----------------------------------------------

describe('handle — saveDraftAnswers', () => {
  it('emits the patch event from draft status', () => {
    const state = stateInStatus('draftCreated');
    const events = handle(state, {
      type: 'saveDraftAnswers',
      expectedVersion: state.version,
      answersPatch: { age: 30 },
      references: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('draftAnswersSaved');
  });

  it('allows the under_review self-loop', () => {
    const state = stateInStatus('reviewStarted');
    const events = handle(state, {
      type: 'saveDraftAnswers',
      expectedVersion: state.version,
      answersPatch: { followUp: 'a' },
      references: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });

  it('rejects from submitted (ILLEGAL_TRANSITION)', () => {
    const state = stateInStatus('draftSubmitted');
    expect(() =>
      handle(state, {
        type: 'saveDraftAnswers',
        expectedVersion: state.version,
        answersPatch: {},
        references: null,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });

  it('rejects on optimistic-concurrency conflict (CONCURRENCY)', () => {
    const state = stateInStatus('draftCreated');
    expect(() =>
      handle(state, {
        type: 'saveDraftAnswers',
        expectedVersion: state.version + 1,
        answersPatch: {},
        references: null,
        at: AT_T1,
      })
    ).toThrowError(/version/);
  });
});

// --- submitDraft -----------------------------------------------------

describe('handle — submitDraft', () => {
  it('transitions draft → submitted', () => {
    const state = stateInStatus('draftCreated');
    const events = handle(state, {
      type: 'submitDraft',
      expectedVersion: state.version,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('draftSubmitted');
  });

  it('rejects from submitted (ILLEGAL_TRANSITION)', () => {
    const state = stateInStatus('draftSubmitted');
    expect(() =>
      handle(state, {
        type: 'submitDraft',
        expectedVersion: state.version,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });
});

// --- startReview -----------------------------------------------------

describe('handle — startReview', () => {
  it('transitions submitted → under_review', () => {
    const state = stateInStatus('draftSubmitted');
    const events = handle(state, {
      type: 'startReview',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });

  it('idempotent — under_review → under_review emits no events', () => {
    const state = stateInStatus('reviewStarted');
    const events = handle(state, {
      type: 'startReview',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(0);
  });

  it('rejects from draft (ILLEGAL_TRANSITION)', () => {
    const state = stateInStatus('draftCreated');
    expect(() =>
      handle(state, {
        type: 'startReview',
        actorUserId: 'usr-staff',
        note: null,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });
});

// --- scheduleHomeVisit ----------------------------------------------

describe('handle — scheduleHomeVisit', () => {
  it('emits from under_review', () => {
    const state = stateInStatus('reviewStarted');
    const events = handle(state, {
      type: 'scheduleHomeVisit',
      scheduledAt: '2026-06-10T10:00:00Z',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });

  it('allows reschedule from home_visit_scheduled', () => {
    const state = stateInStatus('homeVisitScheduled');
    const events = handle(state, {
      type: 'scheduleHomeVisit',
      scheduledAt: '2026-06-12T10:00:00Z',
      actorUserId: 'usr-staff',
      note: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });

  it('rejects empty scheduledAt (INVALID_INPUT)', () => {
    const state = stateInStatus('reviewStarted');
    expect(() =>
      handle(state, {
        type: 'scheduleHomeVisit',
        scheduledAt: '',
        actorUserId: 'usr-staff',
        note: null,
        at: AT_T1,
      })
    ).toThrowError(/scheduledAt/);
  });
});

// --- completeHomeVisit ----------------------------------------------

describe('handle — completeHomeVisit', () => {
  it('transitions home_visit_scheduled → home_visit_completed', () => {
    const state = stateInStatus('homeVisitScheduled');
    const events = handle(state, {
      type: 'completeHomeVisit',
      outcome: 'passed',
      actorUserId: 'usr-staff',
      notes: 'all good',
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
    const next = apply(state, events[0]);
    expect(next.status).toBe('home_visit_completed');
    expect(next.homeVisitOutcome).toBe('passed');
  });

  it('rejects from under_review', () => {
    const state = stateInStatus('reviewStarted');
    expect(() =>
      handle(state, {
        type: 'completeHomeVisit',
        outcome: 'passed',
        actorUserId: 'usr-staff',
        notes: null,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });
});

// --- approve / reject / withdraw / markAdopted ----------------------

describe('handle — approve', () => {
  it('allows under_review → approved (no home visit required)', () => {
    const state = stateInStatus('reviewStarted');
    const events = handle(state, {
      type: 'approve',
      actorUserId: 'usr-staff',
      notes: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('approved');
  });

  it('allows home_visit_completed → approved', () => {
    const state = stateInStatus('homeVisitCompleted');
    const events = handle(state, {
      type: 'approve',
      actorUserId: 'usr-staff',
      notes: null,
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });

  it('rejects from home_visit_scheduled (must complete the visit first)', () => {
    const state = stateInStatus('homeVisitScheduled');
    expect(() =>
      handle(state, {
        type: 'approve',
        actorUserId: 'usr-staff',
        notes: null,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });
});

describe('handle — reject', () => {
  it('requires a reason', () => {
    const state = stateInStatus('reviewStarted');
    expect(() =>
      handle(state, {
        type: 'reject',
        actorUserId: 'usr-staff',
        reason: '',
        at: AT_T1,
      })
    ).toThrowError(/reason/);
  });

  it('emits from under_review', () => {
    const state = stateInStatus('reviewStarted');
    const events = handle(state, {
      type: 'reject',
      actorUserId: 'usr-staff',
      reason: 'not a fit',
      at: AT_T1,
    });
    expect(events).toHaveLength(1);
  });
});

describe('handle — withdraw', () => {
  it('allowed from any pre-decision status (draft / submitted / under_review)', () => {
    for (const s of ['draftCreated', 'draftSubmitted', 'reviewStarted'] as const) {
      const state = stateInStatus(s);
      const events = handle(state, {
        type: 'withdraw',
        actorUserId: 'usr-adopter',
        reason: null,
        at: AT_T1,
      });
      expect(events).toHaveLength(1);
    }
  });

  it('rejected from approved (already decided)', () => {
    const state = stateInStatus('approved');
    expect(() =>
      handle(state, {
        type: 'withdraw',
        actorUserId: 'usr-adopter',
        reason: null,
        at: AT_T1,
      })
    ).toThrowError(DomainError);
  });
});

describe('handle — markAdopted', () => {
  it('transitions approved → adopted', () => {
    const state = stateInStatus('approved');
    const events = handle(state, { type: 'markAdopted', at: AT_T1 });
    expect(events).toHaveLength(1);
    const next = apply(state, events[0]);
    expect(next.status).toBe('adopted');
    expect(next.adoptedAt).toBe(AT_T1);
  });

  it('rejects from any non-approved status', () => {
    for (const s of [
      'draftCreated',
      'draftSubmitted',
      'reviewStarted',
      'homeVisitScheduled',
    ] as const) {
      expect(() => handle(stateInStatus(s), { type: 'markAdopted', at: AT_T1 })).toThrowError(
        DomainError
      );
    }
  });
});

// --- MISSING_AGGREGATE guard ----------------------------------------

describe('handle — MISSING_AGGREGATE', () => {
  it('every command except startDraft rejects INITIAL_STATE', () => {
    expect(() =>
      handle(INITIAL_STATE, {
        type: 'submitDraft',
        expectedVersion: 0,
        at: AT_T1,
      })
    ).toThrowError(/aggregate/);
  });
});
