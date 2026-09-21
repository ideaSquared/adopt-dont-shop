import { describe, expect, it } from 'vitest';

import { maskPiiFields, maskPiiValue, redactSecretFields, redactUrl, REDACTED } from './redact.js';

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

describe('maskPiiValue', () => {
  it('keeps the first local-part character and the domain for an email', () => {
    expect(maskPiiValue('adopter@example.com')).toBe('a***@example.com');
  });

  it('keeps only the first character for a non-email string', () => {
    expect(maskPiiValue('Jane')).toBe('J***');
    expect(maskPiiValue('07700 900123')).toBe('0***');
  });

  it('does not reveal the original length', () => {
    expect(maskPiiValue('verylongname@domain.tld')).not.toContain('verylongname');
    expect(maskPiiValue('a very long address, second line')).toBe('a***');
  });

  it('redacts a non-string value wholesale (cannot be partially masked)', () => {
    expect(maskPiiValue(42)).toBe(REDACTED);
    expect(maskPiiValue(true)).toBe(REDACTED);
    expect(maskPiiValue({ line1: '10 Downing St' })).toBe(REDACTED);
    expect(maskPiiValue(['a@b.com'])).toBe(REDACTED);
  });

  it('passes null/undefined/empty string through unchanged', () => {
    expect(maskPiiValue(null)).toBeNull();
    expect(maskPiiValue(undefined)).toBeUndefined();
    expect(maskPiiValue('')).toBe('');
  });
});

describe('maskPiiFields', () => {
  it('masks PII-shaped top-level keys regardless of casing or affixes', () => {
    const out = maskPiiFields({
      email: 'adopter@example.com',
      phone: '07700900123',
      mobile: '07700900124',
      address: '10 Downing Street',
      postcode: 'SW1A 2AA',
      postalCode: 'SW1A 2AA',
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '2000-01-01',
      userId: 'u1',
    });
    expect(out).toEqual({
      email: 'a***@example.com',
      phone: '0***',
      mobile: '0***',
      address: '1***',
      postcode: 'S***',
      postalCode: 'S***',
      firstName: 'J***',
      lastName: 'D***',
      dateOfBirth: '2***',
      userId: 'u1',
    });
  });

  it('leaves non-PII keys intact', () => {
    const out = maskPiiFields({ userId: 'u1', password: 'hunter2', count: 3 });
    expect(out).toEqual({ userId: 'u1', password: 'hunter2', count: 3 });
  });

  it('recurses through nested objects and arrays', () => {
    const out = maskPiiFields({
      user: { id: 'u1', profile: { email: 'a@b.com' } },
      contacts: [{ phone: '07700900123' }, { ok: true }],
    });
    expect(out).toEqual({
      user: { id: 'u1', profile: { email: 'a***@b.com' } },
      contacts: [{ phone: '0***' }, { ok: true }],
    });
  });

  it('does not mutate the input', () => {
    const input = { email: 'a@b.com', nested: { firstName: 'Jane' } };
    const out = maskPiiFields(input);
    expect(input).toEqual({ email: 'a@b.com', nested: { firstName: 'Jane' } });
    expect(out).not.toBe(input);
  });

  it('passes primitives and null/undefined through unchanged', () => {
    expect(maskPiiFields('plain')).toBe('plain');
    expect(maskPiiFields(42)).toBe(42);
    expect(maskPiiFields(null)).toBeNull();
    expect(maskPiiFields(undefined)).toBeUndefined();
  });
});

describe('redactUrl', () => {
  it('strips the query string', () => {
    expect(redactUrl('/api/v1/pets?resetToken=abc123&apiKey=xyz')).toBe('/api/v1/pets');
  });

  it('leaves a URL with no query string unchanged', () => {
    expect(redactUrl('/api/v1/pets/123')).toBe('/api/v1/pets/123');
  });

  it('redacts the secret in a signed-upload-serve path', () => {
    expect(redactUrl('/uploads-signed/1700000000/abc123signature/foo/bar.png')).toBe(
      `/uploads-signed/${REDACTED}`
    );
  });

  it('redacts a signed-upload path even when it also carries a query string', () => {
    expect(redactUrl('/uploads-signed/1700000000/abc123signature/foo.png?x=1')).toBe(
      `/uploads-signed/${REDACTED}`
    );
  });

  it('handles a bare path with no leading slash oddities gracefully', () => {
    expect(redactUrl('/health/simple')).toBe('/health/simple');
  });
});
