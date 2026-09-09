import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'ci-required-gate.sh');

/**
 * @param {string | undefined} needsJson
 */
function runGate(needsJson) {
  const env = { ...process.env };
  if (needsJson === undefined) {
    delete env.NEEDS_JSON;
  } else {
    env.NEEDS_JSON = needsJson;
  }
  return spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
}

describe('ci-required-gate.sh', () => {
  it('passes when every job succeeded', () => {
    const result = runGate(JSON.stringify({ a: { result: 'success' }, b: { result: 'success' } }));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('All required jobs passed or were skipped');
  });

  it('treats a skipped job (path filter) as passing', () => {
    const result = runGate(JSON.stringify({ a: { result: 'success' }, b: { result: 'skipped' } }));

    expect(result.status).toBe(0);
  });

  it('fails when a job failed', () => {
    const result = runGate(JSON.stringify({ a: { result: 'failure' } }));

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Required jobs failed or were cancelled');
    expect(result.stdout).toContain('a');
  });

  it('fails when a job was cancelled', () => {
    const result = runGate(JSON.stringify({ a: { result: 'cancelled' } }));

    expect(result.status).toBe(1);
  });

  it('fails closed when NEEDS_JSON is not set', () => {
    const result = runGate(undefined);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('NEEDS_JSON is not set');
  });

  it('lists every failing job, not just the first', () => {
    const result = runGate(
      JSON.stringify({
        a: { result: 'success' },
        b: { result: 'failure' },
        c: { result: 'cancelled' },
      })
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('b');
    expect(result.stdout).toContain('c');
    expect(result.stdout).not.toMatch(/^a$/m);
  });
});
