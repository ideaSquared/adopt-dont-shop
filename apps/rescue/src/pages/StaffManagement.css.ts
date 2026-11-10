import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: vars.spacing['5'],
  maxWidth: '1200px',
  margin: '0 auto',
});

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  alignItems: 'center',
  '@media': {
    // The header stacks vertically on mobile; let the action buttons stack and
    // fill the width too rather than crowding onto one cramped row.
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});

export const pageContent = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['5'],
});

export const section = style({});

globalStyle(`${section} h2`, {
  margin: `0 0 ${vars.spacing['3']} 0`,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size['2xl'],
});
