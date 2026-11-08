import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

const KEY = 'k'.repeat(32);
const base: NodeJS.ProcessEnv = {
  OPS_ENV: 'staging',
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://u:p@db/ops',
  PRINCIPAL_SIGNING_KEY: KEY,
  OPS_GITHUB_CLIENT_ID: 'cid',
  OPS_GITHUB_ORG: 'acme',
  OPS_GITHUB_TEAM: 'ops-staging',
};

describe('loadConfig', () => {
  it('loads github mode with gateway-style gRPC defaults', () => {
    const config = loadConfig(base);
    expect(config).toMatchObject({
      env: 'staging',
      port: 4100,
      authMode: 'github',
      sessionTtlHours: 8,
      github: { org: 'acme', team: 'ops-staging' },
    });
    expect(config.grpcTargets.pets).toBe('service-pets:6003');
  });

  it('honours gRPC target overrides', () => {
    expect(loadConfig({ ...base, PETS_GRPC_URL: 'localhost:9' }).grpcTargets.pets).toBe(
      'localhost:9'
    );
  });

  it('requires OPS_ENV to be set explicitly', () => {
    expect(() => loadConfig({ ...base, OPS_ENV: undefined })).toThrow(/OPS_ENV/);
    expect(() => loadConfig({ ...base, OPS_ENV: 'production' })).toThrow(/OPS_ENV/);
  });

  it('refuses to boot without a strong PRINCIPAL_SIGNING_KEY', () => {
    expect(() => loadConfig({ ...base, PRINCIPAL_SIGNING_KEY: undefined })).toThrow(
      /PRINCIPAL_SIGNING_KEY/
    );
    expect(() => loadConfig({ ...base, PRINCIPAL_SIGNING_KEY: 'short' })).toThrow(/32 bytes/);
  });

  it('refuses local auth outside NODE_ENV=development and OPS_ENV=dev', () => {
    const local = { ...base, OPS_AUTH_MODE: 'local' };
    expect(() => loadConfig(local)).toThrow(/local/);
    expect(() => loadConfig({ ...local, NODE_ENV: 'development' })).toThrow(/local/);
    expect(loadConfig({ ...local, NODE_ENV: 'development', OPS_ENV: 'dev' })).toMatchObject({
      authMode: 'local',
      github: null,
    });
  });

  it('requires GitHub settings in github mode', () => {
    expect(() => loadConfig({ ...base, OPS_GITHUB_TEAM: undefined })).toThrow(/OPS_GITHUB/);
  });

  it('validates the session TTL and unknown auth modes', () => {
    expect(() => loadConfig({ ...base, OPS_SESSION_TTL_HOURS: '0' })).toThrow(/TTL/);
    expect(() => loadConfig({ ...base, OPS_AUTH_MODE: 'sso' })).toThrow(/OPS_AUTH_MODE/);
  });
});
