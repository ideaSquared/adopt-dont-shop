import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
});

export const configGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
  gap: '1.5rem',
});

export const sectionCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const infoBanner = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
  background: vars.colors.infoBgSubtle,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.colors.infoTextEmphasis,
  marginBottom: '1rem',
});

globalStyle(`${infoBanner} svg`, {
  flexShrink: 0,
  marginTop: '0.125rem',
});

globalStyle(`${infoBanner} a`, {
  color: vars.colors.infoHover,
  fontWeight: '600',
  textDecoration: 'none',
});

globalStyle(`${infoBanner} a:hover`, {
  textDecoration: 'underline',
});

export const gateItem = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: vars.border.color.muted,
    background: vars.background.body,
  },
});

export const gateInfo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
  flex: 1,
});

export const gateName = style({
  fontWeight: '600',
  color: vars.text.primary,
  fontSize: '0.9375rem',
});

export const gateDescription = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  lineHeight: 1.4,
});

export const gateKey = style({
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  color: vars.text.muted,
  marginTop: '0.25rem',
});

export const statusBadgeEnabled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
});

export const statusBadgeDisabled = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.375rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.background.muted,
  color: vars.text.tertiary,
});

export const settingItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '8px',
});

export const settingLabel = style({
  fontWeight: '600',
  color: vars.text.primary,
  fontSize: '0.875rem',
});

export const settingValue = style({
  fontFamily: 'monospace',
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  padding: '0.5rem',
  background: vars.background.body,
  borderRadius: '6px',
});

export const statsigLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.375rem',
  color: vars.colors.infoHover,
  textDecoration: 'none',
  fontSize: '0.875rem',
  fontWeight: '600',
  ':hover': {
    textDecoration: 'underline',
  },
});
