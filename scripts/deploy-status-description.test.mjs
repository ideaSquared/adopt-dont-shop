import { spawnSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'deploy-status-description.sh');

const RUN_ID = '4242';
const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const LAST_GOOD = 'f0e1d2c3b4a5968778695a4b3c2d1e0f12345678';

/**
 * @param {string | undefined} marker contents of the host's deploy-outcome file
 */
function describeOutcome(marker) {
  const env = { ...process.env, RUN_ID, SHA };
  if (marker === undefined) {
    delete env.MARKER;
  } else {
    env.MARKER = marker;
  }
  const result = spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
  const fields = Object.fromEntries(
    result.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)])
  );
  return { status: result.status, ...fields };
}

describe('deploy-status-description.sh', () => {
  it('reports a healthy deploy as success', () => {
    expect(describeOutcome(`${RUN_ID} success`)).toEqual({
      status: 0,
      state: 'success',
      description: 'Deployed a1b2c3d; health checks passed.',
    });
  });

  it('says which version it rolled back to when the rollback is healthy', () => {
    expect(describeOutcome(`${RUN_ID} rolled_back ${LAST_GOOD}`)).toEqual({
      status: 0,
      state: 'failure',
      description: 'Health check failed; rolled back to f0e1d2c, which is healthy.',
    });
  });

  it('asks for manual action when the rollback is also unhealthy', () => {
    expect(describeOutcome(`${RUN_ID} rollback_failed ${LAST_GOOD}`)).toEqual({
      status: 0,
      state: 'failure',
      description: 'Health check failed; rollback to f0e1d2c also failed. Manual action needed.',
    });
  });

  it('asks for manual action when there is no earlier version', () => {
    expect(describeOutcome(`${RUN_ID} no_rollback_target`)).toEqual({
      status: 0,
      state: 'failure',
      description: 'Health check failed; no earlier version to roll back to. Manual action needed.',
    });
  });

  it('reports a failure before the health check', () => {
    expect(describeOutcome(`${RUN_ID} started`)).toEqual({
      status: 0,
      state: 'failure',
      description: 'Deploy failed before the health check. See the logs.',
    });
  });

  it('ignores a marker left by an earlier run', () => {
    expect(describeOutcome('1111 success')).toEqual({
      status: 0,
      state: 'failure',
      description: 'Deploy failed before reaching the server. See the logs.',
    });
  });

  it('treats a missing marker as a failure before reaching the server', () => {
    expect(describeOutcome(undefined)).toEqual({
      status: 0,
      state: 'failure',
      description: 'Deploy failed before reaching the server. See the logs.',
    });
  });

  it('keeps every description within GitHub’s 140-character limit', () => {
    const markers = [
      `${RUN_ID} success`,
      `${RUN_ID} rolled_back ${LAST_GOOD}`,
      `${RUN_ID} rollback_failed ${LAST_GOOD}`,
      `${RUN_ID} no_rollback_target`,
      `${RUN_ID} started`,
      '',
    ];
    markers.forEach(marker => {
      expect(describeOutcome(marker).description.length).toBeLessThanOrEqual(140);
    });
  });
});
