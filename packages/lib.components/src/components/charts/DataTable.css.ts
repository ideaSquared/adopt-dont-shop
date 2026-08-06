import { globalStyle, style } from '@vanilla-extract/css';

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
