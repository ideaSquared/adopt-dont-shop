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
    borderRadius: vars.border.radius.base,
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(prefers-reduced-motion: reduce)': { transition: 'none' },
    },
  },
  variants: {
    size: {
      xs: {
        padding: `${vars.spacing['1']} ${vars.spacing['1']}`,
        fontSize: vars.typography.size.xs,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['3'],
      },
      sm: {
        padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
        fontSize: vars.typography.size.xs,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['3'],
      },
      md: {
        padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
        fontSize: vars.typography.size.sm,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['4'],
      },
      lg: {
        padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
        fontSize: vars.typography.size.base,
        lineHeight: vars.typography.lineHeight.tight,
        minHeight: vars.spacing['4'],
      },
    },
    variant: {
      primary: {
        background: vars.colors.primaryBgSubtle,
        color: vars.colors.primaryTextEmphasis,
        border: `1px solid ${vars.colors.primaryBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.primaryTextEmphasis,
            color: vars.colors.primaryBgSubtle,
            borderColor: vars.colors.primaryActive,
          },
        },
      },
      secondary: {
        background: vars.colors.secondaryBgSubtle,
        color: vars.colors.secondaryTextEmphasis,
        border: `1px solid ${vars.colors.secondaryBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.secondaryTextEmphasis,
            color: vars.colors.secondaryBgSubtle,
            borderColor: vars.colors.secondaryActive,
          },
        },
      },
      success: {
        background: vars.colors.successBgSubtle,
        color: vars.colors.successTextEmphasis,
        border: `1px solid ${vars.colors.successBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.successTextEmphasis,
            color: vars.colors.successBgSubtle,
            borderColor: vars.colors.successActive,
          },
        },
      },
      error: {
        background: vars.colors.dangerBgSubtle,
        color: vars.colors.dangerTextEmphasis,
        border: `1px solid ${vars.colors.dangerBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.dangerTextEmphasis,
            color: vars.colors.dangerBgSubtle,
            borderColor: vars.colors.dangerActive,
          },
        },
      },
      warning: {
        background: vars.colors.warningBgSubtle,
        color: vars.colors.warningTextEmphasis,
        border: `1px solid ${vars.colors.warningBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.warningTextEmphasis,
            color: vars.colors.warningBgSubtle,
            borderColor: vars.colors.warningActive,
          },
        },
      },
      info: {
        background: vars.colors.infoBgSubtle,
        color: vars.colors.infoTextEmphasis,
        border: `1px solid ${vars.colors.infoBorderSubtle}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.colors.infoTextEmphasis,
            color: vars.colors.infoBgSubtle,
            borderColor: vars.colors.infoActive,
          },
        },
      },
      neutral: {
        background: vars.background.muted,
        color: vars.text.primary,
        border: `1px solid ${vars.border.color.muted}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            background: vars.text.primary,
            color: vars.background.muted,
            borderColor: vars.text.tertiary,
          },
        },
      },
      outline: {
        background: 'transparent',
        color: vars.text.secondary,
        border: `1px solid ${vars.border.color.muted}`,
      },
      count: {
        background: vars.colors.danger,
        color: '#fff',
        border: 'none',
        borderRadius: vars.border.radius.pill,
        fontWeight: '700',
        padding: `0 ${vars.spacing['1']}`,
        minWidth: vars.spacing['3'],
        minHeight: vars.spacing['3'],
        justifyContent: 'center',
      },
    },
    rounded: {
      true: { borderRadius: vars.border.radius.pill },
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
          width: vars.spacing['1'],
          height: vars.spacing['1'],
          borderRadius: vars.border.radius.pill,
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
    borderRadius: vars.border.radius.pill,
    padding: vars.spacing['1'],
    margin: `-${vars.spacing['1']}`,
    marginLeft: vars.spacing['1'],
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
