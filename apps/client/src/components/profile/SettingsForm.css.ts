import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const wrapper = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const form = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const section = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  padding: '1.5rem',
});

export const sectionTitle = style({
  fontSize: '1.1rem',
  color: vars.text.primary,
  marginBottom: '1rem',
});

export const settingItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '0.5rem',
    },
  },
});

export const settingLabel = style({
  flex: 1,
});

globalStyle(`${settingLabel} h4`, {
  fontSize: '1rem',
  color: vars.text.primary,
  marginBottom: '0.25rem',
});

globalStyle(`${settingLabel} p`, {
  fontSize: '0.875rem',
  color: vars.text.secondary,
  margin: 0,
});

export const settingControl = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const buttonGroup = style({
  display: 'flex',
  gap: '1rem',
  justifyContent: 'flex-end',
  marginTop: '1rem',
  '@media': {
    '(max-width: 768px)': {
      flexDirection: 'column',
    },
  },
});

export const dangerZone = style({
  border: `1px solid ${vars.colors.dangerBorderSubtle}`,
  borderRadius: '8px',
  padding: '1.5rem',
  background: vars.colors.dangerBgSubtle,
});

globalStyle(`${dangerZone} h3`, {
  color: vars.colors.dangerActive,
  marginBottom: '1rem',
});

globalStyle(`${dangerZone} p`, {
  color: vars.colors.dangerHover,
  marginBottom: '1rem',
  fontSize: '0.875rem',
});
