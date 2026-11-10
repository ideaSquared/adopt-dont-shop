import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, describe, expect, it } from 'vitest';

import {
  composeUpArgs,
  needsVolumeRenewal,
  resolveComposeFiles,
  resolveHostIds,
  resolveProfiles,
} from './docker-dev.mjs';

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

// resolveHostIds picks the uid/gid the dev entrypoint steps down to. On POSIX
// hosts that is the developer's own, so writes into the `.:/app` bind mount
// land as them. Docker Desktop on Windows presents bind-mounted files as
// root-owned 0644, so any non-root uid gets EACCES writing them (the
// lib-types-watcher's `tsc --watch` dist/ output); there the container stays
// root.
describe('resolveHostIds', () => {
  it("uses the developer's own uid/gid on POSIX hosts", () => {
    expect(resolveHostIds({ platform: 'linux', getuid: () => 501, getgid: () => 20 })).toEqual({
      uid: '501',
      gid: '20',
    });
  });

  it('stays root on Windows so the container can write the bind-mounted source', () => {
    expect(resolveHostIds({ platform: 'win32' })).toEqual({ uid: '0', gid: '0' });
  });
});

// Windows -> Linux bind mounts don't forward inotify, so lib.types'
// `tsc --watch` never saw a source change and services kept importing a
// stale dist/. tsc must poll; lib.types/src is small enough that polling
// everywhere costs nothing.
describe('lib-types-watcher in docker-compose.dev.yml', () => {
  it('polls for file and directory changes so edits reach dist/ on every host', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const compose = readFileSync(join(root, 'docker-compose.dev.yml'), 'utf8');
    const block = compose.split(/\r?\n {2}lib-types-watcher:\r?\n/)[1].split(/\r?\n\r?\n/)[0];
    expect(block).toMatch(/TSC_WATCHFILE: DynamicPriorityPolling/);
    expect(block).toMatch(/TSC_WATCHDIRECTORY: RecursiveDirectoryUsingDynamicPriorityPolling/);
  });

  // Services import lib.validation through its dist/ export too. Without a
  // watcher, a dev stack runs whatever dist/ the host last built, so a schema
  // added on main is a missing export (or a missing module on a fresh clone).
  it('compiles lib.validation as well as lib.types', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const compose = readFileSync(join(root, 'docker-compose.dev.yml'), 'utf8');
    const block = compose.split(/\r?\n {2}lib-types-watcher:\r?\n/)[1].split(/\r?\n\r?\n/)[0];
    expect(block).toMatch(/--filter @adopt-dont-shop\/lib\.types\b/);
    expect(block).toMatch(/--filter @adopt-dont-shop\/lib\.validation\b/);
  });
});

// Compose carries a container's anonymous volumes over when it recreates it, so
// after a dependency change the baked node_modules in the new dev image stayed
// hidden behind the old volumes. Any container still on an older dev image will
// be recreated, so its volumes must be renewed. That includes containers a
// previous, narrower `--profile` run left behind on the old image.
describe('needsVolumeRenewal', () => {
  const DEV = 'adopt-dont-shop-dev:latest';

  it('renews when a container runs an older dev image than the current one', () => {
    const containers = [
      { configImage: DEV, imageId: 'sha256:new' },
      { configImage: DEV, imageId: 'sha256:old' },
    ];
    expect(needsVolumeRenewal(containers, 'sha256:new')).toBe(true);
  });

  it('keeps volumes when every dev container already runs the current image', () => {
    const containers = [
      { configImage: DEV, imageId: 'sha256:new' },
      { configImage: DEV, imageId: 'sha256:new' },
    ];
    expect(needsVolumeRenewal(containers, 'sha256:new')).toBe(false);
  });

  it('ignores infra containers that run other images', () => {
    const containers = [
      { configImage: DEV, imageId: 'sha256:new' },
      { configImage: 'postgis/postgis:16-3.4-alpine', imageId: 'sha256:pg' },
    ];
    expect(needsVolumeRenewal(containers, 'sha256:new')).toBe(false);
  });

  it('keeps volumes when no containers exist yet', () => {
    expect(needsVolumeRenewal([], 'sha256:new')).toBe(false);
  });
});

describe('composeUpArgs', () => {
  it('renews anonymous volumes when asked', () => {
    expect(composeUpArgs(['services'], { detach: false, renewAnonVolumes: true })).toContain(
      '--renew-anon-volumes'
    );
  });

  // --renew-anon-volumes force-recreates every container, so it must not be on
  // by default or each `pnpm docker:dev` restarts the whole stack.
  it('keeps anonymous volumes otherwise', () => {
    expect(composeUpArgs(['services'], { detach: false, renewAnonVolumes: false })).not.toContain(
      '--renew-anon-volumes'
    );
  });

  it('never builds, and detaches only when asked', () => {
    expect(
      composeUpArgs(['client', 'services'], { detach: true, renewAnonVolumes: false })
    ).toEqual(['--profile', 'client', '--profile', 'services', 'up', '--no-build', '-d']);
  });
});
