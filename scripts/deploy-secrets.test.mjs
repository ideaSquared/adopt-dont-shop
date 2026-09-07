import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = join(import.meta.dirname, 'deploy-secrets.sh');

const REQUIRED_SECRET_ENV = {
  SECRET_JWT_SECRET: 'jwt-secret-value',
  SECRET_JWT_REFRESH_SECRET: 'jwt-refresh-value',
  SECRET_ENCRYPTION_KEY: 'encryption-key-value',
  SECRET_UPLOAD_SIGNING_SECRET: 'upload-signing-value',
  SECRET_DB_PASSWORD: 'db-password-value',
  SECRET_PRINCIPAL_SIGNING_KEY: 'principal-signing-value',
  SECRET_NATS_AUTH_TOKEN: 'nats-token-value',
};

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'deploy-secrets-'));
  writeFileSync(
    join(dir, '.env'),
    'POSTGRES_USER=ads_prod\nPOSTGRES_DB=adopt_dont_shop_prod\nREDIS_PASSWORD=redis-pw\n'
  );
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function readSecret(name) {
  return readFileSync(join(dir, 'secrets', name), 'utf8');
}

describe('deploy-secrets.sh', () => {
  it('materializes every required secret file from .env + provided secrets', () => {
    execFileSync('bash', [SCRIPT], {
      cwd: dir,
      env: { ...process.env, ...REQUIRED_SECRET_ENV },
    });

    expect(readSecret('database_url')).toBe(
      'postgresql://ads_prod:db-password-value@database:5432/adopt_dont_shop_prod'
    );
    expect(readSecret('redis_url')).toBe('redis://:redis-pw@redis:6379');
    expect(readSecret('redis_password')).toBe('redis-pw');
    expect(readSecret('jwt_secret')).toBe('jwt-secret-value');
    expect(readSecret('jwt_refresh_secret')).toBe('jwt-refresh-value');
    expect(readSecret('encryption_key')).toBe('encryption-key-value');
    expect(readSecret('upload_signing_secret')).toBe('upload-signing-value');
    expect(readSecret('principal_signing_key')).toBe('principal-signing-value');
    expect(readSecret('nats_auth_token')).toBe('nats-token-value');
    expect(readSecret('db_password')).toBe('db-password-value');
  });

  it('locks down the secrets directory and files', () => {
    execFileSync('bash', [SCRIPT], {
      cwd: dir,
      env: { ...process.env, ...REQUIRED_SECRET_ENV },
    });

    const dirMode = statSync(join(dir, 'secrets')).mode & 0o777;
    const fileMode = statSync(join(dir, 'secrets', 'jwt_secret')).mode & 0o777;
    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });

  it('fails fast with the offending name(s) when a required secret is missing', () => {
    const { SECRET_NATS_AUTH_TOKEN: _omit, ...partial } = REQUIRED_SECRET_ENV;
    expect(() =>
      execFileSync('bash', [SCRIPT], {
        cwd: dir,
        env: { ...process.env, ...partial },
        stdio: 'pipe',
      })
    ).toThrowError(/SECRET_NATS_AUTH_TOKEN/);
  });

  it('fails fast when the host .env is missing a required non-secret key', () => {
    writeFileSync(join(dir, '.env'), 'POSTGRES_USER=ads_prod\n');
    expect(() =>
      execFileSync('bash', [SCRIPT], {
        cwd: dir,
        env: { ...process.env, ...REQUIRED_SECRET_ENV },
        stdio: 'pipe',
      })
    ).toThrowError(/POSTGRES_DB missing from \.env/);
  });
});
