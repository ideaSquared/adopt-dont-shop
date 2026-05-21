import { describe, it, expect } from 'vitest';
import { escapeLikePattern } from './escape-like';

describe('escapeLikePattern', () => {
  it('passes a bare string through unchanged', () => {
    expect(escapeLikePattern('foo')).toBe('foo');
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

  it('escapes combined wildcards', () => {
    expect(escapeLikePattern('%foo_bar\\baz')).toBe('\\%foo\\_bar\\\\baz');
  });

  it('returns empty string unchanged', () => {
    expect(escapeLikePattern('')).toBe('');
  });
});
