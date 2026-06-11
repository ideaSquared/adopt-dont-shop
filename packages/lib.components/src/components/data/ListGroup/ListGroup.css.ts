import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '../../../styles/theme.css';

const listGroupBordered = style({
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  overflow: 'hidden',
});
globalStyle(`${listGroupBordered} li`, { borderBottom: `1px solid ${vars.border.color.default}` });
globalStyle(`${listGroupBordered} li:last-child`, { borderBottom: 'none' });

const listGroupSm = style({});
const listGroupMd = style({});
const listGroupLg = style({});
globalStyle(`${listGroupSm} li`, {
  padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
  fontSize: vars.typography.size.sm,
});
globalStyle(`${listGroupMd} li`, {
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  fontSize: vars.typography.size.base,
});
globalStyle(`${listGroupLg} li`, {
  padding: `${vars.spacing['3']} ${vars.spacing['3']}`,
  fontSize: vars.typography.size.lg,
});

export const listGroup = recipe({
  base: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
    background: vars.background.surface,
  },
  variants: {
    variant: {
      default: {
        border: `1px solid ${vars.border.color.default}`,
        borderRadius: vars.border.radius.lg,
        overflow: 'hidden',
      },
      flush: { border: 'none', borderRadius: 0 },
      bordered: listGroupBordered,
    },
    size: {
      sm: listGroupSm,
      md: listGroupMd,
      lg: listGroupLg,
    },
  },
});

export const listGroupItem = recipe({
  base: {
    color: vars.text.primary,
    lineHeight: vars.typography.lineHeight.relaxed,
    transition: vars.transitions.fast,
    wordBreak: 'break-word',
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  variants: {
    variant: {
      default: {},
      flush: {
        borderBottom: `1px solid ${vars.border.color.default}`,
        selectors: {
          '&:last-child': {
            borderBottom: 'none',
          },
        },
      },
      bordered: {},
    },
    interactive: {
      true: {
        cursor: 'pointer',
        userSelect: 'none',
        selectors: {
          '&:hover': {
            background: vars.background.muted,
            color: vars.text.primary,
          },
          '&:active': {
            background: vars.colors.primaryBgSubtle,
            color: vars.colors.primaryActive,
          },
          '&:focus-visible': {
            outline: 'none',
            background: vars.background.muted,
            boxShadow: `inset 0 0 0 2px ${vars.colors.primary}`,
          },
        },
      },
      false: {},
    },
  },
});
