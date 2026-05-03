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
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
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
  borderBottom: `1px solid ${vars.border.color.primary}`,
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

export const switchLabel = style({
  position: 'relative',
  display: 'inline-block',
  width: '50px',
  height: '24px',
});

globalStyle(`${switchLabel} input`, {
  opacity: 0,
  width: 0,
  height: 0,
});

globalStyle(`${switchLabel} span`, {
  position: 'absolute',
  cursor: 'pointer',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: vars.colors.neutral['300'],
  transition: '0.3s',
  borderRadius: '24px',
});

globalStyle(`${switchLabel} span:before`, {
  position: 'absolute',
  content: '""',
  height: '18px',
  width: '18px',
  left: '3px',
  bottom: '3px',
  backgroundColor: 'white',
  transition: '0.3s',
  borderRadius: '50%',
});

globalStyle(`${switchLabel} input:checked + span`, {
  backgroundColor: vars.colors.primary['500'],
});

globalStyle(`${switchLabel} input:checked + span:before`, {
  transform: 'translateX(26px)',
});

export const select = style({
  padding: '0.5rem',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '6px',
  background: vars.background.primary,
  color: vars.text.primary,
  fontSize: '0.875rem',
  minWidth: '150px',
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.primary['500'],
  },
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
  border: `1px solid ${vars.colors.semantic.error['300']}`,
  borderRadius: '8px',
  padding: '1.5rem',
  background: vars.colors.semantic.error['50'],
});

globalStyle(`${dangerZone} h3`, {
  color: vars.colors.semantic.error['700'],
  marginBottom: '1rem',
});

globalStyle(`${dangerZone} p`, {
  color: vars.colors.semantic.error['600'],
  marginBottom: '1rem',
  fontSize: '0.875rem',
});
