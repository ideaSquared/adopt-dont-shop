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

export const headerActions = style({
  display: 'flex',
  gap: '0.75rem',
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
  minWidth: '200px',
  flex: 1,
});

export const filterLabel = style({
  fontSize: '0.875rem',
  fontWeight: '500',
  color: vars.text.secondary,
});

export const searchInputWrapper = style({
  position: 'relative',
  flex: 2,
  minWidth: '300px',
});

globalStyle(`${searchInputWrapper} svg`, {
  position: 'absolute',
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: vars.text.quaternary,
  fontSize: '1.125rem',
});

globalStyle(`${searchInputWrapper} input`, {
  paddingLeft: '2.5rem',
});

export const select = style({
  padding: '0.625rem 0.875rem',
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
    borderColor: vars.colors.primary['500'],
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
  },
});

export const badgeSuccess = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.success['100'],
  color: vars.colors.semantic.success['800'],
});

export const badgeWarning = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.warning['100'],
  color: vars.colors.semantic.warning['800'],
});

export const badgeDanger = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.error['100'],
  color: vars.colors.semantic.error['800'],
});

export const badgeInfo = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

export const badgeNeutral = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: '600',
  background: vars.background.tertiary,
  color: vars.text.secondary,
});

export const userAvatar = style({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: vars.colors.gradients.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.background.secondary,
  fontWeight: '600',
  fontSize: '0.875rem',
});

export const userInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
});

export const userDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
});

export const userName = style({
  fontWeight: '600',
  color: vars.text.primary,
});

export const userEmail = style({
  fontSize: '0.8125rem',
  color: vars.text.tertiary,
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

export const errorPanel = style({
  background: '#fee2e2',
  border: '1px solid #fecaca',
  borderRadius: '12px',
  padding: '2rem',
  textAlign: 'center',
  color: '#991b1b',
});

export const errorTitle = style({
  margin: '0 0 1rem 0',
  fontWeight: 600,
});

export const errorMessage = style({
  margin: '0',
  fontSize: '0.875rem',
});

export const addUserIcon = style({
  marginRight: '0.5rem',
});
