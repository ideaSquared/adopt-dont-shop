import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const policyCard = style({
  padding: vars.spacing['5'],
  marginBottom: vars.spacing['5'],
});

export const sectionTitle = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['4']} 0`,
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
});

globalStyle(`${sectionTitle} .icon`, {
  width: '24px',
  height: '24px',
});

export const requirementsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['5'],
});

export const requirementItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: vars.spacing['3'],
  background: vars.background.surface,
  borderRadius: vars.border.radius.base,
});

globalStyle(`${requirementItem} .icon`, {
  width: '20px',
  height: '20px',
  color: vars.colors.successHover,
  flexShrink: 0,
  marginTop: '2px',
});

globalStyle(`${requirementItem} .text`, {
  fontSize: '0.9rem',
  color: vars.text.secondary,
  lineHeight: 1.4,
});

export const feeRange = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  padding: vars.spacing['4'],
  background: vars.background.surface,
  borderRadius: vars.border.radius.lg,
  marginBottom: vars.spacing['5'],
});

globalStyle(`${feeRange} .icon`, {
  width: '32px',
  height: '32px',
  color: vars.colors.primaryHover,
});

globalStyle(`${feeRange} .fee-info`, {
  flex: 1,
});

globalStyle(`${feeRange} .fee-info .label`, {
  fontSize: vars.typography.size.sm,
  color: vars.text.secondary,
  marginBottom: vars.spacing['1'],
});

globalStyle(`${feeRange} .fee-info .amount`, {
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.bold,
  color: vars.text.primary,
});

export const listSection = style({
  marginBottom: vars.spacing['5'],
});

globalStyle(`${listSection} h3`, {
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['3']} 0`,
});

globalStyle(`${listSection} ul`, {
  listStyle: 'none',
  padding: 0,
  margin: 0,
});

globalStyle(`${listSection} li`, {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.muted}`,
});

globalStyle(`${listSection} li:last-child`, {
  borderBottom: 'none',
});

globalStyle(`${listSection} li .bullet`, {
  width: '6px',
  height: '6px',
  background: vars.colors.primaryHover,
  borderRadius: '50%',
  flexShrink: 0,
  marginTop: vars.spacing['2'],
});

globalStyle(`${listSection} li .text`, {
  fontSize: '0.95rem',
  color: vars.text.secondary,
  lineHeight: 1.6,
});

export const policyDetailSection = style({
  marginBottom: vars.spacing['5'],
});

globalStyle(`${policyDetailSection} h3`, {
  fontSize: vars.typography.size.lg,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: '0 0 0.75rem 0',
});

globalStyle(`${policyDetailSection} p`, {
  fontSize: '0.95rem',
  color: vars.text.secondary,
  lineHeight: 1.6,
  margin: 0,
  padding: vars.spacing['3'],
  background: vars.background.surface,
  borderRadius: vars.border.radius.base,
});

export const emptyState = style({
  textAlign: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['5']}`,
  color: vars.text.secondary,
});

globalStyle(`${emptyState} .icon`, {
  width: '64px',
  height: '64px',
  margin: `0 auto ${vars.spacing['3']}`,
  opacity: 0.4,
});

globalStyle(`${emptyState} h3`, {
  fontSize: vars.typography.size.xl,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['2']} 0`,
});

globalStyle(`${emptyState} p`, {
  fontSize: '0.95rem',
  margin: 0,
});
