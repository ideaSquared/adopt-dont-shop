import { globalStyle, style } from '@vanilla-extract/css';

import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: vars.spacing['5'],
});

export const backButton = style({
  marginBottom: vars.spacing['5'],
});

export const rescueHeader = style({
  background: vars.background.body,
  borderRadius: vars.border.radius.xl,
  padding: vars.spacing['6'],
  marginBottom: vars.spacing['6'],
  textAlign: 'center',
});

globalStyle(`${rescueHeader} h1`, {
  fontSize: vars.typography.size['5xl'],
  fontWeight: vars.typography.weight.bold,
  marginBottom: vars.spacing['3'],
  color: vars.text.primary,
});

globalStyle(`${rescueHeader} .rescue-meta`, {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
  marginBottom: vars.spacing['4'],
});

globalStyle(`${rescueHeader} .rescue-meta .meta-item`, {
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['2'],
  fontSize: '1.1rem',
  color: vars.text.tertiary,
});

globalStyle(`${rescueHeader} .rescue-meta .meta-item .icon`, {
  width: '20px',
  height: '20px',
  fill: 'currentColor',
});

globalStyle(`${rescueHeader} .verification-badge`, {
  marginBottom: vars.spacing['3'],
});

globalStyle(`${rescueHeader} .contact-info`, {
  display: 'flex',
  justifyContent: 'center',
  gap: vars.spacing['3'],
  flexWrap: 'wrap',
});

export const rescueInfo = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.spacing['5'],
  marginBottom: vars.spacing['6'],
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: '2fr 1fr',
    },
  },
});

export const descriptionCard = style({
  padding: vars.spacing['5'],
});

globalStyle(`${descriptionCard} h2`, {
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['4'],
  color: vars.text.primary,
});

globalStyle(`${descriptionCard} h3`, {
  fontSize: '1.2rem',
  fontWeight: vars.typography.weight.semibold,
  margin: `${vars.spacing['5']} 0 ${vars.spacing['3']} 0`,
  color: vars.text.primary,
});

globalStyle(`${descriptionCard} p`, {
  lineHeight: '1.6',
  color: vars.text.tertiary,
  whiteSpace: 'pre-wrap',
});

export const contactCard = style({
  padding: vars.spacing['5'],
});

globalStyle(`${contactCard} h2`, {
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['4'],
  color: vars.text.primary,
});

globalStyle(`${contactCard} .contact-item`, {
  display: 'flex',
  alignItems: 'center',
  gap: vars.spacing['3'],
  marginBottom: vars.spacing['3'],
  padding: vars.spacing['3'],
  background: vars.background.surface,
  borderRadius: vars.border.radius.base,
});

globalStyle(`${contactCard} .contact-item .icon`, {
  width: '20px',
  height: '20px',
  fill: vars.text.tertiary,
  flexShrink: 0,
});

globalStyle(`${contactCard} .contact-item .details .label`, {
  fontWeight: vars.typography.weight.medium,
  color: vars.text.tertiary,
  fontSize: '0.9rem',
});

globalStyle(`${contactCard} .contact-item .details .value`, {
  color: vars.text.primary,
  fontWeight: vars.typography.weight.semibold,
});

globalStyle(`${contactCard} .website-link`, {
  color: vars.colors.infoHover,
  textDecoration: 'none',
});

globalStyle(`${contactCard} .website-link:hover`, {
  color: vars.colors.infoActive,
  textDecoration: 'underline',
});

export const petsSection = style({});

globalStyle(`${petsSection} h2`, {
  fontSize: '2rem',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['5'],
  color: vars.text.primary,
  textAlign: 'center',
});

globalStyle(`${petsSection} .pets-header`, {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['5'],
  flexWrap: 'wrap',
  gap: vars.spacing['3'],
});

globalStyle(`${petsSection} .pets-header .pets-count`, {
  fontSize: '1.1rem',
  color: vars.text.tertiary,
});

globalStyle(`${petsSection} .pets-header .view-toggle`, {
  display: 'flex',
  gap: vars.spacing['2'],
});

export const petsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: vars.spacing['4'],
});

export const loadMoreButton = style({
  margin: `${vars.spacing['5']} auto`,
  display: 'block',
});

export const errorActions = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: vars.spacing['3'],
});

export const emptyState = style({
  textAlign: 'center',
  padding: vars.spacing['6'],
  color: vars.text.tertiary,
});

globalStyle(`${emptyState} .icon`, {
  width: '64px',
  height: '64px',
  margin: `0 auto ${vars.spacing['3']}`,
  fill: 'currentColor',
  opacity: '0.5',
});

globalStyle(`${emptyState} h3`, {
  fontSize: vars.typography.size['2xl'],
  marginBottom: vars.spacing['3'],
  color: vars.text.primary,
});

globalStyle(`${emptyState} p`, {
  fontSize: '1.1rem',
  marginBottom: vars.spacing['5'],
});
