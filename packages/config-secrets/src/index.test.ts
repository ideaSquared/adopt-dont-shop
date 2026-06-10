import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readSecret, requireSecret } from './index.js';

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

  it('throws a descriptive error naming both env shapes when missing', () => {
    expect(() => requireSecret('JWT_SECRET', {})).toThrow(
      /JWT_SECRET \(or JWT_SECRET_FILE\) is required/
    );
  });
});
