import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

/**
 * Shared split-pane layout for the entity-management pages (Users, Pets,
 * Applications, Rescues): a list on the left and an inline detail panel on
 * the right.
 *
 * Breakpoints:
 * - Desktop (≥ 1025px): two columns. The detail pane width is fluid — it
 *   grows with the viewport between a comfortable minimum and a capped
 *   maximum so the panel is generously sized on large screens without
 *   crowding the list.
 * - Tablet / mobile (≤ 1024px): a single column. While a detail is open the
 *   list is hidden and the detail fills the available width, with a
 *   "Back to list" control to return.
 */
const SINGLE_COLUMN = 'screen and (max-width: 1024px)';

export const splitLayout = style({
  display: 'flex',
  gap: vars.spacing['4'],
  minHeight: 0,
  flex: 1,
  alignItems: 'stretch',
});

export const listPane = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  transition: 'flex 0.2s ease',
});

// Applied to the list pane while a detail is open. The list keeps a readable
// minimum on desktop; on tablet/mobile it collapses so the detail takes over.
export const listPaneNarrow = style({
  flex: '1 1 40%',
  minWidth: '320px',
  '@media': {
    [SINGLE_COLUMN]: {
      display: 'none',
      minWidth: 0,
    },
  },
});

export const detailPane = style({
  // Fluid: ~44% of the row, bounded so it stays large but never dominates.
  flex: '0 0 clamp(440px, 44%, 760px)',
  minWidth: 0,
  '@media': {
    [SINGLE_COLUMN]: {
      flex: '1 1 auto',
    },
  },
});

export const backToList = style({
  display: 'none',
  '@media': {
    [SINGLE_COLUMN]: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.375rem',
      background: 'transparent',
      border: `1px solid ${vars.border.color.default}`,
      borderRadius: vars.border.radius.base,
      padding: '0.5rem 0.875rem',
      marginBottom: vars.spacing['2'],
      cursor: 'pointer',
      color: vars.text.secondary,
      fontSize: vars.typography.size.sm,
      fontWeight: vars.typography.weight.medium,
      // WCAG 2.5.5 AA touch target on small screens.
      minHeight: '44px',
    },
  },
});
