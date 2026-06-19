import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { assertSpamAllowed } from './env-guard.js';

// assertSpamAllowed is a double-gate that protects against a stray DATABASE_URL
// flooding the wrong database: the bulk-insert volume it unlocks must only ever
// reach a development/test database that the operator has explicitly armed.
describe('assertSpamAllowed', () => {
  const original = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ALLOW_SPAM;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('allows a development environment that is explicitly armed', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).not.toThrow();
  });

  it('allows a test environment that is explicitly armed', () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).not.toThrow();
  });

  it('refuses a production environment even when armed', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/production/);
  });

  it('refuses a staging environment even when armed', () => {
    process.env.NODE_ENV = 'staging';
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/staging/);
  });

  it('refuses development when the arming flag is absent', () => {
    process.env.NODE_ENV = 'development';

    expect(() => assertSpamAllowed()).toThrow(/ALLOW_SPAM/);
  });

  it('refuses development when the arming flag is not exactly "true"', () => {
    process.env.NODE_ENV = 'development';
    process.env.ALLOW_SPAM = '1';

    expect(() => assertSpamAllowed()).toThrow(/ALLOW_SPAM/);
  });

  // An unset NODE_ENV is the bare `node script.ts` case. Treat it as the most
  // dangerous reading (could be anything) and refuse rather than default-allow.
  it('refuses when NODE_ENV is unset', () => {
    process.env.ALLOW_SPAM = 'true';

    expect(() => assertSpamAllowed()).toThrow(/NODE_ENV/);
  });
});
