import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const content = style({
  textAlign: 'center',
});

export const icon = style({
  fontSize: '4rem',
  marginBottom: vars.spacing['4'],
  color: '#4ecdc4',
});

export const message = style({
  fontSize: vars.typography.size.base,
  color: '#666',
  lineHeight: 1.6,
  marginBottom: vars.spacing['5'],
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const primaryButton = style({
  background: 'linear-gradient(45deg, #4ecdc4, #44a08d)',
  color: 'white',
  padding: `${vars.spacing['3']} ${vars.spacing['5']}`,
  borderRadius: vars.border.radius.lg,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.base,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['2'],
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
  ':hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(78, 205, 196, 0.4)',
  },
});

export const secondaryButton = style({
  background: 'transparent',
  color: '#4ecdc4',
  padding: `${vars.spacing['3']} ${vars.spacing['5']}`,
  border: '2px solid #4ecdc4',
  borderRadius: vars.border.radius.lg,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.base,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['2'],
  transition: 'all 0.3s ease',
  ':hover': {
    background: '#4ecdc4',
    color: 'white',
    transform: 'translateY(-2px)',
  },
});
