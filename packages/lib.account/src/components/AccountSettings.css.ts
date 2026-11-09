import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['8'],
  maxWidth: '48rem',
});

export const list = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.lg,
  backgroundColor: vars.background.surface,
});

export const row = style({
  padding: vars.spacing['4'],
  selectors: {
    '& + &': {
      borderTop: `${vars.border.width.thin} solid ${vars.border.color.default}`,
    },
  },
});

export const rowHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: vars.spacing['4'],
});

export const rowText = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  minWidth: 0,
});

export const rowTitle = style({
  margin: 0,
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const rowSummary = style({
  margin: 0,
  color: vars.text.secondary,
  overflowWrap: 'anywhere',
});

export const rowBody = style({
  marginTop: vars.spacing['4'],
  paddingTop: vars.spacing['4'],
  borderTop: `${vars.border.width.thin} dashed ${vars.border.color.muted}`,
});

export const themeChoices = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
  margin: 0,
  padding: 0,
  border: 'none',
});

export const themeLegend = style({
  marginBottom: vars.spacing['3'],
  padding: 0,
  color: vars.text.secondary,
});

export const themeOption = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['2']} ${vars.spacing['4']}`,
  border: `${vars.border.width.thin} solid ${vars.border.color.default}`,
  borderRadius: vars.border.radius.base,
  color: vars.text.primary,
  cursor: 'pointer',
});

export const dangerZone = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
  border: `${vars.border.width.thin} solid ${vars.border.color.danger}`,
  borderRadius: vars.border.radius.lg,
});
