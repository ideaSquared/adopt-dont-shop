import { describe, it, expect } from 'vitest';
import { redactEmail } from '../../services/redact';

describe('redactEmail (ADS-407 / ADS-494)', () => {
  it('redacts a typical address with a 2-char local prefix and stable hash', () => {
    const out = redactEmail('jessica.wilson@gmail.com');
    expect(out).toMatch(/^je\*\*\*@gmail\.com#[0-9a-f]{8}$/);
  });

  it('is deterministic for the same address (case/whitespace-insensitive)', () => {
    const a = redactEmail('Foo@Bar.com');
    const b = redactEmail('  foo@bar.com  ');
    expect(a).toBe(b);
  });

  it('produces different outputs for different addresses', () => {
    expect(redactEmail('alice@example.com')).not.toBe(redactEmail('bob@example.com'));
  });

  it('never echoes the local-part beyond the first two characters', () => {
    const out = redactEmail('confidential@example.com');
    expect(out.startsWith('co***@')).toBe(true);
    expect(out).not.toContain('confidential');
  });

  it('handles null, undefined, and empty input without throwing', () => {
    expect(redactEmail(undefined)).toBe('unknown');
    expect(redactEmail(null)).toBe('unknown');
    expect(redactEmail('')).toBe('unknown');
  });

  it('marks malformed input with an "invalid" tag and a hash', () => {
    expect(redactEmail('no-at-sign')).toMatch(/^invalid#[0-9a-f]{8}$/);
    expect(redactEmail('@no-local')).toMatch(/^invalid#[0-9a-f]{8}$/);
  });
});
