import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const statsBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
});

export const priorityIndicatorCritical = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.dangerHover,
  flexShrink: 0,
});

export const priorityIndicatorHigh = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#ea580c',
  flexShrink: 0,
});

export const priorityIndicatorMedium = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: '#ca8a04',
  flexShrink: 0,
});

export const priorityIndicatorLow = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.infoHover,
  flexShrink: 0,
});

export const priorityIndicatorDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.muted,
  flexShrink: 0,
});

export const priorityLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: vars.text.secondary,
});

export const actionButtons = style({
  display: 'flex',
  gap: '0.5rem',
});

export const reportTitle = style({
  fontWeight: 600,
  marginBottom: '0.25rem',
});

export const reportSummary = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
  marginBottom: '0.25rem',
});

export const reportTagRow = style({
  marginTop: '0.5rem',
});

export const reportedAt = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});

export const entityFilterBanner = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['4'],
  padding: `${vars.spacing['3']} ${vars.spacing['4']}`,
  borderRadius: vars.border.radius.lg,
  fontSize: vars.typography.size.sm,
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});
