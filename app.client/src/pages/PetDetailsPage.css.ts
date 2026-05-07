import { vars } from '@adopt-dont-shop/lib.components';
import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '2rem',
});

export const backLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.5rem 1rem',
  marginBottom: '2rem',
  textDecoration: 'none',
  color: vars.text.secondary,
  border: `1px solid ${vars.border.color.primary}`,
  borderRadius: vars.border.radius.md,
  fontSize: '0.9rem',
  transition: `all ${vars.transitions.fast}`,
  ':hover': {
    color: vars.text.primary,
    borderColor: vars.border.color.secondary,
    background: vars.background.tertiary,
  },
});

export const actionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: vars.border.radius.lg,
  fontWeight: '500',
  transition: `all ${vars.transitions.fast}`,
  width: '100%',
});

export const actionLinkPrimary = style({
  background: vars.colors.primary['500'],
  color: 'white',
  ':hover': {
    background: vars.colors.primary['600'],
    boxShadow: vars.shadows.md,
    transform: 'translateY(-1px)',
  },
});

export const actionLinkOutline = style({
  background: 'transparent',
  color: vars.text.primary,
  border: `1px solid ${vars.border.color.primary}`,
  ':hover': {
    background: vars.background.tertiary,
    borderColor: vars.border.color.secondary,
  },
});

export const actionLinkLarge = style({
  padding: '1rem 2rem',
  fontSize: '1.1rem',
});

export const errorActionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: vars.border.radius.lg,
  fontWeight: '500',
  transition: `all ${vars.transitions.fast}`,
  background: vars.colors.primary['500'],
  color: 'white',
  ':hover': {
    background: vars.colors.primary['600'],
    transform: 'translateY(-1px)',
  },
});

export const petHeader = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '2rem',
  '@media': {
    '(min-width: 768px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
});

export const petTitle = style({});

globalStyle(`${petTitle} h1`, {
  fontFamily: vars.typography.family.display,
  fontSize: '2.5rem',
  fontWeight: vars.typography.weight.bold,
  marginBottom: '0.5rem',
  color: vars.text.primary,
  letterSpacing: '-0.025em',
});

globalStyle(`${petTitle} .subtitle`, {
  fontSize: '1.2rem',
  color: vars.text.secondary,
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  flexWrap: 'wrap',
});

export const statusSection = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap',
});

export const mainContent = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '2rem',
  '@media': {
    '(min-width: 768px)': {
      gridTemplateColumns: '2fr 1fr',
    },
  },
});

export const imageSection = style({});

globalStyle(`${imageSection} .primary-image`, {
  width: '100%',
  height: '400px',
  borderRadius: vars.border.radius['2xl'],
  overflow: 'hidden',
  marginBottom: '1rem',
  position: 'relative',
  boxShadow: vars.shadows.md,
});

globalStyle(`${imageSection} .primary-image img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

globalStyle(`${imageSection} .thumbnail-grid`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: '0.5rem',
  maxHeight: '200px',
  overflowY: 'auto',
});

globalStyle(`${imageSection} .thumbnail`, {
  width: '80px',
  height: '80px',
  borderRadius: vars.border.radius.lg,
  overflow: 'hidden',
  cursor: 'pointer',
  border: '2px solid transparent',
  transition: `border-color ${vars.transitions.fast}`,
});

globalStyle(`${imageSection} .thumbnail.active`, {
  borderColor: vars.colors.primary['500'],
});

globalStyle(`${imageSection} .thumbnail:hover`, {
  borderColor: vars.border.color.primary,
});

globalStyle(`${imageSection} .thumbnail img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  background: `linear-gradient(135deg, ${vars.colors.neutral['100']} 0%, ${vars.colors.neutral['200']} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
  '::before': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80px',
    height: '80px',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: '0.3',
  },
  '::after': {
    content: '"No Photo Available"',
    position: 'absolute',
    bottom: '20px',
    fontSize: '0.9rem',
    opacity: '0.8',
    color: vars.text.tertiary,
  },
});

export const thumbnailPlaceholder = style({
  width: '100%',
  height: '100%',
  background: `linear-gradient(135deg, ${vars.colors.neutral['100']} 0%, ${vars.colors.neutral['200']} 100%)`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: vars.border.radius.sm,
  '::before': {
    content: '""',
    width: '20px',
    height: '20px',
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a0a0a0'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    opacity: '0.3',
  },
});

export const sidebar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2rem',
});

export const infoCard = style({
  padding: '2rem',
});

globalStyle(`${infoCard} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.5rem',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: '1.5rem',
  color: vars.text.primary,
});

globalStyle(`${infoCard} .info-grid`, {
  display: 'grid',
  gap: '1rem',
});

globalStyle(`${infoCard} .info-item`, {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.primary}`,
});

globalStyle(`${infoCard} .info-item:last-child`, {
  borderBottom: 'none',
});

globalStyle(`${infoCard} .info-item .label`, {
  fontWeight: '500',
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: '0.75rem',
});

globalStyle(`${infoCard} .info-item .value`, {
  fontWeight: '600',
  color: vars.text.primary,
});

export const actionCard = style({
  padding: '2rem',
  textAlign: 'center',
});

globalStyle(`${actionCard} h3`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.25rem',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: '1rem',
  color: vars.text.primary,
});

globalStyle(`${actionCard} .rescue-info`, {
  background: vars.background.tertiary,
  borderRadius: vars.border.radius.lg,
  padding: '1rem',
  marginBottom: '1.5rem',
});

globalStyle(`${actionCard} .rescue-info .rescue-name`, {
  fontWeight: '600',
  color: vars.text.primary,
  marginBottom: '0.25rem',
});

globalStyle(`${actionCard} .rescue-info .rescue-location`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
});

globalStyle(`${actionCard} .actions`, {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
});

export const descriptionCard = style({
  padding: '2rem',
  gridColumn: '1 / -1',
});

globalStyle(`${descriptionCard} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: '1.5rem',
  fontWeight: vars.typography.weight.semibold,
  marginBottom: '1rem',
  color: vars.text.primary,
});

globalStyle(`${descriptionCard} p`, {
  lineHeight: '1.6',
  color: vars.text.secondary,
  whiteSpace: 'pre-wrap',
});

export const loadingContainer = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '400px',
  fontSize: '1.1rem',
  color: vars.text.secondary,
});

export const errorContainer = style({
  textAlign: 'center',
  padding: '3rem',
  color: vars.text.error,
});

globalStyle(`${errorContainer} h2`, {
  fontSize: '1.5rem',
  marginBottom: '1rem',
});

globalStyle(`${errorContainer} p`, {
  marginBottom: '2rem',
});

export const contactButton = style({
  width: '100%',
  marginTop: '0.5rem',
});
