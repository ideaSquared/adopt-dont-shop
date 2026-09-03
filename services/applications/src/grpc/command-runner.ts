// Shared command-runner for the event-sourced ApplicationService
// handlers. Extracted from handlers.ts so every handler file (draft
// handlers, review/decision handlers) reuses the exact same
// load → handle → append → project → publish-after-commit flow.
//
// runCommand is the single join point: pass an aggregateId + command +
// a publishFor mapper, and it runs everything inside one
// withTransaction. DomainError + ConcurrencyError translate to
// HandlerError codes here so individual handlers stay declarative.

import { requirePermission, type Principal } from '@adopt-dont-shop/authz';
import { withTransaction } from '@adopt-dont-shop/events';
import type { Permission, RescueId, UserId } from '@adopt-dont-shop/lib.types';

import {
  apply as applyEvent,
  DomainError,
  handle,
  INITIAL_STATE,
  type ApplicationCommand,
  type ApplicationState,
} from '../domain/index.js';

import { HandlerError, type HandlerDeps } from './adapter.js';
import { appendEvents, ConcurrencyError, loadAggregate, projectReadModel } from './event-store.js';

export type PublishEnvelope = { type: string; id: string; payload: unknown };

// pg's 23505 (unique_violation) raised by the applications_user_pet_unique
// partial index (migration 002) — one open application per (user, pet).
const PG_UNIQUE_VIOLATION = '23505';
const OPEN_APPLICATION_CONSTRAINT = 'applications_user_pet_unique';

// True when a projectReadModel INSERT tripped the "one open application per
// (adopter, pet)" partial unique index — a duplicate, not a server error.
function isDuplicateOpenApplication(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string };
  return e.code === PG_UNIQUE_VIOLATION && e.constraint === OPEN_APPLICATION_CONSTRAINT;
}

// A command-authorization hook: runs against the loaded aggregate state
// (after the empty/NOT_FOUND check) so a write can be denied based on the
// target's owning rescue / adopter — not just the bare permission. Throws
// HandlerError('PERMISSION_DENIED') to reject.
export type Authorize = (state: ApplicationState) => void;

// Rescue-staff write: the principal must hold `permission` AND be scoped to
// the application's owning rescue. Mirrors the read side's rescue branch in
// read-handlers.ts. super_admin bypasses the scope inside requirePermission.
export function requireRescueScope(
  principal: Principal,
  permission: Permission,
  state: ApplicationState
): void {
  if (!requirePermission(principal, permission, { rescueId: state.rescueId as RescueId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

// Adopter-or-staff write: allowed when the principal is the owning adopter
// OR holds the permission scoped to the owning rescue. Same OR-scope the
// read side (getApplication / listDocuments) uses.
export function requireOwnerOrRescueScope(
  principal: Principal,
  permission: Permission,
  state: ApplicationState
): void {
  const ok =
    requirePermission(principal, permission, { userId: state.adopterId as UserId }) ||
    requirePermission(principal, permission, { rescueId: state.rescueId as RescueId });
  if (!ok) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

// Draft-lifecycle authorization (ADS-1007, extended by ADS-1225). While an
// application is still a `draft`, only the owning adopter (or super_admin,
// via requirePermission's own bypass) may act on it — the rescue-staff
// allowance exists ONLY once the application has left `draft`. So the scope
// is status-aware:
//
//   - draft         → owner only (the adopter's answers/decision are theirs
//                     alone until they submit; staff shouldn't even see them
//                     yet).
//   - under_review  → owner OR rescue scope (the intended follow-up path).
//
// Shared by saveDraftAnswers (legal from draft/under_review) and submitDraft
// (legal from draft only, so this always resolves to the owner-only branch
// there — rescue staff can no longer force-transition an adopter's draft).
// Any other status is unreachable for either command — but is treated as the
// stricter owner-only branch for safety.
export function requireDraftScope(
  principal: Principal,
  permission: Permission,
  state: ApplicationState
): void {
  if (state.status === 'under_review') {
    requireOwnerOrRescueScope(principal, permission, state);
    return;
  }
  if (!requirePermission(principal, permission, { userId: state.adopterId as UserId })) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

// Draft-privacy scope (ADS-1225), shared by the read and write helpers below.
// A draft application is private to the owning adopter (and super_admin, via
// requirePermission's own bypass) until it is submitted: while `status` is
// `draft`, only the owner may act; the rescue-staff branch applies once the
// application has left `draft`. Takes the owner fields as primitives so both
// the folded ApplicationState and the read-model owner row (user_id /
// rescue_id) can reuse it.
type DraftAwareScope = { status: string; adopterId: string; rescueId: string };

function assertDraftAwareScope(
  principal: Principal,
  permission: Permission,
  scope: DraftAwareScope
): void {
  const ownerOk = requirePermission(principal, permission, {
    userId: scope.adopterId as UserId,
  });
  if (scope.status === 'draft') {
    // Draft: owner (or super_admin) only — no rescue branch.
    if (!ownerOk) {
      throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
    }
    return;
  }
  // Non-draft: the usual owner-OR-rescue scope.
  const rescueOk = requirePermission(principal, permission, {
    rescueId: scope.rescueId as RescueId,
  });
  if (!ownerOk && !rescueOk) {
    throw new HandlerError('PERMISSION_DENIED', `'${permission}' required`);
  }
}

// Draft-privacy READ scope (ADS-1225 read-path half, tracked as ADS-1261).
// The read-side mirror of requireDraftScope, shared by getApplication and the
// document / timeline-note / home-visit list handlers.
export function requireDraftAwareReadScope(
  principal: Principal,
  permission: Permission,
  scope: DraftAwareScope
): void {
  assertDraftAwareScope(principal, permission, scope);
}

// Draft-privacy WRITE scope (ADS-1272 — the write-side mirror of the read
// scope, and the sibling of requireDraftScope for the auxiliary write paths).
// addDocument / removeDocument / addTimelineNote previously used a status-blind
// owner-OR-rescue check, which let rescue staff mutate an adopter's private
// draft; this narrows those writes to the owning adopter while `status` is
// `draft`, restoring the rescue branch once the application has left draft.
export function requireDraftAwareWriteScope(
  principal: Principal,
  permission: Permission,
  scope: DraftAwareScope
): void {
  assertDraftAwareScope(principal, permission, scope);
}

// Translate the pure domain's DomainError codes into HandlerError
// codes. ILLEGAL_TRANSITION / INVALID_INPUT → INVALID_ARGUMENT;
// CONCURRENCY → FAILED_PRECONDITION (a stale expected_version is an
// optimistic-concurrency conflict the gateway maps to HTTP 409, not a
// server error); MISSING_AGGREGATE → NOT_FOUND.
export function domainErrorToHandler(err: DomainError): HandlerError {
  switch (err.code) {
    case 'ILLEGAL_TRANSITION':
    case 'INVALID_INPUT':
      return new HandlerError('INVALID_ARGUMENT', err.message);
    case 'MISSING_AGGREGATE':
      return new HandlerError('NOT_FOUND', err.message);
    case 'CONCURRENCY':
      return new HandlerError('FAILED_PRECONDITION', err.message);
    default:
      return new HandlerError('INTERNAL', err.message);
  }
}

// Runs the command against the loaded aggregate and persists the
// resulting events. Returns the new folded state (caller maps to
// proto). publishFor returns the NATS envelope to fire after commit,
// or null to skip publishing.
export async function runCommand(
  deps: HandlerDeps,
  aggregateId: string,
  command: ApplicationCommand,
  actorUserId: string,
  publishFor: (state: ApplicationState) => PublishEnvelope | null,
  authorize?: Authorize
): Promise<ApplicationState> {
  return withTransaction(deps, async ({ client, publish }) => {
    const state = await loadAggregate(client, aggregateId);

    // Tenant/ownership scope check on the loaded aggregate. Only meaningful
    // once the aggregate exists (version > 0); a missing aggregate is
    // INITIAL_STATE and falls through to handle(), which raises NOT_FOUND —
    // so we never leak "exists" via PERMISSION_DENIED for unknown ids.
    if (authorize !== undefined && state.version > 0) {
      authorize(state);
    }

    let events;
    try {
      events = handle(state, command);
    } catch (err) {
      if (err instanceof DomainError) {
        throw domainErrorToHandler(err);
      }
      throw err;
    }

    // Idempotent no-op (e.g. a second StartReview once already under_review):
    // the domain emits no events, so there's nothing to append, project, or
    // publish. Returning early avoids re-projecting the read model and firing
    // a phantom event whose versioned id could differ from the original.
    if (events.length === 0) {
      return state;
    }

    try {
      await appendEvents(client, aggregateId, state.version, events, actorUserId);
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        // A concurrent writer won the race at the same version — an
        // optimistic-concurrency conflict the gateway maps to HTTP 409.
        throw new HandlerError('FAILED_PRECONDITION', err.message);
      }
      throw err;
    }

    // Fold the new events onto the loaded state to get the post-command
    // state, then project + publish.
    const nextState = events.reduce<ApplicationState>((s, e) => applyEvent(s, e), state);

    await projectReadModel(client, nextState);

    publishWithVersionedId(publish, publishFor, nextState);

    return nextState;
  });
}

// The envelope `id` becomes the JetStream Nats-Msg-Id used for
// broker-side de-dup. Handlers pass the aggregate id as the base, but a
// bare aggregate id collides across EVERY event of the same aggregate —
// JetStream would drop the second and later events (submitted after
// draftCreated, etc.) as duplicates inside the dedup window. The HEAD
// version makes the key deterministic AND unique per event:
// `<aggregateId>:<version>`. Deterministic (not Date.now()) so a
// publish retry after a transient failure re-uses the same id and is
// correctly de-duped rather than re-delivered.
function publishWithVersionedId(
  publish: (evt: PublishEnvelope) => void,
  publishFor: (state: ApplicationState) => PublishEnvelope | null,
  state: ApplicationState
): void {
  const evt = publishFor(state);
  if (evt === null) {
    return;
  }
  publish({ ...evt, id: `${evt.id}:${state.version}` });
}

// Create-flow counterpart to runCommand. StartDraft is the one command
// that operates on a FRESH aggregate: the pure domain mints the
// applicationId inside the DraftCreated event, so the caller can't know
// the aggregate id up front. We run handle() against INITIAL_STATE,
// read the minted id off the produced event, and append from version 0.
// A freshly-minted UUID can't collide, so there's no optimistic-
// concurrency path here.
export async function runCreateCommand(
  deps: HandlerDeps,
  command: ApplicationCommand,
  actorUserId: string,
  publishFor: (state: ApplicationState) => PublishEnvelope | null
): Promise<ApplicationState> {
  return withTransaction(deps, async ({ client, publish }) => {
    let events;
    try {
      events = handle(INITIAL_STATE, command);
    } catch (err) {
      if (err instanceof DomainError) {
        throw domainErrorToHandler(err);
      }
      throw err;
    }

    // Every application event carries the aggregate's id; the create
    // command always produces exactly the DraftCreated event whose
    // applicationId IS the new aggregate id.
    const aggregateId = events[0].applicationId;

    await appendEvents(client, aggregateId, 0, events, actorUserId);

    const nextState = events.reduce<ApplicationState>((s, e) => applyEvent(s, e), INITIAL_STATE);

    try {
      await projectReadModel(client, nextState);
    } catch (err) {
      if (isDuplicateOpenApplication(err)) {
        throw new HandlerError('ALREADY_EXISTS', 'an open application already exists for this pet');
      }
      throw err;
    }

    publishWithVersionedId(publish, publishFor, nextState);

    return nextState;
  });
}
