import { style } from '@vanilla-extract/css';

export const image = style({
  width: '100%',
  height: '14rem',
  objectFit: 'cover',
  borderRadius: '12px',
  marginBottom: '1rem',
});

export const body = style({
  textAlign: 'center',
});

export const subtitle = style({
  fontSize: '1rem',
  color: '#333',
  margin: '0 0 1.25rem 0',
});

export const cta = style({
  display: 'inline-block',
  padding: '0.75rem 1.5rem',
  background: '#f5576c',
  color: 'white',
  borderRadius: '999px',
  fontWeight: 700,
  textDecoration: 'none',
  ':hover': { background: '#dc2626' },
});
