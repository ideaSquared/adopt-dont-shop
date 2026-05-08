import { describe, expect, it } from 'vitest';
import { redactEmail } from '../../services/redact';

describe('redactEmail (ADS-407 / ADS-494)', () => {
  it('produces a deterministic prefix+domain+hash for valid emails', () => {
    const a = redactEmail('Admin@Example.com');
    const b = redactEmail('admin@example.com');
    expect(a).toMatch(/^ad\*\*\*@example\.com#[0-9a-f]{8}$/);
    expect(a).toBe(b);
  });

  it('returns "unknown" for null/undefined', () => {
    expect(redactEmail(null)).toBe('unknown');
    expect(redactEmail(undefined)).toBe('unknown');
  });

  it('handles malformed input by emitting only the hash', () => {
    expect(redactEmail('not-an-email')).toMatch(/^invalid#[0-9a-f]{8}$/);
  });

  it('uses * for empty local-part', () => {
    expect(redactEmail('@domain.test')).toMatch(/^invalid#[0-9a-f]{8}$/);
  });
});
