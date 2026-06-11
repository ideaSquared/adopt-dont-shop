import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { darkThemeClass, vars } from '../../styles/theme.css';

export const navbar = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: vars.spacing['4'],
    paddingRight: vars.spacing['4'],
    height: '64px',
    zIndex: '100',
    transition: `all ${vars.transitions.fast}`,
    '@media': {
      '(max-width: 768px)': {
        paddingLeft: vars.spacing['3'],
        paddingRight: vars.spacing['3'],
      },
    },
  },
  variants: {
    variant: {
      default: {
        backgroundColor: vars.background.body,
        borderBottom: `1px solid ${vars.border.color.muted}`,
        selectors: {
          [`:is(html.${darkThemeClass}) &`]: {
            backgroundColor: vars.background.body,
          },
        },
      },
      transparent: {
        backgroundColor: 'transparent',
        borderBottom: 'none',
      },
      solid: {
        backgroundColor: vars.colors.primary,
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
  color: `${vars.background.body} !important`,
});

export const brand = style({
  display: 'flex',
  alignItems: 'center',
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
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
  gap: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      flexDirection: 'column',
      backgroundColor: vars.background.body,
      borderBottom: `1px solid ${vars.border.color.muted}`,
      padding: vars.spacing['3'],
      gap: vars.spacing['3'],
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
    gap: vars.spacing['1'],
    paddingTop: vars.spacing['2'],
    paddingBottom: vars.spacing['2'],
    paddingLeft: vars.spacing['3'],
    paddingRight: vars.spacing['3'],
    textDecoration: 'none',
    borderRadius: vars.spacing['1'],
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
        color: vars.colors.primary,
        fontWeight: vars.typography.weight.medium,
      },
      false: {
        color: vars.text.secondary,
        fontWeight: vars.typography.weight.normal,
        selectors: {
          '&:hover': {
            backgroundColor: vars.background.muted,
            color: vars.colors.primary,
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
  gap: vars.spacing['3'],
});

export const userMenuContainer = style({
  position: 'relative',
});

export const userMenuTrigger = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: vars.spacing['1'],
  borderRadius: vars.spacing['2'],
  transition: `background-color ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.background.muted,
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
  color: vars.text.primary,
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      color: vars.text.primary,
    },
  },
});

export const userEmail = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
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
  backgroundColor: vars.background.body,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.spacing['2'],
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  minWidth: '200px',
  zIndex: '1000',
  marginTop: vars.spacing['1'],
  selectors: {
    [`:is(html.${darkThemeClass}) &`]: {
      backgroundColor: vars.background.body,
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
    gap: vars.spacing['2'],
    width: '100%',
    paddingTop: vars.spacing['2'],
    paddingBottom: vars.spacing['2'],
    paddingLeft: vars.spacing['3'],
    paddingRight: vars.spacing['3'],
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: vars.typography.size.sm,
    color: vars.text.secondary,
    transition: `background-color ${vars.transitions.fast}`,
    selectors: {
      '&:hover': {
        backgroundColor: vars.background.body,
      },
      [`:is(html.${darkThemeClass}) &`]: {
        color: vars.text.secondary,
      },
    },
  },
  variants: {
    divider: {
      true: {
        borderTop: `1px solid ${vars.border.color.muted}`,
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
  padding: vars.spacing['1'],
  color: vars.text.secondary,
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
