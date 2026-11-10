import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

// Severity indicators
export const severityDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
});

export const severityCritical = style([severityDot, { background: vars.colors.dangerHover }]);
export const severityHigh = style([severityDot, { background: '#ea580c' }]);
export const severityMedium = style([severityDot, { background: '#ca8a04' }]);
export const severityLow = style([severityDot, { background: vars.colors.infoHover }]);

export const severityLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.875rem',
  color: vars.text.secondary,
});

// Item content
export const itemTitle = style({
  fontWeight: 600,
  marginBottom: '0.25rem',
});

export const itemTitleUnassigned = style([itemTitle, { fontWeight: 700 }]);

export const itemSummary = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '350px',
});

export const itemMeta = style({
  fontSize: '0.75rem',
  color: vars.text.muted,
  marginTop: '0.25rem',
});

export const relatedUserEmailLink = style({
  color: vars.colors.primary,
  textDecoration: 'none',
  ':hover': {
    textDecoration: 'underline',
  },
});

export const timestamp = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});
