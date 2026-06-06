// Pure event reducer — `apply(state, event)` → next state.
//
// Every state transition is a pure fold. Replay = live write — the
// same `apply` runs at command time (after handle() emits an event)
// and at hydration time (when Phase 5.3b reads the event store and
// rebuilds the projection). Identical outputs guaranteed by the
// purity discipline.
//
// `fold(events)` is the convenience that drains the whole stream
// onto the Initial sentinel; use it to rebuild a single aggregate's
// state at read time.

import type { ApplicationEvent, ApplicationState } from './types.js';

// The Initial state sentinel — the projection BEFORE any events
// arrive. Useful for fold() callers; never persisted itself.
//
// `applicationId` / `adopterId` / `petId` / `rescueId` are populated
// from the first event (DraftCreated). Anywhere else they're empty
// strings because `fold([])` returning empty IDs is a structural
// signal that no DraftCreated has been replayed yet (Phase 5.3b
// rejects commands against this state with MISSING_AGGREGATE).
export const INITIAL_STATE: ApplicationState = {
  applicationId: '',
  adopterId: '',
  petId: '',
  rescueId: '',
  status: 'draft',
  answers: {},
  references: [],
  version: 0,
  submittedAt: null,
  reviewStartedAt: null,
  homeVisitScheduledAt: null,
  homeVisitCompletedAt: null,
  homeVisitOutcome: null,
  homeVisitNotes: null,
  decidedAt: null,
  decidedBy: null,
  decisionNotes: null,
  rejectionReason: null,
  adoptedAt: null,
  createdAt: '',
  updatedAt: '',
};

export function apply(state: ApplicationState, event: ApplicationEvent): ApplicationState {
  // Always bump version + updatedAt. The per-event branches below
  // override the rest as needed; the spread copies the rest unchanged
  // (immutability discipline).
  const baseline = {
    ...state,
    version: state.version + 1,
    updatedAt: event.at,
  };

  switch (event.type) {
    case 'draftCreated':
      return {
        ...baseline,
        applicationId: event.applicationId,
        adopterId: event.adopterId,
        petId: event.petId,
        rescueId: event.rescueId,
        status: 'draft',
        answers: {},
        references: [],
        createdAt: event.at,
      };

    case 'draftAnswersSaved':
      return {
        ...baseline,
        answers: { ...state.answers, ...event.answersPatch },
        references: event.references ?? state.references,
      };

    case 'draftSubmitted':
      return { ...baseline, status: 'submitted', submittedAt: event.at };

    case 'reviewStarted':
      return {
        ...baseline,
        status: 'under_review',
        // Idempotent — first StartReview wins on the timestamp.
        reviewStartedAt: state.reviewStartedAt ?? event.at,
      };

    case 'homeVisitScheduled':
      return {
        ...baseline,
        status: 'home_visit_scheduled',
        homeVisitScheduledAt: event.scheduledAt,
      };

    case 'homeVisitCompleted':
      return {
        ...baseline,
        status: 'home_visit_completed',
        homeVisitCompletedAt: event.at,
        homeVisitOutcome: event.outcome,
        homeVisitNotes: event.notes,
      };

    case 'approved':
      return {
        ...baseline,
        status: 'approved',
        decidedAt: event.at,
        decidedBy: event.actorUserId,
        decisionNotes: event.notes,
      };

    case 'rejected':
      return {
        ...baseline,
        status: 'rejected',
        decidedAt: event.at,
        decidedBy: event.actorUserId,
        rejectionReason: event.reason,
      };

    case 'withdrawn':
      return {
        ...baseline,
        status: 'withdrawn',
        decidedAt: event.at,
        decidedBy: event.actorUserId,
        decisionNotes: event.reason,
      };

    case 'adopted':
      return { ...baseline, status: 'adopted', adoptedAt: event.at };
  }
}

// Replay-from-empty convenience. `fold([])` returns INITIAL_STATE.
export function fold(events: ReadonlyArray<ApplicationEvent>): ApplicationState {
  return events.reduce(apply, INITIAL_STATE);
}
