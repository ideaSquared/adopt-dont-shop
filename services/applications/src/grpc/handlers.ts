// gRPC handler implementations for ApplicationService — batch 1.
//
// Phase 5.3b — ships SaveDraftAnswers + SubmitDraft (the
// existing-aggregate draft operations). StartDraft is DEFERRED: the
// pure domain requires a non-empty rescueId at draft creation (a
// cross-schema pets-vertical lookup), and the proto StartDraftRequest
// doesn't carry rescue_id — so StartDraft needs the service.pets gRPC
// client to resolve pet → rescue first. The review/visit/decision
// RPCs (StartReview, ScheduleHomeVisit, CompleteHomeVisit, Approve,
// Reject, Withdraw, MarkAdopted) and the read RPCs (GetApplication,
// ListApplications) follow in focused batches.
//
// This is the EVENT-SOURCED vertical. Each write handler:
//   1. loadAggregate — fold the event stream into current state
//   2. domain.handle(state, command) — pure, produces new events
//   3. appendEvents — INSERT with optimistic-concurrency versions
//   4. projectReadModel — UPSERT the read-model row
//   5. publish after commit
// All inside one withTransaction so the event append + projection
// commit atomically.
//
// Optimistic concurrency: SaveDraftAnswers + SubmitDraft carry an
// expected_version; a mismatch (or a concurrent writer racing the
// INSERT) surfaces as a CONCURRENCY HandlerError the gateway maps to
// a 409.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import { APPLICATIONS_UPDATE } from '@adopt-dont-shop/lib.types';
import type {
  SaveDraftAnswersRequest,
  SaveDraftAnswersResponse,
  SubmitDraftRequest,
  SubmitDraftResponse,
} from '@adopt-dont-shop/proto';

import {
  apply as applyEvent,
  DomainError,
  handle,
  type ApplicationCommand,
  type ApplicationState,
  type Reference,
} from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { appendEvents, ConcurrencyError, loadAggregate, projectReadModel } from './event-store.js';
import { stateToProto } from './state-mapper.js';

// Translate the pure domain's DomainError codes into HandlerError
// codes. ILLEGAL_TRANSITION / INVALID_INPUT → INVALID_ARGUMENT;
// CONCURRENCY → INTERNAL with a message (the gateway maps the
// CONCURRENCY message to 409 in Phase 5.3d); MISSING_AGGREGATE →
// NOT_FOUND.
function domainErrorToHandler(err: DomainError): HandlerError {
  switch (err.code) {
    case 'ILLEGAL_TRANSITION':
    case 'INVALID_INPUT':
      return new HandlerError('INVALID_ARGUMENT', err.message);
    case 'MISSING_AGGREGATE':
      return new HandlerError('NOT_FOUND', err.message);
    case 'CONCURRENCY':
      return new HandlerError('INTERNAL', `CONCURRENCY: ${err.message}`);
    default:
      return new HandlerError('INTERNAL', err.message);
  }
}

// Runs the command against the loaded aggregate and persists the
// resulting events. Shared by every write handler. Returns the new
// folded state (caller maps to proto).
async function runCommand(
  deps: HandlerDeps,
  aggregateId: string,
  command: ApplicationCommand,
  actorUserId: string,
  publishFor: (state: ApplicationState) => { type: string; id: string; payload: unknown } | null
): Promise<ApplicationState> {
  return withTransaction(deps, async ({ client, publish }) => {
    const state = await loadAggregate(client, aggregateId);

    let events;
    try {
      events = handle(state, command);
    } catch (err) {
      if (err instanceof DomainError) {
        throw domainErrorToHandler(err);
      }
      throw err;
    }

    try {
      await appendEvents(client, aggregateId, state.version, events, actorUserId);
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        throw new HandlerError('INTERNAL', `CONCURRENCY: ${err.message}`);
      }
      throw err;
    }

    // Fold the new events onto the loaded state to get the post-command
    // state, then project + publish.
    const nextState = events.reduce<ApplicationState>((s, e) => applyEvent(s, e), state);

    await projectReadModel(client, nextState);

    const evt = publishFor(nextState);
    if (evt !== null) {
      publish(evt);
    }

    return nextState;
  });
}

// --- SaveDraftAnswers ------------------------------------------------

export async function saveDraftAnswers(
  deps: HandlerDeps,
  principal: Principal,
  req: SaveDraftAnswersRequest
): Promise<SaveDraftAnswersResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  const answersPatch = parseJsonObject(req.answersPatchJson, 'answers_patch_json');
  // references_json absent/empty = leave unchanged (null tells the
  // domain not to replace the references list).
  const references = parseReferences(req.referencesJson);

  // Pre-check expected_version against the loaded aggregate so a stale
  // client gets a clean CONCURRENCY without even running the command.
  const command: ApplicationCommand = {
    type: 'saveDraftAnswers',
    expectedVersion: req.expectedVersion,
    answersPatch,
    references,
    at: new Date().toISOString(),
  };

  const state = await runCommand(deps, req.applicationId, command, principal.userId, () => ({
    type: 'applications.draftUpdated',
    id: req.applicationId,
    payload: { applicationId: req.applicationId },
  }));

  return { application: stateToProto(state) };
}

// --- SubmitDraft -----------------------------------------------------

export async function submitDraft(
  deps: HandlerDeps,
  principal: Principal,
  req: SubmitDraftRequest
): Promise<SubmitDraftResponse> {
  if (!requirePermission(principal, APPLICATIONS_UPDATE)) {
    throw new HandlerError('PERMISSION_DENIED', `'${APPLICATIONS_UPDATE}' required`);
  }
  if (req.applicationId === undefined || req.applicationId === '') {
    throw new HandlerError('INVALID_ARGUMENT', 'application_id is required');
  }

  const command: ApplicationCommand = {
    type: 'submitDraft',
    expectedVersion: req.expectedVersion,
    at: new Date().toISOString(),
  };

  const state = await runCommand(deps, req.applicationId, command, principal.userId, s => ({
    type: 'applications.submitted',
    id: req.applicationId,
    payload: {
      applicationId: req.applicationId,
      adopterId: s.adopterId,
      petId: s.petId,
      rescueId: s.rescueId,
      submittedAt: s.submittedAt,
    },
  }));

  return { application: stateToProto(state) };
}

// --- Helpers ---------------------------------------------------------

function parseJsonObject(raw: string | undefined, field: string): Record<string, unknown> {
  if (raw === undefined || raw === '') {
    return {};
  }
  try {
    const obj = JSON.parse(raw) as unknown;
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      throw new Error(`${field} must encode a JSON object`);
    }
    return obj as Record<string, unknown>;
  } catch (err) {
    throw new HandlerError('INVALID_ARGUMENT', `${field} invalid: ${(err as Error).message}`);
  }
}

// references_json is an optional wholesale replacement. Empty / absent
// = null (the domain leaves references unchanged). A present value must
// be a JSON array of {name, email, relationship}.
function parseReferences(raw: string | undefined): ReadonlyArray<Reference> | null {
  if (raw === undefined || raw === '') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new HandlerError(
      'INVALID_ARGUMENT',
      `references_json invalid: ${(err as Error).message}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new HandlerError('INVALID_ARGUMENT', 'references_json must encode a JSON array');
  }
  return parsed.map((r, i) => {
    const ref = r as Record<string, unknown>;
    if (
      typeof ref.name !== 'string' ||
      typeof ref.email !== 'string' ||
      typeof ref.relationship !== 'string'
    ) {
      throw new HandlerError(
        'INVALID_ARGUMENT',
        `references_json[${i}] must have name, email, relationship strings`
      );
    }
    return { name: ref.name, email: ref.email, relationship: ref.relationship };
  });
}
