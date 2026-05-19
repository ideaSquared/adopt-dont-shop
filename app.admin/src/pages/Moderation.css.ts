import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
});

export const pageHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexWrap: 'wrap',
  gap: '1rem',
});

export const headerLeft = style({});

globalStyle(`${headerLeft} h1`, {
  fontSize: '2rem',
  fontWeight: '700',
  color: vars.text.primary,
  margin: '0 0 0.5rem 0',
});

globalStyle(`${headerLeft} p`, {
  fontSize: '1rem',
  color: vars.text.tertiary,
  margin: 0,
});

export const statsBar = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '1rem',
  marginBottom: '1rem',
});

export const statCard = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
});

export const statDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
});

export const statLabel = style({
  fontSize: '0.875rem',
  color: vars.text.tertiary,
});

export const statValue = style({
  fontSize: '1.5rem',
  fontWeight: '700',
  color: vars.text.primary,
});

export const filterBar = style({
  background: vars.background.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '12px',
  padding: '1.5rem',
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  minWidth: '180px',
  flex: 1,
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  color: vars.text.secondary,
});

export const select = style({
  padding: '0.625rem 1rem',
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  color: vars.text.primary,
  background: vars.background.secondary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    borderColor: vars.text.quaternary,
  },
  ':focus': {
    outline: 'none',
    borderColor: vars.colors.semantic.info['500'],
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
});

export const searchWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '250px',
});

export const searchIcon = style({
  position: 'absolute',
  left: '1rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: vars.text.quaternary,
  pointerEvents: 'none',
});

export const badgeSuccess = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.semantic.success['100'],
  color: vars.colors.semantic.success['700'],
});

export const badgeDanger = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.semantic.error['100'],
  color: vars.colors.semantic.error['600'],
});

export const badgeInfo = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

export const badgeNeutral = style({
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  display: 'inline-block',
  background: vars.background.tertiary,
  color: vars.colors.neutral['600'],
});

export const priorityIndicatorCritical = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.colors.semantic.error['600'],
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
  background: vars.colors.semantic.info['600'],
  flexShrink: 0,
});

export const priorityIndicatorDefault = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.text.quaternary,
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

export const iconButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: '6px',
  background: vars.background.secondary,
  color: vars.text.tertiary,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  ':hover': {
    background: vars.background.primary,
    color: vars.text.primary,
    borderColor: vars.border.color.secondary,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const contentTypeTagPet = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#ede9fe',
  color: '#6b21a8',
});

export const contentTypeTagMessage = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

export const contentTypeTagUser = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: '#fce7f3',
  color: '#9f1239',
});

export const contentTypeTagRescue = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.warning['100'],
  color: vars.colors.semantic.warning['800'],
});

export const contentTypeTagDefault = style({
  padding: '0.25rem 0.625rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.background.tertiary,
  color: vars.text.secondary,
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

export const errorBanner = style({
  padding: '2rem',
  textAlign: 'center',
  color: vars.colors.semantic.error['600'],
});

const statIconBase = style({
  width: '48px',
  height: '48px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
});

export const statIconRed = style([
  statIconBase,
  { background: '#dc262620', color: vars.colors.semantic.error['600'] },
]);

export const statIconBlue = style([
  statIconBase,
  { background: '#3b82f620', color: vars.colors.semantic.info['500'] },
]);

export const statIconOrange = style([statIconBase, { background: '#ea580c20', color: '#ea580c' }]);

export const statIconGreen = style([
  statIconBase,
  { background: '#16a34a20', color: vars.colors.semantic.success['600'] },
]);

export const searchInputPadded = style({
  paddingLeft: '2.75rem',
  width: '100%',
});
