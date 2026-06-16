import { describe, expect, it } from 'vitest';

import { redactSecretFields, REDACTED } from './redact.js';

describe('redactSecretFields', () => {
  it('redacts secret-shaped top-level keys regardless of casing or affixes', () => {
    const out = redactSecretFields({
      password: 'hunter2',
      passwordHash: 'abc',
      ACCESS_TOKEN: 'jwt',
      refreshToken: 'r',
      'x-api-key': 'k',
      authorization: 'Bearer x',
      Cookie: 'session=1',
      otp: '123456',
      secretSauce: 's',
    });
    expect(out).toEqual({
      password: REDACTED,
      passwordHash: REDACTED,
      ACCESS_TOKEN: REDACTED,
      refreshToken: REDACTED,
      'x-api-key': REDACTED,
      authorization: REDACTED,
      Cookie: REDACTED,
      otp: REDACTED,
      secretSauce: REDACTED,
    });
  });

  it('leaves non-secret keys intact', () => {
    const out = redactSecretFields({ userId: 'u1', email: 'a@b.com', count: 3 });
    expect(out).toEqual({ userId: 'u1', email: 'a@b.com', count: 3 });
  });

  it('recurses through nested objects and arrays', () => {
    const out = redactSecretFields({
      user: { id: 'u1', credentials: { password: 'p' } },
      events: [{ token: 't1' }, { ok: true }],
    });
    expect(out).toEqual({
      user: { id: 'u1', credentials: { password: REDACTED } },
      events: [{ token: REDACTED }, { ok: true }],
    });
  });

  it('does not mutate the input', () => {
    const input = { password: 'p', nested: { token: 't' } };
    const out = redactSecretFields(input);
    expect(input).toEqual({ password: 'p', nested: { token: 't' } });
    expect(out).not.toBe(input);
  });

  it('passes primitives and null/undefined through unchanged', () => {
    expect(redactSecretFields('plain')).toBe('plain');
    expect(redactSecretFields(42)).toBe(42);
    expect(redactSecretFields(null)).toBeNull();
    expect(redactSecretFields(undefined)).toBeUndefined();
  });
});
