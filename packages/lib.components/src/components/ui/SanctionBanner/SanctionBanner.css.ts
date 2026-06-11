import { style, styleVariants } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

export const region = style({
  position: 'sticky',
  top: 0,
  zIndex: vars.zIndex.sticky,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: vars.spacing['2'],
});

const bannerBase = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
  padding: vars.spacing['3'],
  borderRadius: vars.border.radius.base,
  border: `1px solid transparent`,
  '@media': {
    '(min-width: 640px)': {
      flexDirection: 'row',
      alignItems: 'center',
    },
  },
});

export const banner = styleVariants({
  // Warnings — yellow palette.
  warning: [
    bannerBase,
    {
      backgroundColor: vars.colors.warningBgSubtle,
      borderColor: vars.colors.warningBorderSubtle,
      color: vars.colors.warningTextEmphasis,
    },
  ],
  // Suspensions / bans / restrictions — red palette.
  danger: [
    bannerBase,
    {
      backgroundColor: vars.colors.dangerBgSubtle,
      borderColor: vars.colors.dangerBorderSubtle,
      color: vars.colors.dangerTextEmphasis,
    },
  ],
});

export const content = style({
  flex: 1,
  minWidth: 0,
});

export const title = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
});

export const description = style({
  margin: 0,
  marginTop: vars.spacing['1'],
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.snug,
});

export const expiry = style({
  margin: 0,
  marginTop: vars.spacing['1'],
  fontSize: vars.typography.size.xs,
});

export const dismissButton = style({
  alignSelf: 'flex-end',
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  border: `1px solid currentColor`,
  background: 'transparent',
  color: 'inherit',
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  cursor: 'pointer',
  '@media': {
    '(min-width: 640px)': {
      alignSelf: 'center',
    },
  },
  selectors: {
    '&:disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    '&:focus-visible': {
      outline: `2px solid currentColor`,
      outlineOffset: '2px',
    },
  },
});
