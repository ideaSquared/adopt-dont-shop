import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const formContainer = style({
  padding: vars.spacing['5'],
  marginBottom: vars.spacing['5'],
});

export const formSection = style({
  marginBottom: vars.spacing['5'],
  selectors: {
    '&:last-child': {
      marginBottom: '0',
    },
  },
});

export const sectionTitle = style({
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: '#1f2937',
  margin: `0 0 ${vars.spacing['3']} 0`,
  paddingBottom: vars.spacing['2'],
  borderBottom: '2px solid #e5e7eb',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['4'],
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const listInput = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const listItem = style({
  display: 'flex',
  gap: vars.spacing['2'],
  alignItems: 'center',
});

export const listItemInput = style({
  flex: 1,
  padding: '0.75rem',
  border: '1px solid #d1d5db',
  borderRadius: vars.border.radius.base,
  fontSize: vars.typography.size.sm,
  transition: 'border-color 0.2s',
  ':focus-visible': {
    outline: 'none',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  marginTop: vars.spacing['5'],
  paddingTop: vars.spacing['4'],
  borderTop: '1px solid #e5e7eb',
});

export const checkboxWrapper = style({
  marginBottom: '0.75rem',
});
