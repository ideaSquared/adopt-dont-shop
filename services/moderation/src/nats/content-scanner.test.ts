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

  // --- Word-boundary matching (the in-house upgrade) -----------------

  it('does NOT trip when a banned single-word term is a substring of an innocent word', () => {
    // 'cashapp' must not match inside 'cashappraisal'; 'scam' must not
    // match inside 'scamper'. Substring matching produced false positives.
    expect(scanContent('We did a cashappraisal of the property.')).toBeNull();
    expect(scanContent('The puppy loves to scamper around the garden.')).toBeNull();
  });

  it('DOES trip when the same term appears as a standalone token', () => {
    expect(scanContent('Pay me via cashapp please')?.category).toBe('scam');
  });

  it('matches a banned term despite surrounding punctuation', () => {
    expect(scanContent('cashapp! now')?.category).toBe('scam');
    expect(scanContent('(cashapp)')?.category).toBe('scam');
    expect(scanContent('"cashapp".')?.category).toBe('scam');
  });

  it('matches multi-word phrases as adjacent whole tokens, not as substrings', () => {
    expect(scanContent('please send money now')?.category).toBe('scam');
    // 'send money' must not trip inside 'resend moneymaker'.
    expect(scanContent('I will resend moneymaker reports later')).toBeNull();
  });

  it('carries a severity through the hit', () => {
    // Harassment is high severity; a bare URL is medium.
    expect(scanContent('go kill yourself')?.severity).toBe('high');
    expect(scanContent('see https://example.com')?.severity).toBe('medium');
  });

  it('carries per-category severity for scam (high) and spam (medium)', () => {
    expect(scanContent('wire transfer the fee')?.severity).toBe('high');
    expect(scanContent('call 555-123-4567')?.severity).toBe('medium');
  });
});
