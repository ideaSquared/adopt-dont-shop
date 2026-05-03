import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const card = style({
  display: 'flex',
  gap: '1.5rem',
  alignItems: 'center',
  padding: '1.5rem',
  marginBottom: '2rem',
  background: vars.background.primary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '1rem',
  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.06)',
  '@media': {
    '(max-width: 640px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '1rem',
    },
  },
});

export const imageWrap = style({
  flexShrink: 0,
  width: '112px',
  height: '112px',
  borderRadius: '0.75rem',
  overflow: 'hidden',
  background: vars.background.secondary,
  '@media': {
    '(max-width: 640px)': {
      width: '100%',
      height: '180px',
    },
  },
});

export const petImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const placeholderIcon = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '3rem',
});

export const content = style({
  flex: 1,
  minWidth: 0,
});

export const eyebrow = style({
  margin: '0 0 0.25rem 0',
  fontSize: '0.8125rem',
  color: vars.text.secondary,
});

export const heading = style({
  margin: '0 0 0.5rem 0',
  fontSize: '1.5rem',
  color: vars.text.primary,
  lineHeight: 1.2,
});

export const subheading = style({
  margin: 0,
  fontSize: '0.9375rem',
  color: vars.text.secondary,
  lineHeight: 1.4,
});
