import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/dist/styles/theme.css';

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['6'],
});

export const formRow = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: vars.spacing['4'],
  '@media': {
    '(max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

export const styledAlert = style({
  marginBottom: vars.spacing['4'],
});

export const passwordRequirements = style({
  fontSize: '0.8rem',
  color: vars.text.secondary,
  marginTop: vars.spacing['2'],
});

export const passwordRequirementsList = style({
  margin: `${vars.spacing['2']} 0 0 ${vars.spacing['4']}`,
  padding: '0',
  listStyle: 'none',
});

export const requirementItem = style({
  marginBottom: vars.spacing['1'],
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  transition: 'color 0.2s ease',
});

export const requirementItemValid = style({
  color: '#10b981',
});

export const requirementItemInvalid = style({
  color: '#ef4444',
});

export const checkIcon = style({
  width: '14px',
  height: '14px',
  borderRadius: vars.border.radius.full,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  transition: 'all 0.2s ease',
});

export const checkIconValid = style({
  backgroundColor: '#10b981',
  color: 'white',
});

export const checkIconInvalid = style({
  backgroundColor: vars.border.color.primary,
  color: vars.text.disabled,
});

export const termsCheckbox = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: vars.spacing['3'],
  margin: `${vars.spacing['4']} 0`,
});

export const termsCheckboxLabel = style({
  fontSize: '0.9rem',
  color: vars.text.secondary,
  lineHeight: vars.typography.lineHeight.snug,
});

globalStyle(`${termsCheckboxLabel} a`, {
  color: '#667eea',
  textDecoration: 'none',
});

globalStyle(`${termsCheckboxLabel} a:hover`, {
  textDecoration: 'underline',
});
