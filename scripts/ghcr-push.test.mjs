import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'ghcr-push.sh');
const REF = 'ghcr.io/ideasquared/adopt-dont-shop/service-rescue:abc123';

let dir;

// A fake `docker` on PATH: logs each call, and answers `denied` for the first
// FAKE_DENIALS pushes, the way GHCR answers the first push of a new package.
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ghcr-push-'));
  writeFileSync(
    join(dir, 'docker'),
    [
      '#!/usr/bin/env bash',
      'echo "$*" >> "$FAKE_DIR/calls"',
      'n=$(wc -l < "$FAKE_DIR/calls")',
      'if [ "$n" -le "$FAKE_DENIALS" ]; then echo "denied" >&2; exit 1; fi',
      'echo "pushed $2"',
    ].join('\n'),
    { mode: 0o755 }
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function push(denials) {
  const result = spawnSync('bash', [SCRIPT, REF], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}${delimiter}${process.env.PATH}`,
      FAKE_DIR: dir,
      FAKE_DENIALS: String(denials),
      GHCR_PUSH_RETRY_DELAY_SECONDS: '0',
    },
  });
  const calls = readFileSync(join(dir, 'calls'), 'utf8').trim().split('\n');
  return { status: result.status, calls, stderr: result.stderr };
}

describe('ghcr-push.sh', () => {
  it('pushes once when the registry accepts the first push', () => {
    const { status, calls } = push(0);

    expect(status).toBe(0);
    expect(calls).toEqual([`push ${REF}`]);
  });

  it('retries when the first push of a new package is denied', () => {
    const { status, calls } = push(1);

    expect(status).toBe(0);
    expect(calls).toEqual([`push ${REF}`, `push ${REF}`]);
  });

  it('fails the step after five denied attempts', () => {
    const { status, calls, stderr } = push(99);

    expect(status).not.toBe(0);
    expect(calls).toHaveLength(5);
    expect(stderr).toContain(`push of ${REF} failed after 5 attempts`);
  });
});
