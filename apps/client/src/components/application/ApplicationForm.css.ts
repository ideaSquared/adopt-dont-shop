import { globalStyle, style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const formContainer = style({
  minHeight: '400px',
});

export const reviewContainer = style({
  maxWidth: '640px',
});

export const reviewTitle = style({
  fontSize: vars.typography.size['2xl'],
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['2']} 0`,
});

export const reviewDescription = style({
  color: vars.text.secondary,
  margin: `0 0 ${vars.spacing['5']} 0`,
});

export const reviewCategory = style({
  marginBottom: vars.spacing['4'],
  padding: '1.25rem 1.5rem',
  background: vars.background.surface,
  borderRadius: vars.border.radius.base,
});

export const reviewCategoryTitle = style({
  fontSize: vars.typography.size.base,
  fontWeight: vars.typography.weight.semibold,
  color: vars.text.primary,
  margin: `0 0 ${vars.spacing['3']} 0`,
  paddingBottom: vars.spacing['2'],
  borderBottom: `1px solid ${vars.border.color.default}`,
});

export const reviewItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.125rem',
  padding: `${vars.spacing['2']} 0`,
  selectors: {
    '& + &': {
      borderTop: `1px solid ${vars.border.color.default}`,
    },
  },
});

export const reviewLabel = style({
  fontSize: '0.8125rem',
  color: vars.text.secondary,
});

export const reviewValue = style({
  fontSize: '0.9375rem',
  color: vars.text.primary,
});

export const navigationButtons = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: vars.spacing['5'],
  paddingTop: vars.spacing['5'],
  borderTop: `1px solid ${vars.border.color.default}`,
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      gap: vars.spacing['3'],
      // C4: on mobile the question steps run long, so pin the step
      // navigation (Back / Continue / Send) to the bottom of the viewport
      // so the primary CTA is always reachable without scrolling to the end.
      position: 'sticky',
      bottom: '0',
      zIndex: vars.zIndex.sticky,
      background: vars.background.body,
      paddingBottom: vars.spacing['3'],
      boxShadow: vars.shadows.lg,
    },
  },
});

export const buttonGroup = style({
  display: 'flex',
  gap: vars.spacing['3'],
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
    },
  },
});

globalStyle(`${buttonGroup} button`, {
  '@media': {
    'screen and (max-width: 768px)': {
      flex: '1',
    },
  },
});

export const saveIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  '@media': {
    'screen and (max-width: 768px)': {
      width: '100%',
      justifyContent: 'space-between',
    },
  },
});

export const saveStatusText = style({
  fontSize: '0.8125rem',
});

export const saveStatusVariants = styleVariants({
  saved: { color: vars.colors.successHover },
  saving: { color: vars.text.muted },
  error: { color: vars.colors.dangerHover },
  idle: { color: vars.border.color.strong },
});
