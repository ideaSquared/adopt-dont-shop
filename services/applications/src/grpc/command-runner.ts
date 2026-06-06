// Shared command-runner for the event-sourced ApplicationService
// handlers. Extracted from handlers.ts so every handler file (draft
// handlers, review/decision handlers) reuses the exact same
// load → handle → append → project → publish-after-commit flow.
//
// runCommand is the single join point: pass an aggregateId + command +
// a publishFor mapper, and it runs everything inside one
// withTransaction. DomainError + ConcurrencyError translate to
// HandlerError codes here so individual handlers stay declarative.

import { withTransaction } from '@adopt-dont-shop/events';

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

// Translate the pure domain's DomainError codes into HandlerError
// codes. ILLEGAL_TRANSITION / INVALID_INPUT → INVALID_ARGUMENT;
// CONCURRENCY → INTERNAL with a "CONCURRENCY:" message (the gateway
// maps that to 409 in Phase 5.3d); MISSING_AGGREGATE → NOT_FOUND.
export function domainErrorToHandler(err: DomainError): HandlerError {
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
// resulting events. Returns the new folded state (caller maps to
// proto). publishFor returns the NATS envelope to fire after commit,
// or null to skip publishing.
export async function runCommand(
  deps: HandlerDeps,
  aggregateId: string,
  command: ApplicationCommand,
  actorUserId: string,
  publishFor: (state: ApplicationState) => PublishEnvelope | null
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

    await projectReadModel(client, nextState);

    const evt = publishFor(nextState);
    if (evt !== null) {
      publish(evt);
    }

    return nextState;
  });
}
