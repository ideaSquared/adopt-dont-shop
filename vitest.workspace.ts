import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type UserProjectConfigExport } from 'vitest/config';

import { discoverVitestProjectDirs } from './scripts/lib/discover-vitest-projects.mjs';

// Vitest 4 removed `defineWorkspace()` / workspace-file auto-discovery (the
// pre-Vitest-4 `defineWorkspace(['packages/lib.*/vitest.config.ts', ...])`
// form this file used to export no longer loads). Multi-project runs are now
// expressed as `test.projects` on a root Vitest config — see
// https://vitest.dev/guide/migration#workspace. This file fills that role and
// is still what .vscode/settings.json's `vitest.workspaceConfig` points the
// VS Code Vitest extension at (ADS-986), and what `pnpm test` at the root
// aggregates apps into (ADS-908).
//
// Every aggregated project needs a unique `test.name` (Vitest 4 enforces
// this), which none of the per-package vitest.config.ts files set on their
// own — so each project is included via `extends` (reuse that package's own
// config as-is) plus an explicit `root` and a derived, collision-free `name`
// rather than a bare glob string.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// ADS-1108: directory discovery itself lives in discoverVitestProjectDirs so
// scripts/check-workspace-consistency.mjs can verify real project coverage
// against the same logic used here, instead of pattern-matching this file's
// source text.
function discoverProjects(
  dir: string,
  namePrefix: string,
  nameFilter: (name: string) => boolean = () => true
): UserProjectConfigExport[] {
  return discoverVitestProjectDirs(repoRoot, dir, nameFilter).map(name => {
    const root = join(dir, name);
    return {
      extends: join(root, 'vitest.config.ts'),
      root,
      test: { name: `${namePrefix}${basename(name)}` },
    };
  });
}

export default defineConfig({
  test: {
    projects: [
      // ADS-1029: every packages/* with a vitest.config.ts, not just lib.* —
      // the service-side shared packages (authz, db, events, proto, …) were
      // omitted from the aggregated run and the VS Code Vitest panel. Their
      // basenames don't collide with the app./service. prefixed names.
      ...discoverProjects('packages', ''),
      ...discoverProjects('apps', 'app.'),
      ...discoverProjects('services', 'service.'),
    ],
  },
});
