import { vars } from '@adopt-dont-shop/lib.components/theme';
import { style } from '@vanilla-extract/css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const formInfo = style({
  background: vars.colors.infoBgSubtle,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  marginTop: vars.spacing['4'],
});

export const infoHeading = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: vars.colors.infoTextEmphasis,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
});

export const infoList = style({
  margin: 0,
  paddingLeft: vars.spacing['5'],
  color: vars.text.secondary,
  fontSize: vars.typography.size.sm,
});

export const formActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: vars.spacing['3'],
});
