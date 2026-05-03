import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const bar = style({
  display: 'flex',
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1000,
  background: vars.background.primary,
  borderTop: `1px solid ${vars.border.color.primary}`,
  paddingBottom: 'env(safe-area-inset-bottom, 0)',
  '@media': {
    '(min-width: 769px)': {
      display: 'none',
    },
  },
});

export const tabs = style({
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'stretch',
  listStyle: 'none',
  margin: 0,
  padding: 0,
  width: '100%',
});

export const tabItem = style({
  flex: 1,
  display: 'flex',
});

export const tabLinkBase = style({
  flex: 1,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['0.5'],
  padding: `${vars.spacing['2']} ${vars.spacing['1']}`,
  fontSize: vars.typography.size.xs,
  textDecoration: 'none',
  position: 'relative',
  minHeight: '56px',
  ':focus-visible': {
    outline: `2px solid ${vars.border.color.focus}`,
    outlineOffset: '-2px',
  },
});

globalStyle(`${tabLinkBase} svg`, {
  fontSize: '1.5rem',
});

export const tabLink = recipe({
  base: [tabLinkBase],
  variants: {
    active: {
      true: {
        color: vars.colors.primary['600'],
      },
      false: {
        color: vars.text.secondary,
      },
    },
  },
  defaultVariants: { active: false },
});

export const badgeOverlay = style({
  position: 'absolute',
  top: '6px',
  right: 'calc(50% - 20px)',
  pointerEvents: 'none',
});

export const meTab = style({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});
