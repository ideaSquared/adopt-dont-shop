import { describe, expect, it } from 'vitest';

import { scanContent } from './content-scanner.js';

describe('scanContent', () => {
  it('returns null for empty / whitespace / nullish content', () => {
    expect(scanContent(undefined)).toBeNull();
    expect(scanContent(null)).toBeNull();
    expect(scanContent('')).toBeNull();
    expect(scanContent('   \n\t  ')).toBeNull();
  });

  it('matches scam phrases (case-insensitive)', () => {
    const hit = scanContent('Please WIRE TRANSFER me the adoption fee.');
    expect(hit?.category).toBe('scam');
    expect(hit?.reason).toContain('wire transfer');
  });

  it('matches URLs (https + bare www + bare domain)', () => {
    expect(scanContent('check https://example.com')?.category).toBe('spam');
    expect(scanContent('www.totally-not-spam.io')?.category).toBe('spam');
    expect(scanContent('visit example.io for more info')?.category).toBe('spam');
  });

  it('matches phone numbers in various formats', () => {
    expect(scanContent('call me at 555-123-4567')?.category).toBe('spam');
    expect(scanContent('555.123.4567')?.category).toBe('spam');
    expect(scanContent('5551234567')?.category).toBe('spam');
  });

  it('matches harassment phrases', () => {
    const hit = scanContent('go kill yourself you loser');
    expect(hit?.category).toBe('harassment');
  });

  it('passes ordinary friendly content through', () => {
    expect(scanContent('Hi! Love your dog, super excited to meet them.')).toBeNull();
    expect(scanContent('I have a fenced yard and two kids age 5 and 7.')).toBeNull();
  });

  it('scam phrases take precedence over URL matches when both are present', () => {
    // The scam check runs first by design.
    expect(scanContent('venmo me at https://venmo.com/x')?.category).toBe('scam');
  });
});
