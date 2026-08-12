/**
 * Vitest project discovery (ADS-1108).
 *
 * Single source of truth for "which subdirectories of a workspace root
 * (packages/, apps/, services/) have their own vitest.config.ts". Used by
 * both vitest.workspace.ts (to build the aggregated `test.projects` list)
 * and scripts/check-workspace-consistency.mjs (to verify every lib.* with a
 * vitest.config.ts is actually covered by that aggregation) so the two can
 * never drift apart.
 */
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * @param {string} repoRoot
 * @param {string} dir - workspace root relative to repoRoot, e.g. 'packages'
 * @param {(name: string) => boolean} [nameFilter]
 * @returns {string[]} directory names under `dir` that contain a vitest.config.ts
 */
export function discoverVitestProjectDirs(repoRoot, dir, nameFilter = () => true) {
  return readdirSync(resolve(repoRoot, dir), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(nameFilter)
    .filter(name => existsSync(resolve(repoRoot, dir, name, 'vitest.config.ts')));
}
