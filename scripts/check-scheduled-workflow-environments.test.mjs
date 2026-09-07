import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  hasScheduleTrigger,
  jobEnvironment,
  parseJobs,
  findScheduledProductionJobs,
} from './check-scheduled-workflow-environments.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REAL_WORKFLOWS_DIR = join(REPO_ROOT, '.github', 'workflows');

describe('hasScheduleTrigger', () => {
  it('detects a `schedule:` trigger under `on:`', () => {
    const yaml = ['on:', '  schedule:', "    - cron: '0 2 * * *'", '  workflow_dispatch: {}'].join(
      '\n'
    );
    expect(hasScheduleTrigger(yaml)).toBe(true);
  });

  it('returns false for a workflow with no schedule trigger', () => {
    const yaml = ['on:', '  workflow_dispatch: {}'].join('\n');
    expect(hasScheduleTrigger(yaml)).toBe(false);
  });

  it('does not match `schedule` mentioned outside the `on:` block', () => {
    const yaml = [
      'on:',
      '  workflow_dispatch: {}',
      'jobs:',
      '  build:',
      '    steps:',
      "      - run: echo 'schedule:'",
    ].join('\n');
    expect(hasScheduleTrigger(yaml)).toBe(false);
  });
});

describe('parseJobs + jobEnvironment', () => {
  it('reads a scalar `environment:` value off a job', () => {
    const yaml = [
      'jobs:',
      '  my-job:',
      '    runs-on: ubuntu-latest',
      '    environment: production',
    ].join('\n');
    const jobs = parseJobs(yaml);
    expect(Object.keys(jobs)).toEqual(['my-job']);
    expect(jobEnvironment(jobs['my-job'])).toBe('production');
  });

  it('reads the `name:` sub-key of an object-form `environment:`', () => {
    const yaml = [
      'jobs:',
      '  my-job:',
      '    runs-on: ubuntu-latest',
      '    environment:',
      '      name: production',
      '      url: https://example.com',
    ].join('\n');
    const jobs = parseJobs(yaml);
    expect(jobEnvironment(jobs['my-job'])).toBe('production');
  });

  it('returns null when the job declares no environment', () => {
    const yaml = ['jobs:', '  my-job:', '    runs-on: ubuntu-latest'].join('\n');
    const jobs = parseJobs(yaml);
    expect(jobEnvironment(jobs['my-job'])).toBeNull();
  });

  it('separates multiple jobs correctly', () => {
    const yaml = [
      'jobs:',
      '  first:',
      '    environment: staging',
      '  second:',
      '    environment: production',
    ].join('\n');
    const jobs = parseJobs(yaml);
    expect(jobEnvironment(jobs.first)).toBe('staging');
    expect(jobEnvironment(jobs.second)).toBe('production');
  });
});

describe('findScheduledProductionJobs', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'scheduled-env-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('flags a schedule-triggered job that uses `environment: production`', () => {
    writeFileSync(
      join(root, 'nightly.yml'),
      [
        'name: Nightly',
        'on:',
        '  schedule:',
        "    - cron: '0 2 * * *'",
        'jobs:',
        '  do-it:',
        '    runs-on: ubuntu-latest',
        '    environment: production',
      ].join('\n')
    );

    expect(findScheduledProductionJobs(root)).toEqual([
      { workflow: 'nightly.yml', job: 'do-it', environment: 'production' },
    ]);
  });

  it('does not flag a schedule-triggered job using a non-approving environment', () => {
    writeFileSync(
      join(root, 'nightly.yml'),
      [
        'name: Nightly',
        'on:',
        '  schedule:',
        "    - cron: '0 2 * * *'",
        'jobs:',
        '  do-it:',
        '    runs-on: ubuntu-latest',
        '    environment: backups',
      ].join('\n')
    );

    expect(findScheduledProductionJobs(root)).toEqual([]);
  });

  it('does not flag `environment: production` on a workflow with no schedule trigger', () => {
    writeFileSync(
      join(root, 'deploy.yml'),
      [
        'name: Deploy',
        'on:',
        '  workflow_dispatch: {}',
        'jobs:',
        '  deploy:',
        '    runs-on: ubuntu-latest',
        '    environment: production',
      ].join('\n')
    );

    expect(findScheduledProductionJobs(root)).toEqual([]);
  });

  it('does not flag a job whose environment is a dynamic expression', () => {
    writeFileSync(
      join(root, 'nightly.yml'),
      [
        'name: Nightly',
        'on:',
        '  schedule:',
        "    - cron: '0 2 * * *'",
        'jobs:',
        '  do-it:',
        '    runs-on: ubuntu-latest',
        '    environment: ${{ needs.preflight.outputs.deploy_environment }}',
      ].join('\n')
    );

    expect(findScheduledProductionJobs(root)).toEqual([]);
  });
});

describe('real repo workflows (ADS-1305 regression)', () => {
  it('no schedule-triggered job in .github/workflows declares `environment: production`', () => {
    expect(findScheduledProductionJobs(REAL_WORKFLOWS_DIR)).toEqual([]);
  });

  it('sanity: backup.yml and backup-restore-drill.yml are actually schedule-triggered and scanned', () => {
    const files = readdirSync(REAL_WORKFLOWS_DIR).filter(f => /\.ya?ml$/.test(f));
    expect(files).toEqual(expect.arrayContaining(['backup.yml', 'backup-restore-drill.yml']));
    for (const file of ['backup.yml', 'backup-restore-drill.yml']) {
      const yaml = readFileSync(join(REAL_WORKFLOWS_DIR, file), 'utf8');
      expect(hasScheduleTrigger(yaml)).toBe(true);
    }
  });
});
