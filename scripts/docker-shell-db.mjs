#!/usr/bin/env node
// `pnpm docker:shell:db` used bare `docker compose exec` (no `-f` flags), the
// same compose-file divergence as docker:ps — it resolves a different
// compose-file set than `pnpm docker:dev` and can target the wrong `database`
// container. Route it through the same resolveComposeFiles() docker-dev.mjs
// uses so the two agree (ADS-1335).
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { resolveComposeFiles } from './docker-dev.mjs';

export function buildShellDbArgs(root = undefined) {
  return [
    'compose',
    ...resolveComposeFiles(root),
    'exec',
    'database',
    'sh',
    '-c',
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = spawnSync('docker', buildShellDbArgs(), { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
