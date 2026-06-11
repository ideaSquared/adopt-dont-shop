import { style } from '@vanilla-extract/css';

// ADS-522: replaces inline style={{ ... }} on the <PageLoader> div so the app
// can ship under a strict style-src CSP.
export const pageLoader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
});
