import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const errorContainer = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  textAlign: 'center',
  minHeight: '200px',
  background: vars.colors.dangerBgSubtle,
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  borderRadius: vars.border.radius.lg,
  margin: '1rem',
});

export const errorTitle = style({
  color: vars.colors.dangerActive,
  margin: '0 0 1rem 0',
  fontSize: '1.5rem',
  fontWeight: '600',
});

export const errorMessage = style({
  color: vars.colors.dangerHover,
  margin: '0 0 1.5rem 0',
  fontSize: '1rem',
  maxWidth: '500px',
});

export const errorDetails = style({
  marginBottom: '1rem',
  textAlign: 'left',
});

export const errorSummary = style({
  cursor: 'pointer',
  marginBottom: '0.5rem',
});

export const errorPre = style({
  fontSize: '0.875rem',
  overflow: 'auto',
  maxWidth: '100%',
});

export const retryButton = style({
  background: vars.colors.primary,
  color: 'white',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: vars.border.radius.base,
  fontSize: '1rem',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  ':hover': {
    background: vars.colors.primaryHover,
  },
  ':focus': {
    outline: `2px solid ${vars.colors.primaryBorderSubtle}`,
    outlineOffset: '2px',
  },
});
