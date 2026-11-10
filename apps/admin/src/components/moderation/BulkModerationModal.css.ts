import { style } from '@vanilla-extract/css';

export const description = style({
  fontSize: '0.875rem',
  color: '#374151',
  lineHeight: 1.5,
  margin: 0,
});

export const countBadge = style({
  display: 'inline-block',
  padding: '0.25rem 0.75rem',
  borderRadius: '9999px',
  background: '#dbeafe',
  color: '#1e40af',
  fontSize: '0.75rem',
  fontWeight: 600,
  width: 'fit-content',
});

export const severityWarning = style({
  background: '#fef3c7',
  border: '1px solid #fbbf24',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#92400e',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const severityCritical = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#991b1b',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
});

export const resultBanner = style({
  background: '#dcfce7',
  border: '1px solid #16a34a',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#166534',
});

export const resultBannerFailed = style({
  background: '#fee2e2',
  border: '1px solid #dc2626',
  color: '#991b1b',
});

export const severityHeading = style({
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
});
