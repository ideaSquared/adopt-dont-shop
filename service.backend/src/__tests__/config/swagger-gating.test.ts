import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { shouldExposeApiDocs } from '../../config/swagger';

describe('shouldExposeApiDocs (ADS-412)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalExpose = process.env.EXPOSE_API_DOCS;

  beforeEach(() => {
    delete process.env.EXPOSE_API_DOCS;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalExpose === undefined) {
      delete process.env.EXPOSE_API_DOCS;
    } else {
      process.env.EXPOSE_API_DOCS = originalExpose;
    }
  });

  it('exposes docs in development by default', () => {
    process.env.NODE_ENV = 'development';
    expect(shouldExposeApiDocs()).toBe(true);
  });

  it('exposes docs in test/staging by default (anything not production)', () => {
    process.env.NODE_ENV = 'staging';
    expect(shouldExposeApiDocs()).toBe(true);
  });

  it('hides docs in production by default', () => {
    process.env.NODE_ENV = 'production';
    expect(shouldExposeApiDocs()).toBe(false);
  });

  it('opt-in: EXPOSE_API_DOCS=true overrides production gate', () => {
    process.env.NODE_ENV = 'production';
    process.env.EXPOSE_API_DOCS = 'true';
    expect(shouldExposeApiDocs()).toBe(true);
  });
});
