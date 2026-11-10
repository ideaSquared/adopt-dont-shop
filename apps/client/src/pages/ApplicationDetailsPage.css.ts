import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
  '@media': {
    '(max-width: 768px)': {
      padding: '1rem',
    },
  },
});

export const messageRescueRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: '2rem',
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '12px',
  padding: '2rem',
  marginBottom: '2rem',
});

export const sectionTitle = style({
  fontSize: '1.25rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

export const infoGrid = style({
  display: 'grid',
  gap: '1rem',
});

export const infoItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const infoLabel = style({
  fontWeight: '500',
  color: vars.text.tertiary,
  minWidth: '120px',
});

export const infoValue = style({
  color: vars.text.primary,
  textAlign: 'right',
  flex: '1',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  marginTop: '2rem',
});

export const withdrawButton = style({
  backgroundColor: '#dc2626',
  borderColor: '#dc2626',
  color: 'white',
});
