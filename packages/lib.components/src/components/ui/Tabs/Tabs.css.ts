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
      color: vars.text.info,
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
});

// Text uses text.info: colors.info (#3B82F6) is ~3.7:1 on white and ~3.4:1 on
// warm-cream, under the 4.5:1 AA floor. The underline is not text, so it keeps
// colors.info (3:1 is enough for a non-text indicator).
export const tabActive = style({
  color: vars.text.info,
  borderBottomColor: vars.colors.info,
});

export const tabPanel = style({
  selectors: {
    '&[hidden]': {
      display: 'none',
    },
  },
});
