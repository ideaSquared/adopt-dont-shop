import { globalStyle, style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { vars } from '@adopt-dont-shop/lib.components/theme';

export const pageContainer = style({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  padding: `${vars.spacing['3']} 0`,
});

export const header = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: vars.spacing['5'],
  padding: `0 ${vars.spacing['3']}`,
});

export const locationRow = style({
  padding: `0 ${vars.spacing['3']}`,
  marginBottom: vars.spacing['4'],
});

export const title = style({
  fontSize: '2rem',
  fontWeight: vars.typography.weight.bold,
  color: '#333',
  margin: 0,
});

export const headerActions = style({
  display: 'flex',
  gap: vars.spacing['3'],
  alignItems: 'center',
});

export const filterButton = recipe({
  base: {
    padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
    borderRadius: vars.border.radius.base,
    border: '1px solid #dee2e6',
    background: '#f8f9fa',
    color: '#333',
    fontWeight: vars.typography.weight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#e9ecef',
    },
  },
  variants: {
    active: {
      true: {
        background: '#4ecdc4',
        color: 'white',
        borderColor: '#4ecdc4',
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const actionLinkPrimary = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  borderRadius: vars.border.radius.base,
  textDecoration: 'none',
  fontWeight: vars.typography.weight.medium,
  transition: 'all 0.2s ease',
  background: '#4ecdc4',
  color: 'white',
  ':hover': {
    background: '#45b7b8',
  },
});

export const mainContent = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: vars.spacing['3'],
});

export const filtersPanel = recipe({
  base: {
    marginBottom: vars.spacing['3'],
    overflow: 'hidden',
    background: '#f8f9fa',
    borderRadius: vars.border.radius.base,
    transition: 'all 0.3s ease',
    width: '100%',
    maxWidth: '600px',
  },
  variants: {
    isOpen: {
      true: {
        padding: vars.spacing['3'],
        maxHeight: '200px',
      },
      false: {
        padding: 0,
        maxHeight: 0,
      },
    },
  },
  defaultVariants: { isOpen: false },
});

export const filterGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: vars.spacing['3'],
});

export const filterGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: vars.spacing['2'],
});

globalStyle(`${filterGroup} label`, {
  fontWeight: vars.typography.weight.medium,
  color: '#333',
  fontSize: '0.9rem',
});

globalStyle(`${filterGroup} select`, {
  padding: vars.spacing['2'],
  border: '1px solid #dee2e6',
  borderRadius: vars.border.radius.sm,
  fontSize: '0.9rem',
});

globalStyle(`${filterGroup} input`, {
  padding: vars.spacing['2'],
  border: '1px solid #dee2e6',
  borderRadius: vars.border.radius.sm,
  fontSize: '0.9rem',
});

globalStyle(`${filterGroup} select:focus-visible`, {
  outline: 'none',
  borderColor: '#4ecdc4',
});

globalStyle(`${filterGroup} input:focus-visible`, {
  outline: 'none',
  borderColor: '#4ecdc4',
});

export const sessionStats = style({
  marginTop: vars.spacing['5'],
  padding: vars.spacing['3'],
  background: '#f8f9fa',
  borderRadius: vars.border.radius.lg,
  textAlign: 'center',
  color: '#666',
  fontSize: '0.9rem',
});

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: vars.spacing['3'],
  marginTop: vars.spacing['2'],
});

export const statItem = style({
  textAlign: 'center',
});

export const statNumber = style({
  fontSize: '1.2rem',
  fontWeight: vars.typography.weight.bold,
  color: '#333',
});

export const statLabel = style({
  fontSize: '0.8rem',
  marginTop: vars.spacing['1'],
});

export const loadingState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '400px',
  color: '#666',
});

export const spinner = style({
  width: '40px',
  height: '40px',
  border: '3px solid #f3f3f3',
  borderTop: '3px solid #4ecdc4',
  borderRadius: '50%',
  animationName: 'spin',
  animationDuration: '1s',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
  marginBottom: vars.spacing['3'],
  '@media': {
    '(prefers-reduced-motion: reduce)': { animation: 'none' },
  },
});

export const errorState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '400px',
  padding: vars.spacing['5'],
  textAlign: 'center',
});

export const errorIcon = style({
  fontSize: vars.typography.size['5xl'],
  marginBottom: vars.spacing['3'],
  opacity: 0.5,
});

export const errorMessageText = style({
  color: '#e74c3c',
  marginBottom: vars.spacing['3'],
  fontWeight: vars.typography.weight.medium,
});

export const retryButton = style({
  padding: `${vars.spacing['2']} ${vars.spacing['3']}`,
  background: '#4ecdc4',
  color: 'white',
  border: 'none',
  borderRadius: vars.border.radius.base,
  cursor: 'pointer',
  fontWeight: vars.typography.weight.medium,
  ':hover': {
    background: '#45b7b8',
  },
});

// ADS-630: end-of-queue empty state.
export const emptyQueueState = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: `${vars.spacing['6']} ${vars.spacing['5']}`,
  textAlign: 'center',
  background: '#ffffff',
  border: '1px solid #dee2e6',
  borderRadius: vars.border.radius.lg,
  margin: `0 ${vars.spacing['3']}`,
});

export const emptyQueueIcon = style({
  fontSize: vars.typography.size['5xl'],
  color: '#4ecdc4',
  marginBottom: vars.spacing['3'],
});

export const emptyQueueTitle = style({
  fontSize: vars.typography.size['2xl'],
  fontWeight: vars.typography.weight.bold,
  color: '#333',
  margin: `0 0 ${vars.spacing['2']} 0`,
});

export const emptyQueueSubtitle = style({
  fontSize: vars.typography.size.base,
  color: '#6c757d',
  margin: `0 0 ${vars.spacing['4']} 0`,
});

export const emptyQueueActions = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  alignItems: 'center',
});

export const emptyQueueNotifyButton = style({
  padding: '0.75rem 1.5rem',
  background: '#4ecdc4',
  color: 'white',
  border: 'none',
  borderRadius: vars.border.radius.base,
  cursor: 'pointer',
  fontWeight: vars.typography.weight.semibold,
  ':hover': {
    background: '#45b7b8',
  },
});

export const emptyQueueOptedIn = style({
  padding: '0.75rem 1.5rem',
  background: '#e9f7f6',
  color: '#1f7a73',
  borderRadius: vars.border.radius.base,
  fontWeight: vars.typography.weight.semibold,
});

export const emptyQueueBrowseLink = style({
  color: '#4ecdc4',
  textDecoration: 'underline',
  fontWeight: vars.typography.weight.medium,
});

export const emptyQueueError = style({
  marginTop: vars.spacing['3'],
  color: '#e74c3c',
  fontSize: vars.typography.size.sm,
});
