import { globalStyle, style } from '@vanilla-extract/css';
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
  // Stretch so the Remove button is exactly as tall as the text box.
  alignItems: 'stretch',
});

// The shared Input wraps itself with a bottom margin, which pushed the text box off the
// button's centre line. The row owns the spacing here.
globalStyle(`${listItem} > :first-child`, {
  flex: 1,
  marginBottom: 0,
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

// A small number field shouldn't stretch across the whole form.
export const narrowField = style({
  maxWidth: '16rem',
});
