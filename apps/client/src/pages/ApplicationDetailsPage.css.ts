import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '800px',
  margin: '0 auto',
  padding: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
    },
  },
});

export const messageRescueRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  marginBottom: vars.spacing['5'],
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['5'],
  marginBottom: vars.spacing['5'],
});

export const sectionTitle = style({
  fontSize: vars.typography.size.xl,
  color: vars.text.primary,
  marginBottom: vars.spacing['3'],
});

export const infoGrid = style({
  display: 'grid',
  gap: vars.spacing['3'],
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
  fontWeight: vars.typography.weight.medium,
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
  gap: vars.spacing['3'],
  marginTop: vars.spacing['5'],
});

export const withdrawButton = style({
  backgroundColor: '#dc2626',
  borderColor: '#dc2626',
  color: 'white',
});
