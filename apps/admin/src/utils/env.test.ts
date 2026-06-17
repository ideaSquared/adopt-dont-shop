import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDevelopment } from './env';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isDevelopment', () => {
  it('returns true when the Vite DEV flag is set', () => {
    vi.stubEnv('DEV', true);

    expect(isDevelopment()).toBe(true);
  });

  it('returns false when the Vite DEV flag is not set', () => {
    vi.stubEnv('DEV', false);

    expect(isDevelopment()).toBe(false);
  });
});
