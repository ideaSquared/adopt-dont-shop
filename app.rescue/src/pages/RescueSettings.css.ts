import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
});

export const pageHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${pageHeader} h1`, {
  fontSize: '2rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${pageHeader} p`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const tabContainer = style({
  borderBottom: `2px solid ${vars.border.color.default}`,
  marginBottom: '2rem',
});

export const tabList = style({
  display: 'flex',
  gap: '0.5rem',
});

export const tab = style({
  padding: '1rem 1.5rem',
  fontSize: '0.875rem',
  fontWeight: 500,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  color: vars.text.tertiary,
  transition: 'all 0.2s',
  position: 'relative',
  bottom: '-2px',
  selectors: {
    '&:hover': {
      color: vars.colors.info,
    },
  },
});

export const tabActive = style({
  color: vars.colors.info,
  borderBottomColor: vars.colors.info,
});

export const tabPanel = style({
  display: 'block',
});

export const tabPanelHidden = style({
  display: 'none',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '400px',
  fontSize: '1.125rem',
  color: vars.text.tertiary,
});

export const errorContainer = style({
  backgroundColor: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
  padding: '2rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
});

globalStyle(`${errorContainer} h3`, {
  fontSize: '1.25rem',
  margin: '0 0 1rem 0',
});

globalStyle(`${errorContainer} p`, {
  margin: 0,
});

export const placeholderSection = style({
  background: vars.background.body,
  border: `2px dashed ${vars.border.color.muted}`,
  borderRadius: '0.75rem',
  padding: '3rem',
  textAlign: 'center',
});

globalStyle(`${placeholderSection} h2`, {
  fontSize: '1.5rem',
  color: vars.text.secondary,
  margin: '0 0 1rem 0',
});

globalStyle(`${placeholderSection} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const securitySection = style({
  background: vars.background.surface,
  border: `1px solid ${vars.border.color.default}`,
  borderRadius: '0.75rem',
  padding: '2rem',
});

globalStyle(`${securitySection} h2`, {
  fontSize: '1.25rem',
  color: vars.text.secondary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${securitySection} > p`, {
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  margin: '0 0 1.5rem 0',
});
