import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: vars.spacing[4],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[4],
});

export const headerRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: vars.spacing[3],
  flexWrap: 'wrap',
});

export const headerText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing[3],
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});
