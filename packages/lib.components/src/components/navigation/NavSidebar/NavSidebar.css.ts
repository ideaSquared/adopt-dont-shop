import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

// Below this width the sidebar becomes an off-canvas drawer. Exported so app
// shells can align their own responsive rules with the drawer breakpoint —
// a shell that switches at a different width leaves a band where the sidebar
// is off-canvas but the content is still offset for it.
export const SIDEBAR_MOBILE_MAX_WIDTH = '1024px';
const MOBILE = `screen and (max-width: ${SIDEBAR_MOBILE_MAX_WIDTH})`;

export const SIDEBAR_EXPANDED_WIDTH = '260px';
export const SIDEBAR_COLLAPSED_WIDTH = '72px';

const EXPANDED_WIDTH = SIDEBAR_EXPANDED_WIDTH;
const COLLAPSED_WIDTH = SIDEBAR_COLLAPSED_WIDTH;

export const sidebar = recipe({
  base: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100vh',
    position: 'sticky',
    top: 0,
    width: EXPANDED_WIDTH,
    backgroundColor: vars.background.inverse,
    color: vars.text.inverse,
    borderRight: `${vars.border.width.thin} solid ${vars.border.color.strong}`,
    transition: `width ${vars.transitions.base}, transform ${vars.transitions.base}`,
    overflowY: 'auto',
    '@media': {
      [MOBILE]: {
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: vars.zIndex.modal,
        transform: 'translateX(-100%)',
        boxShadow: vars.shadows.xl,
        // Closed drawer is off-screen — also remove it from the tab order and
        // the accessibility tree (a transform alone leaves it focusable).
        visibility: 'hidden',
        pointerEvents: 'none',
      },
      // Respect users who prefer reduced motion — no width/transform animation.
      '(prefers-reduced-motion: reduce)': {
        transition: 'none',
      },
    },
  },
  variants: {
    collapsed: {
      true: { width: COLLAPSED_WIDTH },
      false: {},
    },
    mobileOpen: {
      true: {
        '@media': {
          [MOBILE]: {
            transform: 'translateX(0)',
            width: EXPANDED_WIDTH,
            visibility: 'visible',
            pointerEvents: 'auto',
          },
        },
      },
      false: {},
    },
  },
  defaultVariants: { collapsed: false, mobileOpen: false },
});

export const overlay = style({
  display: 'none',
  '@media': {
    [MOBILE]: {
      display: 'block',
      position: 'fixed',
      inset: 0,
      zIndex: vars.zIndex.overlay,
      backgroundColor: vars.background.overlay,
    },
  },
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: vars.spacing['4'],
  minHeight: '64px',
});

export const headerBrand = recipe({
  base: { flex: 1, minWidth: 0, overflow: 'hidden' },
  variants: { collapsed: { true: { flex: 'none' }, false: {} } },
});

export const collapseButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  border: 'none',
  borderRadius: vars.border.radius.base,
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: vars.typography.size.lg,
  lineHeight: 1,
  '@media': { [MOBILE]: { display: 'none' } },
});

export const mobileCloseButton = style({
  display: 'none',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: 'none',
  borderRadius: vars.border.radius.base,
  background: 'rgba(255, 255, 255, 0.08)',
  color: 'inherit',
  cursor: 'pointer',
  fontSize: vars.typography.size.xl,
  lineHeight: 1,
  '@media': { [MOBILE]: { display: 'inline-flex' } },
});

export const nav = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  padding: `${vars.spacing['2']} ${vars.spacing['2']} ${vars.spacing['4']}`,
});

export const group = style({ display: 'flex', flexDirection: 'column', gap: vars.spacing['1'] });

export const groupLabel = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']} ${vars.spacing['1']}`,
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  letterSpacing: vars.typography.letterSpacing.wide,
  textTransform: 'uppercase',
  color: vars.text.tertiary,
});

export const groupList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const link = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['3'],
    padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
    borderRadius: vars.border.radius.base,
    color: 'inherit',
    textDecoration: 'none',
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    cursor: 'pointer',
    selectors: {
      '&:hover': { background: 'rgba(255, 255, 255, 0.08)' },
      '&:focus-visible': { outline: `2px solid ${vars.border.color.focus}`, outlineOffset: '-2px' },
    },
  },
  variants: {
    collapsed: {
      true: { justifyContent: 'center', padding: vars.spacing['2'] },
      false: {},
    },
  },
});

export const linkActive = style({
  background: 'rgba(255, 255, 255, 0.16)',
  fontWeight: vars.typography.weight.semibold,
  boxShadow: `inset 3px 0 0 0 ${vars.colors.primary}`,
});

export const icon = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: '20px',
  height: '20px',
  fontSize: vars.typography.size.base,
});

export const label = recipe({
  base: { flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  variants: {
    collapsed: {
      true: {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      },
      false: {},
    },
  },
});

export const badge = recipe({
  base: {
    flexShrink: 0,
    minWidth: '20px',
    height: '20px',
    padding: `0 ${vars.spacing['2']}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.border.radius.pill,
    backgroundColor: vars.colors.danger,
    color: vars.text.inverse,
    fontSize: vars.typography.size.xs,
    fontWeight: vars.typography.weight.bold,
    lineHeight: 1,
  },
  variants: {
    collapsed: {
      true: { position: 'absolute', top: '4px', right: '8px', minWidth: '16px', height: '16px' },
      false: {},
    },
  },
});

export const footer = recipe({
  base: {
    marginTop: 'auto',
    padding: vars.spacing['4'],
    borderTop: `${vars.border.width.thin} solid ${vars.border.color.strong}`,
    fontSize: vars.typography.size.sm,
  },
  variants: {
    collapsed: {
      true: { textAlign: 'center', padding: vars.spacing['2'] },
      false: {},
    },
  },
});
