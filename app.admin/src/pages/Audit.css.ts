import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['2'],
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
  borderRadius: vars.border.radius.pill,
  background: vars.colors.gradientPrimary,
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
  borderRadius: vars.border.radius.base,
  flexShrink: 0,
} as const;

export const actionIconCreate = style({
  ...actionIconBase,
  background: vars.colors.successBgSubtle,
  color: vars.colors.successTextEmphasis,
});

globalStyle(`${actionIconCreate} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconUpdate = style({
  ...actionIconBase,
  background: vars.colors.infoBgSubtle,
  color: vars.colors.infoTextEmphasis,
});

globalStyle(`${actionIconUpdate} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconDelete = style({
  ...actionIconBase,
  background: vars.colors.dangerBgSubtle,
  color: vars.colors.dangerTextEmphasis,
});

globalStyle(`${actionIconDelete} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconLogin = style({
  ...actionIconBase,
  background: vars.colors.warningBgSubtle,
  color: vars.colors.warningTextEmphasis,
});

globalStyle(`${actionIconLogin} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconLogout = style({
  ...actionIconBase,
  background: vars.background.muted,
  color: vars.text.secondary,
});

globalStyle(`${actionIconLogout} svg`, {
  fontSize: vars.typography.size.sm,
});

export const actionIconDefault = style({
  ...actionIconBase,
  background: vars.colors.primaryBgSubtle,
  color: vars.colors.primaryTextEmphasis,
});

globalStyle(`${actionIconDefault} svg`, {
  fontSize: vars.typography.size.sm,
});

export const changesButton = style({
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  border: `1px solid ${vars.border.color.muted}`,
  borderRadius: vars.border.radius.base,
  background: vars.background.surface,
  color: vars.text.tertiary,
  fontSize: vars.typography.size.xs,
  cursor: 'pointer',
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.background.muted,
    borderColor: vars.border.color.muted,
  },
});

export const ipAddress = style({
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  background: vars.background.muted,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
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
  background: vars.background.surface,
  borderRadius: vars.border.radius.xl,
  padding: vars.spacing['4'],
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  boxShadow: vars.shadows.xl,
});

export const modalHeader = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['3'],
  paddingBottom: vars.spacing['3'],
  borderBottom: `1px solid ${vars.border.color.default}`,
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
  borderRadius: vars.border.radius.base,
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    background: vars.background.muted,
    color: vars.text.primary,
  },
});

export const jsonBlock = style({
  background: vars.text.primary,
  color: vars.background.body,
  padding: vars.spacing['3'],
  borderRadius: vars.border.radius.lg,
  overflow: 'auto',
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.sm,
  lineHeight: vars.typography.lineHeight.relaxed,
  margin: 0,
});

export const subUserType = style({
  fontSize: vars.typography.size.xs,
  color: vars.text.muted,
});

export const buttonIcon = style({
  marginRight: vars.spacing['2'],
});

export const errorBanner = style({
  padding: vars.spacing['3'],
  color: vars.text.danger,
  background: vars.background.danger,
  borderRadius: vars.border.radius.lg,
  margin: `${vars.spacing['3']} 0`,
});
