import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: vars.spacing['4'],
});

export const filtersContainer = style({
  margin: `${vars.spacing['3']} 0`,
  padding: vars.spacing['3'],
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
});

export const filtersHeader = style({
  marginBottom: vars.spacing['3'],
});

globalStyle(`${filtersHeader} h3`, {
  margin: 0,
  color: vars.text.primary,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: vars.spacing['3'],
});

export const skeletonStack = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const modalForm = style({
  display: 'grid',
  gap: vars.spacing['2'],
});

export const modalActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
  justifyContent: 'flex-end',
});
