/**
 * Regression guard for the feature-flag HTTP surface.
 *
 * The shared library `@adopt-dont-shop/lib.feature-flags` declares endpoint
 * constants such as `/api/v1/features`, `/api/v1/features/user/:userId` and
 * `/api/v1/config/remote`. Today these endpoints are *not* implemented in
 * the backend — feature gates are evaluated client-side through Statsig and
 * the constants are unused, leaving no server attack surface.
 *
 * If somebody adds a real backend handler for these paths in the future,
 * this test will fail and force the author to (a) confirm the new handler
 * requires `authenticateToken`, and (b) for the `:userId` evaluation route,
 * confirm an ownership / admin guard is present. The point is to make any
 * accidental "leak the list of unreleased feature names to an unauthenticated
 * client" addition impossible without a deliberate review.
 */
import { describe, it, expect, vi } from 'vitest';
import { resolve } from 'path';

// The global test setup mocks `fs`, so we use `vi.importActual` to read the
// real source from disk. Tests run with cwd = service.backend.
const { readFileSync } = await vi.importActual<typeof import('node:fs')>('node:fs');
const indexSource = readFileSync(resolve(process.cwd(), 'src/index.ts'), 'utf8');

// The library currently exposes these path *literals* via
// lib.feature-flags/src/constants/endpoints.ts. We hardcode them here rather
// than importing the constants so that renaming the lib path would not
// silently invalidate the guard.
const FEATURE_FLAG_PATHS_THAT_MUST_REMAIN_UNMOUNTED = [
  "'/api/v1/features'",
  "'/api/v1/features/user'",
  "'/api/v1/features/analytics'",
  "'/api/v1/features/experiments'",
  "'/api/v1/admin/features'",
  "'/api/v1/config/remote'",
] as const;

describe('feature-flag endpoint surface', () => {
  it.each(FEATURE_FLAG_PATHS_THAT_MUST_REMAIN_UNMOUNTED)(
    'does not mount %s on the backend without explicit review',
    path => {
      // Whole-string match — guards against `app.use('/api/v1/features', ...)`
      // style mounts that would expose flag names to anonymous clients.
      expect(indexSource).not.toContain(path);
    }
  );
});
