import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const dashboardContainer = style({
  maxWidth: 'none',
  margin: 0,
  width: '100%',
  padding: 0,
});

export const dashboardHeader = style({
  marginBottom: '2rem',
});

globalStyle(`${dashboardHeader} h1`, {
  fontSize: '2.5rem',
  fontWeight: 700,
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${dashboardHeader} p`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const welcomeMessage = style({
  background: `linear-gradient(135deg, ${vars.colors.infoBgSubtle} 0%, ${vars.colors.infoBgSubtle} 100%)`,
  border: `1px solid ${vars.colors.infoBorderSubtle}`,
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '2rem',
});

globalStyle(`${welcomeMessage} h2`, {
  margin: '0 0 0.5rem 0',
  color: vars.colors.infoTextEmphasis,
  fontSize: '1.25rem',
});

globalStyle(`${welcomeMessage} p`, {
  margin: 0,
  color: vars.colors.infoActive,
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
});

export const analyticsGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr',
  gap: '1.5rem',
  marginBottom: '2rem',
  width: '100%',
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});
