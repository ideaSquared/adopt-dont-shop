import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace — discovers all 21 lib.* packages.
 * Each package has its own vitest.config.ts with lib-specific overrides.
 */
export default defineWorkspace([
  'lib.analytics/vitest.config.ts',
  'lib.api/vitest.config.ts',
  'lib.applications/vitest.config.ts',
  'lib.audit-logs/vitest.config.ts',
  'lib.auth/vitest.config.ts',
  'lib.chat/vitest.config.ts',
  'lib.components/vitest.config.ts',
  'lib.dev-tools/vitest.config.ts',
  'lib.discovery/vitest.config.ts',
  'lib.feature-flags/vitest.config.ts',
  'lib.invitations/vitest.config.ts',
  'lib.moderation/vitest.config.ts',
  'lib.notifications/vitest.config.ts',
  'lib.permissions/vitest.config.ts',
  'lib.pets/vitest.config.ts',
  'lib.rescue/vitest.config.ts',
  'lib.search/vitest.config.ts',
  'lib.support-tickets/vitest.config.ts',
  'lib.types/vitest.config.ts',
  'lib.utils/vitest.config.ts',
  'lib.validation/vitest.config.ts',
]);
