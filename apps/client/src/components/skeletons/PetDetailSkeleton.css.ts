import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const container = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: vars.spacing[4],
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: vars.spacing[4],
  gap: vars.spacing[3],
  flexWrap: 'wrap',
});

export const titleGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});

export const subtitleRow = style({
  display: 'flex',
  gap: vars.spacing[2],
});

export const imagePlaceholder = style({
  width: '100%',
  aspectRatio: '16/9',
  maxHeight: '500px',
  borderRadius: vars.border.radius.lg,
  marginBottom: vars.spacing[4],
});

export const infoGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing[3],
  marginBottom: vars.spacing[4],
});

export const infoItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[1],
});

export const descriptionBlock = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing[2],
});
