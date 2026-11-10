import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const staffGrid = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))',
  gap: vars.spacing['3'],
});

export const loadingContainer = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
});

export const loadingSpinner = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: vars.spacing['3'],
});

export const emptyState = style({
  textAlign: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['3']}`,
});

export const emptyTitle = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
});

export const emptyText = style({
  margin: 0,
  color: vars.text.secondary,
});
