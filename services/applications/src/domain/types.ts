// Pure event-sourced application domain — type definitions.
//
// These shapes are I/O-free + proto-free + DB-free by design:
// the domain compiles and tests without depending on
// @adopt-dont-shop/proto, pg, or NATS. Phase 5.3b adapts the proto
// requests into commands and persists the resulting events; Phase 5.2
// (this commit) is just the pure layer.
//
// Same CAD apply/fold discipline ported across:
//
//   apply(state, event)  → next state    (pure reducer)
//   fold(events)         → state         (apply over Initial)
//   handle(state, cmd)   → events        (command handler — validates +
//                                         emits the events the command
//                                         produces; throws DomainError
//                                         on invariant violation)
//
// Replay = live write — the same `apply` runs at command time and at
// event-store hydration time, so a row reconstructed from the event
// store is byte-for-byte identical to the row the command produced
// (modulo timestamps).

// --- Statuses --------------------------------------------------------

// The canonical lifecycle (matches Phase 5.3a's ApplicationStatus proto):
//
//   draft → submitted → under_review → home_visit_scheduled →
//   home_visit_completed → approved | rejected | withdrawn → adopted
//
// Plus `withdrawn` as a terminal exit from any pre-decision state.
// `adopted` only follows `approved`.
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'home_visit_scheduled'
  | 'home_visit_completed'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'adopted';

export type HomeVisitOutcome = 'passed' | 'failed' | 'reschedule';

// --- State -----------------------------------------------------------

// ApplicationState is the FOLDED view of all events for one
// aggregate. Phase 5.3b denormalises this into the read-model row;
// the apply function produces this same shape from the event stream
// at hydration time.
//
// The only fields not derived from events: `applicationId`,
// `adopterId`, `petId`, `rescueId` — set by DraftCreated and never
// changed.
export type ApplicationState = {
  applicationId: string;
  adopterId: string;
  petId: string;
  rescueId: string;
  status: ApplicationStatus;
  // The merged answers map. Each DraftAnswersSaved event patches
  // (NOT replaces) this map.
  answers: Record<string, unknown>;
  // Wholesale-replaced on each DraftAnswersSaved that carries a
  // references list.
  references: ReadonlyArray<Reference>;
  // Optimistic-concurrency cursor — increments by 1 on every event.
  // Phase 5.3b uses this for the (aggregate_id, version) primary key
  // on the event-store row.
  version: number;
  // Lifecycle timestamps, filled as the transitions fire.
  submittedAt: string | null;
  reviewStartedAt: string | null;
  homeVisitScheduledAt: string | null;
  homeVisitCompletedAt: string | null;
  homeVisitOutcome: HomeVisitOutcome | null;
  homeVisitNotes: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNotes: string | null;
  rejectionReason: string | null;
  adoptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Reference = {
  name: string;
  email: string;
  relationship: string;
};

// --- Events ----------------------------------------------------------

// The event log. Each event is the immutable record of what happened.
// The discriminated `type` field is the wire-level subject suffix —
// the publisher in Phase 5.3b uses it verbatim for the NATS subject
// (e.g. `applications.draftCreated`).
export type DraftCreated = {
  type: 'draftCreated';
  applicationId: string;
  adopterId: string;
  petId: string;
  rescueId: string;
  at: string;
};

export type DraftAnswersSaved = {
  type: 'draftAnswersSaved';
  applicationId: string;
  // Patch merged into the existing answers map.
  answersPatch: Record<string, unknown>;
  // When supplied, REPLACES the existing references list wholesale.
  // null = leave unchanged.
  references: ReadonlyArray<Reference> | null;
  at: string;
};

export type DraftSubmitted = {
  type: 'draftSubmitted';
  applicationId: string;
  at: string;
};

export type ReviewStarted = {
  type: 'reviewStarted';
  applicationId: string;
  actorUserId: string;
  note: string | null;
  at: string;
};

export type HomeVisitScheduled = {
  type: 'homeVisitScheduled';
  applicationId: string;
  scheduledAt: string;
  actorUserId: string;
  note: string | null;
  at: string;
};

export type HomeVisitCompleted = {
  type: 'homeVisitCompleted';
  applicationId: string;
  outcome: HomeVisitOutcome;
  actorUserId: string;
  notes: string | null;
  at: string;
};

export type Approved = {
  type: 'approved';
  applicationId: string;
  actorUserId: string;
  notes: string | null;
  at: string;
};

export type Rejected = {
  type: 'rejected';
  applicationId: string;
  actorUserId: string;
  reason: string;
  at: string;
};

export type Withdrawn = {
  type: 'withdrawn';
  applicationId: string;
  actorUserId: string;
  reason: string | null;
  at: string;
};

export type Adopted = {
  type: 'adopted';
  applicationId: string;
  at: string;
};

export type ApplicationEvent =
  | DraftCreated
  | DraftAnswersSaved
  | DraftSubmitted
  | ReviewStarted
  | HomeVisitScheduled
  | HomeVisitCompleted
  | Approved
  | Rejected
  | Withdrawn
  | Adopted;

// --- Commands --------------------------------------------------------

// Commands are inputs to the domain — Phase 5.3b's handlers translate
// proto requests into these. Each command carries the actor's user
// id (the principal that initiated the action) so the resulting
// event records who did what.
export type StartDraftCommand = {
  type: 'startDraft';
  adopterId: string;
  petId: string;
  // The rescue that owns the pet — looked up by the handler before
  // commanding the domain (cross-schema FK we can't enforce in DB).
  rescueId: string;
  at: string;
};

export type SaveDraftAnswersCommand = {
  type: 'saveDraftAnswers';
  expectedVersion: number;
  answersPatch: Record<string, unknown>;
  references: ReadonlyArray<Reference> | null;
  at: string;
};

export type SubmitDraftCommand = {
  type: 'submitDraft';
  expectedVersion: number;
  at: string;
};

export type StartReviewCommand = {
  type: 'startReview';
  actorUserId: string;
  note: string | null;
  at: string;
};

export type ScheduleHomeVisitCommand = {
  type: 'scheduleHomeVisit';
  scheduledAt: string;
  actorUserId: string;
  note: string | null;
  at: string;
};

export type CompleteHomeVisitCommand = {
  type: 'completeHomeVisit';
  outcome: HomeVisitOutcome;
  actorUserId: string;
  notes: string | null;
  at: string;
};

export type ApproveCommand = {
  type: 'approve';
  actorUserId: string;
  notes: string | null;
  at: string;
};

export type RejectCommand = {
  type: 'reject';
  actorUserId: string;
  reason: string;
  at: string;
};

export type WithdrawCommand = {
  type: 'withdraw';
  actorUserId: string;
  reason: string | null;
  at: string;
};

export type MarkAdoptedCommand = {
  type: 'markAdopted';
  at: string;
};

export type ApplicationCommand =
  | StartDraftCommand
  | SaveDraftAnswersCommand
  | SubmitDraftCommand
  | StartReviewCommand
  | ScheduleHomeVisitCommand
  | CompleteHomeVisitCommand
  | ApproveCommand
  | RejectCommand
  | WithdrawCommand
  | MarkAdoptedCommand;

// --- DomainError -----------------------------------------------------

// Domain-level invariant violations. Phase 5.3b's handler maps these
// codes onto gRPC status via the same HandlerError → grpc.status
// table the other services use:
//
//   ILLEGAL_TRANSITION → INVALID_ARGUMENT
//   CONCURRENCY        → INVALID_ARGUMENT (FAILED_PRECONDITION in gRPC)
//   INVALID_INPUT      → INVALID_ARGUMENT
//   MISSING_AGGREGATE  → INVALID_ARGUMENT (caller bug — StartDraft
//                                          is the only command that
//                                          works on a fresh aggregate)
export type DomainErrorCode =
  | 'ILLEGAL_TRANSITION'
  | 'CONCURRENCY'
  | 'INVALID_INPUT'
  | 'MISSING_AGGREGATE';

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
