// Pure mapping: a monolith application row → the minimal valid event
// sequence that folds (via the domain `apply`) to the equivalent
// current status in the new event-sourced model.
//
// This is the heart of ADR Stage D.0 (0002-applications-strangler-
// cutover.md). The monolith's `applications` table carries a COLLAPSED
// 4-state status (submitted | approved | rejected | withdrawn) — it
// never modelled the intermediate review / home-visit states. The new
// domain has 9. We synthesize the *minimal* event chain that lands on
// the right terminal status; the richer intermediate states
// (under_review, home_visit_*) are simply absent for backfilled
// aggregates because the monolith never recorded them.
//
// Mapping (monolith status → events):
//   submitted → draftCreated [, draftAnswersSaved] , draftSubmitted
//   approved  → draftCreated [, draftAnswersSaved] , draftSubmitted,
//               reviewStarted, approved
//   rejected  → draftCreated [, draftAnswersSaved] , draftSubmitted,
//               reviewStarted, rejected
//   withdrawn → draftCreated [, draftAnswersSaved] , draftSubmitted,
//               withdrawn
//
// `reviewStarted` is interposed before approved/rejected because the
// domain's read model derives `reviewStartedAt` from it and the
// monolith's `reviewed_at` / `actioned_by` carry that information — we
// would otherwise drop it. Withdrawn skips review: a monolith
// withdrawal could happen straight from submitted.
//
// IMPORTANT: this function bypasses the domain's command handlers
// (`handle`) on purpose — handlers enforce live-write invariants
// (version checks, actor requirements) that don't apply to a faithful
// historical replay. It emits events directly and relies on `apply` /
// `fold` to reconstruct state, exactly as event-store hydration does.

import type { ApplicationEvent, ApplicationStatus, Reference } from '../domain/index.js';

// The monolith's collapsed status set. Source of truth:
// service.backend/src/models/Application.ts ApplicationStatus enum.
export type MonolithApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'withdrawn';

// The fields of a monolith application row this backfill needs. A
// faithful subset of service.backend/src/models/Application.ts +
// the extracted application_answers / application_references tables
// (plan 2.1). Timestamps are ISO-8601 strings (the script stringifies
// the pg Date before calling this pure function).
export type MonolithApplicationInput = {
  applicationId: string;
  userId: string;
  petId: string;
  rescueId: string;
  status: MonolithApplicationStatus;
  // Merged answers map, rebuilt from application_answers rows
  // (question_key → answer_value). Empty object when the application
  // has no recorded answers.
  answers: Record<string, unknown>;
  // References rebuilt from application_references rows. Empty array
  // when none.
  references: ReadonlyArray<Reference>;
  // ISO-8601. Monolith `created_at` — when the draft first existed.
  createdAt: string;
  // ISO-8601. Monolith `submitted_at`. Falls back to createdAt when
  // null (older rows predate the column) — see resolveSubmittedAt.
  submittedAt: string | null;
  // ISO-8601. Monolith `reviewed_at`. Used for the synthesized
  // reviewStarted timestamp on approved/rejected. Falls back to the
  // decision time when null.
  reviewedAt: string | null;
  // ISO-8601. Monolith `decision_at` / `actioned_at` — when the
  // terminal decision landed.
  decidedAt: string | null;
  // Monolith `actioned_by` — the staff user who approved/rejected.
  // Null for system / legacy decisions.
  actionedBy: string | null;
  // Monolith `rejection_reason`. The domain's `rejected` event
  // REQUIRES a non-empty reason; we substitute a sentinel when the
  // monolith row left it null (legacy rows predate the NOT NULL
  // expectation). See REJECTION_REASON_FALLBACK.
  rejectionReason: string | null;
  // Monolith `withdrawal_reason`. Optional on the domain's withdrawn
  // event (null allowed).
  withdrawalReason: string | null;
};

// The domain's `rejected` event requires a non-empty reason (see
// commands.ts reject handler). Monolith rows with a null
// rejection_reason get this sentinel so the read model is still
// populated and folds cleanly. Flagged as an OPEN QUESTION in the PR.
export const REJECTION_REASON_FALLBACK = 'Rejected (reason not recorded in legacy data)';

// `at` for the terminal decision event. Prefer the explicit decision
// timestamp; fall back to submittedAt, then createdAt, so `at` is
// never null (events carry non-null ISO strings).
const resolveDecisionAt = (input: MonolithApplicationInput): string =>
  input.decidedAt ?? resolveSubmittedAt(input);

// `at` for draftSubmitted. Older monolith rows may have a null
// submitted_at; fall back to createdAt so the timeline stays ordered.
const resolveSubmittedAt = (input: MonolithApplicationInput): string =>
  input.submittedAt ?? input.createdAt;

// `at` for the synthesized reviewStarted. Prefer reviewed_at; fall back
// to the decision time so review is never stamped after the decision.
const resolveReviewStartedAt = (input: MonolithApplicationInput): string =>
  input.reviewedAt ?? resolveDecisionAt(input);

const draftCreated = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'draftCreated',
  applicationId: input.applicationId,
  adopterId: input.userId,
  petId: input.petId,
  rescueId: input.rescueId,
  at: input.createdAt,
});

// Only emitted when there's something to carry — an empty answers map
// AND no references means no draftAnswersSaved event (keeps the chain
// minimal and the read model's documents blob is `{}` either way).
const draftAnswersSaved = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'draftAnswersSaved',
  applicationId: input.applicationId,
  answersPatch: input.answers,
  references: input.references.length > 0 ? input.references : null,
  at: input.createdAt,
});

const draftSubmitted = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'draftSubmitted',
  applicationId: input.applicationId,
  at: resolveSubmittedAt(input),
});

const reviewStarted = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'reviewStarted',
  applicationId: input.applicationId,
  actorUserId: input.actionedBy ?? '',
  note: null,
  at: resolveReviewStartedAt(input),
});

const approved = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'approved',
  applicationId: input.applicationId,
  actorUserId: input.actionedBy ?? '',
  notes: null,
  at: resolveDecisionAt(input),
});

const rejected = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'rejected',
  applicationId: input.applicationId,
  actorUserId: input.actionedBy ?? '',
  reason: input.rejectionReason ?? REJECTION_REASON_FALLBACK,
  at: resolveDecisionAt(input),
});

const withdrawn = (input: MonolithApplicationInput): ApplicationEvent => ({
  type: 'withdrawn',
  applicationId: input.applicationId,
  actorUserId: input.actionedBy ?? '',
  reason: input.withdrawalReason,
  at: resolveDecisionAt(input),
});

const hasAnswerData = (input: MonolithApplicationInput): boolean =>
  Object.keys(input.answers).length > 0 || input.references.length > 0;

// The shared prefix every backfilled aggregate gets: it existed as a
// draft, optionally captured answers, and was submitted.
const submittedChain = (input: MonolithApplicationInput): ReadonlyArray<ApplicationEvent> => {
  const created = draftCreated(input);
  const submitted = draftSubmitted(input);
  return hasAnswerData(input)
    ? [created, draftAnswersSaved(input), submitted]
    : [created, submitted];
};

// Map one monolith row to its synthesized event sequence. Pure — no
// I/O, deterministic, immutable. The caller appends these with
// sequential versions (1..n) and projects the folded read model.
export function mapMonolithApplication(
  input: MonolithApplicationInput
): ReadonlyArray<ApplicationEvent> {
  const base = submittedChain(input);

  switch (input.status) {
    case 'submitted':
      return base;
    case 'approved':
      return [...base, reviewStarted(input), approved(input)];
    case 'rejected':
      return [...base, reviewStarted(input), rejected(input)];
    case 'withdrawn':
      return [...base, withdrawn(input)];
  }
}

// Convenience for callers/tests: the terminal status the synthesized
// chain folds to. Mirrors the mapping table above. (The script asserts
// fold(events).status === expectedStatus(input.status) as a safety net.)
export function expectedStatus(status: MonolithApplicationStatus): ApplicationStatus {
  return status;
}
