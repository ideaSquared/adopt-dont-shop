import { execFileSync } from 'child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-glitchtip-secrets.sh');

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'deploy-glitchtip-secrets-'));
  mkdirSync(join(dir, 'secrets'), { mode: 0o700 }); // deploy-secrets.sh runs first in practice
  writeFileSync(
    join(dir, '.env'),
    'GLITCHTIP_DB_PASSWORD=gt-db-pw\nGLITCHTIP_SECRET_KEY=gt-secret-key\nGLITCHTIP_REDIS_PASSWORD=gt-redis-pw\n'
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function readSecret(name) {
  return readFileSync(join(dir, 'secrets', name), 'utf8');
}

describe('deploy-glitchtip-secrets.sh', () => {
  it('materializes the three GlitchTip secret files from .env', () => {
    execFileSync('bash', [SCRIPT], { cwd: dir });

    expect(readSecret('glitchtip_db_password')).toBe('gt-db-pw');
    expect(readSecret('glitchtip_secret_key')).toBe('gt-secret-key');
    expect(readSecret('glitchtip_redis_password')).toBe('gt-redis-pw');
  });

  it('locks down the secret files', () => {
    execFileSync('bash', [SCRIPT], { cwd: dir });

    const fileMode = statSync(join(dir, 'secrets', 'glitchtip_db_password')).mode & 0o777;
    expect(fileMode).toBe(0o600);
  });

  it('fails fast with the offending key when a required .env value is missing', () => {
    writeFileSync(join(dir, '.env'), 'GLITCHTIP_DB_PASSWORD=gt-db-pw\n');
    expect(() => execFileSync('bash', [SCRIPT], { cwd: dir, stdio: 'pipe' })).toThrowError(
      /GLITCHTIP_SECRET_KEY missing from \.env/
    );
  });
});
