import { globalStyle } from '@vanilla-extract/css';

// ADS-522: replaces inline style={{ ... }} on the Statsig loading splash so the
// app can ship under a strict style-src CSP.
globalStyle('.statsig-loading-fallback', {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  fontSize: '18px',
  color: '#666',
});
