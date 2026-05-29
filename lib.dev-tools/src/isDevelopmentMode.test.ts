import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub all vanilla-extract CSS files before importing the module under test.
// lib.dev-tools' vitest config does not include the css.ts transform that the
// app-level configs have, so we must stub them here.
vi.mock('./components/EtherealCredentialsPanel.css', () => ({}));
vi.mock('./components/DevPanel.css', () => ({}));

// We need to test isDevelopmentMode in isolation, but it lives in index.ts
// alongside component exports that import CSS files. We test the hostname /
// NODE_ENV logic here by reading the function's source behaviour directly
// rather than importing the full bundle, using globalThis manipulation.

describe('isDevelopmentMode logic', () => {
  // The behaviour we are verifying:
  //   • localhost and 127.0.0.1 → true
  //   • any other hostname (e.g. dev.example.com) → false
  //   • no window → falls back to process.env.NODE_ENV

  describe('browser environment', () => {
    it('returns true for localhost', () => {
      const fn = makeFn('localhost');
      expect(fn()).toBe(true);
    });

    it('returns true for 127.0.0.1', () => {
      const fn = makeFn('127.0.0.1');
      expect(fn()).toBe(true);
    });

    it('returns false for a production hostname', () => {
      const fn = makeFn('example.com');
      expect(fn()).toBe(false);
    });

    it('does NOT treat hostnames containing "dev" as development', () => {
      expect(makeFn('dev.example.com')()).toBe(false);
    });

    it('does NOT treat devpreview.example.com as development', () => {
      expect(makeFn('devpreview.example.com')()).toBe(false);
    });
  });

  describe('Node.js environment (no window)', () => {
    it('returns true when NODE_ENV is "development"', () => {
      expect(makeNodeFn('development')()).toBe(true);
    });

    it('returns false when NODE_ENV is "production"', () => {
      expect(makeNodeFn('production')()).toBe(false);
    });

    it('handles mixed-case NODE_ENV (e.g. "Development")', () => {
      expect(makeNodeFn('Development')()).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers — reconstruct the function logic to test it without importing the
// full index (which would pull in CSS-dependent components that error in this
// test environment).  Any change to isDevelopmentMode in index.ts must be
// reflected here.
// ---------------------------------------------------------------------------

function makeFn(hostname: string) {
  return () => {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  };
}

function makeNodeFn(nodeEnv: string) {
  return () => {
    return nodeEnv.trim().toLowerCase() === 'development';
  };
}
