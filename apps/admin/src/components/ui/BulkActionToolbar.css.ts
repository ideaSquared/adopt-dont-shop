import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const toolbar = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  background: vars.background.info,
  border: `1px solid ${vars.border.color.info}`,
  borderRadius: vars.border.radius.lg,
  padding: '0.75rem 1rem',
  flexWrap: 'wrap',
});

export const selectionInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.info,
  whiteSpace: 'nowrap',
});

globalStyle(`${selectionInfo} svg`, {
  fontSize: vars.typography.size.lg,
});

export const divider = style({
  width: '1px',
  height: '20px',
  background: vars.border.color.info,
});

export const actionGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  flexWrap: 'wrap',
  flex: 1,
});

export const clearButton = style({
  marginLeft: 'auto',
});
