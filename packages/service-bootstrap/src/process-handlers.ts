// Last-resort handlers for errors that escape every try/catch.
//
// Without these, a `pg.Pool` idle-client 'error' event (emitted on Postgres
// failover/restart/idle-reap or a brief network partition — all routine in
// production) is re-thrown by Node as an unhandled 'error', and an absent
// `uncaughtException` handler terminates the process with no drain and no
// logged cause. Under `restart: always` that becomes a crash-loop on every
// Postgres blip. The same is true for any stray `unhandledRejection`.
//
// installProcessErrorHandlers logs the cause, runs the same teardown a
// signal-driven shutdown would, and exits non-zero so the orchestrator
// restarts a *drained* process rather than a mid-flight one.

import type { createLogger } from '@adopt-dont-shop/observability';

type Logger = ReturnType<typeof createLogger>;

export type ProcessErrorHandlerDeps = {
  logger: Logger;
  // Best-effort teardown run before exiting. Should resolve; any throw is
  // logged and swallowed so the process still exits. Typically the same
  // `runServiceShutdown` call used on SIGTERM/SIGINT.
  onFatal: () => Promise<void>;
  // Injectable for tests; defaults to process.exit. Typed to return void
  // (process.exit's `never` is assignable to it) so a test can pass a plain
  // spy without an assertion.
  exit?: (code: number) => void;
};

export const installProcessErrorHandlers = (deps: ProcessErrorHandlerDeps): void => {
  // Wrap rather than alias process.exit so we neither trip the unbound-method
  // lint rule nor lose the `this` binding.
  const exit = deps.exit ?? ((code: number) => process.exit(code));

  // A teardown that itself throws (or a second fatal event fired while we are
  // already draining) must not re-enter and loop.
  let handling = false;

  const handle =
    (kind: 'uncaughtException' | 'unhandledRejection') =>
    (err: unknown): void => {
      if (handling) {
        return;
      }
      handling = true;
      deps.logger.error(`fatal ${kind} — draining and exiting`, { err });
      void (async () => {
        try {
          await deps.onFatal();
        } catch (teardownErr) {
          deps.logger.error('teardown during fatal handler failed', { err: teardownErr });
        }
        exit(1);
      })();
    };

  process.on('uncaughtException', handle('uncaughtException'));
  process.on('unhandledRejection', handle('unhandledRejection'));
};
