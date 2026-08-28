import { describe, expect, it } from 'vitest';

import { maskRecipient, maskRecipients } from './base.js';

describe('maskRecipient (ADS-1257)', () => {
  it('masks a bare address to first-char + domain', () => {
    expect(maskRecipient('adopter@example.com')).toBe('a***@example.com');
  });

  it('extracts and masks the address from a "Name <addr>" form', () => {
    expect(maskRecipient('Jane Doe <jane.doe@rescue.org>')).toBe('j***@rescue.org');
  });

  it('returns *** when there is no parseable address', () => {
    expect(maskRecipient('not-an-email')).toBe('***');
  });

  it('never leaks the full local part', () => {
    expect(maskRecipient('verylongname@domain.tld')).not.toContain('verylongname');
  });

  it('masks a list of recipients', () => {
    expect(maskRecipients(['a@b.com', 'c@d.com'])).toEqual(['a***@b.com', 'c***@d.com']);
  });
});
