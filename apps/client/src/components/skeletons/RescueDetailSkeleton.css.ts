import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: vars.spacing[4],
});

export const header = style({
  display: 'flex',
  gap: vars.spacing[3],
  alignItems: 'center',
  marginBottom: vars.spacing[4],
});

export const headerText = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const infoSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
  marginBottom: vars.spacing[4],
});

export const petGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: vars.spacing[3],
});
