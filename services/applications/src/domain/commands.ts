// Pure command handlers — `handle(state, command)` → events.
//
// Each command validates invariants against the current state and
// emits the events that command produces. NO I/O — Phase 5.3b's gRPC
// handler is the only thing that wraps this with DB writes + NATS
// publishes.
//
// State machine (matches Phase 5.3a's ApplicationStatus proto):
//
//   draft → submitted → under_review → home_visit_scheduled →
//   home_visit_completed → approved | rejected | withdrawn → adopted
//
// Plus:
//   - `under_review` can self-loop via SaveDraftAnswers (additional
//     answers / references after the rescue asks follow-ups)
//   - `withdrawn` is a terminal exit from any pre-decision state
//   - `adopted` only follows `approved` and is the final-terminal
//
// All commands except StartDraft require an existing aggregate
// (applicationId set). Calling them against INITIAL_STATE throws
// MISSING_AGGREGATE — Phase 5.3b's handler interprets this as
// "caller passed an applicationId that has no events", a 400.

import { randomUUID } from 'node:crypto';

import {
  DomainError,
  type ApplicationCommand,
  type ApplicationEvent,
  type ApplicationState,
} from './types.js';

const PRE_DECISION_STATUSES = new Set(['draft', 'submitted', 'under_review']);

export function handle(
  state: ApplicationState,
  command: ApplicationCommand
): ReadonlyArray<ApplicationEvent> {
  switch (command.type) {
    case 'startDraft':
      // The only command that operates on a fresh aggregate. Reject if
      // the state already has an applicationId — the caller must mint
      // a new id for each draft.
      if (state.applicationId !== '') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          'startDraft requires a fresh aggregate (no prior events)'
        );
      }
      if (!command.adopterId || !command.petId || !command.rescueId) {
        throw new DomainError(
          'INVALID_INPUT',
          'startDraft requires adopterId, petId, and rescueId'
        );
      }
      return [
        {
          type: 'draftCreated',
          applicationId: randomUUID(),
          adopterId: command.adopterId,
          petId: command.petId,
          rescueId: command.rescueId,
          at: command.at,
        },
      ];

    case 'saveDraftAnswers':
      requireAggregate(state);
      checkVersion(state, command.expectedVersion);
      // Allowed from draft AND under_review (so rescue staff can ask
      // follow-up questions after starting review). Rejected from
      // submitted / decided / withdrawn.
      if (state.status !== 'draft' && state.status !== 'under_review') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `saveDraftAnswers not allowed in status '${state.status}'`
        );
      }
      return [
        {
          type: 'draftAnswersSaved',
          applicationId: state.applicationId,
          answersPatch: command.answersPatch,
          references: command.references,
          at: command.at,
        },
      ];

    case 'submitDraft':
      requireAggregate(state);
      checkVersion(state, command.expectedVersion);
      if (state.status !== 'draft') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `submitDraft only allowed from 'draft' (was '${state.status}')`
        );
      }
      return [
        {
          type: 'draftSubmitted',
          applicationId: state.applicationId,
          at: command.at,
        },
      ];

    case 'startReview':
      requireAggregate(state);
      // Idempotent — under_review → under_review is a clean no-op
      // (apply preserves the first reviewStartedAt). Reject from
      // statuses that don't lead to under_review.
      if (state.status === 'under_review') {
        return [];
      }
      if (state.status !== 'submitted') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `startReview only allowed from 'submitted' or 'under_review' (was '${state.status}')`
        );
      }
      return [
        {
          type: 'reviewStarted',
          applicationId: state.applicationId,
          actorUserId: command.actorUserId,
          note: command.note,
          at: command.at,
        },
      ];

    case 'scheduleHomeVisit':
      requireAggregate(state);
      if (state.status !== 'under_review' && state.status !== 'home_visit_scheduled') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `scheduleHomeVisit only allowed from 'under_review' or 'home_visit_scheduled' (was '${state.status}')`
        );
      }
      if (!command.scheduledAt) {
        throw new DomainError('INVALID_INPUT', 'scheduleHomeVisit requires scheduledAt');
      }
      return [
        {
          type: 'homeVisitScheduled',
          applicationId: state.applicationId,
          scheduledAt: command.scheduledAt,
          actorUserId: command.actorUserId,
          note: command.note,
          at: command.at,
        },
      ];

    case 'completeHomeVisit':
      requireAggregate(state);
      if (state.status !== 'home_visit_scheduled') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `completeHomeVisit only allowed from 'home_visit_scheduled' (was '${state.status}')`
        );
      }
      return [
        {
          type: 'homeVisitCompleted',
          applicationId: state.applicationId,
          outcome: command.outcome,
          actorUserId: command.actorUserId,
          notes: command.notes,
          at: command.at,
        },
      ];

    case 'approve':
      requireAggregate(state);
      // Approval can come straight from under_review (no home visit
      // required for some rescues' workflows) OR from a passed home
      // visit. Failed/reschedule home visits MUST be reviewed again
      // before approval; the rescue staff would call StartReview to
      // open a new review cycle.
      if (state.status !== 'under_review' && state.status !== 'home_visit_completed') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `approve only allowed from 'under_review' or 'home_visit_completed' (was '${state.status}')`
        );
      }
      return [
        {
          type: 'approved',
          applicationId: state.applicationId,
          actorUserId: command.actorUserId,
          notes: command.notes,
          at: command.at,
        },
      ];

    case 'reject':
      requireAggregate(state);
      if (!PRE_DECISION_STATUSES.has(state.status) && state.status !== 'home_visit_completed') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `reject not allowed in status '${state.status}'`
        );
      }
      if (!command.reason) {
        throw new DomainError('INVALID_INPUT', 'reject requires a reason');
      }
      return [
        {
          type: 'rejected',
          applicationId: state.applicationId,
          actorUserId: command.actorUserId,
          reason: command.reason,
          at: command.at,
        },
      ];

    case 'withdraw':
      requireAggregate(state);
      // Adopter-initiated terminal exit from any pre-decision state.
      // Once decided (approved/rejected/withdrawn/adopted) the
      // aggregate is closed.
      if (
        !PRE_DECISION_STATUSES.has(state.status) &&
        state.status !== 'home_visit_scheduled' &&
        state.status !== 'home_visit_completed'
      ) {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `withdraw not allowed in status '${state.status}'`
        );
      }
      return [
        {
          type: 'withdrawn',
          applicationId: state.applicationId,
          actorUserId: command.actorUserId,
          reason: command.reason,
          at: command.at,
        },
      ];

    case 'markAdopted':
      requireAggregate(state);
      if (state.status !== 'approved') {
        throw new DomainError(
          'ILLEGAL_TRANSITION',
          `markAdopted only allowed from 'approved' (was '${state.status}')`
        );
      }
      return [
        {
          type: 'adopted',
          applicationId: state.applicationId,
          at: command.at,
        },
      ];
  }
}

function requireAggregate(state: ApplicationState): void {
  if (state.applicationId === '') {
    throw new DomainError(
      'MISSING_AGGREGATE',
      'command requires an existing aggregate (no events replayed)'
    );
  }
}

function checkVersion(state: ApplicationState, expected: number): void {
  if (state.version !== expected) {
    throw new DomainError(
      'CONCURRENCY',
      `expected version ${expected}, current is ${state.version}`
    );
  }
}
