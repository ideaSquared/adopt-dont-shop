import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'grid',
  gap: '0.75rem',
});

export const detailGrid = style({
  display: 'grid',
  gridTemplateColumns: '8rem 1fr',
  gap: '0.25rem 1rem',
});

// ── EntityInspector header ──────────────────────────────────────

export const headerInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  flex: 1,
  minWidth: 0,
});

export const headerTitle = style({
  fontSize: '1rem',
  fontWeight: 600,
  color: vars.text.primary,
  margin: 0,
});

export const headerSubtitle = style({
  fontSize: '0.8125rem',
  color: vars.text.muted,
  margin: 0,
});

// ── Activity tab ────────────────────────────────────────────────

export const activityList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
});

export const activityItem = style({
  display: 'flex',
  gap: '0.75rem',
  padding: '0.625rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
  ':last-child': {
    borderBottom: 'none',
  },
});

export const activityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.primary,
  marginTop: '0.375rem',
  flexShrink: 0,
});

export const activityContent = style({
  flex: 1,
  minWidth: 0,
});

export const activityDescription = style({
  fontSize: '0.8125rem',
  color: vars.text.primary,
  margin: 0,
});

export const activityMeta = style({
  fontSize: '0.75rem',
  color: vars.text.muted,
  margin: '0.125rem 0 0 0',
});

export const activityEmpty = style({
  padding: '2rem 1rem',
  textAlign: 'center',
  color: vars.text.muted,
  fontSize: '0.875rem',
});
