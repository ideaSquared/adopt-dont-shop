import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const listContainer = style({
  background: 'white',
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['4'],
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
});

export const listControls = style({
  marginBottom: vars.spacing['5'],
  paddingBottom: vars.spacing['3'],
  borderBottom: '1px solid #e9ecef',
});

export const searchFilters = style({
  display: 'flex',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const searchInput = style({
  flex: 1,
  minWidth: '200px',
});

export const filterSelect = style({
  minWidth: '180px',
});

export const staffCount = style({
  fontSize: vars.typography.size.sm,
  color: '#666',
  fontWeight: vars.typography.weight.medium,
});

export const staffGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
  gap: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
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

export const emptyContainer = style({
  maxWidth: '400px',
  margin: '0 auto',
});

export const emptyIcon = style({
  fontSize: vars.typography.size['5xl'],
  marginBottom: vars.spacing['3'],
});

export const emptyTitle = style({
  margin: `0 0 ${vars.spacing['2']} 0`,
  color: '#333',
  fontWeight: vars.typography.weight.semibold,
});

export const emptyText = style({
  margin: '0',
  color: '#666',
});
