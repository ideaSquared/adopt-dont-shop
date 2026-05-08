import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('./logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { assertAllowedFrontendUrl, getValidatedFrontendOrigin } from './url-allowlist';

describe('url-allowlist (ADS-438)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('assertAllowedFrontendUrl', () => {
    it('accepts the configured FRONTEND_URL origin', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com';
      expect(assertAllowedFrontendUrl('https://app.example.com')).toBe('https://app.example.com');
    });

    it('rejects an origin not in the allowlist', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com';
      expect(() => assertAllowedFrontendUrl('https://attacker.example')).toThrow(
        /not in the configured allowlist/
      );
    });

    it('rejects http:// in production even when origin matches', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'http://app.example.com';
      expect(() => assertAllowedFrontendUrl('http://app.example.com')).toThrow(
        /non-HTTPS scheme in production/
      );
    });

    it('accepts the rescue frontend origin', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com';
      process.env.RESCUE_FRONTEND_URL = 'https://rescue.example.com';
      expect(assertAllowedFrontendUrl('https://rescue.example.com')).toBe(
        'https://rescue.example.com'
      );
    });

    it('rejects an unparseable URL', () => {
      process.env.NODE_ENV = 'development';
      expect(() => assertAllowedFrontendUrl('not a url')).toThrow(/not parseable/);
    });

    it('allows http://localhost in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:3000';
      expect(assertAllowedFrontendUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('rejects http to a non-loopback host in non-prod', () => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://random.example';
      expect(() => assertAllowedFrontendUrl('http://random.example')).toThrow(
        /non-loopback host in non-prod/
      );
    });
  });

  describe('getValidatedFrontendOrigin', () => {
    it('returns the validated origin without trailing slash', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://app.example.com/';
      expect(getValidatedFrontendOrigin()).toBe('https://app.example.com');
    });

    it('throws if FRONTEND_URL is missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      expect(() => getValidatedFrontendOrigin()).toThrow(/FRONTEND_URL is not set in production/);
    });

    it('falls back to localhost in dev when FRONTEND_URL is missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.FRONTEND_URL;
      expect(getValidatedFrontendOrigin()).toBe('http://localhost:3000');
    });

    it('refuses to build links with non-allowlist origin in prod', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://attacker.example';
      // FRONTEND_URL itself becomes the allowlist, so this would actually pass —
      // the threat model is that something downstream tries to build a link
      // with a different host. Verify by directly probing assertAllowedFrontendUrl
      // with a URL that does not match the env.
      expect(() => assertAllowedFrontendUrl('https://other.example')).toThrow();
    });
  });
});
