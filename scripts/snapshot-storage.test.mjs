import { execFile } from 'child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { beforeEach, describe, expect, it } from 'vitest';

const run = promisify(execFile);

// A stand-in `aws` that records its arguments, so the upload flags can be checked without AWS or R2.
let bin;
let log;
let data;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'snapshot-'));
  bin = join(dir, 'bin');
  log = join(dir, 'aws.log');
  data = join(dir, 'data');
  mkdirSync(bin);
  mkdirSync(data);
  writeFileSync(join(data, 'file.txt'), 'x');
  writeFileSync(join(bin, 'aws'), `#!/usr/bin/env bash\necho "$*" >> "${log}"\n`);
  chmodSync(join(bin, 'aws'), 0o755);
});

const snapshot = (script, pathVar, env = {}) =>
  run('bash', [join(import.meta.dirname, script)], {
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      BACKUP_BUCKET: 'ads-backups',
      AWS_REGION: 'auto',
      AWS_ENDPOINT_URL: undefined,
      [pathVar]: data,
      ...env,
    },
  });

const awsCall = () => readFileSync(log, 'utf8').trim();

describe.each([
  ['snapshot-uploads.sh', 'UPLOADS_PATH', 'uploads'],
  ['snapshot-nats.sh', 'NATS_DATA_PATH', 'nats'],
])('%s', (script, pathVar, prefix) => {
  it('asks AWS for SSE-S3 encryption', async () => {
    await snapshot(script, pathVar);
    expect(awsCall()).toContain('--sse AES256');
  });

  it('leaves the AWS-only SSE header out for an S3-compatible endpoint such as R2', async () => {
    await snapshot(script, pathVar, { AWS_ENDPOINT_URL: 'https://acct.r2.cloudflarestorage.com' });
    expect(awsCall()).not.toContain('--sse');
    expect(awsCall()).toContain('Retention=');
  });

  it('writes each run to its own prefix, so a locked bucket never sees an overwrite', async () => {
    await snapshot(script, pathVar);
    expect(awsCall()).toMatch(
      new RegExp(`s3://ads-backups/${prefix}/\\d{4}/\\d{2}/\\d{2}/\\d{6}/`)
    );
  });
});
