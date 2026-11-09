import { recipe } from '@vanilla-extract/recipes';
import { style } from '@vanilla-extract/css';

import { vars } from '../../../styles/theme.css';

// On narrow viewports a horizontal stepper stacks like the vertical one so
// long step titles and descriptions never push the page wider than the screen.
const NARROW = '(max-width: 640px)';

export const root = style({
  width: '100%',
});

export const list = recipe({
  base: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    gap: vars.spacing['2'],
  },
  variants: {
    orientation: {
      // No gap between steps: each step's connector spans from the previous
      // step's centre to its own, which assumes the steps sit edge to edge.
      horizontal: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 0,
        '@media': {
          [NARROW]: { flexDirection: 'column', alignItems: 'stretch', gap: vars.spacing['2'] },
        },
      },
      vertical: { flexDirection: 'column' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

export const step = recipe({
  base: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
  },
  variants: {
    orientation: {
      horizontal: {
        flex: 1,
        minWidth: 0,
        alignItems: 'flex-start',
        justifyContent: 'center',
        '@media': {
          [NARROW]: { flex: 'none', alignItems: 'center', justifyContent: 'flex-start' },
        },
      },
      vertical: { flex: 'none' },
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

// Horizontal: the title sits under the marker, so the connector is drawn
// between markers — from the previous step's marker to this one's, at the
// markers' vertical centre (control padding + half the marker height).
const MARKER_HALF = `calc(${vars.spacing['5']} / 2)`;

export const connector = recipe({
  base: {
    flex: 1,
    minWidth: vars.spacing['4'],
    height: vars.border.width.base,
    backgroundColor: vars.border.color.default,
    '@media': { [NARROW]: { display: 'none' } },
  },
  variants: {
    complete: {
      true: { backgroundColor: vars.colors.primary },
      false: {},
    },
    orientation: {
      horizontal: {
        position: 'absolute',
        top: `calc(${vars.spacing['1']} + ${MARKER_HALF})`,
        left: `calc(-50% + ${MARKER_HALF} + ${vars.spacing['2']})`,
        right: `calc(50% + ${MARKER_HALF} + ${vars.spacing['2']})`,
        minWidth: 0,
      },
      vertical: {},
    },
  },
  defaultVariants: {
    complete: false,
    orientation: 'horizontal',
  },
});

export const control = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: vars.spacing['2'],
    margin: 0,
    padding: vars.spacing['1'],
    background: 'transparent',
    border: 'none',
    borderRadius: vars.border.radius.base,
    textAlign: 'left',
    font: 'inherit',
    color: 'inherit',
    // Let the control shrink and wrap long words inside a narrow step.
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        selectors: {
          '&:hover': {
            backgroundColor: vars.background.muted,
          },
          '&:focus-visible': {
            outline: `${vars.border.width.base} solid ${vars.border.color.focus}`,
            outlineOffset: vars.spacing['1'],
          },
        },
      },
      false: {
        cursor: 'default',
      },
    },
    // Horizontal: marker on top, title centred underneath, so each title gets
    // the full step width. Narrow viewports stack the steps, so go back to
    // marker-beside-title there.
    orientation: {
      horizontal: {
        flexDirection: 'column',
        textAlign: 'center',
        '@media': { [NARROW]: { flexDirection: 'row', textAlign: 'left' } },
      },
      vertical: {},
    },
  },
  defaultVariants: {
    clickable: false,
    orientation: 'horizontal',
  },
});

export const marker = recipe({
  base: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: vars.spacing['5'],
    height: vars.spacing['5'],
    borderRadius: vars.border.radius.pill,
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.semibold,
    border: `${vars.border.width.base} solid`,
  },
  variants: {
    status: {
      complete: {
        backgroundColor: vars.colors.primary,
        borderColor: vars.colors.primary,
        color: vars.text.inverse,
      },
      current: {
        backgroundColor: vars.colors.primaryBgSubtle,
        borderColor: vars.colors.primary,
        color: vars.colors.primaryTextEmphasis,
      },
      upcoming: {
        backgroundColor: vars.background.surface,
        borderColor: vars.border.color.default,
        color: vars.text.muted,
      },
    },
  },
  defaultVariants: {
    status: 'upcoming',
  },
});

export const checkIcon = style({
  width: '60%',
  height: '60%',
});

export const body = style({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const title = recipe({
  base: {
    fontSize: vars.typography.size.sm,
    fontWeight: vars.typography.weight.medium,
    lineHeight: vars.typography.lineHeight.snug,
  },
  variants: {
    status: {
      complete: { color: vars.text.primary },
      current: { color: vars.text.primary },
      upcoming: { color: vars.text.muted },
    },
  },
  defaultVariants: {
    status: 'upcoming',
  },
});

export const description = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
  lineHeight: vars.typography.lineHeight.snug,
});

export const optional = style({
  fontSize: vars.typography.size.xs,
  fontStyle: 'italic',
  color: vars.text.tertiary,
});

export const visuallyHidden = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  border: 0,
  clip: 'rect(0, 0, 0, 0)',
});
