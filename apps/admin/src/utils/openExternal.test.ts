import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternal } from './openExternal';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('openExternal', () => {
  it('opens https URLs in a new tab with safe rel attributes', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternal('https://example.com/page');

    expect(openSpy).toHaveBeenCalledWith(
      'https://example.com/page',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens http URLs', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternal('http://example.com');

    expect(openSpy).toHaveBeenCalledWith('http://example.com/', '_blank', 'noopener,noreferrer');
  });

  it('ignores javascript: URLs to prevent XSS', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternal('javascript:alert(1)');

    expect(openSpy).not.toHaveBeenCalled();
  });

  it('ignores strings that are not valid URLs', () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternal('not a url');

    expect(openSpy).not.toHaveBeenCalled();
  });
});
