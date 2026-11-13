import { spawnSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { delimiter, join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'cosign-sign.sh');
const REF = 'ghcr.io/ideasquared/adopt-dont-shop/service-applications@sha256:49ecfc86';

let dir;

// A fake `cosign` on PATH: logs each call, and fails the first FAKE_FAILURES
// signs the way cosign fails when the Actions OIDC endpoint returns a non-JSON
// body.
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cosign-sign-'));
  writeFileSync(
    join(dir, 'cosign'),
    [
      '#!/usr/bin/env bash',
      'echo "$*" >> "$FAKE_DIR/calls"',
      'n=$(wc -l < "$FAKE_DIR/calls")',
      'if [ "$n" -le "$FAKE_FAILURES" ]; then',
      '  echo "fetching ambient OIDC credentials: invalid character" >&2; exit 1',
      'fi',
      'echo "signed $3"',
    ].join('\n'),
    { mode: 0o755 }
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function sign(failures) {
  const result = spawnSync('bash', [SCRIPT, REF], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${dir}${delimiter}${process.env.PATH}`,
      FAKE_DIR: dir,
      FAKE_FAILURES: String(failures),
      COSIGN_SIGN_RETRY_DELAY_SECONDS: '0',
    },
  });
  const calls = readFileSync(join(dir, 'calls'), 'utf8').trim().split('\n');
  return { status: result.status, calls, stderr: result.stderr };
}

describe('cosign-sign.sh', () => {
  it('signs once when the first attempt succeeds', () => {
    const { status, calls } = sign(0);

    expect(status).toBe(0);
    expect(calls).toEqual([`sign --yes ${REF}`]);
  });

  it('retries when fetching the OIDC token fails', () => {
    const { status, calls } = sign(1);

    expect(status).toBe(0);
    expect(calls).toEqual([`sign --yes ${REF}`, `sign --yes ${REF}`]);
  });

  it('fails the step after five failed attempts', () => {
    const { status, calls, stderr } = sign(99);

    expect(status).not.toBe(0);
    expect(calls).toHaveLength(5);
    expect(stderr).toContain(`signing of ${REF} failed after 5 attempts`);
  });
});
