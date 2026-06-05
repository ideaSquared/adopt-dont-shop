import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses the documented defaults when no env vars are set', () => {
    const config = loadConfig({});
    expect(config.port).toBe(5001);
    expect(config.host).toBe('0.0.0.0');
    expect(config.environment).toBe('development');
  });

  it('honours NOTIFICATIONS_PORT / NOTIFICATIONS_HOST / NODE_ENV when set', () => {
    const config = loadConfig({
      NOTIFICATIONS_PORT: '5500',
      NOTIFICATIONS_HOST: '127.0.0.1',
      NODE_ENV: 'production',
    });

    expect(config.port).toBe(5500);
    expect(config.host).toBe('127.0.0.1');
    expect(config.environment).toBe('production');
  });

  it('rejects a non-numeric NOTIFICATIONS_PORT', () => {
    expect(() => loadConfig({ NOTIFICATIONS_PORT: 'five-thousand' })).toThrow(
      /NOTIFICATIONS_PORT must be a positive integer/
    );
  });

  it('rejects a non-positive NOTIFICATIONS_PORT', () => {
    expect(() => loadConfig({ NOTIFICATIONS_PORT: '0' })).toThrow(
      /NOTIFICATIONS_PORT must be a positive integer/
    );
    expect(() => loadConfig({ NOTIFICATIONS_PORT: '-1' })).toThrow(
      /NOTIFICATIONS_PORT must be a positive integer/
    );
  });

  it('trims surrounding whitespace from string env values', () => {
    const config = loadConfig({ NOTIFICATIONS_HOST: '  localhost  ' });
    expect(config.host).toBe('localhost');
  });
});
