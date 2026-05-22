import { style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['4'],
  padding: vars.spacing['4'],
  height: '100%',
});

export const pageHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const splitPaneContainer = style({
  flex: '1 1 auto',
  minHeight: '400px',
});

export const listRow = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const listRowName = style({
  fontWeight: 600,
});

export const listRowEmail = style({
  color: vars.text.muted,
  fontSize: vars.typography.size.sm,
});

export const detailHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
  marginBottom: vars.spacing['3'],
  paddingBottom: vars.spacing['3'],
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const detailField = style({
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: vars.spacing['2'],
  padding: `${vars.spacing['1']} 0`,
});

export const detailFieldLabel = style({
  color: vars.text.muted,
  fontSize: vars.typography.size.sm,
});

export const detailFieldValue = style({
  color: vars.text.primary,
});

export const loading = style({
  padding: vars.spacing['4'],
  textAlign: 'center',
  color: vars.text.muted,
});

export const errorBox = style({
  padding: vars.spacing['3'],
  border: `1px solid ${vars.border.color.danger}`,
  background: vars.background.danger,
  color: vars.text.danger,
  borderRadius: vars.border.radius.base,
});
