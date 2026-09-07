import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'apply-backup-bucket-policy.sh');

function run(args) {
  return execFileSync('bash', [SCRIPT, ...args], { encoding: 'utf8' });
}

function runExpectFailure(args) {
  try {
    run(args);
    throw new Error('expected the script to exit non-zero');
  } catch (error) {
    if (error.status === undefined) throw error; // rethrow the assertion above
    return error;
  }
}

describe('apply-backup-bucket-policy.sh --dry-run', () => {
  it('makes no `aws` call it does not also print (dry-run prints every command, runs none)', () => {
    const output = run(['--bucket', 'my-backups', '--region', 'eu-west-2', '--dry-run']);
    expect(output).toMatch(
      /\+ aws s3api put-bucket-versioning --bucket my-backups --region eu-west-2 --versioning-configuration Status=Enabled/
    );
    expect(output).toMatch(/\+ aws s3api put-bucket-lifecycle-configuration --bucket my-backups/);
    expect(output).toMatch(/dry-run=true/);
    expect(output).toMatch(/\[apply-backup-bucket-policy\] done/);
  });

  it('applies the documented per-prefix retention: postgres 30d, uploads 90d, nats 14d', () => {
    const output = run(['--bucket', 'my-backups', '--region', 'eu-west-2', '--dry-run']);
    expect(output).toMatch(/"ID": "postgres-snapshots"[\s\S]*?"Expiration": \{ "Days": 30 \}/);
    expect(output).toMatch(/"ID": "uploads-snapshots"[\s\S]*?"Expiration": \{ "Days": 90 \}/);
    expect(output).toMatch(/"ID": "nats-snapshots"[\s\S]*?"Expiration": \{ "Days": 14 \}/);
  });

  it('does not attempt the Object Lock support check or call when --enable-object-lock is absent', () => {
    const output = run(['--bucket', 'my-backups', '--region', 'eu-west-2', '--dry-run']);
    expect(output).not.toMatch(/put-object-lock-configuration/);
    expect(output).toMatch(/--enable-object-lock not set/);
  });

  it('prints the Object Lock call with the requested mode and retention when enabled', () => {
    const output = run([
      '--bucket',
      'my-backups',
      '--region',
      'eu-west-2',
      '--dry-run',
      '--enable-object-lock',
      '--object-lock-mode',
      'COMPLIANCE',
      '--object-lock-days',
      '60',
    ]);
    expect(output).toMatch(/aws s3api put-object-lock-configuration/);
    expect(output).toMatch(/"Mode":"COMPLIANCE"/);
    expect(output).toMatch(/"Days":60/);
  });

  it('defaults Object Lock mode to GOVERNANCE and 30 days', () => {
    const output = run([
      '--bucket',
      'my-backups',
      '--region',
      'eu-west-2',
      '--dry-run',
      '--enable-object-lock',
    ]);
    expect(output).toMatch(/"Mode":"GOVERNANCE"/);
    expect(output).toMatch(/"Days":30/);
  });

  it('is idempotent: two dry-run invocations produce the same lifecycle JSON', () => {
    const first = run(['--bucket', 'b', '--region', 'r', '--dry-run']);
    const second = run(['--bucket', 'b', '--region', 'r', '--dry-run']);
    const stripTmpPaths = s => s.replace(/backup-bucket-lifecycle-\w+\.json/g, 'LIFECYCLE_FILE');
    expect(stripTmpPaths(first)).toBe(stripTmpPaths(second));
  });
});

describe('apply-backup-bucket-policy.sh argument validation', () => {
  it('fails when --bucket / BACKUP_BUCKET is not provided', () => {
    const error = runExpectFailure(['--region', 'eu-west-2']);
    expect(error.status).not.toBe(0);
    expect(String(error.stderr)).toMatch(/--bucket \(or BACKUP_BUCKET\) required/);
  });

  it('fails when --region / AWS_REGION is not provided', () => {
    const error = runExpectFailure(['--bucket', 'my-backups']);
    expect(error.status).not.toBe(0);
    expect(String(error.stderr)).toMatch(/--region \(or AWS_REGION\) required/);
  });

  it('rejects an --object-lock-mode other than GOVERNANCE/COMPLIANCE', () => {
    const error = runExpectFailure([
      '--bucket',
      'b',
      '--region',
      'r',
      '--object-lock-mode',
      'NOPE',
    ]);
    expect(String(error.stderr)).toMatch(/--object-lock-mode must be GOVERNANCE or COMPLIANCE/);
  });

  it('rejects a non-positive --object-lock-days', () => {
    const error = runExpectFailure(['--bucket', 'b', '--region', 'r', '--object-lock-days', '0']);
    expect(String(error.stderr)).toMatch(/--object-lock-days must be a positive integer/);
  });

  it('rejects an unknown flag', () => {
    const error = runExpectFailure(['--bucket', 'b', '--region', 'r', '--bogus']);
    expect(String(error.stderr)).toMatch(/unknown argument: --bogus/);
  });

  it('--help prints usage and exits 0 without requiring --bucket/--region', () => {
    const output = run(['--help']);
    expect(output).toMatch(/S3 backup bucket hardening/);
    expect(output).toMatch(/--dry-run/);
  });
});
