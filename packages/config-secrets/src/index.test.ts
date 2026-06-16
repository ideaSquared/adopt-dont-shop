import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { parsePort, readSecret, requireSecret } from './index.js';

describe('readSecret', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'config-secrets-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns the trimmed contents of the file when NAME_FILE is set', () => {
    const file = join(tmp, 'jwt');
    writeFileSync(file, '  super-secret-value\n');

    expect(readSecret('JWT_SECRET', { JWT_SECRET_FILE: file })).toBe('super-secret-value');
  });

  it('returns the env value as-is when NAME is set and NAME_FILE is not', () => {
    expect(readSecret('JWT_SECRET', { JWT_SECRET: 'plain-env-value' })).toBe('plain-env-value');
  });

  it('returns undefined when neither NAME nor NAME_FILE is set', () => {
    expect(readSecret('JWT_SECRET', {})).toBeUndefined();
  });

  it('refuses to guess when both NAME and NAME_FILE are set', () => {
    const file = join(tmp, 'jwt');
    writeFileSync(file, 'file-value');

    expect(() =>
      readSecret('JWT_SECRET', { JWT_SECRET: 'env-value', JWT_SECRET_FILE: file })
    ).toThrow(/JWT_SECRET and JWT_SECRET_FILE are both set/);
  });

  it('propagates fs errors when NAME_FILE points at a missing file', () => {
    expect(() =>
      readSecret('JWT_SECRET', { JWT_SECRET_FILE: join(tmp, 'does-not-exist') })
    ).toThrow();
  });

  it('preserves an empty-string env value (treats it as set, not absent)', () => {
    expect(readSecret('JWT_SECRET', { JWT_SECRET: '' })).toBe('');
  });

  it('returns an empty string when the file is empty / whitespace only', () => {
    const file = join(tmp, 'jwt');
    writeFileSync(file, '   \n');

    expect(readSecret('JWT_SECRET', { JWT_SECRET_FILE: file })).toBe('');
  });
});

describe('requireSecret', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'config-secrets-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns the value when NAME is set', () => {
    expect(requireSecret('JWT_SECRET', { JWT_SECRET: 'value' })).toBe('value');
  });

  it('returns the file contents when NAME_FILE is set', () => {
    const file = join(tmp, 'jwt');
    writeFileSync(file, 'file-value');

    expect(requireSecret('JWT_SECRET', { JWT_SECRET_FILE: file })).toBe('file-value');
  });

  it('trims surrounding whitespace from the resolved value', () => {
    expect(requireSecret('JWT_SECRET', { JWT_SECRET: '  value  ' })).toBe('value');
  });

  it('throws when the secret is missing — no description', () => {
    expect(() => requireSecret('JWT_SECRET', {})).toThrow(/JWT_SECRET is required/);
  });

  it('throws when the secret is missing — with description', () => {
    expect(() => requireSecret('JWT_SECRET', {}, 'access-token signing secret')).toThrow(
      'JWT_SECRET is required (access-token signing secret)'
    );
  });

  it('throws when the value is blank (whitespace only)', () => {
    expect(() => requireSecret('JWT_SECRET', { JWT_SECRET: '   ' })).toThrow(
      /JWT_SECRET is required/
    );
  });

  it('throws when a present value is shorter than minBytes', () => {
    expect(() =>
      requireSecret('JWT_SECRET', { JWT_SECRET: 'short' }, undefined, { minBytes: 32 })
    ).toThrow(/JWT_SECRET must be at least 32 bytes/);
  });

  it('accepts a value that meets minBytes', () => {
    const value = 'a-signing-secret-that-is-at-least-32-bytes';
    expect(requireSecret('JWT_SECRET', { JWT_SECRET: value }, undefined, { minBytes: 32 })).toBe(
      value
    );
  });

  it('refuses to guess when both NAME and NAME_FILE are set (delegates to readSecret)', () => {
    const file = join(tmp, 'jwt');
    writeFileSync(file, 'file-value');

    expect(() =>
      requireSecret('JWT_SECRET', { JWT_SECRET: 'env-value', JWT_SECRET_FILE: file })
    ).toThrow(/JWT_SECRET and JWT_SECRET_FILE are both set/);
  });
});

describe('parsePort', () => {
  it('returns the fallback when raw is undefined', () => {
    expect(parsePort(undefined, 5002, 'AUTH_PORT')).toBe(5002);
  });

  it('returns the fallback when raw is blank / whitespace only', () => {
    expect(parsePort('   ', 5002, 'AUTH_PORT')).toBe(5002);
  });

  it('parses a valid port string', () => {
    expect(parsePort('8080', 5002, 'AUTH_PORT')).toBe(8080);
  });

  it('trims whitespace before parsing', () => {
    expect(parsePort('  8080  ', 5002, 'AUTH_PORT')).toBe(8080);
  });

  it('throws naming the variable when value is non-numeric', () => {
    expect(() => parsePort('five-thousand', 5002, 'AUTH_PORT')).toThrow(
      'AUTH_PORT must be a positive integer, got "five-thousand"'
    );
  });

  it('throws when value is zero', () => {
    expect(() => parsePort('0', 5002, 'AUTH_PORT')).toThrow(/AUTH_PORT must be a positive integer/);
  });

  it('throws when value is negative', () => {
    expect(() => parsePort('-1', 5002, 'AUTH_PORT')).toThrow(
      /AUTH_PORT must be a positive integer/
    );
  });
});
