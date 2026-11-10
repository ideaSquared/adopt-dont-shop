// Static breakpoints for media queries.
//
// `vars.breakpoints.*` cannot be used in a media query: it is a theme-contract CSS
// variable, and `var()` is invalid inside a media condition. Use these plain values
// (and the ready-made queries in `media`) in any `.css.ts` or `matchMedia` call instead.
//
//   '@media': { [media.down('md')]: { flexDirection: 'column' } }
//
// Both `up` and `down` are inclusive of the breakpoint width, so `up('md')` and
// `down('md')` both match at exactly 768px. Pick one direction per component
// (mobile-first with `up`, or desktop-first with `down`) rather than pairing them.

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export type BreakpointName = keyof typeof breakpoints;

export const media = {
  /** `screen and (min-width: <breakpoint>)` */
  up: (name: BreakpointName): string => `screen and (min-width: ${breakpoints[name]})`,
  /** `screen and (max-width: <breakpoint>)` */
  down: (name: BreakpointName): string => `screen and (max-width: ${breakpoints[name]})`,
} as const;
