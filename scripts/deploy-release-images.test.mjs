import { execFileSync } from 'child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-release-images.sh');
const PREFIX = 'ghcr.io/ideasquared/adopt-dont-shop';
const SHA = 'a'.repeat(40);

let binDir;

// A fake `docker` whose `manifest inspect <ref>` succeeds only for the refs
// listed in PUBLISHED (space-separated).
beforeEach(() => {
  binDir = mkdtempSync(join(tmpdir(), 'deploy-release-images-'));
  const docker = join(binDir, 'docker');
  writeFileSync(
    docker,
    '#!/bin/sh\n[ "$1" = manifest ] && [ "$2" = inspect ] || exit 3\ncase " $PUBLISHED " in *" $3 "*) exit 0 ;; esac\nexit 1\n'
  );
  chmodSync(docker, 0o755);
});

afterEach(() => {
  rmSync(binDir, { recursive: true, force: true });
});

function run(args, published) {
  return execFileSync('bash', [SCRIPT, ...args], {
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, PUBLISHED: published },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const ref = image => `${PREFIX}/${image}:${SHA}`;

describe('deploy-release-images.sh', () => {
  it('keeps service-ops when the release published it', () => {
    const out = run(
      [PREFIX, SHA, 'service-gateway', 'service-ops', 'app-client'],
      [ref('service-ops')].join(' ')
    );
    expect(out).toBe('service-gateway service-ops app-client');
  });

  it('drops service-ops for a release that predates it', () => {
    const out = run([PREFIX, SHA, 'service-gateway', 'service-ops', 'app-client'], '');
    expect(out).toBe('service-gateway app-client');
  });

  it('never drops a core image, even if its manifest is missing', () => {
    const out = run([PREFIX, SHA, 'service-gateway', 'service-auth'], '');
    expect(out).toBe('service-gateway service-auth');
  });

  it('refuses to run without a prefix, sha and at least one image', () => {
    expect(() => run([PREFIX, SHA], '')).toThrow();
  });
});
