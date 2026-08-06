import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// ADS UX D7: pet-filter deep-link banner, previously an inline style object with
// hardcoded hex values. Routed through the shared info-tone tokens so it stays
// theme-aware and WCAG-consistent.
export const petFilterBanner = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: vars.background.info,
  border: `${vars.border.width.thin} solid ${vars.border.color.info}`,
  borderRadius: vars.border.radius.base,
  marginBottom: vars.spacing['3'],
  fontSize: vars.typography.size.sm,
  color: vars.text.info,
});

export const petFilterClearButton = style({
  background: 'transparent',
  border: `${vars.border.width.thin} solid ${vars.border.color.info}`,
  borderRadius: vars.border.radius.sm,
  cursor: 'pointer',
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  fontSize: vars.typography.size.xs,
  color: vars.text.info,
});
