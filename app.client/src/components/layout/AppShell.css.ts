import { style } from '@vanilla-extract/css';

export const shell = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
});

export const main = style({
  flex: '1',
});

// The BottomTabBar is position:fixed and renders on mobile for both anonymous
// (Discover/Search) and authenticated visitors. Reserve space at the bottom of
// the shell so the fixed bar never covers the footer or the end of page content.
export const shellWithBottomNav = style({
  '@media': {
    '(max-width: 768px)': {
      paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
    },
  },
});
