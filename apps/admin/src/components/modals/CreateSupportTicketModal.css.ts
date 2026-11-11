import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
});

export const recipientInfo = style({
  padding: vars.spacing['3'],
  background: vars.background.muted,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const recipientLabel = style({
  fontSize: vars.typography.size.xs,
  fontWeight: vars.typography.weight.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: vars.text.tertiary,
});

export const recipientName = style({
  fontSize: vars.typography.size.sm,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const recipientEmail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
});

export const buttonGroup = style({
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
  paddingTop: vars.spacing['3'],
  borderTop: `1px solid ${vars.border.color.muted}`,
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (max-width: 640px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const infoBox = style({
  padding: '0.75rem 1rem',
  background: '#dbeafe',
  border: '1px solid #93c5fd',
  borderRadius: vars.border.radius.base,
  color: '#1e40af',
  fontSize: vars.typography.size.sm,
});
