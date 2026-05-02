import { style, styleVariants } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const progressContainer = style({
  marginBottom: '3rem',
});

export const stepsContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '2rem',
  overflowX: 'auto',
  padding: '1rem 0',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'column',
      gap: '1rem',
      alignItems: 'stretch',
    },
  },
});

export const stepItem = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  minWidth: '120px',
  transition: 'opacity 0.2s ease',
  '@media': {
    'screen and (max-width: 768px)': {
      flexDirection: 'row',
      textAlign: 'left',
      minWidth: 'auto',
      width: '100%',
      padding: '0.5rem',
      borderRadius: '8px',
    },
  },
});

export const stepItemClickable = style({
  cursor: 'pointer',
  ':hover': {
    opacity: '0.8' as unknown as number,
  },
});

export const stepItemDefault = style({
  cursor: 'default',
});

export const stepItemActiveMobile = style({
  '@media': {
    'screen and (max-width: 768px)': {
      background: vars.colors.primary['50'],
    },
  },
});

export const stepNumber = style({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '600',
  fontSize: '1rem',
  marginBottom: '0.5rem',
  border: '2px solid',
  '@media': {
    'screen and (max-width: 768px)': {
      marginBottom: '0',
      marginRight: '1rem',
      width: '32px',
      height: '32px',
      fontSize: '0.875rem',
    },
  },
});

export const stepNumberVariants = styleVariants({
  completed: {
    background: vars.colors.semantic.success['500'],
    borderColor: vars.colors.semantic.success['500'],
    color: 'white',
  },
  active: {
    background: vars.colors.primary['500'],
    borderColor: vars.colors.primary['500'],
    color: 'white',
  },
  inactive: {
    background: 'transparent',
    borderColor: vars.colors.neutral['300'],
    color: vars.colors.neutral['400'],
  },
});

export const stepContent = style({
  '@media': {
    'screen and (max-width: 768px)': {
      flex: '1',
    },
  },
});

export const stepTitle = style({
  fontSize: '0.875rem',
  fontWeight: '600',
  margin: '0 0 0.25rem 0',
  '@media': {
    'screen and (max-width: 768px)': {
      fontSize: '1rem',
    },
  },
});

export const stepTitleVariants = styleVariants({
  activeOrCompleted: { color: vars.text.primary },
  inactive: { color: vars.text.tertiary },
});

export const stepDescription = style({
  fontSize: '0.75rem',
  margin: '0',
  '@media': {
    'screen and (max-width: 768px)': {
      fontSize: '0.875rem',
    },
  },
});

export const stepDescriptionVariants = styleVariants({
  activeOrCompleted: { color: vars.text.secondary },
  inactive: { color: vars.text.tertiary },
});

export const stepConnector = style({
  flex: '1',
  height: '2px',
  margin: '0 1rem',
  transition: 'background-color 0.3s ease',
  '@media': {
    'screen and (max-width: 768px)': {
      display: 'none',
    },
  },
});

export const stepConnectorVariants = styleVariants({
  completed: { background: vars.colors.semantic.success['500'] },
  incomplete: { background: vars.colors.neutral['200'] },
});

export const progressBar = style({
  width: '100%',
  height: '4px',
  background: vars.colors.neutral['200'],
  borderRadius: '2px',
  overflow: 'hidden',
});

export const progressFill = style({
  height: '100%',
  background: vars.colors.primary['500'],
  transition: 'width 0.3s ease',
  borderRadius: '2px',
});
