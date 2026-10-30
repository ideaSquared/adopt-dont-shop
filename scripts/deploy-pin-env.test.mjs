import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-pin-env.sh');

const SHA = 'a'.repeat(40);
const OTHER_SHA = 'b'.repeat(40);

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'deploy-pin-env-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeEnv(contents) {
  writeFileSync(join(dir, '.env'), contents);
}

function readEnv() {
  return readFileSync(join(dir, '.env'), 'utf8');
}

function run(sha, tagOverrides = '') {
  return execFileSync('bash', [SCRIPT, sha], {
    cwd: dir,
    env: { ...process.env, TAG_OVERRIDES: tagOverrides },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runExpectingFailure(sha, tagOverrides = '') {
  expect(() => run(sha, tagOverrides)).toThrow();
}

describe('deploy-pin-env.sh', () => {
  it('adds DEPLOY_SHA on a first deploy when the host .env has no DEPLOY_SHA line', () => {
    writeEnv('POSTGRES_USER=ads_prod\n');

    run(SHA);

    expect(readEnv()).toBe(`POSTGRES_USER=ads_prod\nDEPLOY_SHA=${SHA}\n`);
  });

  it('replaces an existing DEPLOY_SHA in place', () => {
    writeEnv(`POSTGRES_USER=ads_prod\nDEPLOY_SHA=${OTHER_SHA}\nREDIS_PASSWORD=pw\n`);

    run(SHA);

    expect(readEnv()).toBe(`POSTGRES_USER=ads_prod\nDEPLOY_SHA=${SHA}\nREDIS_PASSWORD=pw\n`);
  });

  it('does not glue DEPLOY_SHA onto the last line when .env lacks a trailing newline', () => {
    writeEnv('POSTGRES_USER=ads_prod');

    run(SHA);

    expect(readEnv()).toBe(`POSTGRES_USER=ads_prod\nDEPLOY_SHA=${SHA}\n`);
  });

  it('clears per-service tag overrides left behind by an earlier deploy', () => {
    writeEnv(
      `DEPLOY_SHA=${OTHER_SHA}\nSERVICE_AUTH_TAG=${OTHER_SHA}\nAPP_ADMIN_TAG=${OTHER_SHA}\nPOSTGRES_DB=ads\n`
    );

    run(SHA);

    expect(readEnv()).toBe(`DEPLOY_SHA=${SHA}\nPOSTGRES_DB=ads\n`);
  });

  it('applies valid comma- and newline-separated tag overrides', () => {
    writeEnv('POSTGRES_DB=ads\n');

    run(SHA, ` SERVICE_AUTH_TAG=${OTHER_SHA} ,\nAPP_RESCUE_TAG=${OTHER_SHA}\n`);

    expect(readEnv()).toBe(
      `POSTGRES_DB=ads\nDEPLOY_SHA=${SHA}\nSERVICE_AUTH_TAG=${OTHER_SHA}\nAPP_RESCUE_TAG=${OTHER_SHA}\n`
    );
  });

  it.each([
    ['a short SHA', 'abc1234'],
    ['an uppercase SHA', 'A'.repeat(40)],
    ['a mutable tag', 'latest'],
    ['shell metacharacters', `${SHA};rm -rf /`],
  ])('rejects %s as the deploy SHA and leaves .env untouched', (_label, sha) => {
    writeEnv('POSTGRES_DB=ads\n');

    runExpectingFailure(sha);

    expect(readEnv()).toBe('POSTGRES_DB=ads\n');
  });

  it.each([
    ['a key outside the SERVICE_/APP_ namespace', `POSTGRES_PASSWORD_TAG=${OTHER_SHA}`],
    ['a non-SHA value', 'SERVICE_AUTH_TAG=latest'],
    ['a short SHA value', 'SERVICE_AUTH_TAG=abc1234'],
    ['a pair with no value', 'SERVICE_AUTH_TAG'],
  ])('rejects %s and leaves .env untouched', (_label, overrides) => {
    writeEnv(`DEPLOY_SHA=${OTHER_SHA}\nSERVICE_PETS_TAG=${OTHER_SHA}\n`);

    runExpectingFailure(SHA, overrides);

    expect(readEnv()).toBe(`DEPLOY_SHA=${OTHER_SHA}\nSERVICE_PETS_TAG=${OTHER_SHA}\n`);
  });

  it('fails when there is no .env in the working directory', () => {
    runExpectingFailure(SHA);
  });
});
