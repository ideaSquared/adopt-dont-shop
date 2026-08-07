import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../styles/theme.css';

export const scrollContainer = style({
  height: '100%',
  overflow: 'auto',
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
});

export const th = style({
  textAlign: 'left',
  padding: 0,
  borderBottom: '1px solid var(--color-border, #e5e7eb)',
  color: 'var(--color-text-muted, #6b7280)',
  fontWeight: 600,
  background: 'var(--color-surface-muted, #f9fafb)',
  position: 'sticky',
  top: 0,
});

export const sortButton = style({
  width: '100%',
  textAlign: 'left',
  padding: '8px 12px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 'inherit',
});

export const td = style({
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-border, #e5e7eb)',
  color: 'var(--color-text, #111827)',
});

export const rowClickable = style({
  cursor: 'pointer',
});

export const rowDefault = style({
  cursor: 'default',
});

export const pagination = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  fontSize: '12px',
  color: 'var(--color-text-muted, #6b7280)',
  paddingTop: '8px',
});

/**
 * Opt-in responsive card layout. Below the mobile breakpoint each row becomes
 * a stacked label/value card: the header row is visually hidden and each cell
 * shows its column label (from `data-label`) alongside the value. Applied via
 * the `responsive="cards"` prop.
 */
export const cardsTable = style({});

const MOBILE = 'screen and (max-width: 640px)';

globalStyle(`${cardsTable} thead`, {
  '@media': {
    [MOBILE]: {
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
  },
});

globalStyle(`${cardsTable} tr`, {
  '@media': {
    [MOBILE]: {
      display: 'block',
      marginBottom: '12px',
      border: '1px solid var(--color-border, #e5e7eb)',
      borderRadius: '8px',
      padding: '4px 8px',
    },
  },
});

globalStyle(`${cardsTable} td`, {
  '@media': {
    [MOBILE]: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '12px',
      borderBottom: 'none',
      padding: '6px 4px',
      textAlign: 'right',
    },
  },
});

globalStyle(`${cardsTable} td::before`, {
  '@media': {
    [MOBILE]: {
      content: 'attr(data-label)',
      fontWeight: 600,
      color: 'var(--color-text-muted, #6b7280)',
      textAlign: 'left',
    },
  },
});

/* ─────────────────────────────────────────────────────────────────────────
 * ADS UX D2 — opt-in additive styles for selection, non-sortable headers and
 * per-row highlighting. These use the theme `vars` contract (design-tokens
 * skill) and are only applied when the matching opt-in props are set, so the
 * default table appearance is unchanged.
 * ──────────────────────────────────────────────────────────────────────── */

/** Leading checkbox column — kept narrow and vertically aligned with cells. */
export const selectCell = style({
  width: '1%',
  padding: `${vars.spacing['2']} ${vars.spacing['2']}`,
  textAlign: 'center',
  borderBottom: `${vars.border.width.thin} solid var(--color-border, #e5e7eb)`,
});

export const selectHeaderCell = style([
  selectCell,
  {
    position: 'sticky',
    top: 0,
    background: 'var(--color-surface-muted, #f9fafb)',
  },
]);

export const checkbox = style({
  cursor: 'pointer',
  width: vars.spacing['3'],
  height: vars.spacing['3'],
  accentColor: vars.colors.primary,
  selectors: {
    '&:focus-visible': {
      outline: `${vars.border.width.base} solid ${vars.colors.primary}`,
      outlineOffset: vars.spacing['1'],
    },
  },
});

/** Non-sortable column header — plain label with the same padding as the sort button. */
export const headerLabel = style({
  display: 'block',
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
});

/** Frameless empty state used when the table is rendered without the ChartFrame chrome. */
export const emptyFrameless = style({
  padding: vars.spacing['4'],
  textAlign: 'center',
  color: vars.text.muted,
  fontSize: vars.typography.size.sm,
});

/** Frameless bordered shell — the admin list-table surface (no ChartFrame title). */
export const surface = style({
  border: `${vars.border.width.thin} solid var(--color-border, #e5e7eb)`,
  borderRadius: vars.border.radius.base,
  overflow: 'hidden',
  backgroundColor: vars.background.surface,
});

/**
 * Per-row highlighting. `variant` tints the row for valid / duplicate / invalid
 * style states; `selected` highlights a row picked via the selection column.
 * Token-based so it stays theme-aware in light / normal / dark.
 */
export const rowVariant = recipe({
  base: {},
  variants: {
    variant: {
      default: {},
      success: { backgroundColor: vars.colors.successBgSubtle },
      warning: { backgroundColor: vars.colors.warningBgSubtle },
      danger: { backgroundColor: vars.colors.dangerBgSubtle },
    },
    selected: {
      true: { backgroundColor: vars.colors.primaryBgSubtle },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'default',
    selected: false,
  },
});
