// Pure event-sourced application domain — public surface.
//
// Phase 5.3b's gRPC handlers import from here. Everything else
// (proto adapter, persistence, NATS publisher) wraps these pure
// functions but never touches the internals.

export { apply, fold, INITIAL_STATE } from './apply.js';
export { handle } from './commands.js';
export {
  DomainError,
  type ApplicationCommand,
  type ApplicationEvent,
  type ApplicationState,
  type ApplicationStatus,
  type HomeVisitOutcome,
  type Reference,
} from './types.js';
