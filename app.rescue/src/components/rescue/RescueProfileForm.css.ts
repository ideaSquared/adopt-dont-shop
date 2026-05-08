import { style } from '@vanilla-extract/css';

export const formContainer = style({
  padding: '2rem',
  marginBottom: '2rem',
});

export const formSection = style({
  marginBottom: '2rem',
  selectors: {
    '&:last-child': {
      marginBottom: '0',
    },
  },
});

export const sectionTitle = style({
  fontSize: '1.125rem',
  fontWeight: '600',
  color: '#1f2937',
  margin: '0 0 1rem 0',
  paddingBottom: '0.5rem',
  borderBottom: '2px solid #e5e7eb',
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1.5rem',
  marginBottom: '1.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '2rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

export const formGroupFullWidth = style({
  gridColumn: '1 / -1',
});
