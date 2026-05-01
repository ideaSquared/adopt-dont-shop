import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';

import { vars } from '../../../styles/theme.css';

export const galleryContainer = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'center',
  margin: '12px',
  '@media': {
    '(max-width: 480px)': {
      gap: '8px',
      margin: '8px',
    },
  },
});

export const imageContainer = style({
  position: 'relative',
  width: '150px',
  height: '150px',
  '@media': {
    '(max-width: 480px)': {
      width: '120px',
      height: '120px',
    },
  },
});

export const imageWrapper = style({
  position: 'relative',
  width: '100%',
  maxWidth: '300px',
  height: '300px',
  margin: '20px auto',
  '@media': {
    '(max-width: 480px)': {
      height: '250px',
      margin: '12px auto',
    },
  },
});

export const galleryImage = recipe({
  base: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '12px',
    transition: 'opacity 0.3s ease-in-out',
  },
  variants: {
    isLoading: {
      true: { opacity: 0 },
      false: { opacity: 1 },
    },
  },
  defaultVariants: {
    isLoading: false,
  },
});

export const deleteButton = style({
  position: 'absolute',
  top: '10px',
  right: '10px',
  backgroundColor: 'rgba(255, 0, 0, 0.8)',
  border: 'none',
  color: 'white',
  padding: '5px 10px',
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: '12px',
  '@media': {
    '(max-width: 480px)': {
      padding: '4px 8px',
      fontSize: '10px',
      top: '5px',
      right: '5px',
    },
  },
  selectors: {
    '&:hover': {
      backgroundColor: 'red',
    },
  },
});

export const navigationDots = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: '16px',
  '@media': {
    '(max-width: 480px)': {
      marginTop: '12px',
    },
  },
});

export const dot = recipe({
  base: {
    width: vars.spacing.xs,
    height: vars.spacing.xs,
    marginLeft: vars.spacing.xs,
    marginRight: vars.spacing.xs,
    border: 'none',
    borderRadius: vars.border.radius.full,
    cursor: 'pointer',
    transition: `background-color ${vars.transitions.fast}`,
    selectors: {
      '&:hover': {
        backgroundColor: vars.text.linkHover,
      },
    },
  },
  variants: {
    active: {
      true: { backgroundColor: vars.text.link },
      false: { backgroundColor: vars.text.disabled },
    },
  },
  defaultVariants: {
    active: false,
  },
});

export const uploadButton = style({
  display: 'block',
  backgroundColor: vars.background.info,
  color: vars.text.inverse,
  padding: `${vars.spacing.sm} ${vars.spacing.md}`,
  margin: `${vars.spacing.md} auto`,
  textAlign: 'center',
  borderRadius: vars.border.radius.md,
  cursor: 'pointer',
  fontSize: vars.typography.size.base,
  transition: `background-color ${vars.transitions.fast}`,
  selectors: {
    '&:hover': {
      backgroundColor: vars.text.linkHover,
    },
  },
});

export const hiddenInput = style({
  display: 'none',
});

export const centeredBadgeContainer = style({
  display: 'flex',
  justifyContent: 'center',
  marginTop: vars.spacing.md,
});
