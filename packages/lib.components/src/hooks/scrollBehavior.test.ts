import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScrollBehavior } from './scrollBehavior';

const mockMatchMedia = (matches: boolean) =>
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));

describe('getScrollBehavior', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is smooth when the visitor has no motion preference', () => {
    mockMatchMedia(false);
    expect(getScrollBehavior()).toBe('smooth');
  });

  it('is instant when the visitor prefers reduced motion', () => {
    mockMatchMedia(true);
    expect(getScrollBehavior()).toBe('instant');
  });

  it('is smooth when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(getScrollBehavior()).toBe('smooth');
  });
});
