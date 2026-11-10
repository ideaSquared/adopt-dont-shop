import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Shared page shell and heading block, used by the Applications and Foster
// Coordination pages. Replaces the `.page-container` / `.page-header` rules
// that lived in the global App.css.
export const pageContainer = style({
  width: '100%',
});

export const pageHeader = style({
  marginBottom: vars.spacing['8'],
});

globalStyle(`${pageHeader} h1`, {
  fontSize: vars.typography.size['4xl'],
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['2']} 0`,
});

globalStyle(`${pageHeader} p`, {
  fontSize: vars.typography.size.lg,
  color: vars.text.secondary,
  margin: 0,
  lineHeight: vars.typography.lineHeight.relaxed,
});
