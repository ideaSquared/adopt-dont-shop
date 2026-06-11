import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace — discovers every lib.* package via glob so newly added
 * libraries are picked up automatically. Each package has its own
 * vitest.config.ts with lib-specific overrides.
 */
export default defineWorkspace(['packages/lib.*/vitest.config.ts']);
