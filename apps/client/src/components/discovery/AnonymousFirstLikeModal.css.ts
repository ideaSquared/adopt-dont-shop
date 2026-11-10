import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const image = style({
  width: '100%',
  height: '14rem',
  objectFit: 'cover',
  borderRadius: vars.border.radius.lg,
  marginBottom: vars.spacing['3'],
});

export const body = style({
  textAlign: 'center',
});

export const subtitle = style({
  fontSize: vars.typography.size.base,
  color: '#333',
  margin: '0 0 1.25rem 0',
});

export const cta = style({
  display: 'inline-block',
  padding: '0.75rem 1.5rem',
  background: '#f5576c',
  color: 'white',
  borderRadius: '999px',
  fontWeight: vars.typography.weight.bold,
  textDecoration: 'none',
  ':hover': { background: '#dc2626' },
});
