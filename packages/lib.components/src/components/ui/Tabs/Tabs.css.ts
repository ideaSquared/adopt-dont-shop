import { style } from '@vanilla-extract/css';
import { vars } from '../../../styles/theme.css';

export const tabList = style({
  display: 'flex',
  gap: vars.spacing['2'],
  borderBottom: `2px solid ${vars.border.color.default}`,
  marginBottom: vars.spacing['8'],
});

export const tab = style({
  padding: `${vars.spacing['4']} ${vars.spacing['6']}`,
  fontFamily: vars.typography.family.sans,
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  color: vars.text.tertiary,
  transition: `all ${vars.transitions.fast}`,
  position: 'relative',
  bottom: '-2px',
  selectors: {
    '&:hover': {
      color: vars.colors.info,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

export const tabActive = style({
  color: vars.colors.info,
  borderBottomColor: vars.colors.info,
});

export const tabPanel = style({
  selectors: {
    '&[hidden]': {
      display: 'none',
    },
  },
});
