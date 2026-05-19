import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
});

export const logDetails = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['1'],
});

export const logAction = style({
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

globalStyle(`${logAction} svg`, {
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const logResource = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.tertiary,
});

export const userInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

export const userAvatar = style({
  width: '24px',
  height: '24px',
  borderRadius: vars.border.radius.full,
  background: vars.colors.gradients.primary,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: vars.text.inverse,
  fontWeight: vars.typography.weight.semibold,
  fontSize: vars.typography.size.xs,
  flexShrink: 0,
});

export const userName = style({
  fontSize: vars.typography.size.sm,
  color: vars.text.primary,
  fontWeight: vars.typography.weight.medium,
});

const actionIconBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: vars.border.radius.md,
  flexShrink: 0,
} as const;

export const actionIconCreate = style({
  ...actionIconBase,
  background: vars.colors.semantic.success['100'],
  color: vars.colors.semantic.success['800'],
});

globalStyle(`${actionIconCreate} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconUpdate = style({
  ...actionIconBase,
  background: vars.colors.semantic.info['100'],
  color: vars.colors.semantic.info['800'],
});

globalStyle(`${actionIconUpdate} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconDelete = style({
  ...actionIconBase,
  background: vars.colors.semantic.error['100'],
  color: vars.colors.semantic.error['800'],
});

globalStyle(`${actionIconDelete} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconLogin = style({
  ...actionIconBase,
  background: vars.colors.semantic.warning['100'],
  color: vars.colors.semantic.warning['800'],
});

globalStyle(`${actionIconLogin} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconLogout = style({
  ...actionIconBase,
  background: vars.colors.neutral['100'],
  color: vars.colors.neutral['700'],
});

globalStyle(`${actionIconLogout} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconDefault = style({
  ...actionIconBase,
  background: vars.colors.primary['100'],
  color: vars.colors.primary['800'],
});

globalStyle(`${actionIconDefault} svg`, {
  fontSize: vars.typography.size.sm,
});

export const changesButton = style({
  padding: `${vars.spacing['1']} ${vars.spacing['2.5']}`,
  border: `1px solid ${vars.border.color.secondary}`,
  borderRadius: vars.border.radius.md,
  background: vars.background.secondary,
  color: vars.text.tertiary,
  fontSize: vars.typography.size.xs,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.background.tertiary,
    borderColor: vars.border.color.tertiary,
  },
});

export const ipAddress = style({
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  background: vars.background.tertiary,
  padding: `${vars.spacing['0.5']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.sm,
});

export const modal = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: vars.background.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: vars.zIndex.modal,
});

export const modalContent = style({
  background: vars.background.secondary,
  borderRadius: vars.border.radius.xl,
  padding: vars.spacing.lg,
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: vars.shadows.xl,
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing.md,
  paddingBottom: vars.spacing.md,
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

export const modalTitle = style({
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: 0,
});

export const closeButton = style({
  background: 'none',
  border: 'none',
  fontSize: vars.typography.size.xl,
  color: vars.text.tertiary,
  cursor: 'pointer',
  padding: 0,
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: vars.border.radius.md,
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.background.tertiary,
    color: vars.text.primary,
  },
});

export const jsonBlock = style({
  background: vars.colors.neutral['900'],
  color: vars.colors.neutral['50'],
  padding: vars.spacing.md,
  borderRadius: vars.border.radius.lg,
  overflow: 'auto',
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.relaxed,
  margin: 0,
});

export const subUserType = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.quaternary,
});

export const buttonIcon = style({
  marginRight: vars.spacing['2'],
});

export const errorBanner = style({
  padding: vars.spacing.md,
  color: vars.text.error,
  background: vars.background.error,
  borderRadius: vars.border.radius.lg,
  margin: `${vars.spacing.md} 0`,
});
