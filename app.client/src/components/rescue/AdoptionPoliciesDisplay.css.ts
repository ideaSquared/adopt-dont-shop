import { style } from '@vanilla-extract/css';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const policyCard = style({
  padding: '2rem',
  marginBottom: '2rem',
});

export const sectionTitle = style({
  fontSize: '1.5rem',
  fontWeight: 600,
  color: vars.text.primary,
  margin: '0 0 1.5rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  selectors: {
    '& .icon': {
      width: '24px',
      height: '24px',
    },
  },
});

export const requirementsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: '1rem',
  marginBottom: '2rem',
});

export const requirementItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '0.75rem',
  padding: '1rem',
  background: vars.background.secondary,
  borderRadius: '8px',
  selectors: {
    '& .icon': {
      width: '20px',
      height: '20px',
      color: vars.colors.semantic.success['600'],
      flexShrink: 0,
      marginTop: '2px',
    },
    '& .text': {
      fontSize: '0.9rem',
      color: vars.text.secondary,
      lineHeight: 1.4,
    },
  },
});

export const feeRange = style({
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '1.5rem',
  background: vars.background.secondary,
  borderRadius: '12px',
  marginBottom: '2rem',
  selectors: {
    '& .icon': {
      width: '32px',
      height: '32px',
      color: vars.colors.primary['600'],
    },
    '& .fee-info': {
      flex: 1,
    },
    '& .fee-info .label': {
      fontSize: '0.875rem',
      color: vars.text.secondary,
      marginBottom: '0.25rem',
    },
    '& .fee-info .amount': {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: vars.text.primary,
    },
  },
});

export const listSection = style({
  marginBottom: '2rem',
  selectors: {
    '& h3': {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: vars.text.primary,
      margin: '0 0 1rem 0',
    },
    '& ul': {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    '& li': {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      padding: '0.75rem 0',
      borderBottom: `1px solid ${vars.border.color.secondary}`,
    },
    '& li:last-child': {
      borderBottom: 'none',
    },
    '& li .bullet': {
      width: '6px',
      height: '6px',
      background: vars.colors.primary['600'],
      borderRadius: '50%',
      flexShrink: 0,
      marginTop: '0.5rem',
    },
    '& li .text': {
      fontSize: '0.95rem',
      color: vars.text.secondary,
      lineHeight: 1.6,
    },
  },
});

export const policyDetailSection = style({
  marginBottom: '2rem',
  selectors: {
    '& h3': {
      fontSize: '1.125rem',
      fontWeight: 600,
      color: vars.text.primary,
      margin: '0 0 0.75rem 0',
    },
    '& p': {
      fontSize: '0.95rem',
      color: vars.text.secondary,
      lineHeight: 1.6,
      margin: 0,
      padding: '1rem',
      background: vars.background.secondary,
      borderRadius: '8px',
    },
  },
});

export const emptyState = style({
  textAlign: 'center',
  padding: '3rem 2rem',
  color: vars.text.secondary,
  selectors: {
    '& .icon': {
      width: '64px',
      height: '64px',
      margin: '0 auto 1rem',
      opacity: 0.4,
    },
    '& h3': {
      fontSize: '1.25rem',
      color: vars.text.primary,
      margin: '0 0 0.5rem 0',
    },
    '& p': {
      fontSize: '0.95rem',
      margin: 0,
    },
  },
});
