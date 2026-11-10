import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const filtersContainer = style({
  padding: '0.75rem',
  marginBottom: 0,
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: vars.border.radius.base,
});

export const filtersHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '0.75rem',
});

globalStyle(`${filtersHeader} h3`, {
  margin: 0,
  color: '#111827',
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
});

export const filtersGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: vars.spacing['3'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
      gap: '0.75rem',
    },
  },
});

export const filterGroup = style({});

globalStyle(`${filterGroup} .label`, {
  display: 'block',
  marginBottom: vars.spacing['2'],
  fontWeight: vars.typography.weight.medium,
  fontSize: vars.typography.size.sm,
  color: '#111827',
});

globalStyle(`${filterGroup} select`, {
  width: '100%',
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: vars.border.radius.sm,
  fontSize: vars.typography.size.sm,
  fontFamily: 'inherit',
  background: 'white',
});

export const filterActions = style({
  display: 'flex',
  gap: '0.75rem',
  marginTop: '0.75rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #e5e7eb',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      gap: vars.spacing['2'],
    },
  },
});
