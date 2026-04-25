import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { darkThemeClass, vars } from '../../styles/theme.css';

export const navbar = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: vars.spacing.lg,
    paddingRight: vars.spacing.lg,
    height: '64px',
    zIndex: '100',
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(max-width: 768px)': {
        paddingLeft: vars.spacing.md,
        paddingRight: vars.spacing.md,
      },
    },
  },
  variants: {
    variant: {
      default: {
        backgroundColor: vars.colors.neutral['50'],
        borderBottom: `1px solid ${vars.colors.neutral['200']}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            backgroundColor: vars.background.primary,
          },
        },
      },
      transparent: {
        backgroundColor: 'transparent',
        borderBottom: 'none',
      },
      solid: {
        backgroundColor: vars.colors.primary['500'],
        borderBottom: 'none',
      },
    },
    shadow: {
      true: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'default',
    shadow: false,
  },
});

export const navbarSolidContent = style({
  color: `${vars.colors.neutral['50']} !important`,
});

export const brand = style({
  display: 'flex',
  alignItems: 'center',
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.bold,
  color: vars.colors.neutral['900'],
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      opacity: '0.8',
    },
    [`:is(html.${darkThemeClass}) &`]: {
      color: vars.text.primary,
    },
  },
});

export const brandLink = style({
  textDecoration: 'none',
  color: 'inherit',
});

export const navItems = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.lg,
  '@media': {
    '(max-width: 768px)': {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      flexDirection: 'column',
      backgroundColor: vars.colors.neutral['50'],
      borderBottom: `1px solid ${vars.colors.neutral['200']}`,
      padding: vars.spacing.md,
      gap: vars.spacing.md,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
  },
});

export const navItemsHidden = style({
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const navItemsVisible = style({
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
    },
  },
});

export const navItem = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing.xs,
    paddingTop: vars.spacing.sm,
    paddingBottom: vars.spacing.sm,
    paddingLeft: vars.spacing.md,
    paddingRight: vars.spacing.md,
    textDecoration: 'none',
    borderRadius: vars.spacing.xs,
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(max-width: 768px)': {
        width: '100%',
        justifyContent: 'flex-start',
      },
    },
  },
  variants: {
    active: {
      true: {
        color: vars.colors.primary['500'],
        fontWeight: vars.typography.weight.medium,
      },
      false: {
        color: vars.colors.neutral['700'],
        fontWeight: vars.typography.weight.normal,
        selectors: {
          '&:hover': {
            backgroundColor: vars.colors.neutral['100'],
            color: vars.colors.primary['500'],
          },
        },
      },
    },
    disabled: {
      true: {
        cursor: 'not-allowed',
        opacity: '0.5',
        selectors: {
          '&:hover': {
            backgroundColor: 'transparent',
            color: 'inherit',
          },
        },
      },
      false: {
        cursor: 'pointer',
        opacity: '1',
      },
    },
  },
  defaultVariants: {
    active: false,
    disabled: false,
  },
});

export const rightSection = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.md,
});

export const userMenuContainer = style({
  position: 'relative',
});

export const userMenuTrigger = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing.sm,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: vars.spacing.xs,
  borderRadius: vars.spacing.sm,
  transition: `background-color ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.colors.neutral['100'],
    },
  },
});

export const userInfo = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  '@media': {
    '(max-width: 768px)': {
      display: 'none',
    },
  },
});

export const userName = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.medium,
  color: vars.colors.neutral['900'],
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      color: vars.text.primary,
    },
  },
});

export const userEmail = style({
  fontSize: vars.typography.size.xs,
  color: vars.colors.neutral['600'],
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      color: vars.text.secondary,
    },
  },
});

export const userMenu = style({
  position: 'absolute',
  top: '100%',
  right: '0',
  backgroundColor: vars.colors.neutral['50'],
  border: `1px solid ${vars.colors.neutral['200']}`,
  borderRadius: vars.spacing.sm,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  minWidth: '200px',
  zIndex: '1000',
  marginTop: vars.spacing.xs,
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      backgroundColor: vars.background.primary,
    },
  },
});

export const userMenuHidden = style({
  display: 'none',
});

export const userMenuVisible = style({
  display: 'block',
});

export const userMenuAction = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing.sm,
    width: '100%',
    paddingTop: vars.spacing.sm,
    paddingBottom: vars.spacing.sm,
    paddingLeft: vars.spacing.md,
    paddingRight: vars.spacing.md,
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: vars.typography.size.sm,
    color: vars.colors.neutral['700'],
    transition: `background-color ${vars.transitions.fast}`,
    selectors: {
      '&:hover': {
        backgroundColor: vars.colors.neutral['50'],
      },
      [`:is(html.${darkThemeClass}) &`]: {
        color: vars.text.secondary,
      },
    },
  },
  variants: {
    divider: {
      true: {
        borderTop: `1px solid ${vars.colors.neutral['200']}`,
      },
      false: {},
    },
  },
  defaultVariants: {
    divider: false,
  },
});

export const mobileMenuButton = style({
  display: 'none',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: vars.spacing.xs,
  color: vars.colors.neutral['700'],
  '@media': {
    '(max-width: 768px)': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
    },
  },
});

export const menuIcon = style({
  width: '24px',
  height: '24px',
  position: 'relative',
  selectors: {
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      left: '0',
      width: '100%',
      height: '2px',
      backgroundColor: 'currentColor',
      transition: `all ${vars.transitions.fast}`,
    },
    '&::before': {
      top: '6px',
    },
    '&::after': {
      bottom: '6px',
    },
  },
});

export const menuIconClosed = style({
  selectors: {
    '&::before': {
      boxShadow: '0 8px 0 currentColor',
    },
  },
});

export const menuIconOpen = style({
  selectors: {
    '&::before': {
      top: '50%',
      transform: 'translateY(-50%) rotate(45deg)',
    },
    '&::after': {
      bottom: '50%',
      transform: 'translateY(50%) rotate(-45deg)',
    },
  },
});
