import { describe, expect, it } from 'vitest';
import { redactLogPayload, redactSensitiveFields } from '../../utils/redact';

describe('redactSensitiveFields', () => {
  it('redacts password, token, and secret keys (case-insensitive substring match)', () => {
    const result = redactSensitiveFields({
      passwordHash: 'h',
      RESET_TOKEN: 't',
      apiSecret: 's',
      keep: 'visible',
    });
    expect(result.passwordHash).toBe('[REDACTED]');
    expect(result.RESET_TOKEN).toBe('[REDACTED]');
    expect(result.apiSecret).toBe('[REDACTED]');
    expect(result.keep).toBe('visible');
  });

  it('does NOT redact email — audit-log details legitimately keep it', () => {
    const result = redactSensitiveFields({ email: 'admin@example.com', name: 'a' });
    expect(result.email).toBe('admin@example.com');
  });

  it('walks nested objects and arrays', () => {
    const result = redactSensitiveFields({
      user: { password: 'p', name: 'n' },
      sessions: [{ token: 't1' }, { token: 't2' }],
    });
    expect((result.user as Record<string, unknown>).password).toBe('[REDACTED]');
    const sessions = result.sessions as Array<Record<string, unknown>>;
    expect(sessions[0].token).toBe('[REDACTED]');
    expect(sessions[1].token).toBe('[REDACTED]');
  });
});

describe('redactLogPayload', () => {
  it('redacts credentials AND email keys (PII for log output)', () => {
    const result = redactLogPayload({
      email: 'leaked@example.com',
      userEmail: 'also-leaked@example.com',
      password: 'p',
      keep: 'visible',
    });
    expect(result.email).toBe('[REDACTED]');
    expect(result.userEmail).toBe('[REDACTED]');
    expect(result.password).toBe('[REDACTED]');
    expect(result.keep).toBe('visible');
  });

  it('preserves null and primitive values', () => {
    expect(redactLogPayload(null)).toBeNull();
    expect(redactLogPayload(42)).toBe(42);
    expect(redactLogPayload('hello')).toBe('hello');
  });
});
