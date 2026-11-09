import { describe, expect, it } from 'vitest';

import { breakpoints, media } from './breakpoints';
import { darkTheme, lightTheme, normalTheme } from './theme';

describe('breakpoints', () => {
  it('lists the documented widths in ascending order', () => {
    expect(Object.values(breakpoints).map(width => parseInt(width, 10))).toEqual([
      640, 768, 1024, 1280, 1536,
    ]);
  });

  it('matches the theme contract values in every theme', () => {
    [lightTheme, normalTheme, darkTheme].forEach(theme => {
      expect(theme.breakpoints).toEqual(breakpoints);
    });
  });
});

describe('media', () => {
  it('builds a min-width query for up()', () => {
    expect(media.up('md')).toBe('screen and (min-width: 768px)');
  });

  it('builds a max-width query for down()', () => {
    expect(media.down('lg')).toBe('screen and (max-width: 1024px)');
  });

  it('produces a valid media condition for every breakpoint (no var() inside)', () => {
    (Object.keys(breakpoints) as (keyof typeof breakpoints)[]).forEach(name => {
      expect(media.up(name)).toMatch(/^screen and \(min-width: \d+px\)$/);
      expect(media.down(name)).toMatch(/^screen and \(max-width: \d+px\)$/);
    });
  });
});
