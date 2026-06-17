/**
 * Behavioural tests for openExternal.
 *
 * Security-sensitive helper: it must open valid http(s) URLs in a new,
 * isolated tab and silently refuse anything that could be an XSS vector
 * (javascript:, mailto:, malformed strings).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternal } from './openExternal';

const openSpy = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('open', openSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openExternal', () => {
  it('opens an https URL in a new, isolated tab', () => {
    openExternal('https://example.com/path');

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/path',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens a plain http URL', () => {
    openExternal('http://example.com/');

    expect(openSpy).toHaveBeenCalledWith('http://example.com/', '_blank', 'noopener,noreferrer');
  });

  it('refuses a javascript: URL (XSS vector)', () => {
    openExternal('javascript:alert(1)');

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('refuses a mailto: URL', () => {
    openExternal('mailto:hi@example.com');

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('ignores a malformed, unparseable URL', () => {
    openExternal('not a url at all');

    expect(openSpy).not.toHaveBeenCalled();
  });
});
