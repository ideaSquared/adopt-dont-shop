import { globalStyle, style } from '@vanilla-extract/css';

export const container = style({
  minHeight: 'calc(100vh - 200px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem',
  background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
});

export const verifyEmailCard = style({
  width: '100%',
  maxWidth: '500px',
  padding: '2.5rem',
});

export const header = style({
  textAlign: 'center',
  marginBottom: '2rem',
});

globalStyle(`${header} h1`, {
  fontSize: '2rem',
  marginBottom: '0.5rem',
  color: '#111827',
});

globalStyle(`${header} p`, {
  color: '#6b7280',
  lineHeight: '1.6',
  fontSize: '1rem',
});

export const iconContainer = style({
  textAlign: 'center',
  marginBottom: '1.5rem',
  fontSize: '4rem',
});

export const buttonGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginTop: '2rem',
});

export const loadingSpinner = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '2rem',
  '::after': {
    content: '""',
    width: '48px',
    height: '48px',
    border: '5px solid #e5e7eb',
    borderBottomColor: '#6366f1',
    borderRadius: '50%',
    animationName: 'rotation',
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
});

export const resendSection = style({
  textAlign: 'center',
  marginTop: '1.5rem',
  paddingTop: '1.5rem',
  borderTop: '1px solid #e5e7eb',
});

globalStyle(`${resendSection} p`, {
  color: '#6b7280',
  marginBottom: '1rem',
  fontSize: '0.95rem',
});
