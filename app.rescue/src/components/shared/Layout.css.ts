import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const appLayout = style({
  display: 'flex',
  minHeight: '100vh',
  background: vars.background.primary,
});

export const mainContent = style({
  flex: 1,
  overflow: 'auto',
  padding: '2rem',
});
