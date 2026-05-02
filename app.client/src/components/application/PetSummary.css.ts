import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const summaryCard = style({
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  padding: '1.5rem',
  position: 'sticky',
  top: '2rem',
});

export const petImage = style({
  width: '100%',
  height: '200px',
  objectFit: 'cover',
  borderRadius: '8px',
  marginBottom: '1rem',
});

export const petName = style({
  fontSize: '1.5rem',
  fontWeight: '600',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

export const petDetails = style({
  marginBottom: '1rem',
});

export const detailItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  borderBottom: `1px solid ${vars.border.color.primary}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const detailLabel = style({
  fontWeight: '500',
  color: vars.text.secondary,
  fontSize: '0.875rem',
});

export const detailValue = style({
  color: vars.text.primary,
  fontSize: '0.875rem',
});

export const rescueInfo = style({
  padding: '1rem',
  background: vars.background.secondary,
  borderRadius: '8px',
  marginTop: '1rem',
});

export const rescueName = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

export const rescueLocation = style({
  fontSize: '0.875rem',
  color: vars.text.secondary,
  margin: '0',
});

export const adoptionFee = style({
  textAlign: 'center',
  padding: '1rem',
  background: vars.colors.primary['50'],
  borderRadius: '8px',
  marginTop: '1rem',
});

export const feeLabel = style({
  fontSize: '0.875rem',
  color: vars.text.secondary,
  marginBottom: '0.25rem',
});

export const feeAmount = style({
  fontSize: '1.5rem',
  fontWeight: '700',
  color: vars.colors.primary['600'],
});
