import { describe, expect, it } from 'vitest';

import { escapeLikePattern } from './escape-like.js';

describe('escapeLikePattern', () => {
  it('passes a bare string through unchanged', () => {
    expect(escapeLikePattern('labrador')).toBe('labrador');
  });

  it('escapes percent signs', () => {
    expect(escapeLikePattern('%')).toBe('\\%');
  });

  it('escapes underscores', () => {
    expect(escapeLikePattern('_')).toBe('\\_');
  });

  it('escapes backslashes', () => {
    expect(escapeLikePattern('\\')).toBe('\\\\');
  });

  it('escapes combined wildcards without double-escaping', () => {
    expect(escapeLikePattern('%foo_bar\\baz')).toBe('\\%foo\\_bar\\\\baz');
  });

  it('returns an empty string unchanged', () => {
    expect(escapeLikePattern('')).toBe('');
  });
});
