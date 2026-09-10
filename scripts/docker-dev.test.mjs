import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveComposeFiles, resolveProfiles } from './docker-dev.mjs';

// resolveProfiles maps the requested `--profile` onto the real compose profiles
// `pnpm docker:dev` enables. The behaviour that matters to a developer booting
// the stack: the default is lean (no observability/nginx), a single frontend
// still drags the gateway in, and `full` is the escape hatch for everything.
describe('resolveProfiles', () => {
  it('expands the default `dev` profile to every app + service, without observability or nginx', () => {
    const profiles = resolveProfiles('dev');
    expect(profiles).toEqual(['client', 'admin', 'rescue', 'services']);
    // The observability/nginx-only profiles must NOT be pulled into the default.
    expect(profiles).not.toContain('full');
    expect(profiles).not.toContain('observability');
    expect(profiles).not.toContain('proxy');
  });

  it.each(['client', 'admin', 'rescue'])(
    'enables the `services` profile alongside a single frontend (%s) so /api does not 502',
    frontend => {
      expect(resolveProfiles(frontend)).toEqual([frontend, 'services']);
    }
  );

  it('passes `full` through untouched so it still starts observability + nginx', () => {
    expect(resolveProfiles('full')).toEqual(['full']);
  });

  it('passes any other profile through unchanged', () => {
    expect(resolveProfiles('observability')).toEqual(['observability']);
  });
});

// resolveComposeFiles decides which `-f` flags `pnpm docker:dev` (and the
// other docker:* commands) pass to `docker compose`. Passing explicit `-f`
// files disables Compose's automatic loading of docker-compose.override.yml,
// so this must append it — last, to preserve base -> dev -> override
// precedence — only when the file actually exists (ADS-1335).
describe('resolveComposeFiles', () => {
  let dir;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('uses only the base + dev compose files when no override exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-dev-compose-'));
    expect(resolveComposeFiles(dir)).toEqual([
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
    ]);
  });

  it('appends the override file last when it exists', () => {
    dir = mkdtempSync(join(tmpdir(), 'docker-dev-compose-'));
    writeFileSync(join(dir, 'docker-compose.override.yml'), 'services: {}\n');
    expect(resolveComposeFiles(dir)).toEqual([
      '-f',
      'docker-compose.yml',
      '-f',
      'docker-compose.dev.yml',
      '-f',
      'docker-compose.override.yml',
    ]);
  });
});
