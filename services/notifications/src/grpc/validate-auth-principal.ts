// Boot-time validation of the notifications system principal.
//
// The auth-client stamps a hardcoded principal (svc-notifications /
// admin / admin.users.broadcast) onto every ListUserIdsByCohort call.
// If that principal is wrong — e.g. the permission was never seeded, or
// the env vars override it with a bad value — broadcasts will fail at
// request time with PERMISSION_DENIED or UNAUTHENTICATED, with no
// boot-time signal.
//
// validateAuthPrincipal fires one cheap probe RPC at boot using an
// empty cohort filter (page 1, limit 1) so the auth service does the
// permission check but scans at most one row. The result is discarded.
//
// Outcome rules:
//   OK              → resolves (principal is accepted)
//   PERMISSION_DENIED / UNAUTHENTICATED → rejects (fatal — crash boot)
//   UNAVAILABLE     → warns and resolves (auth may still be starting;
//                     the gRPC client retries lazily at request time)
//   anything else   → rejects (unexpected; don't swallow it)

import { status } from '@grpc/grpc-js';

import type { AuthCohortClient } from './handlers.js';

type BootLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

const FATAL_CODES = new Set([status.PERMISSION_DENIED, status.UNAUTHENTICATED]);

export async function validateAuthPrincipal(
  client: AuthCohortClient,
  logger: BootLogger
): Promise<void> {
  try {
    await client.listUserIdsByCohort({
      userTypes: [],
      statuses: [],
      page: 1,
      limit: 1,
    });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;

    if (typeof code === 'number' && code === status.UNAVAILABLE) {
      logger.warn(
        'service.notifications: auth service unavailable at boot — ' +
          'system principal not verified; will retry at request time',
        { code }
      );
      return;
    }

    if (typeof code === 'number' && FATAL_CODES.has(code)) {
      logger.error(
        'service.notifications: system principal rejected by auth service — ' +
          'check AUTH_GRPC_URL and the svc-notifications seed data; crashing',
        { code, err: (err as Error).message }
      );
      throw new Error(
        `boot validation failed: auth service rejected system principal (gRPC status ${code})`
      );
    }

    // Unexpected error — surface it rather than silently continuing.
    logger.error('service.notifications: unexpected error during auth principal validation', {
      code,
      err: (err as Error).message,
    });
    throw err;
  }
}
