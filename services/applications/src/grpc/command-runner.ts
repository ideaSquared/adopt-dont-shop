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
