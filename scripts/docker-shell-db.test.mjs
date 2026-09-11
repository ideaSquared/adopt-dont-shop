import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildShellDbArgs } from './docker-shell-db.mjs';

// buildShellDbArgs must resolve the same `-f` compose-file list as docker:dev
// so `pnpm docker:shell:db` targets the same `database` container
// `pnpm docker:dev` actually started (ADS-1335).
describe('buildShellDbArgs', () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('uses the base + dev compose files when no override exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-shell-db-compose-'));
    expect(buildShellDbArgs(dir)).toEqual([
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      'exec',
      'database',
      'sh',
      '-c',
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ]);
  });

  it('appends the override file last when it exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-shell-db-compose-'));
    writeFileSync(join(dir, 'docker-compose.override.yml'), 'services: {}\n');
    expect(buildShellDbArgs(dir)).toEqual([
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      '-f',
      'docker-compose.override.yml',
      'exec',
      'database',
      'sh',
      '-c',
      'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
    ]);
  });
});
