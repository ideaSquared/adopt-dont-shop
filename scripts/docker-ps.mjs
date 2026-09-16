#!/usr/bin/env node
// `pnpm docker:ps` used bare `docker compose ps` (no `-f` flags), which
// resolves a DIFFERENT compose-file set than `pnpm docker:dev`: Compose's
// default file discovery picks up docker-compose.yml + docker-compose.override.yml
// but never docker-compose.dev.yml, so it reported a different container set
// entirely. Route it through the same resolveComposeFiles() docker-dev.mjs
// uses so the two agree (ADS-1335).
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';
import { resolveComposeFiles } from './docker-dev.mjs';

export function buildPsArgs(extraArgs = [], root = undefined) {
  return ['compose', ...resolveComposeFiles(root), 'ps', ...extraArgs];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = spawnSync('docker', buildPsArgs(process.argv.slice(2)), { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
