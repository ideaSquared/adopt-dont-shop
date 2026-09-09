#!/usr/bin/env node
/**
 * Scheduled-workflow environment guard (ADS-1305).
 *
 * A `schedule:`-triggered job that declares `environment: production` will
 * wait for the `production` environment's required reviewers, then expire —
 * a cron trigger can never supply that approval, so no unattended run of such
 * a job would ever complete (see backup.yml's history before this fix).
 *
 * This guard fails CI if any workflow job triggered by `schedule:` declares
 * the approval-gated `production` environment. Schedule-triggered jobs that
 * need environment secrets should use a dedicated non-approving environment
 * instead (e.g. `backups` — see docs/operations/deploy.md's environment
 * table and .github/workflows/README.md).
 *
 * Run via `node scripts/check-scheduled-workflow-environments.mjs` or
 * `pnpm check:scheduled-workflow-environments` (wired into `test:scripts` via
 * this file's *.test.mjs, and into `ci:local` directly).
 */
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

// The reviewer-gated environment a schedule trigger can never satisfy.
export const BLOCKED_ENVIRONMENT = 'production';

// True when the workflow's top-level `on:` trigger set includes `schedule:`.
export function hasScheduleTrigger(yaml) {
  const lines = yaml.split('\n');
  let inOn = false;
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) {
      inOn = true;
      continue;
    }
    if (inOn && /^[A-Za-z]/.test(line)) break; // dedent out of `on:` to the next top-level key
    if (!inOn) continue;
    if (/^\s{2}schedule:\s*$/.test(line)) return true;
  }
  return false;
}

// Splits a workflow's `jobs:` block into { jobName: bodyLines[] }.
export function parseJobs(yaml) {
  const lines = yaml.split('\n');
  const jobs = {};
  let inJobs = false;
  let currentJob = null;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^[A-Za-z]/.test(line)) break; // dedent out of `jobs:` to the next top-level key
    const jobMatch = line.match(/^\s{2}([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch) {
      currentJob = jobMatch[1];
      jobs[currentJob] = [];
      continue;
    }
    if (currentJob) jobs[currentJob].push(line);
  }
  return jobs;
}

// The `environment:` value declared directly on a job — either the scalar
// form (`environment: production`) or the object form
// (`environment:\n  name: production`). Returns null if the job sets none.
export function jobEnvironment(jobLines) {
  for (let i = 0; i < jobLines.length; i++) {
    const line = jobLines[i];
    const scalar = line.match(/^\s{4}environment:\s*(\S.*)$/);
    if (scalar) return scalar[1].replace(/^['"]|['"]$/g, '').trim();
    const mapStart = line.match(/^\s{4}environment:\s*$/);
    if (mapStart) {
      const next = jobLines[i + 1] || '';
      const nameMatch = next.match(/^\s{6}name:\s*(\S.*)$/);
      if (nameMatch) return nameMatch[1].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  return null;
}

// Every { workflow, job, environment } triple where a `schedule:`-triggered
// workflow's job declares the blocked environment.
export function findScheduledProductionJobs(workflowsDir = WORKFLOWS_DIR) {
  const failures = [];
  for (const file of readdirSync(workflowsDir)
    .filter(f => /\.ya?ml$/.test(f))
    .sort()) {
    const yaml = readFileSync(join(workflowsDir, file), 'utf8');
    if (!hasScheduleTrigger(yaml)) continue;
    const jobs = parseJobs(yaml);
    for (const [job, body] of Object.entries(jobs)) {
      const environment = jobEnvironment(body);
      if (environment === BLOCKED_ENVIRONMENT) {
        failures.push({ workflow: file, job, environment });
      }
    }
  }
  return failures;
}

function main() {
  const failures = findScheduledProductionJobs();

  if (failures.length === 0) {
    console.log(
      'OK — no schedule-triggered workflow job declares the reviewer-gated `production` environment.'
    );
    return;
  }

  console.error('Schedule-triggered job(s) using the approval-gated `production` environment:');
  for (const { workflow, job, environment } of failures) {
    console.error(
      `  - .github/workflows/${workflow}: job \`${job}\` sets \`environment: ${environment}\``
    );
  }
  console.error('');
  console.error('A cron-triggered job entering a required-reviewer environment waits for approval');
  console.error('and expires — no unattended run ever completes. Move the job to a dedicated');
  console.error('non-approving environment instead (e.g. `backups`).');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
