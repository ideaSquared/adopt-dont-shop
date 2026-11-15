import { describe, expect, it } from 'vitest';

import { deployEnvironment } from './deploy-environment.js';

describe('deployEnvironment', () => {
  it('tells staging apart from production when NODE_ENV is production on both', () => {
    expect(deployEnvironment({ NODE_ENV: 'production', DEPLOY_ENV: 'staging' })).toBe('staging');
    expect(deployEnvironment({ NODE_ENV: 'production', DEPLOY_ENV: 'production' })).toBe(
      'production'
    );
  });

  it('tolerates surrounding whitespace in DEPLOY_ENV', () => {
    expect(deployEnvironment({ NODE_ENV: 'production', DEPLOY_ENV: ' staging ' })).toBe('staging');
  });

  it('falls back to NODE_ENV when DEPLOY_ENV is unset, empty or not a known value', () => {
    expect(deployEnvironment({ NODE_ENV: 'production' })).toBe('production');
    expect(deployEnvironment({ NODE_ENV: 'production', DEPLOY_ENV: '' })).toBe('production');
    expect(deployEnvironment({ NODE_ENV: 'development', DEPLOY_ENV: 'qa' })).toBe('development');
    expect(deployEnvironment({ NODE_ENV: 'development', DEPLOY_ENV: 'Staging' })).toBe(
      'development'
    );
  });

  it('defaults to development when neither variable is set', () => {
    expect(deployEnvironment({})).toBe('development');
  });

  it('reads process.env by default', () => {
    const saved = { deploy: process.env.DEPLOY_ENV, node: process.env.NODE_ENV };
    process.env.DEPLOY_ENV = 'staging';
    try {
      expect(deployEnvironment()).toBe('staging');
    } finally {
      if (saved.deploy === undefined) delete process.env.DEPLOY_ENV;
      else process.env.DEPLOY_ENV = saved.deploy;
    }
  });
});
