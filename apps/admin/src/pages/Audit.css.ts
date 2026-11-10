import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

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

export const ipAddress = style({
  fontFamily: vars.typography.family.mono,
  fontSize: vars.typography.size.xs,
  color: vars.text.tertiary,
  background: vars.background.muted,
  padding: `${vars.spacing['1']} ${vars.spacing['2']}`,
  borderRadius: vars.border.radius.sm,
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
