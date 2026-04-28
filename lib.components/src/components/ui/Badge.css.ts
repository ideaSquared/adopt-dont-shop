import { recipe } from '@vanilla-extract/recipes';
import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

import { darkThemeClass, vars } from '../../styles/theme.css';

export const badge = recipe({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: vars.spacing['1'],
    fontFamily: vars.typography.family.sans,
    fontWeight: vars.typography.weight.medium,
    whiteSpace: 'nowrap',
    verticalAlign: 'baseline',
    borderRadius: vars.border.radius.md,
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(prefers-reduced-motion: reduce)': { transition: 'none' },
    },
  },
  variants: {
    size: {
      xs: {
        padding: `${vars.spacing['0.5']} ${vars.spacing['1.5']}`,
        fontSize: vars.typography.size.xs,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['4'],
      },
      sm: {
        padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
        fontSize: vars.typography.size.xs,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['5'],
      },
      md: {
        padding: `${vars.spacing['1']} ${vars.spacing['2.5']}`,
        fontSize: vars.typography.size.sm,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['6'],
      },
      lg: {
        padding: `${vars.spacing['1.5']} ${vars.spacing['3']}`,
        fontSize: vars.typography.size.base,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['7'],
      },
    },
    variant: {
      primary: {
        background: vars.colors.primary['100'],
        color: vars.colors.primary['800'],
        border: `1px solid ${vars.colors.primary['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.primary['900'],
            color: vars.colors.primary['100'],
            borderColor: vars.colors.primary['700'],
          },
        },
      },
      secondary: {
        background: vars.colors.secondary['100'],
        color: vars.colors.secondary['800'],
        border: `1px solid ${vars.colors.secondary['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.secondary['900'],
            color: vars.colors.secondary['100'],
            borderColor: vars.colors.secondary['700'],
          },
        },
      },
      success: {
        background: vars.colors.semantic.success['100'],
        color: vars.colors.semantic.success['800'],
        border: `1px solid ${vars.colors.semantic.success['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.semantic.success['900'],
            color: vars.colors.semantic.success['100'],
            borderColor: vars.colors.semantic.success['700'],
          },
        },
      },
      error: {
        background: vars.colors.semantic.error['100'],
        color: vars.colors.semantic.error['800'],
        border: `1px solid ${vars.colors.semantic.error['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.semantic.error['900'],
            color: vars.colors.semantic.error['100'],
            borderColor: vars.colors.semantic.error['700'],
          },
        },
      },
      warning: {
        background: vars.colors.semantic.warning['100'],
        color: vars.colors.semantic.warning['800'],
        border: `1px solid ${vars.colors.semantic.warning['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.semantic.warning['900'],
            color: vars.colors.semantic.warning['100'],
            borderColor: vars.colors.semantic.warning['700'],
          },
        },
      },
      info: {
        background: vars.colors.semantic.info['100'],
        color: vars.colors.semantic.info['800'],
        border: `1px solid ${vars.colors.semantic.info['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.semantic.info['900'],
            color: vars.colors.semantic.info['100'],
            borderColor: vars.colors.semantic.info['700'],
          },
        },
      },
      neutral: {
        background: vars.colors.neutral['100'],
        color: vars.colors.neutral['800'],
        border: `1px solid ${vars.colors.neutral['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.neutral['800'],
            color: vars.colors.neutral['100'],
            borderColor: vars.colors.neutral['600'],
          },
        },
      },
      outline: {
        background: 'transparent',
        color: vars.text.secondary,
        border: `1px solid ${vars.border.color.secondary}`,
      },
      count: {
        background: vars.colors.semantic.error['500'],
        color: '#fff',
        border: 'none',
        borderRadius: vars.border.radius.full,
        fontWeight: '700',
        padding: `0 ${vars.spacing['1.5']}`,
        minWidth: vars.spacing['5'],
        minHeight: vars.spacing['5'],
        justifyContent: 'center',
      },
    },
    rounded: {
      true: { borderRadius: vars.border.radius.full },
      false: {},
    },
    disabled: {
      true: { opacity: 0.5, cursor: 'not-allowed', pointerEvents: 'none' },
      false: {},
    },
    dot: {
      true: {
        paddingLeft: vars.spacing['2'],
        position: 'relative',
        '::before': {
          content: '""',
          position: 'absolute',
          left: vars.spacing['1'],
          top: '50%',
          transform: 'translateY(-50%)',
          width: vars.spacing['1.5'],
          height: vars.spacing['1.5'],
          borderRadius: vars.border.radius.full,
          background: 'currentColor',
        },
      },
      false: {},
    },
  },
  defaultVariants: {
    size: 'md',
    variant: 'neutral',
    rounded: false,
    disabled: false,
    dot: false,
  },
});

export const iconContainer = styleVariants({
  xs: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sm: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  md: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lg: { display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
globalStyle(`${iconContainer.xs} svg`, { width: '12px', height: '12px' });
globalStyle(`${iconContainer.sm} svg`, { width: '14px', height: '14px' });
globalStyle(`${iconContainer.md} svg`, { width: '16px', height: '16px' });
globalStyle(`${iconContainer.lg} svg`, { width: '18px', height: '18px' });

const removeBtnXs = style({});
const removeBtnSm = style({});
const removeBtnMd = style({});
const removeBtnLg = style({});
globalStyle(`${removeBtnXs} svg`, { width: '10px', height: '10px' });
globalStyle(`${removeBtnSm} svg`, { width: '12px', height: '12px' });
globalStyle(`${removeBtnMd} svg`, { width: '14px', height: '14px' });
globalStyle(`${removeBtnLg} svg`, { width: '16px', height: '16px' });

export const removeButton = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    opacity: 0.7,
    borderRadius: vars.border.radius.full,
    padding: vars.spacing['0.5'],
    margin: `-${vars.spacing['0.5']}`,
    marginLeft: vars.spacing['0.5'],
    transition: `all ${vars.transitions.fast}`,
    flexShrink: 0,
    ':hover': { opacity: 1, background: 'rgba(0,0,0,0.1)' },
    ':focus-visible': { outline: 'none', opacity: 1, boxShadow: '0 0 0 2px currentColor' },
    ':active': { transform: 'scale(0.95)' },
    '@media': {
      '(prefers-reduced-motion: reduce)': {
        selectors: { '&:active': { transform: 'none' } },
      },
    },
  },
  variants: {
    size: {
      xs: removeBtnXs,
      sm: removeBtnSm,
      md: removeBtnMd,
      lg: removeBtnLg,
    },
  },
  defaultVariants: { size: 'md' },
});

export const dotIndicator = style({});
