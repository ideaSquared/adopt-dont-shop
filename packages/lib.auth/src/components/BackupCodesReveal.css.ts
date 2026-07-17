import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const heading = style({
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  selectors: {
    '&:focus': {
      outline: 'none',
    },
  },
});

export const warningBox = style({
  margin: 0,
  padding: vars.spacing['3'],
  background: vars.colors.warningBgSubtle,
  border: `1px solid ${vars.colors.warningBorderSubtle}`,
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.sm,
  color: vars.colors.warningTextEmphasis,
});

export const codesList = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['2'],
  maxWidth: '320px',
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const codeItem = style({
  padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.sm,
  fontSize: vars.typography.size.sm,
  textAlign: 'center',
  letterSpacing: vars.typography.letterSpacing.wide,
});

export const buttonRow = style({
  display: 'flex',
  gap: vars.spacing['2'],
  flexWrap: 'wrap',
});

// Visually hidden but still available to assistive tech — used for the
// aria-live announcements (reveal, copy status, download status) that
// shouldn't duplicate visible copy on screen.
export const srOnly = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
});
