import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const formContainer = style({
  minHeight: '400px',
});

export const reviewContainer = style({
  maxWidth: '640px',
});

export const reviewTitle = style({
  fontSize: '1.5rem',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

export const reviewDescription = style({
  color: vars.text.secondary,
  margin: '0 0 2rem 0',
});

export const reviewCategory = style({
  marginBottom: '1.5rem',
  padding: '1.25rem 1.5rem',
  background: vars.background.surface,
  borderRadius: '0.5rem',
});

export const reviewCategoryTitle = style({
  fontSize: '1rem',
  fontWeight: '600',
  color: vars.text.primary,
  margin: '0 0 1rem 0',
  paddingBottom: '0.5rem',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const reviewItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  padding: '0.5rem 0',
  selectors: {
    '& + &': {
      borderTop: `1px solid ${vars.border.color.default}`,
    },
  },
});

export const reviewLabel = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
});

export const reviewValue = style({
  fontSize: '0.9375rem',
  color: vars.text.primary,
});

export const navigationButtons = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '2rem',
  paddingTop: '2rem',
  borderTop: `1px solid ${vars.border.color.default}`,
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      gap: '1rem',
    },
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
    },
  },
});

globalStyle(`${buttonGroup} button`, {
  '@media': {
    'screen and (max-width: 768px)': {
      flex: '1',
    },
  },
});

export const saveIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      justifyContent: 'space-between',
    },
  },
});

export const saveStatusText = style({
  fontSize: '0.8125rem',
});

export const saveStatusVariants = styleVariants({
  saved: { color: vars.colors.successHover },
  saving: { color: vars.text.muted },
  error: { color: vars.colors.dangerHover },
  idle: { color: vars.border.color.strong },
});
