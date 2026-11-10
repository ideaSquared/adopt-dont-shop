import { style } from '@vanilla-extract/css';

// ADS-522: replaces inline style={{ ... }} on the Statsig loading splash so the
// app can ship under a strict style-src CSP.
//
// Exported as a class (not a globalStyle) on purpose: this package is
// `sideEffects: false`, so a bare `import './StatsigWrapper.css'` is dropped
// from production bundles and the rule would never ship.
export const loadingFallback = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  fontSize: '18px',
  color: '#666',
});
