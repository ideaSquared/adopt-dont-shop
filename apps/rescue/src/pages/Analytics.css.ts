import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '100%',
  margin: 0,
  padding: 0,
});

export const headerActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      flexDirection: 'column',
    },
  },
});

export const filterBar = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  flexWrap: 'wrap',
});

export const metricsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

export const chartsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.spacing['4'],
  marginBottom: vars.spacing['5'],
});

export const twoColumnGrid = style({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr',
  gap: vars.spacing['4'],
  '@media': {
    'screen and (max-width: 1024px)': {
      gridTemplateColumns: '1fr',
    },
  },
});

export const cardHeader = style({
  padding: `${vars.spacing['4']} ${vars.spacing['4']} ${vars.spacing['3']} ${vars.spacing['4']}`,
  borderBottom: `1px solid ${vars.border.color.default}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
});

export const cardTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

globalStyle(`${cardTitle} h3`, {
  margin: 0,
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

globalStyle(`${cardTitle} svg`, {
  color: vars.colors.infoHover,
  fontSize: vars.typography.size.xl,
});

export const cardBody = style({
  padding: vars.spacing['4'],
});

export const breedList = style({
  display: 'grid',
  gap: vars.spacing['3'],
});

export const breedRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: vars.spacing['3'],
  background: '#F9FAFB',
  borderRadius: vars.border.radius.base,
});

export const breedTitle = style({
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['1'],
});

export const breedSubtitle = style({
  fontSize: vars.typography.size.sm,
  color: '#6B7280',
});

export const breedCount = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.bold,
  color: '#3B82F6',
});

// Email report modal styles (matches InviteStaffModal pattern)
export const emailModalForm = style({
  display: 'grid',
  gap: vars.spacing['4'],
});

export const emailModalActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  justifyContent: 'flex-end',
  paddingTop: vars.spacing['3'],
  borderTop: '1px solid #e9ecef',
});
