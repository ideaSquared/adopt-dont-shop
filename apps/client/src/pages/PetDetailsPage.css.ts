import { vars } from '@adopt-dont-shop/lib.components/theme';
import { globalStyle, style } from '@vanilla-extract/css';

export const pageContainer = style({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: vars.spacing['5'],
  '@media': {
    '(max-width: 768px)': {
      padding: vars.spacing['3'],
    },
  },
});

export const actionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  // C4: primary/secondary CTAs must clear the 44px minimum touch target.
  minHeight: vars.spacing['6'],
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: vars.border.radius.lg,
  fontWeight: vars.typography.weight.medium,
  transition: `all ${vars.transitions.fast}`,
  width: '100%',
});

export const actionLinkPrimary = style({
  background: vars.colors.primary,
  color: 'white',
  ':hover': {
    background: vars.colors.primaryHover,
    boxShadow: vars.shadows.base,
    transform: 'translateY(-1px)',
  },
});

export const actionLinkLarge = style({
  padding: `${vars.spacing['3']} ${vars.spacing['5']}`,
  fontSize: '1.1rem',
});

export const backRow = style({
  marginBottom: vars.spacing['4'],
});

export const errorActions = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: vars.spacing['3'],
});

export const errorActionLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: vars.spacing['6'],
  padding: '0.75rem 1.5rem',
  textDecoration: 'none',
  borderRadius: vars.border.radius.lg,
  fontWeight: vars.typography.weight.medium,
  transition: `all ${vars.transitions.fast}`,
  background: vars.colors.primary,
  color: 'white',
  ':hover': {
    background: vars.colors.primaryHover,
    transform: 'translateY(-1px)',
  },
});

export const mainContent = style({
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: vars.spacing['5'],
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
  marginBottom: vars.spacing['3'],
  position: 'relative',
  boxShadow: vars.shadows.base,
});

globalStyle(`${imageSection} .primary-image img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

globalStyle(`${imageSection} .thumbnail-grid`, {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
  gap: vars.spacing['2'],
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
  borderColor: vars.colors.primary,
});

globalStyle(`${imageSection} .thumbnail:hover`, {
  borderColor: vars.border.color.default,
});

globalStyle(`${imageSection} .thumbnail img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const placeholderImage = style({
  width: '100%',
  height: '100%',
  background: `linear-gradient(135deg, ${vars.background.muted} 0%, ${vars.border.color.muted} 100%)`,
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
  background: `linear-gradient(135deg, ${vars.background.muted} 0%, ${vars.border.color.muted} 100%)`,
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
  gap: vars.spacing['5'],
  '@media': {
    // C4: on desktop the details column is long, so pin the sidebar (which
    // holds the Apply CTA) so the primary action stays in view while the
    // adopter scrolls the description. `align-self: start` lets the grid
    // child shrink to content height so `position: sticky` engages.
    // The sidebar spans both grid rows so its sticky range covers the
    // description row; otherwise the full-width About card slid over it.
    '(min-width: 768px)': {
      gridColumn: '2',
      gridRow: '1 / span 2',
      position: 'sticky',
      top: vars.spacing['4'],
      alignSelf: 'start',
      // Keep the whole sidebar reachable on short viewports: cap it at the
      // visible height and let it scroll rather than pinning controls offscreen.
      maxHeight: `calc(100vh - 2 * ${vars.spacing['4']})`,
      overflowY: 'auto',
    },
  },
});

export const infoCard = style({
  padding: vars.spacing['5'],
});

globalStyle(`${infoCard} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['4'],
  color: vars.text.primary,
});

globalStyle(`${infoCard} .info-grid`, {
  display: 'grid',
  gap: vars.spacing['3'],
});

globalStyle(`${infoCard} .info-item`, {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.75rem 0',
  borderBottom: `1px solid ${vars.border.color.default}`,
});

globalStyle(`${infoCard} .info-item:last-child`, {
  borderBottom: 'none',
});

globalStyle(`${infoCard} .info-item .label`, {
  fontWeight: vars.typography.weight.medium,
  color: vars.text.tertiary,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  fontSize: vars.typography.size.xs,
});

globalStyle(`${infoCard} .info-item .value`, {
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
});

export const actionCard = style({
  padding: vars.spacing['5'],
  textAlign: 'center',
});

globalStyle(`${actionCard} h3`, {
  fontFamily: vars.typography.family.display,
  fontSize: vars.typography.size.xl,
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['3'],
  color: vars.text.primary,
});

globalStyle(`${actionCard} .rescue-info`, {
  background: vars.background.muted,
  borderRadius: vars.border.radius.lg,
  padding: vars.spacing['3'],
  marginBottom: vars.spacing['4'],
});

globalStyle(`${actionCard} .rescue-info .rescue-name`, {
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  marginBottom: vars.spacing['1'],
});

globalStyle(`${actionCard} .rescue-info .rescue-location`, {
  fontSize: '0.9rem',
  color: vars.text.tertiary,
});

globalStyle(`${actionCard} .actions`, {
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['3'],
});

export const descriptionCard = style({
  padding: vars.spacing['5'],
  gridColumn: '1 / -1',
  '@media': {
    // Sits under the images, beside the sidebar, instead of spanning under it.
    '(min-width: 768px)': {
      gridColumn: '1',
      minWidth: 0,
    },
  },
});

globalStyle(`${descriptionCard} h2`, {
  fontFamily: vars.typography.family.display,
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.semibold,
  marginBottom: vars.spacing['3'],
  color: vars.text.primary,
});

globalStyle(`${descriptionCard} p`, {
  lineHeight: '1.6',
  color: vars.text.secondary,
  whiteSpace: 'pre-wrap',
});

export const contactButton = style({
  width: '100%',
  marginTop: vars.spacing['2'],
});

// ADS-639: "View Rescue Profile" is a tertiary inline link below the
// primary (Apply) and secondary (Ask a question) actions, so it reads as
// a low-emphasis affordance rather than competing for attention.
export const tertiaryLink = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  // C4: even the low-emphasis link keeps a comfortable tap target.
  minHeight: vars.spacing['6'],
  marginTop: vars.spacing['2'],
  fontSize: '0.9rem',
  color: vars.text.secondary,
  textDecoration: 'underline',
  background: 'transparent',
  border: 'none',
  ':hover': {
    color: vars.text.primary,
  },
});
