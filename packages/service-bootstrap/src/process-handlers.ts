// Top-level process guards (ADS-1040) — no service registered
// `uncaughtException` / `unhandledRejection` handlers, so any error that
// escapes normal error handling (an idle pg.Pool 'error' event with no
// listener was the concrete case, now fixed separately in
// @adopt-dont-shop/db) terminates the process immediately: no logged cause,
// no graceful drain of in-flight work. Under `restart: always` this becomes
// a crash-loop on every transient error.
//
// registerFatalErrorHandlers logs the error with context, runs the same
// graceful-shutdown sequence as SIGTERM/SIGINT, then exits non-zero.

import { runServiceShutdown, type ShutdownDeps } from './shutdown.js';

export const registerFatalErrorHandlers = (deps: ShutdownDeps): void => {
  const handleFatal =
    (kind: 'uncaughtException' | 'unhandledRejection') =>
    (err: unknown): void => {
      deps.logger.error(`${kind} — shutting down`, { err });
      void runServiceShutdown(deps).finally(() => process.exit(1));
    };

  process.on('uncaughtException', handleFatal('uncaughtException'));
  process.on('unhandledRejection', handleFatal('unhandledRejection'));
};
