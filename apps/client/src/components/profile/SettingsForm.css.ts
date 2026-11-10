import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const wrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['5'],
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['5'],
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  padding: vars.spacing['4'],
});

export const sectionTitle = style({
  fontSize: '1.1rem',
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
});

export const settingItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${vars.spacing['3']} 0`,
  borderBottom: `1px solid ${vars.border.color.default}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: vars.spacing['2'],
    },
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});
