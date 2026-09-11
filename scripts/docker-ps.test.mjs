import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildPsArgs } from './docker-ps.mjs';

// buildPsArgs must resolve the same `-f` compose-file list as docker:dev
// (base + dev, plus the override file when present) so `pnpm docker:ps`
// reports the same containers `pnpm docker:dev` actually started (ADS-1335).
describe('buildPsArgs', () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('uses the base + dev compose files when no override exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-ps-compose-'));
    expect(buildPsArgs([], dir)).toEqual([
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      'ps',
    ]);
  });

  it('appends the override file last when it exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-ps-compose-'));
    writeFileSync(join(dir, 'docker-compose.override.yml'), 'services: {}\n');
    expect(buildPsArgs([], dir)).toEqual([
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      '-f',
      'docker-compose.override.yml',
      'ps',
    ]);
  });

  it('forwards extra CLI args after `ps`, matching the old bare-command behaviour', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-ps-compose-'));
    expect(buildPsArgs(['-a'], dir)).toEqual([
      'compose',
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      'ps',
      '-a',
    ]);
  });
});
