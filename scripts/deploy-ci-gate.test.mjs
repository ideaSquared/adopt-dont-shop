import { spawnSync } from 'child_process';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-ci-gate.sh');

function ciRuns(...runs) {
  return JSON.stringify({ total_count: runs.length, workflow_runs: runs });
}

function runGate({ runsJson, skip = 'false' }) {
  const env = { ...process.env, SKIP_CI_CHECK: skip };
  if (runsJson === undefined) {
    delete env.RUNS_JSON;
  } else {
    env.RUNS_JSON = runsJson;
  }
  return spawnSync('bash', [SCRIPT], { env, encoding: 'utf8' });
}

describe('deploy-ci-gate.sh', () => {
  it('passes when the CI run for the commit succeeded', () => {
    const result = runGate({
      runsJson: ciRuns({ id: 1, status: 'completed', conclusion: 'success' }),
    });

    expect(result.status).toBe(0);
  });

  it('judges the newest CI run, so a green re-run supersedes an older red run', () => {
    const result = runGate({
      runsJson: ciRuns(
        { id: 2, status: 'completed', conclusion: 'success' },
        { id: 1, status: 'completed', conclusion: 'failure' }
      ),
    });

    expect(result.status).toBe(0);
  });

  it.each(['failure', 'cancelled', 'timed_out', 'action_required'])(
    'blocks the deploy when CI concluded %s',
    conclusion => {
      const result = runGate({ runsJson: ciRuns({ id: 1, status: 'completed', conclusion }) });

      expect(result.status).toBe(1);
    }
  );

  it('still blocks a failed CI run when skip_ci_check is set', () => {
    const result = runGate({
      runsJson: ciRuns({ id: 1, status: 'completed', conclusion: 'failure' }),
      skip: 'true',
    });

    expect(result.status).toBe(1);
  });

  it('blocks the deploy while CI is still running', () => {
    const result = runGate({
      runsJson: ciRuns({ id: 1, status: 'in_progress', conclusion: null }),
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('still in_progress');
  });

  it('blocks the deploy when CI never ran on the commit', () => {
    const result = runGate({ runsJson: ciRuns() });

    expect(result.status).toBe(1);
  });

  it.each([
    ['CI is still running', ciRuns({ id: 1, status: 'queued', conclusion: null })],
    ['CI never ran', ciRuns()],
  ])('lets skip_ci_check through when %s', (_label, runsJson) => {
    const result = runGate({ runsJson, skip: 'true' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WARNING');
  });

  it('fails closed when RUNS_JSON is not set', () => {
    const result = runGate({ runsJson: undefined, skip: 'true' });

    expect(result.status).toBe(1);
  });

  it('fails closed when RUNS_JSON is not a workflow-runs response', () => {
    const result = runGate({ runsJson: '{"message":"Not Found"}', skip: 'true' });

    expect(result.status).toBe(1);
  });
});

describe('deploy-ci-gate.sh with the production smoke check', () => {
  const SMOKE = 'Production Image Smoke (boot)';

  function smokeRuns(...runs) {
    return JSON.stringify({ total_count: runs.length, check_runs: runs });
  }

  function runSmokeGate({ runsJson, skip = 'false' }) {
    return spawnSync('bash', [SCRIPT], {
      env: { ...process.env, RUNS_JSON: runsJson, SKIP_CI_CHECK: skip, CHECK_NAME: SMOKE },
      encoding: 'utf8',
    });
  }

  it('passes when the smoke test succeeded on the commit', () => {
    const result = runSmokeGate({
      runsJson: smokeRuns({ name: SMOKE, status: 'completed', conclusion: 'success' }),
    });

    expect(result.status).toBe(0);
  });

  it('blocks the deploy when the smoke test failed, even with skip_ci_check', () => {
    const result = runSmokeGate({
      runsJson: smokeRuns({ name: SMOKE, status: 'completed', conclusion: 'failure' }),
      skip: 'true',
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(SMOKE);
  });

  it('blocks the deploy while the smoke test is still running', () => {
    const result = runSmokeGate({
      runsJson: smokeRuns({ name: SMOKE, status: 'in_progress', conclusion: null }),
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`${SMOKE} is still in_progress`);
  });

  it('blocks the deploy when the smoke test never ran on the commit', () => {
    const result = runSmokeGate({ runsJson: smokeRuns() });

    expect(result.status).toBe(1);
  });

  it('lets skip_ci_check through when the smoke test never ran', () => {
    const result = runSmokeGate({ runsJson: smokeRuns(), skip: 'true' });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WARNING');
  });
});
