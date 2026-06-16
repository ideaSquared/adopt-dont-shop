import { describe, expect, it } from 'vitest';

import { redactAuditPayload } from './redact-audit-payload.js';

describe('redactAuditPayload', () => {
  // --- passthrough cases ---

  it('returns undefined unchanged', () => {
    expect(redactAuditPayload(undefined)).toBeUndefined();
  });

  it('returns null unchanged', () => {
    expect(redactAuditPayload(null)).toBeNull();
  });

  it('returns a primitive string unchanged', () => {
    expect(redactAuditPayload('hello')).toBe('hello');
  });

  it('returns a number unchanged', () => {
    expect(redactAuditPayload(42)).toBe(42);
  });

  it('returns an empty object unchanged', () => {
    expect(redactAuditPayload({})).toEqual({});
  });

  it('returns an object with no sensitive keys unchanged', () => {
    const input = { userId: 'abc', action: 'login', outcome: 'success' };
    expect(redactAuditPayload(input)).toEqual(input);
  });

  // --- deny-list coverage (top-level keys) ---

  it.each([
    ['password', 'hunter2'],
    ['Password', 'hunter2'],
    ['PASSWORD', 'hunter2'],
    ['passwordHash', '$2b$10$...'],
    ['token', 'tok_123'],
    ['accessToken', 'eyJ...'],
    ['refreshToken', 'rt_abc'],
    ['ACCESS_TOKEN', 'eyJ...'],
    ['otp', '123456'],
    ['OTP', '123456'],
    ['secret', 's3cr3t'],
    ['clientSecret', 's3cr3t'],
    ['CLIENT_SECRET', 's3cr3t'],
    ['authorization', 'Bearer eyJ...'],
    ['Authorization', 'Bearer eyJ...'],
    ['AUTHORIZATION', 'Bearer eyJ...'],
    ['cookie', 'session=abc'],
    ['Cookie', 'session=abc'],
    ['apiKey', 'key_abc'],
    ['ApiKey', 'key_abc'],
    ['api_key', 'key_abc'],
    ['api-key', 'key_abc'],
    ['API_KEY', 'key_abc'],
  ])('redacts key "%s"', (key, value) => {
    const result = redactAuditPayload({ [key]: value }) as Record<string, unknown>;
    expect(result[key]).toBe('[REDACTED]');
  });

  // --- non-sensitive keys are preserved ---

  it('does not redact a key that merely contains a word starting with "otp" as a prefix elsewhere', () => {
    // "topSecret" contains no deny-list substring — "top" ≠ "token", "secret" IS in the list
    // so topSecret SHOULD be redacted (secret substring match)
    const result = redactAuditPayload({ topSecret: 'foo' }) as Record<string, unknown>;
    expect(result['topSecret']).toBe('[REDACTED]');
  });

  it('preserves non-sensitive keys alongside sensitive ones', () => {
    const result = redactAuditPayload({
      userId: 'u-1',
      action: 'login',
      password: 'secret!',
    }) as Record<string, unknown>;

    expect(result['userId']).toBe('u-1');
    expect(result['action']).toBe('login');
    expect(result['password']).toBe('[REDACTED]');
  });

  // --- PII deny-list coverage ---

  it.each([
    ['email', 'x@example.com'],
    ['userEmail', 'x@example.com'],
    ['emailAddress', 'x@example.com'],
    ['phone', '07700900000'],
    ['phoneNumber', '07700900000'],
    ['address', '1 High St'],
    ['homeAddress', '1 High St'],
    ['postcode', 'SW1A 1AA'],
    ['postalCode', '90210'],
    ['nationalInsurance', 'QQ123456C'],
    ['passport', '123456789'],
    ['dateOfBirth', '1990-01-01'],
    ['creditCard', '4111111111111111'],
    ['cardNumber', '4111111111111111'],
    ['sortCode', '00-00-00'],
    ['bankAccount', '12345678'],
    ['iban', 'GB33BUKB20201555555555'],
    ['ssn', '123-45-6789'],
  ])('redacts PII key "%s"', (key, value) => {
    const result = redactAuditPayload({ [key]: value }) as Record<string, unknown>;
    expect(result[key]).toBe('[REDACTED]');
  });

  it('redacts PII nested inside objects and arrays', () => {
    const result = redactAuditPayload({
      applicant: { name: 'alice', email: 'a@e.com', phone: '07700900000' },
      references: [{ name: 'bob', email: 'b@e.com' }],
    }) as { applicant: Record<string, unknown>; references: Array<Record<string, unknown>> };

    expect(result.applicant['name']).toBe('alice');
    expect(result.applicant['email']).toBe('[REDACTED]');
    expect(result.applicant['phone']).toBe('[REDACTED]');
    expect(result.references[0]['email']).toBe('[REDACTED]');
    expect(result.references[0]['name']).toBe('bob');
  });

  // --- recursive nesting ---

  it('redacts sensitive keys nested inside objects', () => {
    const result = redactAuditPayload({
      user: {
        id: 'u-1',
        credentials: {
          password: 'secret!',
          token: 'tok_abc',
        },
      },
    }) as { user: { credentials: Record<string, unknown> } };

    expect(result.user.credentials.password).toBe('[REDACTED]');
    expect(result.user.credentials.token).toBe('[REDACTED]');
  });

  it('redacts sensitive keys at depth 3', () => {
    const result = redactAuditPayload({
      a: { b: { c: { accessToken: 'eyJ...' } } },
    }) as { a: { b: { c: Record<string, unknown> } } };

    expect(result.a.b.c.accessToken).toBe('[REDACTED]');
  });

  it('redacts sensitive keys inside arrays', () => {
    const result = redactAuditPayload([
      { name: 'alice', password: 'pw1' },
      { name: 'bob', token: 'tok_2' },
    ]) as Array<Record<string, unknown>>;

    expect(result[0]['password']).toBe('[REDACTED]');
    expect(result[1]['token']).toBe('[REDACTED]');
    expect(result[0]['name']).toBe('alice');
    expect(result[1]['name']).toBe('bob');
  });

  it('redacts sensitive keys inside objects nested inside arrays', () => {
    const result = redactAuditPayload({
      sessions: [
        { sessionId: 's1', refreshToken: 'rt_1' },
        { sessionId: 's2', refreshToken: 'rt_2' },
      ],
    }) as { sessions: Array<Record<string, unknown>> };

    expect(result.sessions[0]['refreshToken']).toBe('[REDACTED]');
    expect(result.sessions[1]['refreshToken']).toBe('[REDACTED]');
    expect(result.sessions[0]['sessionId']).toBe('s1');
  });

  // --- immutability ---

  it('does not mutate the original object', () => {
    const input = { password: 'secret' };
    redactAuditPayload(input);
    expect(input.password).toBe('secret');
  });

  it('does not mutate deeply nested originals', () => {
    const inner = { accessToken: 'tok' };
    const input = { auth: inner };
    redactAuditPayload(input);
    expect(inner.accessToken).toBe('tok');
  });

  it('does not mutate array elements', () => {
    const item = { otp: '123456' };
    const input = [item];
    redactAuditPayload(input);
    expect(item.otp).toBe('123456');
  });

  // --- mixed realistic payload ---

  it('handles a realistic auth login payload with mixed keys', () => {
    // Note: the key "tokens" contains "token" as a substring, so the entire
    // "tokens" value is redacted rather than recursed into. The inner
    // accessToken / refreshToken keys are intentionally inside a safe wrapper
    // key "authInfo" here to demonstrate nested redaction separately.
    const result = redactAuditPayload({
      source: 'web',
      ip: '1.2.3.4',
      loginAttempt: {
        email: 'user@example.com',
        password: 'hunter2',
        otp: '123456',
        deviceInfo: { browser: 'Chrome', os: 'Linux' },
      },
      authInfo: {
        accessToken: 'eyJhbGc...',
        refreshToken: 'rt_xyz',
      },
    }) as {
      source: string;
      ip: string;
      loginAttempt: Record<string, unknown>;
      authInfo: Record<string, unknown>;
    };

    expect(result.source).toBe('web');
    expect(result.ip).toBe('1.2.3.4');
    expect(result.loginAttempt['email']).toBe('[REDACTED]');
    expect(result.loginAttempt['password']).toBe('[REDACTED]');
    expect(result.loginAttempt['otp']).toBe('[REDACTED]');
    expect((result.loginAttempt['deviceInfo'] as Record<string, unknown>)['browser']).toBe(
      'Chrome'
    );
    expect(result.authInfo['accessToken']).toBe('[REDACTED]');
    expect(result.authInfo['refreshToken']).toBe('[REDACTED]');
  });

  it('redacts the entire value when a parent key matches the deny-list', () => {
    // "tokens" contains "token" → its value (even if an object) is replaced wholesale.
    const result = redactAuditPayload({
      tokens: { accessToken: 'eyJ...', refreshToken: 'rt_' },
    }) as Record<string, unknown>;

    // The parent key is sensitive, so the whole subtree becomes [REDACTED].
    expect(result['tokens']).toBe('[REDACTED]');
  });
});
