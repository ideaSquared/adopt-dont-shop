// Pure event-sourced application domain — public surface.
//
// Phase 5.3b's gRPC handlers import from here. Everything else
// (proto adapter, persistence, NATS publisher) wraps these pure
// functions but never touches the internals.

export { apply, fold, INITIAL_STATE } from './apply.js';
export { handle } from './commands.js';
export {
  DomainError,
  type Adopted,
  type ApplicationCommand,
  type ApplicationEvent,
  type ApplicationState,
  type ApplicationStatus,
  type ApproveCommand,
  type Approved,
  type CompleteHomeVisitCommand,
  type DomainErrorCode,
  type DraftAnswersSaved,
  type DraftCreated,
  type DraftSubmitted,
  type HomeVisitCompleted,
  type HomeVisitOutcome,
  type HomeVisitScheduled,
  type MarkAdoptedCommand,
  type Reference,
  type RejectCommand,
  type Rejected,
  type ReviewStarted,
  type SaveDraftAnswersCommand,
  type ScheduleHomeVisitCommand,
  type StartDraftCommand,
  type StartReviewCommand,
  type SubmitDraftCommand,
  type WithdrawCommand,
  type Withdrawn,
} from './types.js';
