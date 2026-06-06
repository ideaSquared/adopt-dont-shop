// ApplicationState → proto Application mapper.
//
// The event-sourced handlers fold the event stream into an
// ApplicationState, then return the proto built from that state —
// they don't re-read the read-model row (the fold IS the authoritative
// current state at command time). This is the state→proto counterpart
// to mapper.ts's row→proto (which the read-only Get/List handlers
// use).
//
// Pure function — no I/O. The optional timestamp / outcome fields are
// OMITTED from the proto when the state hasn't reached that stage yet
// (NULL in the state), same NULL-omitted-optional discipline as the
// row mappers.

import type { Application } from '@adopt-dont-shop/proto';

import { homeVisitOutcomeToProto, statusToProto } from './domain-enum-map.js';
import type { ApplicationState } from '../domain/index.js';

export function stateToProto(state: ApplicationState): Application {
  const app: Application = {
    applicationId: state.applicationId,
    adopterId: state.adopterId,
    petId: state.petId,
    rescueId: state.rescueId,
    status: statusToProto(state.status),
    answersJson: JSON.stringify(state.answers ?? {}),
    referencesJson: JSON.stringify(state.references ?? []),
    version: state.version,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  };

  if (state.submittedAt !== null) {
    app.submittedAt = state.submittedAt;
  }
  if (state.reviewStartedAt !== null) {
    app.reviewStartedAt = state.reviewStartedAt;
  }
  if (state.homeVisitScheduledAt !== null) {
    app.homeVisitScheduledAt = state.homeVisitScheduledAt;
  }
  if (state.homeVisitCompletedAt !== null) {
    app.homeVisitCompletedAt = state.homeVisitCompletedAt;
  }
  if (state.homeVisitOutcome !== null) {
    app.homeVisitOutcome = homeVisitOutcomeToProto(state.homeVisitOutcome);
  }
  if (state.homeVisitNotes !== null) {
    app.homeVisitNotes = state.homeVisitNotes;
  }
  if (state.decidedAt !== null) {
    app.decidedAt = state.decidedAt;
  }
  if (state.decidedBy !== null) {
    app.decidedBy = state.decidedBy;
  }
  if (state.decisionNotes !== null) {
    app.decisionNotes = state.decisionNotes;
  }
  if (state.rejectionReason !== null) {
    app.rejectionReason = state.rejectionReason;
  }
  if (state.adoptedAt !== null) {
    app.adoptedAt = state.adoptedAt;
  }

  return app;
}
